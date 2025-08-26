"use client";
import { calculateScenario } from "@/lib/calc";
import { CalculationEngine } from "@/lib/calc/engines";
import {
  FinanceInput,
  PlantMaster,
  BusinessCase as Scenario,
  Sku,
} from "@/lib/types";
import { nanoid } from "nanoid";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import FreeCashFlow from "./FreeCashFlow";
import MergedPnlTable from "./MergedPnlTable";
import CaseProgressBar from "./CaseProgressBar";

import { formatCrores, formatPct } from "@/lib/utils";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import CalculateIcon from "@mui/icons-material/Calculate";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import {
  FinanceTeamCard,
  NpdTeamCard,
  OpsTeamCard,
  PricingTeamCard,
  SalesTeamCard,
} from "./team-cards";

// Custom hook for autosaving functionality
function useAutoSave(
  scenario: Scenario,
  onSave: (scenarioToSave: Scenario) => Promise<void>,
  delay: number = 2000
) {
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const scenarioRef = React.useRef(scenario);
  const onSaveRef = React.useRef(onSave);

  useEffect(() => {
    scenarioRef.current = scenario;
  }, [scenario]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    const timer = setTimeout(() => {
      onSaveRef.current(scenarioRef.current);
      setAutoSaveTimer(null);
    }, delay);
    setAutoSaveTimer(timer);
  }, [delay, autoSaveTimer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  return { triggerAutoSave, autoSaveTimer };
}

export default function MultiSkuEditor({
  scenario: initial,
  plantOptions,
}: {
  scenario: Scenario;
  plantOptions: PlantMaster[];
}) {
  const [scenario, setScenario] = useState<Scenario>(initial);
  const [activeSkuId, setActiveSkuId] = useState<string>(
    initial.skus[0]?.id || ""
  );

  // State for expanded team card
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  // Debug logging for plant data
  console.log("MultiSkuEditor - plantOptions:", plantOptions);
  console.log(
    "MultiSkuEditor - plantOptions length:",
    plantOptions?.length || 0
  );
  console.log("MultiSkuEditor - first plant:", plantOptions?.[0]);
  console.log(
    "MultiSkuEditor - scenario skus:",
    scenario.skus.map((s) => ({
      id: s.id,
      name: s.name,
      plant: s.plantMaster?.plant,
    }))
  );

  // Ensure activeSkuId is always valid when scenario changes
  useEffect(() => {
    if (scenario.skus.length > 0) {
      const currentSkuExists = scenario.skus.some(
        (sku) => sku.id === activeSkuId
      );
      if (!currentSkuExists) {
        setActiveSkuId(scenario.skus[0].id);
      }
    }
  }, [scenario.skus, activeSkuId]);

  // Ensure all SKUs have proper default values for OpsInput fields
  useEffect(() => {
    let needsUpdate = false;
    const updatedSkus = scenario.skus.map((sku) => {
      const updatedOps = { ...sku.ops };

      // Check and set defaults for boolean fields
      if (updatedOps.newMachineRequired === undefined) {
        updatedOps.newMachineRequired = false;
        needsUpdate = true;
      }
      if (updatedOps.newMouldRequired === undefined) {
        updatedOps.newMouldRequired = false;
        needsUpdate = true;
      }
      if (updatedOps.newInfraRequired === undefined) {
        updatedOps.newInfraRequired = false;
        needsUpdate = true;
      }

      // Check and set defaults for cost fields
      if (updatedOps.costOfNewMachine === undefined) {
        updatedOps.costOfNewMachine = 0;
        needsUpdate = true;
      }
      if (updatedOps.costOfOldMachine === undefined) {
        updatedOps.costOfOldMachine = 0;
        needsUpdate = true;
      }
      if (updatedOps.costOfNewMould === undefined) {
        updatedOps.costOfNewMould = 0;
        needsUpdate = true;
      }
      if (updatedOps.costOfOldMould === undefined) {
        updatedOps.costOfOldMould = 0;
        needsUpdate = true;
      }
      if (updatedOps.costOfNewInfra === undefined) {
        updatedOps.costOfNewInfra = 0;
        needsUpdate = true;
      }
      if (updatedOps.costOfOldInfra === undefined) {
        updatedOps.costOfOldInfra = 0;
        needsUpdate = true;
      }

      // Check and set defaults for life fields
      if (updatedOps.lifeOfNewMachineYears === undefined) {
        updatedOps.lifeOfNewMachineYears = 15;
        needsUpdate = true;
      }
      if (updatedOps.lifeOfNewMouldYears === undefined) {
        updatedOps.lifeOfNewMouldYears = 15;
        needsUpdate = true;
      }
      if (updatedOps.lifeOfNewInfraYears === undefined) {
        updatedOps.lifeOfNewInfraYears = 30;
        needsUpdate = true;
      }

      // Check and set defaults for other fields
      if (updatedOps.oee === undefined) {
        updatedOps.oee = 0.8;
        needsUpdate = true;
      }
      if (updatedOps.operatingHoursPerDay === undefined) {
        updatedOps.operatingHoursPerDay = 24;
        needsUpdate = true;
      }
      if (updatedOps.workingDaysPerYear === undefined) {
        updatedOps.workingDaysPerYear = 365;
        needsUpdate = true;
      }
      if (updatedOps.workingCapitalDays === undefined) {
        updatedOps.workingCapitalDays = 0;
        needsUpdate = true;
      }

      return {
        ...sku,
        ops: updatedOps,
      };
    });

    if (needsUpdate) {
      console.log("Updating SKUs with default OpsInput values");
      setScenario((prev) => ({ ...prev, skus: updatedSkus }));
    }
  }, [scenario.skus]);

  // State for collapsible sections
  const [freeCashFlowCollapsed, setFreeCashFlowCollapsed] = useState(false);

  const handleSaveWithScenario = useCallback(
    async (scenarioToSave: Scenario) => {
      try {
        const response = await fetch(`/api/scenarios/${scenarioToSave.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scenarioToSave),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(
            "handleSaveWithScenario - API response not OK:",
            response.status,
            errorData
          );
          throw new Error(
            errorData.error || `Save failed with status: ${response.status}`
          );
        }

        const result = await response.json();
        console.log("handleSaveWithScenario - API response success:", result);

        if (result.success) {
        } else {
          throw new Error("Save failed");
        }
      } catch (error) {
        console.error("Save error:", error);
      }
    },
    []
  );

  const { triggerAutoSave } = useAutoSave(scenario, handleSaveWithScenario);

  // P&L Aggregated State Variables
  const [pnlAggregated, setPnlAggregated] = useState<{
    revenueNet: number[];
    materialCost: number[];
    materialMargin: number[];
    conversionCost: number[];
    grossMargin: number[];
    sgaCost: number[];
    ebitda: number[];
    depreciation: number[];
    ebit: number[];
    interest: number[];
    pbt: number[];
    tax: number[];
    pat: number[];
  }>({
    revenueNet: [],
    materialCost: [],
    materialMargin: [],
    conversionCost: [],
    grossMargin: [],
    sgaCost: [],
    ebitda: [],
    depreciation: [],
    ebit: [],
    interest: [],
    pbt: [],
    tax: [],
    pat: [],
  });

  const activeSkuIndex = Math.max(
    0,
    scenario.skus.findIndex((s) => s.id === activeSkuId)
  );
  const sku = scenario.skus[activeSkuIndex];

  // P&L Calculation Functions using Engine
  const calculatePnlAggregated = useMemo(() => {
    const calc = calculateScenario(scenario);
    return CalculationEngine.calculateAggregatedPnl(calc, scenario);
  }, [scenario]);

  // Update P&L aggregated state when calculations change
  useEffect(() => {
    setPnlAggregated(calculatePnlAggregated);
  }, [calculatePnlAggregated]);

  useEffect(() => {
    // Ensure finance inputs have default values if they're missing
    const updatedScenario = { ...initial };
    let needsSave = false;

    if (updatedScenario.finance) {
      const originalFinance = updatedScenario.finance;
      updatedScenario.finance = {
        includeCorpSGA: originalFinance.includeCorpSGA ?? true,
        debtPct: originalFinance.debtPct ?? 1,
        costOfDebtPct: originalFinance.costOfDebtPct ?? 0.085,
        costOfEquityPct: originalFinance.costOfEquityPct ?? 0.18,
        corporateTaxRatePct: originalFinance.corporateTaxRatePct ?? 0.25, // Default to 25%
        waccPct: originalFinance.waccPct ?? 0.14, // Default to 14%
        annualVolumeGrowthPct: originalFinance.annualVolumeGrowthPct ?? 0,
      };
      // Check if any defaults were applied
      if (
        originalFinance.corporateTaxRatePct === undefined ||
        originalFinance.corporateTaxRatePct === null ||
        originalFinance.corporateTaxRatePct === 0 ||
        originalFinance.waccPct === undefined ||
        originalFinance.waccPct === null
      ) {
        needsSave = true;
      }
    }

    console.log("updatedScenario", updatedScenario);
    setScenario(updatedScenario);

    // If defaults were applied, save to database
    if (needsSave) {
      setTimeout(() => {
        handleSaveWithScenario(updatedScenario);
      }, 2000);
    }
  }, [initial, handleSaveWithScenario]);

  const calc = useMemo(() => calculateScenario(scenario), [scenario]);

  // Key metrics for quick visibility and change deltas
  const keyMetrics = useMemo(() => {
    return {
      revenueY1: calc.pnl[0]?.revenueNet ?? 0,
      ebitdaY1: calc.pnl[0]?.ebitda ?? 0,
      npv: calc.returns.npv,
      irr: calc.returns.irr, // can be null
    };
  }, [calc]);

  const [metricDeltas, setMetricDeltas] = useState<{
    revenueY1: number;
    ebitdaY1: number;
    npv: number;
    irr: number | null;
  }>({
    revenueY1: 0,
    ebitdaY1: 0,
    npv: 0,
    irr: null,
  });
  const prevMetricsRef = React.useRef<typeof keyMetrics | null>(null);

  useEffect(() => {
    const prev = prevMetricsRef.current;
    if (prev) {
      setMetricDeltas({
        revenueY1: keyMetrics.revenueY1 - prev.revenueY1,
        ebitdaY1: keyMetrics.ebitdaY1 - prev.ebitdaY1,
        npv: keyMetrics.npv - prev.npv,
        irr:
          keyMetrics.irr === null || prev.irr === null
            ? null
            : keyMetrics.irr - prev.irr,
      });
    }
    prevMetricsRef.current = keyMetrics;
  }, [keyMetrics]);

  function updateSku(updater: (s: Sku) => Sku) {
    setScenario((prev) => {
      const copy = { ...prev, skus: prev.skus.map((x) => ({ ...x })) };
      copy.skus[activeSkuIndex] = updater(copy.skus[activeSkuIndex]);
      return copy;
    });
  }

  function updateFinanceDetails(updater: (f: FinanceInput) => FinanceInput) {
    setScenario((prev) => {
      const copy = { ...prev, finance: updater(prev.finance) };
      return copy;
    });
  }

  async function addSku() {
    const id = nanoid(6);
    const base = scenario.skus[0];
    const next: Sku = {
      id,
      businessCaseId: scenario.id, // Set the business case ID
      name: `SKU-${scenario.skus.length + 1}`,
      sales: {
        ...base.sales,
        baseAnnualVolumePieces: 0,
      },
      npd: { ...base.npd },
      ops: {
        ...base.ops,
        // Ensure all required fields have proper defaults
        newMachineRequired: false,
        newMouldRequired: false,
        newInfraRequired: false,
        costOfNewMachine: 0,
        costOfOldMachine: 0,
        costOfNewMould: 0,
        costOfOldMould: 0,
        costOfNewInfra: 0,
        costOfOldInfra: 0,
        lifeOfNewMachineYears: 15,
        lifeOfNewMouldYears: 15,
        lifeOfNewInfraYears: 30,
        oee: 0.8, // Default OEE to 80%
        operatingHoursPerDay: 24,
        workingDaysPerYear: 365,
        workingCapitalDays: 0,
      },
      costing: { ...base.costing },
      altConversion: { ...base.altConversion },
      plantMaster: { ...base.plantMaster },
    };

    const originalScenario = scenario;
    const originalActiveSkuId = activeSkuId;
    const updatedScenario = {
      ...scenario,
      skus: [...scenario.skus, next],
    };

    // Update local state first
    setScenario(updatedScenario);
    setActiveSkuId(id);

    // Auto-save to Firestore
    try {
      await handleSaveWithScenario(updatedScenario);
    } catch (error) {
      console.error("Failed to auto-save after SKU addition:", error);
      // Revert the addition if save fails
      setScenario(originalScenario);
      setActiveSkuId(originalActiveSkuId);
      alert("Failed to save changes. SKU addition was reverted.");
    }
  }

  async function deleteActiveSku() {
    if (scenario.skus.length <= 1) {
      alert("At least one SKU is required in a case.");
      return;
    }
    const skuName = sku.name || sku.id;
    if (!confirm(`Delete SKU "${skuName}"? This cannot be undone.`)) return;

    const originalScenario = scenario;
    const skusAfterDeletion = scenario.skus.filter((s) => s.id !== activeSkuId);
    const updatedScenario = { ...scenario, skus: skusAfterDeletion };
    const nextActiveSkuId = skusAfterDeletion[0]?.id || "";

    setActiveSkuId(nextActiveSkuId);
    setScenario(updatedScenario);

    try {
      await handleSaveWithScenario(updatedScenario);
    } catch (error) {
      console.error("Failed to auto-save after SKU deletion:", error);
      // Revert the deletion if save fails
      setScenario(originalScenario);
      setActiveSkuId(activeSkuId);
      alert("Failed to save changes. SKU deletion was reverted.");
    }
  }

  // Function to prevent scroll wheel from changing number input values
  const preventScrollOnNumberInputs = (e: WheelEvent) => {
    if (e.target instanceof HTMLInputElement && e.target.type === "number") {
      e.preventDefault();
    }
  };

  // Add event listener when component mounts
  useEffect(() => {
    document.addEventListener("wheel", preventScrollOnNumberInputs, {
      passive: false,
    });

    return () => {
      document.removeEventListener("wheel", preventScrollOnNumberInputs);
    };
  }, []);

  const handleTeamCardClick = (teamName: string) => {
    const normalizedTeamName = teamName.toLowerCase();
    if (expandedTeam === normalizedTeamName) {
      setExpandedTeam(null);
    } else {
      setExpandedTeam(normalizedTeamName);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            {scenario.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Case ID: {scenario.id}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Button
            href={`/cases/${scenario.id}/case-analysis`}
            variant="contained"
            startIcon={<AnalyticsIcon />}
            sx={{
              background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)",
                boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.4)",
              },
            }}
          >
            Case Analysis
          </Button>
          <Button
            href={`/cases/${scenario.id}/quote-calculator`}
            variant="contained"
            startIcon={<CalculateIcon />}
            sx={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                boxShadow: "0 10px 15px -3px rgba(16, 185, 129, 0.4)",
              },
            }}
          >
            Create Customer Quotation
          </Button>
        </Box>
      </Box>

      {/* Case Progress Bar */}
      <CaseProgressBar
        scenario={scenario}
        onTeamCardClick={handleTeamCardClick}
        expandedTeam={expandedTeam}
      />

      {/* Global sticky metrics bar for immediate feedback */}
      <Card
        variant="outlined"
        sx={(theme) => ({
          position: "sticky",
          top: theme.spacing(10),
          zIndex: theme.zIndex.appBar - 1,
        })}
      >
        <CardContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr 1fr" },
              gap: 2,
            }}
          >
            <Box textAlign="center">
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mb={0.5}
              >
                Revenue (Y1)
              </Typography>
              <Typography variant="subtitle1" fontWeight={700}>
                {formatCrores(keyMetrics.revenueY1)}
              </Typography>
              {metricDeltas.revenueY1 !== 0 && (
                <Chip
                  size="small"
                  label={`${
                    metricDeltas.revenueY1 > 0 ? "+" : ""
                  }${formatCrores(Math.abs(metricDeltas.revenueY1))}`}
                  color={metricDeltas.revenueY1 > 0 ? "success" : "error"}
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                />
              )}
            </Box>
            <Box textAlign="center">
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mb={0.5}
              >
                EBITDA (Y1)
              </Typography>
              <Typography variant="subtitle1" fontWeight={700}>
                {formatCrores(keyMetrics.ebitdaY1)}
              </Typography>
              {metricDeltas.ebitdaY1 !== 0 && (
                <Chip
                  size="small"
                  label={`${metricDeltas.ebitdaY1 > 0 ? "+" : ""}${formatCrores(
                    Math.abs(metricDeltas.ebitdaY1)
                  )}`}
                  color={metricDeltas.ebitdaY1 > 0 ? "success" : "error"}
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                />
              )}
            </Box>
            <Box textAlign="center">
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mb={0.5}
              >
                NPV
              </Typography>
              <Typography variant="subtitle1" fontWeight={700}>
                {formatCrores(keyMetrics.npv)}
              </Typography>
              {metricDeltas.npv !== 0 && (
                <Chip
                  size="small"
                  label={`${metricDeltas.npv > 0 ? "+" : ""}${formatCrores(
                    Math.abs(metricDeltas.npv)
                  )}`}
                  color={metricDeltas.npv > 0 ? "success" : "error"}
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                />
              )}
            </Box>
            <Box textAlign="center">
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mb={0.5}
              >
                IRR
              </Typography>
              <Typography variant="subtitle1" fontWeight={700}>
                {keyMetrics.irr === null ? "—" : formatPct(keyMetrics.irr)}
              </Typography>
              {metricDeltas.irr !== null && metricDeltas.irr !== 0 && (
                <Chip
                  size="small"
                  label={`${metricDeltas.irr > 0 ? "+" : ""}${formatPct(
                    Math.abs(metricDeltas.irr)
                  )}`}
                  color={metricDeltas.irr > 0 ? "success" : "error"}
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                />
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Team Input Forms - Show when team card is clicked */}
      {expandedTeam === "finance" && (
        <FinanceTeamCard
          scenario={scenario}
          updateFinanceDetails={updateFinanceDetails}
          triggerAutoSave={triggerAutoSave}
        />
      )}

      {/* SKU Management Section - Show when any SKU-level team is clicked */}
      {(expandedTeam === "sales" ||
        expandedTeam === "pricing" ||
        expandedTeam === "npd" ||
        expandedTeam === "ops") && (
        <Card
          variant="outlined"
          sx={{
            background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        >
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="h6" fontWeight={700} color="text.primary">
                  SKU Management
                </Typography>
                <Chip
                  label={`${scenario.skus.length} SKU${
                    scenario.skus.length !== 1 ? "s" : ""
                  }`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            }
            action={
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  onClick={addSku}
                  startIcon={<span style={{ fontSize: "18px" }}>+</span>}
                  sx={{
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                    boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.3)",
                    "&:hover": {
                      background:
                        "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
                      boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.4)",
                    },
                  }}
                >
                  Add SKU
                </Button>
                <Button
                  color="error"
                  variant="outlined"
                  onClick={deleteActiveSku}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                    borderColor: "#ef4444",
                    color: "#ef4444",
                    "&:hover": {
                      borderColor: "#dc2626",
                      backgroundColor: "rgba(239, 68, 68, 0.04)",
                    },
                  }}
                >
                  Delete SKU
                </Button>
              </Box>
            }
            sx={{
              pb: 1,
              "& .MuiCardHeader-action": { alignSelf: "center" },
            }}
          />

          <CardContent sx={{ pt: 0 }}>
            {/* SKU Navigation Tabs */}
            <Box sx={{ mb: 3 }}>
              <Tabs
                value={activeSkuIndex}
                onChange={(_, idx) => setActiveSkuId(scenario.skus[idx].id)}
                variant="scrollable"
                scrollButtons
                allowScrollButtonsMobile
                sx={{
                  "& .MuiTabs-indicator": {
                    height: 3,
                    borderRadius: 1.5,
                    background:
                      "linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)",
                  },
                  "& .MuiTab-root": {
                    minHeight: 40,
                    padding: "4px 12px",
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "1rem",
                    "&.Mui-selected": {
                      color: "#1d4ed8",
                      fontWeight: 600,
                    },
                  },
                }}
              >
                {scenario.skus.map((s, idx) => (
                  <Tab key={`${s.id}-${s.name}`} label={s.name} value={idx} />
                ))}
              </Tabs>
            </Box>

            {/* Active SKU Indicator */}
            {sku && (
              <Box sx={{ mb: 2, p: 1.5, borderRadius: 1 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  Active: <strong>{sku.name}</strong>
                </Typography>

                {/* Team Input Cards - Only show when expanded */}
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                >
                  {expandedTeam === "sales" && (
                    <SalesTeamCard
                      sku={sku}
                      updateSku={updateSku}
                      triggerAutoSave={triggerAutoSave}
                    />
                  )}

                  {expandedTeam === "pricing" && (
                    <PricingTeamCard
                      sku={sku}
                      updateSku={updateSku}
                      triggerAutoSave={triggerAutoSave}
                    />
                  )}

                  {expandedTeam === "npd" && (
                    <NpdTeamCard
                      sku={sku}
                      plantOptions={plantOptions}
                      updateSku={updateSku}
                      triggerAutoSave={triggerAutoSave}
                    />
                  )}

                  {expandedTeam === "ops" && (
                    <OpsTeamCard
                      sku={sku}
                      updateSku={updateSku}
                      triggerAutoSave={triggerAutoSave}
                    />
                  )}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Full-width P&L and Cashflow tables */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Merged P&L Table */}
        <MergedPnlTable calc={calc} pnlAggregated={pnlAggregated} />

        {/* Free Cash Flow - Collapsible */}
        <Card variant="outlined">
          <CardHeader
            title={
              <Typography variant="h6">Free Cash Flow Analysis</Typography>
            }
            action={
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  setFreeCashFlowCollapsed(!freeCashFlowCollapsed);
                }}
              >
                {freeCashFlowCollapsed ? <ExpandMore /> : <ExpandLess />}
              </IconButton>
            }
            onClick={() => setFreeCashFlowCollapsed(!freeCashFlowCollapsed)}
            sx={{ cursor: "pointer" }}
          />
          <Collapse in={!freeCashFlowCollapsed} timeout="auto" unmountOnExit>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <FreeCashFlow cashflow={calc.cashflow} pnl={calc.pnl} />
            </CardContent>
          </Collapse>
        </Card>
      </Box>
    </Box>
  );
}
