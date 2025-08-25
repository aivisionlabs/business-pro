"use client";
import { calculateScenario } from "@/lib/calc";
import { CalculationEngine } from "@/lib/calc/engines";
import { PlantMaster, BusinessCase as Scenario, Sku } from "@/lib/types";
import { nanoid } from "nanoid";
import React, { useCallback, useEffect, useMemo, useState } from "react";
// import CaseMetricsCharts from "@/components/CaseMetricsCharts";
import { Section, LabeledInput } from "./common";
import FreeCashFlow from "./FreeCashFlow";
import PnlAggregated from "./PnlAggregated";
import PnlPerKg from "./PnlPerKg";

import { formatCrores, formatPct } from "@/lib/utils";
import RiskScenarios from "./RiskScenarios";
import RiskSensitivity from "./RiskSensitivity";
import {
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

  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    const timer = setTimeout(() => {
      onSave(scenario);
    }, delay);
    setAutoSaveTimer(timer);
  }, [scenario, onSave, delay, autoSaveTimer]);

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
  team: string
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
  };

  const config = fieldConfigs[team as keyof typeof fieldConfigs];
  if (!config) return { percentage: 0, filledFields: 0, totalFields: 0 };

  let completedFields = 0;
  let totalFields = 0;

  config.forEach(({ path, mandatory, prefilled }) => {
    if (mandatory || prefilled) {
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
        return; // Skip for now, will handle separately
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
  const [isSaving, setIsSaving] = useState(false);

  // State for collapsible P&L sections
  const [pnlPerKgCollapsed, setPnlPerKgCollapsed] = useState(false);
  const [pnlAggregatedCollapsed, setPnlAggregatedCollapsed] = useState(false);
  const [freeCashFlowCollapsed, setFreeCashFlowCollapsed] = useState(false);

  const { triggerAutoSave, autoSaveTimer } = useAutoSave(
    scenario,
    handleSaveWithScenario
  );

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
        debtPct: originalFinance.debtPct ?? 0,
        costOfDebtPct: originalFinance.costOfDebtPct ?? 0,
        costOfEquityPct: originalFinance.costOfEquityPct ?? 0,
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

    setScenario(updatedScenario);

    // If defaults were applied, save to database
    if (needsSave) {
      setTimeout(() => {
        handleSaveWithScenario(updatedScenario);
      }, 1000);
    }
  }, [initial]);

  const calc = useMemo(() => calculateScenario(scenario), [scenario]);

  function updateSku(updater: (s: Sku) => Sku) {
    setScenario((prev) => {
      const copy = { ...prev, skus: prev.skus.map((x) => ({ ...x })) };
      copy.skus[activeSkuIndex] = updater(copy.skus[activeSkuIndex]);
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

  async function handleSaveWithScenario(scenarioToSave: Scenario) {
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
  }

  async function handleSave() {
    // Call the new function with current scenario state
    await handleSaveWithScenario(scenario);
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

  // State for Finance card collapse
  const [isFinanceCollapsed, setIsFinanceCollapsed] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-900">
            {scenario.name}
          </div>
          <div className="text-xs text-slate-500">Case ID: {scenario.id}</div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || !!autoSaveTimer}
          className={`px-4 py-2 rounded-lg text-white shadow transition-colors ${
            isSaving || autoSaveTimer
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isSaving ? "Saving..." : autoSaveTimer ? "Auto-saving..." : "Save"}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left column - Team cards */}
        <div className="xl:col-span-3 space-y-4">
          {/* Finance Team Card - Fixed at top */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  Finance
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                    Finance
                  </span>
                  <button
                    onClick={() => setIsFinanceCollapsed(!isFinanceCollapsed)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {isFinanceCollapsed ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            {!isFinanceCollapsed && (
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LabeledInput
                    label="Tax Rate (%)"
                    type="number"
                    step={0.01}
                    value={(scenario.finance.corporateTaxRatePct || 0.25) * 100}
                    onChange={(v) =>
                      setScenario((s) => ({
                        ...s,
                        finance: {
                          ...s.finance,
                          corporateTaxRatePct: Number(v) / 100,
                        },
                      }))
                    }
                    onAutoSave={triggerAutoSave}
                  />
                  <LabeledInput
                    label="Debt Percentage (%)"
                    type="number"
                    step={0.01}
                    value={(scenario.finance.debtPct || 1) * 100}
                    onChange={(v) =>
                      setScenario((s) => ({
                        ...s,
                        finance: { ...s.finance, debtPct: Number(v) / 100 },
                      }))
                    }
                    onAutoSave={triggerAutoSave}
                  />
                  <LabeledInput
                    label="Cost of Debt (%)"
                    type="number"
                    step={0.01}
                    value={(scenario.finance.costOfDebtPct || 0.087) * 100}
                    onChange={(v) =>
                      setScenario((s) => ({
                        ...s,
                        finance: {
                          ...s.finance,
                          costOfDebtPct: Number(v) / 100,
                        },
                      }))
                    }
                    onAutoSave={triggerAutoSave}
                  />
                  <LabeledInput
                    label="Cost of Equity (%)"
                    type="number"
                    step={0.01}
                    value={(scenario.finance.costOfEquityPct || 0.18) * 100}
                    onChange={(v) =>
                      setScenario((s) => ({
                        ...s,
                        finance: {
                          ...s.finance,
                          costOfEquityPct: Number(v) / 100,
                        },
                      }))
                    }
                    onAutoSave={triggerAutoSave}
                  />
                  <LabeledInput
                    label="Annual Volume Growth (%)"
                    type="number"
                    step={0.01}
                    value={(scenario.finance.annualVolumeGrowthPct || 0) * 100}
                    onChange={(v) =>
                      setScenario((s) => ({
                        ...s,
                        finance: {
                          ...s.finance,
                          annualVolumeGrowthPct: Number(v) / 100,
                        },
                      }))
                    }
                    onAutoSave={triggerAutoSave}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SKU Tabs */}
          <Section title="SKUs">
            <div className="flex flex-wrap gap-2 items-center">
              {scenario.skus.map((s) => (
                <button
                  key={`${s.id}-${s.name}`}
                  onClick={() => setActiveSkuId(s.id)}
                  className={`px-3 py-1.5 rounded-md border text-sm ${
                    s.id === activeSkuId
                      ? "border-blue-600 text-blue-700 bg-blue-50"
                      : "border-slate-300 text-slate-700 bg-white"
                  }`}
                >
                  {s.name}
                </button>
              ))}
              <button
                onClick={addSku}
                className="px-3 py-1.5 rounded-md border border-dashed border-slate-400 text-slate-700"
              >
                + Add SKU
              </button>
              <button
                onClick={deleteActiveSku}
                className="px-3 py-1.5 rounded-md border border-red-300 text-red-700 bg-red-50 ml-auto"
              >
                Delete Active SKU
              </button>
            </div>
          </Section>

          {/* Team-Based Cards */}
          <div className="space-y-4">
            {/* Sales Team Card */}
            <SalesTeamCard
              sku={sku}
              updateSku={updateSku}
              triggerAutoSave={triggerAutoSave}
              progress={calculateCardProgress(sku, "sales").percentage}
              filledFields={calculateCardProgress(sku, "sales").filledFields}
              totalFields={calculateCardProgress(sku, "sales").totalFields}
            />

            {/* Pricing Team Card */}
            <PricingTeamCard
              sku={sku}
              updateSku={updateSku}
              triggerAutoSave={triggerAutoSave}
              progress={calculateCardProgress(sku, "pricing").percentage}
              filledFields={calculateCardProgress(sku, "pricing").filledFields}
              totalFields={calculateCardProgress(sku, "pricing").totalFields}
            />

            {/* NPD Team Card */}
            <NpdTeamCard
              sku={sku}
              plantOptions={plantOptions}
              updateSku={updateSku}
              triggerAutoSave={triggerAutoSave}
              progress={calculateCardProgress(sku, "npd").percentage}
              filledFields={calculateCardProgress(sku, "npd").filledFields}
              totalFields={calculateCardProgress(sku, "npd").totalFields}
            />

            {/* Ops Team Card */}
            <OpsTeamCard
              sku={sku}
              updateSku={updateSku}
              triggerAutoSave={triggerAutoSave}
              progress={calculateCardProgress(sku, "ops").percentage}
              filledFields={calculateCardProgress(sku, "ops").filledFields}
              totalFields={calculateCardProgress(sku, "ops").totalFields}
            />
          </div>
        </div>

        {/* Right column - Aggregated metrics with independent scroll */}
        <div className="xl:col-span-2 flex flex-col h-[calc(100vh-100px)]">
          {/* Sticky Key Metrics - Always visible at top */}
          <div className="flex-shrink-0 mb-4">
            <div className="sticky top-4 z-10 bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
              <Section title="Key Aggregated Metrics">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <div className="text-xs text-slate-600 mb-1">
                      Revenue (Y1)
                    </div>
                    <div className="text-lg font-semibold text-slate-900">
                      {formatCrores(calc.pnl[0]?.revenueNet || 0)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <div className="text-xs text-slate-600 mb-1">
                      EBITDA (Y1)
                    </div>
                    <div className="text-lg font-semibold text-slate-900">
                      {formatCrores(calc.pnl[0]?.ebitda || 0)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <div className="text-xs text-slate-600 mb-1">NPV</div>
                    <div className="text-lg font-semibold text-slate-900">
                      {formatCrores(calc.returns.npv)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <div className="text-xs text-slate-600 mb-1">IRR</div>
                    <div className="text-lg font-semibold text-slate-900">
                      {calc.returns.irr === null
                        ? "—"
                        : formatPct(calc.returns.irr)}
                    </div>
                  </div>
                </div>
              </Section>
            </div>
          </div>

          {/* Scrollable container for all P&L and Cashflow tables */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-6 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
            {/* P&L per kg - Collapsible */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    P&L per kg (Y1..Y5)
                  </h3>
                  <button
                    onClick={() => setPnlPerKgCollapsed(!pnlPerKgCollapsed)}
                    className="text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {pnlPerKgCollapsed ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {!pnlPerKgCollapsed && (
                <div className="p-4">
                  <PnlPerKg calc={calc} pnlAggregated={pnlAggregated} />
                </div>
              )}
            </div>

            {/* P&L Aggregated - Collapsible */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    P&L (Aggregated) (in Crore)
                  </h3>
                  <button
                    onClick={() =>
                      setPnlAggregatedCollapsed(!pnlAggregatedCollapsed)
                    }
                    className="text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {pnlAggregatedCollapsed ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {!pnlAggregatedCollapsed && (
                <div className="p-4">
                  <PnlAggregated pnlAggregated={pnlAggregated} />
                </div>
              )}
            </div>

            {/* Free Cash Flow - Collapsible */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Free Cash Flow Analysis
                  </h3>
                  <button
                    onClick={() =>
                      setFreeCashFlowCollapsed(!freeCashFlowCollapsed)
                    }
                    className="text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {freeCashFlowCollapsed ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {!freeCashFlowCollapsed && (
                <div className="p-4">
                  <FreeCashFlow cashflow={calc.cashflow} pnl={calc.pnl} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Risk Analysis - Full Page Width */}
      <div className="mt-8 space-y-6">
        <RiskSensitivity scenario={scenario} />
        <RiskScenarios scenario={scenario} />
      </div>

      {/* Case Metrics Charts - COMMENTED OUT */}
      {/* <Section title="📈 Case Performance Charts" className="mt-6">
        <CaseMetricsCharts calcOutput={calc} />
      </Section> */}
    </div>
  );
}
