"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { calculateScenario } from "@/lib/calc";
import { BusinessCase as Scenario, PlantMaster, Sku } from "@/lib/types";
import { nanoid } from "nanoid";
// import CaseMetricsCharts from "@/components/CaseMetricsCharts";
import { Section } from "./common";
import FinanceEditor from "./FinanceEditor";
import SkuEditor from "./SkuEditor";
import PnlAggregated from "./PnlAggregated";
import PnlPerKg from "./PnlPerKg";
import { CalculationEngine } from "@/lib/calc/engines";
import { formatCrores, formatPct } from "@/lib/utils";
import RiskSensitivity from "./RiskSensitivity";
import RiskScenarios from "./RiskScenarios";

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
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
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
      console.log(`Initial finance values:`, {
        original: originalFinance,
        debtPct: originalFinance.debtPct,
        costOfDebtPct: originalFinance.costOfDebtPct,
        corporateTaxRatePct: originalFinance.corporateTaxRatePct,
      });
      updatedScenario.finance = {
        includeCorpSGA: originalFinance.includeCorpSGA ?? true,
        debtPct: originalFinance.debtPct ?? 0,
        costOfDebtPct: originalFinance.costOfDebtPct ?? 0,
        costOfEquityPct: originalFinance.costOfEquityPct ?? 0,
        corporateTaxRatePct: originalFinance.corporateTaxRatePct ?? 0.25, // Default to 25%
      };
      console.log(`Updated finance values:`, {
        updated: updatedScenario.finance,
        debtPct: updatedScenario.finance.debtPct,
        costOfDebtPct: updatedScenario.finance.costOfDebtPct,
        corporateTaxRatePct: updatedScenario.finance.corporateTaxRatePct,
      });
      // Check if any defaults were applied
      if (
        originalFinance.corporateTaxRatePct === undefined ||
        originalFinance.corporateTaxRatePct === null ||
        originalFinance.corporateTaxRatePct === 0
      ) {
        needsSave = true;
      }
    }

    // Set default working capital days for SKUs if not already set
    if (updatedScenario.skus) {
      updatedScenario.skus = updatedScenario.skus.map((sku) => {
        if (
          sku.capex &&
          (sku.capex.workingCapitalDays === undefined ||
            sku.capex.workingCapitalDays === null ||
            sku.capex.workingCapitalDays === 0)
        ) {
          needsSave = true;
          return {
            ...sku,
            capex: {
              ...sku.capex,
              workingCapitalDays: 60,
            },
          };
        }
        return sku;
      });
    }

    setScenario(updatedScenario);

    // If defaults were applied, save to database
    if (needsSave) {
      setTimeout(() => {
        handleSaveWithScenario(updatedScenario);
      }, 1000);
    }
  }, [initial]);

  // Clear save message after 3 seconds
  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

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
      capex: { ...base.capex },
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
    setSaveMessage(null);

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
        setSaveMessage({ type: "success", text: "Case saved successfully!" });
      } else {
        throw new Error("Save failed");
      }
    } catch (error) {
      console.error("Save error:", error);
      setSaveMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save case",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave() {
    // Call the new function with current scenario state
    await handleSaveWithScenario(scenario);
  }

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

      {saveMessage && (
        <div
          className={`p-3 rounded-lg ${
            saveMessage.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-4">
          {/* Finance Inputs */}
          <Section title="💰 Finance Inputs">
            <FinanceEditor
              scenario={scenario}
              onUpdate={setScenario}
              onAutoSave={triggerAutoSave}
            />
          </Section>

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

          {/* SKU Editor */}
          <Section title="SKU Details">
            <SkuEditor
              sku={sku}
              plantOptions={plantOptions}
              onUpdate={updateSku}
              onAutoSave={triggerAutoSave}
            />
          </Section>
        </div>

        {/* Right column - Aggregated metrics */}
        <div className="xl:col-span-2 space-y-4">
          <Section title="Key Aggregated Metrics">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <div className="text-xs text-slate-600 mb-1">Revenue (Y1)</div>
                <div className="text-lg font-semibold text-slate-900">
                  {formatCrores(calc.pnl[0]?.revenueNet || 0)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <div className="text-xs text-slate-600 mb-1">EBITDA (Y1)</div>
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

          {/* Weighted-average price per kg across SKUs */}
          <Section title="P&L per kg (Y1..Y5)">
            <PnlPerKg calc={calc} pnlAggregated={pnlAggregated} />
          </Section>

          {/* P&L (Aggregated) */}
          <Section title="P&L (Aggregated)">
            <PnlAggregated pnlAggregated={pnlAggregated} />
          </Section>

          {/* Risk - Sensitivity */}
          <Section title="Risk">
            <RiskSensitivity scenario={scenario} />
            <div className="h-4" />
            <RiskScenarios scenario={scenario} />
          </Section>
        </div>
      </div>

      {/* Case Metrics Charts - COMMENTED OUT */}
      {/* <Section title="📈 Case Performance Charts" className="mt-6">
        <CaseMetricsCharts calcOutput={calc} />
      </Section> */}
    </div>
  );
}
