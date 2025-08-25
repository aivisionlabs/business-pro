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
import PnlAggregated from "./PnlAggregated";
import PnlPerKg from "./PnlPerKg";

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

// Progress calculation helper
function calculateCardProgress(
  sku: Sku,
  team: string,
  scenario?: Scenario
): { percentage: number; filledFields: number; totalFields: number } {
  const fieldConfigs: Record<
    string,
    Array<{
      field: string;
      path: string;
      mandatory: boolean;
      prefilled?: boolean;
    }>
  > = {
    sales: [
      { field: "name", path: "name", mandatory: true },
      {
        field: "baseAnnualVolumePieces",
        path: "sales.baseAnnualVolumePieces",
        mandatory: true,
      },
      {
        field: "conversionRecoveryRsPerPiece",
        path: "sales.conversionRecoveryRsPerPiece",
        mandatory: true,
      },
      {
        field: "productWeightGrams",
        path: "sales.productWeightGrams",
        mandatory: true,
      },
    ],
    pricing: [
      { field: "resinRsPerKg", path: "costing.resinRsPerKg", mandatory: true },
      {
        field: "freightOutRsPerKg",
        path: "costing.freightOutRsPerKg",
        mandatory: true,
      },
      { field: "mbRsPerKg", path: "costing.mbRsPerKg", mandatory: true },
      {
        field: "packagingRsPerKg",
        path: "costing.packagingRsPerKg",
        mandatory: true,
      },
    ],
    npd: [
      { field: "cavities", path: "npd.cavities", mandatory: true },
      {
        field: "cycleTimeSeconds",
        path: "npd.cycleTimeSeconds",
        mandatory: true,
      },
      {
        field: "productWeightGrams",
        path: "sales.productWeightGrams",
        mandatory: true,
      },
      { field: "plant", path: "plantMaster.plant", mandatory: true },
    ],
    ops: [
      {
        field: "newMachineRequired",
        path: "ops.newMachineRequired",
        mandatory: true,
      },
      {
        field: "newMouldRequired",
        path: "ops.newMouldRequired",
        mandatory: true,
      },
      { field: "machineName", path: "npd.machineName", mandatory: true },
      {
        field: "costOfNewMachine",
        path: "ops.costOfNewMachine",
        mandatory: true,
      },
      {
        field: "costOfOldMachine",
        path: "ops.costOfOldMachine",
        mandatory: true,
      },
      { field: "costOfNewMould", path: "ops.costOfNewMould", mandatory: true },
      { field: "costOfOldMould", path: "ops.costOfOldMould", mandatory: true },
      { field: "costOfNewInfra", path: "ops.costOfNewInfra", mandatory: true },
      { field: "costOfOldInfra", path: "ops.costOfOldInfra", mandatory: true },
    ],
    finance: [
      {
        field: "corporateTaxRatePct",
        path: "finance.corporateTaxRatePct",
        mandatory: true,
      },
      {
        field: "debtPct",
        path: "finance.debtPct",
        mandatory: true,
      },
      {
        field: "costOfDebtPct",
        path: "finance.costOfDebtPct",
        mandatory: true,
      },
      {
        field: "costOfEquityPct",
        path: "finance.costOfEquityPct",
        mandatory: true,
      },
      {
        field: "annualVolumeGrowthPct",
        path: "finance.annualVolumeGrowthPct",
        mandatory: false,
      },
    ],
  };

  const config = fieldConfigs[team as keyof typeof fieldConfigs];
  if (!config) return { percentage: 0, filledFields: 0, totalFields: 0 };

  let completedFields = 0;
  let totalFields = 0;

  config.forEach(({ path, mandatory, prefilled }) => {
    // For finance team, count all fields regardless of mandatory status
    // For other teams, only count mandatory or prefilled fields
    if (team === "finance" || mandatory || prefilled) {
      totalFields++;
      let value: any;
      if (path === "name") {
        value = sku.name;
      } else if (path.startsWith("sales.")) {
        const key = path.split(".")[1] as keyof typeof sku.sales;
        value = sku.sales[key];
      } else if (path.startsWith("npd.")) {
        const key = path.split(".")[1] as keyof typeof sku.npd;
        value = sku.npd[key];
      } else if (path.startsWith("ops.")) {
        const key = path.split(".")[1] as keyof typeof sku.ops;
        value = sku.ops[key];
      } else if (path.startsWith("costing.")) {
        const key = path.split(".")[1] as keyof typeof sku.costing;
        value = sku.costing[key];
      } else if (path.startsWith("plantMaster.")) {
        const key = path.split(".")[1] as keyof typeof sku.plantMaster;
        value = sku.plantMaster[key];
      } else if (path.startsWith("finance.")) {
        // For finance fields, we need to access scenario.finance
        if (!scenario) return;
        const key = path.split(".")[1] as keyof typeof scenario.finance;
        value = scenario.finance[key];
      }

      if (
        prefilled ||
        (value !== undefined && value !== null && value !== "")
      ) {
        completedFields++;
      }
    }
  });

  return {
    percentage: totalFields > 0 ? (completedFields / totalFields) * 100 : 100,
    filledFields: completedFields,
    totalFields: totalFields,
  };
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
  const [isSaving, setIsSaving] = useState(false);

  // State for collapsible P&L sections
  const [pnlPerKgCollapsed, setPnlPerKgCollapsed] = useState(false);
  const [pnlAggregatedCollapsed, setPnlAggregatedCollapsed] = useState(false);
  const [freeCashFlowCollapsed, setFreeCashFlowCollapsed] = useState(false);

  const handleSaveWithScenario = useCallback(
    async (scenarioToSave: Scenario) => {
      setIsSaving(true);

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
      } finally {
        setIsSaving(false);
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
      ops: { ...base.ops },
      costing: { ...base.costing },
      altConversion: { ...base.altConversion },
      plantMaster: { ...base.plantMaster },
    };

    // Update local state first
    setScenario((prev) => ({ ...prev, skus: [...prev.skus, next] }));
    setActiveSkuId(id);

    // Auto-save to Firestore
    try {
      await handleSaveWithScenario(scenario);
    } catch (error) {
      console.error("Failed to auto-save after SKU addition:", error);
      // Revert the addition if save fails
      setScenario((prev) => ({
        ...prev,
        skus: prev.skus.filter((s) => s.id !== id),
      }));
      setActiveSkuId(activeSkuId);
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

    // Update local state first
    setScenario((prev) => {
      const filtered = prev.skus.filter((s) => s.id !== activeSkuId);
      const nextActive = filtered[0]?.id || "";
      setActiveSkuId(nextActive);
      return { ...prev, skus: filtered };
    });

    // Auto-save to Firestore
    try {
      await handleSaveWithScenario(scenario);
    } catch (error) {
      console.error("Failed to auto-save after SKU deletion:", error);
      // Revert the deletion if save fails
      setScenario((prev) => ({
        ...prev,
        skus: [...prev.skus, sku],
      }));
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

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", md: "1fr", lg: "6fr 6fr" },
          alignItems: "start",
          minHeight: 0, // Allow grid to shrink
          width: "100%", // Ensure full width
          overflow: "hidden", // Prevent any overflow
        }}
      >
        {/* Left column - Team cards */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {/* Finance Team Card */}
          <FinanceTeamCard
            scenario={scenario}
            updateFinanceDetails={updateFinanceDetails}
            triggerAutoSave={triggerAutoSave}
            progress={
              calculateCardProgress(sku, "finance", scenario).percentage
            }
            filledFields={
              calculateCardProgress(sku, "finance", scenario).filledFields
            }
            totalFields={
              calculateCardProgress(sku, "finance", scenario).totalFields
            }
          />

          {/* Modern SKU Management Section */}
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
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    color="text.primary"
                  >
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

                  {/* Team Input Cards */}
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                  >
                    <SalesTeamCard
                      sku={sku}
                      updateSku={updateSku}
                      triggerAutoSave={triggerAutoSave}
                      progress={calculateCardProgress(sku, "sales").percentage}
                      filledFields={
                        calculateCardProgress(sku, "sales").filledFields
                      }
                      totalFields={
                        calculateCardProgress(sku, "sales").totalFields
                      }
                    />

                    <PricingTeamCard
                      sku={sku}
                      updateSku={updateSku}
                      triggerAutoSave={triggerAutoSave}
                      progress={
                        calculateCardProgress(sku, "pricing").percentage
                      }
                      filledFields={
                        calculateCardProgress(sku, "pricing").filledFields
                      }
                      totalFields={
                        calculateCardProgress(sku, "pricing").totalFields
                      }
                    />

                    <NpdTeamCard
                      sku={sku}
                      plantOptions={plantOptions}
                      updateSku={updateSku}
                      triggerAutoSave={triggerAutoSave}
                      progress={calculateCardProgress(sku, "npd").percentage}
                      filledFields={
                        calculateCardProgress(sku, "npd").filledFields
                      }
                      totalFields={
                        calculateCardProgress(sku, "npd").totalFields
                      }
                    />

                    <OpsTeamCard
                      sku={sku}
                      updateSku={updateSku}
                      triggerAutoSave={triggerAutoSave}
                      progress={calculateCardProgress(sku, "ops").percentage}
                      filledFields={
                        calculateCardProgress(sku, "ops").filledFields
                      }
                      totalFields={
                        calculateCardProgress(sku, "ops").totalFields
                      }
                    />
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Right column - P&L and Cashflow tables in scroll */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "calc(100vh - 100px)",
            minWidth: 0, // Allow flex item to shrink below content size
            flexShrink: 0, // Prevent shrinking
            maxWidth: "100%", // Ensure it doesn't exceed container width
            overflow: "hidden", // Prevent any overflow
          }}
        >
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden", // Prevent horizontal scroll
              display: "flex",
              flexDirection: "column",
              gap: 3, // Increased gap for better spacing
              pr: 1,
              pb: 3,
              minHeight: 0, // Allow flex item to shrink
            }}
          >
            {/* P&L per kg - Collapsible */}
            <Card variant="outlined" sx={{ flexShrink: 0 }}>
              <CardHeader
                title={
                  <Typography variant="h6">P&L per kg (Y1..Y5)</Typography>
                }
                action={
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      setPnlPerKgCollapsed(!pnlPerKgCollapsed);
                    }}
                  >
                    {pnlPerKgCollapsed ? <ExpandMore /> : <ExpandLess />}
                  </IconButton>
                }
                onClick={() => setPnlPerKgCollapsed(!pnlPerKgCollapsed)}
                sx={{ cursor: "pointer" }}
              />
              <Collapse in={!pnlPerKgCollapsed} timeout="auto" unmountOnExit>
                <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                  <PnlPerKg calc={calc} pnlAggregated={pnlAggregated} />
                </CardContent>
              </Collapse>
            </Card>

            {/* P&L Aggregated - Collapsible */}
            <Card variant="outlined" sx={{ flexShrink: 0 }}>
              <CardHeader
                title={
                  <Typography variant="h6">P&L Aggregated (Cr)</Typography>
                }
                action={
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      setPnlAggregatedCollapsed(!pnlAggregatedCollapsed);
                    }}
                  >
                    {pnlAggregatedCollapsed ? <ExpandMore /> : <ExpandLess />}
                  </IconButton>
                }
                onClick={() =>
                  setPnlAggregatedCollapsed(!pnlAggregatedCollapsed)
                }
                sx={{ cursor: "pointer" }}
              />
              <Collapse
                in={!pnlAggregatedCollapsed}
                timeout="auto"
                unmountOnExit
              >
                <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                  <PnlAggregated pnlAggregated={pnlAggregated} />
                </CardContent>
              </Collapse>
            </Card>

            {/* Free Cash Flow - Collapsible */}
            <Card variant="outlined" sx={{ flexShrink: 0 }}>
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
              <Collapse
                in={!freeCashFlowCollapsed}
                timeout="auto"
                unmountOnExit
              >
                <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                  <FreeCashFlow cashflow={calc.cashflow} pnl={calc.pnl} />
                </CardContent>
              </Collapse>
            </Card>
          </Box>
        </Box>
      </Box>

      {/* Case Metrics Charts - COMMENTED OUT */}
      {/* <Section title="📈 Case Performance Charts" className="mt-6">
        <CaseMetricsCharts calcOutput={calc} />
      </Section> */}
    </Box>
  );
}
