"use client";
import React, { useEffect, useMemo, useState } from "react";
import { calculateScenario } from "@/lib/calc";
import { BusinessCase as Scenario, PlantMaster, Sku } from "@/lib/types";
import { nanoid } from "nanoid";
import CaseMetricsCharts from "@/components/CaseMetricsCharts";

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm ${
        className || ""
      }`}
    >
      <div className="text-base font-semibold text-slate-900 mb-3">{title}</div>
      {children}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  step,
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (v: string | number) => void;
  type?: string;
  step?: number;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-slate-700">{label}</span>
      <input
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
        value={typeof value === "number" ? String(value) : value}
        onChange={(e) =>
          onChange(type === "number" ? Number(e.target.value) : e.target.value)
        }
        type={type}
        step={step}
        placeholder={placeholder}
      />
    </label>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-slate-700">{label}</span>
      <select
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatCrores(n: number): string {
  const crores = n / 10000000; // Convert to crores
  return `₹${crores.toFixed(2).replace(/\.?0+$/, "")} Cr`;
}

function formatPerKg(n: number): string {
  // For per-kg values, show in rupees per kg with appropriate precision
  if (n >= 1000) {
    return `₹${(n / 1000).toFixed(2).replace(/\.?0+$/, "")}K/kg`;
  } else if (n >= 1) {
    return `₹${n.toFixed(2).replace(/\.?0+$/, "")}/kg`;
  } else {
    return `₹${(n * 1000).toFixed(0)}/g`;
  }
}

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
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
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const activeSkuIndex = Math.max(
    0,
    scenario.skus.findIndex((s) => s.id === activeSkuId)
  );
  const sku = scenario.skus[activeSkuIndex];

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
          console.log(
            `Setting default working capital days for SKU ${sku.name}: 60 days`
          );
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

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  const calc = useMemo(() => calculateScenario(scenario), [scenario]);

  // Weighted-average per-kg helper across SKUs using Y1..Y5 volumes as weights
  function waPerKg(
    yearIndex: number,
    key: keyof (typeof calc.prices)[number]["perKg"]
  ) {
    const bySku = calc.bySku || [];
    let num = 0;
    let den = 0;
    for (const s of bySku) {
      const vkg = s.volumes[yearIndex]?.weightKg || 0;
      const val = s.prices[yearIndex]?.perKg[
        key as keyof (typeof s.prices)[number]["perKg"]
      ] as number | undefined;
      if (vkg > 0 && typeof val === "number") {
        num += val * vkg;
        den += vkg;
      }
    }
    return den > 0 ? num / den : 0;
  }

  // Weighted-average revenue per kg helper across SKUs
  function waRevenuePerKg(yearIndex: number) {
    const bySku = calc.bySku || [];
    let num = 0;
    let den = 0;
    for (const s of bySku) {
      const vkg = s.volumes[yearIndex]?.weightKg || 0;
      if (vkg > 0) {
        // Sum of cost components: rmPerKg + mbPerKg + packagingPerKg + freightOutPerKg + conversionPerKg
        const rmPerKg = s.prices[yearIndex]?.perKg.rmPerKg || 0;
        const mbPerKg = s.prices[yearIndex]?.perKg.mbPerKg || 0;
        const packagingPerKg = s.prices[yearIndex]?.perKg.packagingPerKg || 0;
        const freightOutPerKg = s.prices[yearIndex]?.perKg.freightOutPerKg || 0;
        const conversionPerKg = s.prices[yearIndex]?.perKg.conversionPerKg || 0;

        const revenuePerKg =
          rmPerKg +
          mbPerKg +
          packagingPerKg +
          freightOutPerKg +
          conversionPerKg;

        num += revenuePerKg * vkg;
        den += vkg;
      }
    }
    return den > 0 ? num / den : 0;
  }

  // Calculate total depreciation per SKU
  function calculateTotalDepreciation(sku: Sku): number {
    const machineDepreciation =
      (sku.ops.costOfNewMachine || 0) + (sku.ops.costOfOldMachine || 0);
    const mouldDepreciation =
      (sku.ops.costOfNewMould || 0) + (sku.ops.costOfOldMould || 0);
    const infraDepreciation =
      (sku.ops.costOfNewInfra || 0) + (sku.ops.costOfOldInfra || 0);

    const machineDepreciationPerYear =
      machineDepreciation / (sku.ops.lifeOfNewMachineYears || 15);
    const mouldDepreciationPerYear =
      mouldDepreciation / (sku.ops.lifeOfNewMouldYears || 15);
    const infraDepreciationPerYear =
      infraDepreciation / (sku.ops.lifeOfNewInfraYears || 30);

    return (
      machineDepreciationPerYear +
      mouldDepreciationPerYear +
      infraDepreciationPerYear
    );
  }

  function updateSku(updater: (s: Sku) => Sku) {
    setScenario((prev) => {
      const copy = { ...prev, skus: prev.skus.map((x) => ({ ...x })) };
      copy.skus[activeSkuIndex] = updater(copy.skus[activeSkuIndex]);

      // Debug: Log the updated sales data
      console.log(
        "updateSku - Updated sales data:",
        copy.skus[activeSkuIndex].sales
      );
      console.log("updateSku - Full scenario state:", copy);

      return copy;
    });

    // Debounced auto-save
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    const timer = setTimeout(() => {
      console.log("Auto-save timer triggered, calling handleSave");
      // Use functional approach to get latest state
      setScenario((latestScenario) => {
        handleSaveWithScenario(latestScenario);
        return latestScenario; // Return unchanged state
      });
    }, 2000); // Auto-save after 2 seconds of inactivity
    setAutoSaveTimer(timer);
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
      // Debug: Log the data being sent
      console.log(
        "handleSaveWithScenario - Data being sent to API:",
        scenarioToSave
      );
      console.log(
        "handleSaveWithScenario - Sales data in first SKU:",
        scenarioToSave.skus[0]?.sales
      );

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

  function updateFinance(
    updater: (f: typeof scenario.finance) => typeof scenario.finance
  ) {
    setScenario((prev) => ({
      ...prev,
      finance: updater(prev.finance),
    }));

    // Debounced auto-save for finance changes
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    const timer = setTimeout(() => {
      // Use functional approach to get latest state
      setScenario((latestScenario) => {
        handleSaveWithScenario(latestScenario);
        return latestScenario; // Return unchanged state
      });
    }, 2000);
    setAutoSaveTimer(timer);
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
            {/* Debug display of current finance values */}
            <div className="mb-4 p-3 bg-gray-100 rounded text-xs">
              <div className="font-medium">Debug - Current Finance Values:</div>
              <div>
                Debt %: {scenario.finance.debtPct} (
                {scenario.finance.debtPct * 100}%)
              </div>
              <div>
                Cost of Debt %: {scenario.finance.costOfDebtPct} (
                {scenario.finance.costOfDebtPct * 100}%)
              </div>
              <div>
                Tax Rate %: {scenario.finance.corporateTaxRatePct} (
                {scenario.finance.corporateTaxRatePct * 100}%)
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LabeledInput
                label="Tax Rate (%)"
                type="number"
                step={0.1}
                value={scenario.finance.corporateTaxRatePct * 100}
                onChange={(v) => {
                  const newTaxRate = Number(v) / 100;
                  setScenario((s) => ({
                    ...s,
                    finance: {
                      ...s.finance,
                      corporateTaxRatePct: newTaxRate,
                    },
                  }));

                  // Trigger auto-save for finance inputs
                  if (autoSaveTimer) {
                    clearTimeout(autoSaveTimer);
                  }
                  const timer = setTimeout(() => {
                    setScenario((latestScenario) => {
                      handleSaveWithScenario(latestScenario);
                      return latestScenario;
                    });
                  }, 2000);
                  setAutoSaveTimer(timer);
                }}
              />
              <LabeledInput
                label="Debt Percentage (%)"
                type="number"
                step={0.1}
                value={scenario.finance.debtPct * 100}
                onChange={(v) => {
                  const newDebtPct = Number(v) / 100;
                  console.log(`Debt Percentage input changed:`, {
                    inputValue: v,
                    calculatedDebtPct: newDebtPct,
                    oldDebtPct: scenario.finance.debtPct,
                  });
                  setScenario((s) => ({
                    ...s,
                    finance: {
                      ...s.finance,
                      debtPct: newDebtPct,
                    },
                  }));

                  // Trigger auto-save for finance inputs
                  if (autoSaveTimer) {
                    clearTimeout(autoSaveTimer);
                  }
                  const timer = setTimeout(() => {
                    setScenario((latestScenario) => {
                      console.log(
                        `Auto-saving with new debt percentage:`,
                        latestScenario.finance.debtPct
                      );
                      handleSaveWithScenario(latestScenario);
                      return latestScenario;
                    });
                  }, 2000);
                  setAutoSaveTimer(timer);
                }}
              />
              <LabeledInput
                label="Cost of Debt (%)"
                type="number"
                step={0.1}
                value={scenario.finance.costOfDebtPct * 100}
                onChange={(v) => {
                  const newCostOfDebt = Number(v) / 100;
                  console.log(`Cost of Debt input changed:`, {
                    inputValue: v,
                    calculatedCostOfDebt: newCostOfDebt,
                    oldCostOfDebt: scenario.finance.costOfDebtPct,
                  });
                  setScenario((s) => ({
                    ...s,
                    finance: {
                      ...s.finance,
                      costOfDebtPct: newCostOfDebt,
                    },
                  }));

                  // Trigger auto-save for finance inputs
                  if (autoSaveTimer) {
                    clearTimeout(autoSaveTimer);
                  }
                  const timer = setTimeout(() => {
                    setScenario((latestScenario) => {
                      console.log(
                        `Auto-saving with new cost of debt:`,
                        latestScenario.finance.costOfDebtPct
                      );
                      handleSaveWithScenario(latestScenario);
                      return latestScenario;
                    });
                  }, 2000);
                  setAutoSaveTimer(timer);
                }}
              />
              <LabeledInput
                label="Cost of Equity (%)"
                type="number"
                step={0.1}
                value={scenario.finance.costOfEquityPct * 100}
                onChange={(v) => {
                  const newCostOfEquity = Number(v) / 100;
                  setScenario((s) => ({
                    ...s,
                    finance: {
                      ...s.finance,
                      costOfEquityPct: newCostOfEquity,
                    },
                  }));

                  // Trigger auto-save for finance inputs
                  if (autoSaveTimer) {
                    clearTimeout(autoSaveTimer);
                  }
                  const timer = setTimeout(() => {
                    setScenario((latestScenario) => {
                      handleSaveWithScenario(latestScenario);
                      return latestScenario;
                    });
                  }, 2000);
                  setAutoSaveTimer(timer);
                }}
              />
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeCorpSGA"
                  checked={scenario.finance.includeCorpSGA}
                  onChange={(e) => {
                    setScenario((s) => ({
                      ...s,
                      finance: {
                        ...s.finance,
                        includeCorpSGA: e.target.checked,
                      },
                    }));

                    // Trigger auto-save for finance inputs
                    if (autoSaveTimer) {
                      clearTimeout(autoSaveTimer);
                    }
                    const timer = setTimeout(() => {
                      setScenario((latestScenario) => {
                        handleSaveWithScenario(latestScenario);
                        return latestScenario;
                      });
                    }, 2000);
                    setAutoSaveTimer(timer);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="includeCorpSGA"
                  className="text-sm text-slate-700"
                >
                  Include Corporate SGA
                </label>
              </div>
              <div className="text-sm text-slate-600">
                <div className="font-medium">Tax Formula:</div>
                <div className="font-mono text-xs">Tax = Tax Rate × PBT</div>
              </div>
            </div>
          </Section>

          {/* SKU Tabs */}
          <Section title="SKUs">
            <div className="flex flex-wrap gap-2 items-center">
              {scenario.skus.map((s) => (
                <button
                  key={s.id}
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

          {/* Sales Team */}
          <Section title="Sales Inputs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LabeledInput
                label="SKU Name"
                value={sku.name}
                onChange={(v) => updateSku((s) => ({ ...s, name: String(v) }))}
              />
              <LabeledInput
                label="Machine Name"
                value={sku.npd.machineName}
                onChange={(v) =>
                  updateSku((s) => ({
                    ...s,
                    npd: { ...s.npd, machineName: String(v) },
                  }))
                }
              />
              <LabeledInput
                label="Volume (pcs, Y1)"
                type="number"
                step={1}
                value={sku.sales.baseAnnualVolumePieces}
                onChange={(v) =>
                  updateSku((s) => ({
                    ...s,
                    sales: { ...s.sales, baseAnnualVolumePieces: Number(v) },
                  }))
                }
              />
              <LabeledInput
                label="Conversion Recovery (Rs/pc)"
                type="number"
                step={0.01}
                value={sku.sales.conversionRecoveryRsPerPiece || 0}
                onChange={(v) =>
                  updateSku((s) => ({
                    ...s,
                    sales: {
                      ...s.sales,
                      conversionRecoveryRsPerPiece: Number(v),
                    },
                  }))
                }
              />
              <LabeledInput
                label="Resin (Rs/kg)"
                type="number"
                step={0.01}
                value={sku.costing.resinRsPerKg}
                onChange={(v) =>
                  updateSku((s) => ({
                    ...s,
                    costing: { ...s.costing, resinRsPerKg: Number(v) },
                  }))
                }
              />
            </div>
          </Section>

          {/* NPD Team */}
          <Section title="NPD Inputs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LabeledInput
                label="Cavities"
                type="number"
                step={1}
                value={sku.npd.cavities}
                onChange={(v) =>
                  updateSku((s) => ({
                    ...s,
                    npd: { ...s.npd, cavities: Number(v) },
                  }))
                }
              />
              <LabeledInput
                label="Cycle Time (sec)"
                type="number"
                step={0.01}
                value={sku.npd.cycleTimeSeconds}
                onChange={(v) =>
                  updateSku((s) => ({
                    ...s,
                    npd: { ...s.npd, cycleTimeSeconds: Number(v) },
                  }))
                }
              />
              <LabeledInput
                label="Weight (grams)"
                type="number"
                step={0.01}
                value={sku.sales.productWeightGrams}
                onChange={(v) =>
                  updateSku((s) => ({
                    ...s,
                    sales: { ...s.sales, productWeightGrams: Number(v) },
                  }))
                }
              />
              <LabeledSelect
                label="Plant"
                value={sku.plantMaster.plant}
                onChange={(val) => {
                  const pm =
                    plantOptions.find((p) => p.plant === val) ||
                    plantOptions[0];
                  updateSku((s) => ({ ...s, plantMaster: pm }));
                }}
                options={plantOptions.map((p) => p.plant)}
              />
              <LabeledInput
                label="Mould Cost (Rs)"
                type="number"
                step={1}
                value={sku.npd.mouldCost || 0}
                onChange={(v) =>
                  updateSku((s) => ({
                    ...s,
                    npd: { ...s.npd, mouldCost: Number(v) },
                  }))
                }
              />
            </div>
          </Section>

          {/* Ops Team */}
          <Section title="Ops Inputs">
            <div className="space-y-6">
              {/* Boolean options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-300 hover:border-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    checked={sku.ops.newMachineRequired || false}
                    onChange={(e) =>
                      updateSku((s) => ({
                        ...s,
                        ops: {
                          ...s.ops,
                          newMachineRequired: e.target.checked,
                        },
                      }))
                    }
                  />
                  <span className="text-sm text-slate-700">
                    New Machine Required?
                  </span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-300 hover:border-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    checked={sku.ops.newMouldRequired || false}
                    onChange={(e) =>
                      updateSku((s) => ({
                        ...s,
                        ops: {
                          ...s.ops,
                          newMouldRequired: e.target.checked,
                        },
                      }))
                    }
                  />
                  <span className="text-sm text-slate-700">
                    New Mould Required?
                  </span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-300 hover:border-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    checked={sku.ops.newInfraRequired || false}
                    onChange={(e) =>
                      updateSku((s) => ({
                        ...s,
                        ops: {
                          ...s.ops,
                          newInfraRequired: e.target.checked,
                        },
                      }))
                    }
                  />
                  <span className="text-sm text-slate-700">
                    New Infra Required?
                  </span>
                </label>
              </div>

              {/* Machine costs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sku.ops.newMachineRequired ? (
                  <LabeledInput
                    label="Cost of New Machine (Rs)"
                    type="number"
                    step={1}
                    value={sku.ops.costOfNewMachine || 0}
                    onChange={(v) =>
                      updateSku((s) => ({
                        ...s,
                        ops: { ...s.ops, costOfNewMachine: Number(v) },
                      }))
                    }
                  />
                ) : (
                  <LabeledInput
                    label="Cost of Old Machine (Rs)"
                    type="number"
                    step={1}
                    value={sku.ops.costOfOldMachine || 0}
                    onChange={(v) =>
                      updateSku((s) => ({
                        ...s,
                        ops: { ...s.ops, costOfOldMachine: Number(v) },
                      }))
                    }
                  />
                )}
                <LabeledInput
                  label="Life of Machine (years)"
                  type="number"
                  step={1}
                  value={sku.ops.lifeOfNewMachineYears || 15}
                  onChange={(v) =>
                    updateSku((s) => ({
                      ...s,
                      ops: { ...s.ops, lifeOfNewMachineYears: Number(v) },
                    }))
                  }
                />
              </div>

              {/* Mould costs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sku.ops.newMouldRequired ? (
                  <LabeledInput
                    label="Cost of New Mould (Rs)"
                    type="number"
                    step={1}
                    value={sku.ops.costOfNewMould || 0}
                    onChange={(v) =>
                      updateSku((s) => ({
                        ...s,
                        ops: { ...s.ops, costOfNewMould: Number(v) },
                      }))
                    }
                  />
                ) : (
                  <LabeledInput
                    label="Cost of Old Mould (Rs)"
                    type="number"
                    step={1}
                    value={sku.ops.costOfOldMould || 0}
                    onChange={(v) =>
                      updateSku((s) => ({
                        ...s,
                        ops: { ...s.ops, costOfOldMould: Number(v) },
                      }))
                    }
                  />
                )}
                <LabeledInput
                  label="Life of Mould (years)"
                  type="number"
                  step={1}
                  value={sku.ops.lifeOfNewMouldYears || 15}
                  onChange={(v) =>
                    updateSku((s) => ({
                      ...s,
                      ops: { ...s.ops, lifeOfNewMouldYears: Number(v) },
                    }))
                  }
                />
              </div>

              {/* Infra costs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sku.ops.newInfraRequired ? (
                  <LabeledInput
                    label="Cost of New Infra (Rs)"
                    type="number"
                    step={1}
                    value={sku.ops.costOfNewInfra || 0}
                    onChange={(v) =>
                      updateSku((s) => ({
                        ...s,
                        ops: { ...s.ops, costOfNewInfra: Number(v) },
                      }))
                    }
                  />
                ) : (
                  <LabeledInput
                    label="Cost of Old Infra (Rs)"
                    type="number"
                    step={1}
                    value={sku.ops.costOfOldInfra || 0}
                    onChange={(v) =>
                      updateSku((s) => ({
                        ...s,
                        ops: { ...s.ops, costOfOldInfra: Number(v) },
                      }))
                    }
                  />
                )}
                <LabeledInput
                  label="Life of Infra (years)"
                  type="number"
                  step={1}
                  value={sku.ops.lifeOfNewInfraYears || 30}
                  onChange={(v) =>
                    updateSku((s) => ({
                      ...s,
                      ops: { ...s.ops, lifeOfNewInfraYears: Number(v) },
                    }))
                  }
                />
              </div>

              {/* Total Depreciation Display */}
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="text-sm text-blue-700 mb-2">
                  Total Depreciation per SKU (per year)
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  ₹
                  {calculateTotalDepreciation(sku).toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>
          </Section>

          {/* Pricing Team */}
          <Section title="Pricing Inputs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LabeledInput
                label="Freight (Rs/kg)"
                type="number"
                step={0.01}
                value={sku.costing.freightOutRsPerKg}
                onChange={(v) =>
                  updateSku((s) => ({
                    ...s,
                    costing: { ...s.costing, freightOutRsPerKg: Number(v) },
                  }))
                }
              />
              <LabeledInput
                label="MB Price (Rs/kg)"
                type="number"
                step={0.01}
                value={sku.costing.mbRsPerKg}
                onChange={(v) =>
                  updateSku((s) => ({
                    ...s,
                    costing: { ...s.costing, mbRsPerKg: Number(v) },
                  }))
                }
              />
              <LabeledInput
                label="Packaging (Rs/kg)"
                type="number"
                step={0.01}
                value={sku.costing.packagingRsPerKg}
                onChange={(v) =>
                  updateSku((s) => ({
                    ...s,
                    costing: { ...s.costing, packagingRsPerKg: Number(v) },
                  }))
                }
              />
              <LabeledInput
                label="RM Price (Rs/kg)"
                type="number"
                step={0.01}
                value={sku.costing.resinRsPerKg}
                onChange={(v) =>
                  updateSku((s) => ({
                    ...s,
                    costing: { ...s.costing, resinRsPerKg: Number(v) },
                  }))
                }
              />
            </div>
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

          {/* Weighted-average price per kg across SKUs - matching P&L structure */}
          <Section title="P&L per kg (Y1..Y5)">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-slate-900">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-700">
                    <th className="text-left p-2">Line Item</th>
                    {Array.from({ length: 5 }, (_, i) => i + 1).map((y) => (
                      <th key={y} className="text-right p-2">
                        Y{y}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const rows = [
                      [
                        "Revenue (net)",
                        (i: number) =>
                          calc.weightedAvgPricePerKg[i]?.revenueNetPerKg || 0,
                      ],
                      [
                        "Material cost",
                        (i: number) =>
                          calc.weightedAvgPricePerKg[i]?.materialCostPerKg || 0,
                      ],
                      [
                        "Material margin",
                        (i: number) =>
                          calc.weightedAvgPricePerKg[i]?.materialMarginPerKg ||
                          0,
                      ],
                      [
                        "Conversion cost",
                        (i: number) =>
                          calc.weightedAvgPricePerKg[i]?.conversionCostPerKg ||
                          0,
                      ],
                      [
                        "Gross margin",
                        (i: number) => {
                          const revenueNet =
                            calc.weightedAvgPricePerKg[i]?.revenueNetPerKg || 0;
                          const materialCost =
                            calc.weightedAvgPricePerKg[i]?.materialCostPerKg ||
                            0;
                          const conversionCost =
                            calc.weightedAvgPricePerKg[i]
                              ?.conversionCostPerKg || 0;
                          return revenueNet - materialCost - conversionCost;
                        },
                      ],
                      [
                        "SG&A cost",
                        (i: number) =>
                          calc.weightedAvgPricePerKg[i]?.sgaCostPerKg || 0,
                      ],
                      [
                        "EBITDA",
                        (i: number) =>
                          calc.weightedAvgPricePerKg[i]?.ebitdaPerKg || 0,
                      ],
                      [
                        "Depreciation",
                        (i: number) => {
                          // Calculate total depreciation amount across all SKUs for this year
                          const bySku = calc.bySku || [];
                          let totalDepreciationAmount = 0;
                          let totalWeight = 0;

                          for (const s of bySku) {
                            const vkg = s.volumes[i]?.weightKg || 0;
                            if (vkg > 0) {
                              // Find the corresponding SKU in scenario to get ops data
                              const sku = scenario.skus.find(
                                (sku) => sku.id === s.skuId
                              );
                              if (sku) {
                                const skuDepreciation =
                                  calculateTotalDepreciation(sku);
                                // Add the total depreciation amount (not multiplied by weight)
                                totalDepreciationAmount += skuDepreciation;
                                totalWeight += vkg;
                              }
                            }
                          }

                          // Depreciation per kg = Total depreciation amount / Total weight
                          return totalWeight > 0
                            ? totalDepreciationAmount / totalWeight
                            : 0;
                        },
                      ],
                      [
                        "EBIT",
                        (i: number) => {
                          const ebitda =
                            calc.weightedAvgPricePerKg[i]?.ebitdaPerKg || 0;
                          // Calculate total depreciation amount across all SKUs for this year
                          const bySku = calc.bySku || [];
                          let totalDepreciationAmount = 0;
                          let totalWeight = 0;

                          for (const s of bySku) {
                            const vkg = s.volumes[i]?.weightKg || 0;
                            if (vkg > 0) {
                              // Find the corresponding SKU in scenario to get ops data
                              const sku = scenario.skus.find(
                                (sku) => sku.id === s.skuId
                              );
                              if (sku) {
                                const skuDepreciation =
                                  calculateTotalDepreciation(sku);
                                // Add the total depreciation amount (not multiplied by weight)
                                totalDepreciationAmount += skuDepreciation;
                                totalWeight += vkg;
                              }
                            }
                          }

                          // Depreciation per kg = Total depreciation amount / Total weight
                          const depreciationPerKg =
                            totalWeight > 0
                              ? totalDepreciationAmount / totalWeight
                              : 0;

                          return ebitda - depreciationPerKg;
                        },
                      ],
                      [
                        "Interest",
                        (i: number) => {
                          // Calculate total investment across all SKUs for this year
                          const bySku = calc.bySku || [];
                          let totalWeight = 0;
                          let totalInvestment = 0;

                          for (const s of bySku) {
                            const vkg = s.volumes[i]?.weightKg || 0;
                            if (vkg > 0) {
                              // Find the corresponding SKU in scenario to get ops data
                              const sku = scenario.skus.find(
                                (sku) => sku.id === s.skuId
                              );
                              if (sku) {
                                // Total Capex = Cost of New Machine + mould + infra
                                const totalCapex =
                                  (sku.ops?.costOfNewMachine || 0) +
                                  (sku.npd?.mouldCost || 0) +
                                  (sku.ops?.costOfNewInfra || 0);

                                // Working capital investment = Total revenue * WC Days
                                const workingCapitalDays =
                                  sku.capex?.workingCapitalDays || 60;
                                const yearRevenue =
                                  calc.pnl[i]?.revenueNet || 0;
                                const workingCapitalInvestment =
                                  yearRevenue * (workingCapitalDays / 365);

                                // Total investment = Total capex + working capital investment
                                totalInvestment +=
                                  totalCapex + workingCapitalInvestment;
                                totalWeight += vkg;
                              }
                            }
                          }

                          // Interest per kg = Total investment * Cost of Debt / Total weight
                          return totalWeight > 0
                            ? (totalInvestment *
                                scenario.finance.costOfDebtPct) /
                                totalWeight
                            : 0;
                        },
                      ],
                      [
                        "Tax",
                        (i: number) => {
                          const ebitda =
                            calc.weightedAvgPricePerKg[i]?.ebitdaPerKg || 0;
                          // Calculate total depreciation amount across all SKUs for this year
                          const bySku = calc.bySku || [];
                          let totalDepreciationAmount = 0;
                          let totalWeight = 0;

                          for (const s of bySku) {
                            const vkg = s.volumes[i]?.weightKg || 0;
                            if (vkg > 0) {
                              // Find the corresponding SKU in scenario to get ops data
                              const sku = scenario.skus.find(
                                (sku) => sku.id === s.skuId
                              );
                              if (sku) {
                                const skuDepreciation =
                                  calculateTotalDepreciation(sku);
                                // Add the total depreciation amount (not multiplied by weight)
                                totalDepreciationAmount += skuDepreciation;
                                totalWeight += vkg;
                              }
                            }
                          }

                          // Depreciation per kg = Total depreciation amount / Total weight
                          const depreciationPerKg =
                            totalWeight > 0
                              ? totalDepreciationAmount / totalWeight
                              : 0;

                          const ebit = ebitda - depreciationPerKg;

                          // Calculate interest per kg
                          let totalInvestment = 0;
                          for (const s of bySku) {
                            const vkg = s.volumes[i]?.weightKg || 0;
                            if (vkg > 0) {
                              const sku = scenario.skus.find(
                                (sku) => sku.id === s.skuId
                              );
                              if (sku) {
                                const totalCapex =
                                  (sku.ops?.costOfNewMachine || 0) +
                                  (sku.npd?.mouldCost || 0) +
                                  (sku.ops?.costOfNewInfra || 0);
                                const workingCapitalDays =
                                  sku.capex?.workingCapitalDays || 60;
                                const yearRevenue =
                                  calc.pnl[i]?.revenueNet || 0;
                                const workingCapitalInvestment =
                                  yearRevenue * (workingCapitalDays / 365);
                                totalInvestment +=
                                  totalCapex + workingCapitalInvestment;
                              }
                            }
                          }
                          const interestPerKg =
                            totalWeight > 0
                              ? (totalInvestment *
                                  scenario.finance.costOfDebtPct) /
                                totalWeight
                              : 0;

                          const pbt = ebit - interestPerKg;
                          // Tax = Tax Rate × PBT
                          return pbt * scenario.finance.corporateTaxRatePct;
                        },
                      ],
                      [
                        "PBT",
                        (i: number) => {
                          const ebitda =
                            calc.weightedAvgPricePerKg[i]?.ebitdaPerKg || 0;
                          // Calculate total depreciation amount across all SKUs for this year
                          const bySku = calc.bySku || [];
                          let totalDepreciationAmount = 0;
                          let totalWeight = 0;

                          for (const s of bySku) {
                            const vkg = s.volumes[i]?.weightKg || 0;
                            if (vkg > 0) {
                              // Find the corresponding SKU in scenario to get ops data
                              const sku = scenario.skus.find(
                                (sku) => sku.id === s.skuId
                              );
                              if (sku) {
                                const skuDepreciation =
                                  calculateTotalDepreciation(sku);
                                // Add the total depreciation amount (not multiplied by weight)
                                totalDepreciationAmount += skuDepreciation;
                                totalWeight += vkg;
                              }
                            }
                          }

                          // Depreciation per kg = Total depreciation amount / Total weight
                          const depreciationPerKg =
                            totalWeight > 0
                              ? totalDepreciationAmount / totalWeight
                              : 0;

                          const ebit = ebitda - depreciationPerKg;

                          // Calculate interest per kg
                          let totalInvestment = 0;
                          for (const s of bySku) {
                            const vkg = s.volumes[i]?.weightKg || 0;
                            if (vkg > 0) {
                              const sku = scenario.skus.find(
                                (sku) => sku.id === s.skuId
                              );
                              if (sku) {
                                const totalCapex =
                                  (sku.ops?.costOfNewMachine || 0) +
                                  (sku.npd?.mouldCost || 0) +
                                  (sku.ops?.costOfNewInfra || 0);
                                const workingCapitalDays =
                                  sku.capex?.workingCapitalDays || 60;
                                const yearRevenue =
                                  calc.pnl[i]?.revenueNet || 0;
                                const workingCapitalInvestment =
                                  yearRevenue * (workingCapitalDays / 365);
                                totalInvestment +=
                                  totalCapex + workingCapitalInvestment;
                              }
                            }
                          }
                          const interestPerKg =
                            totalWeight > 0
                              ? (totalInvestment *
                                  scenario.finance.costOfDebtPct) /
                                totalWeight
                              : 0;

                          // PBT = EBIT - Interest
                          return ebit - interestPerKg;
                        },
                      ],
                      [
                        "PAT",
                        (i: number) => {
                          const ebitda =
                            calc.weightedAvgPricePerKg[i]?.ebitdaPerKg || 0;
                          // Calculate total depreciation amount across all SKUs for this year
                          const bySku = calc.bySku || [];
                          let totalDepreciationAmount = 0;
                          let totalWeight = 0;

                          for (const s of bySku) {
                            const vkg = s.volumes[i]?.weightKg || 0;
                            if (vkg > 0) {
                              // Find the corresponding SKU in scenario to get ops data
                              const sku = scenario.skus.find(
                                (sku) => sku.id === s.skuId
                              );
                              if (sku) {
                                const skuDepreciation =
                                  calculateTotalDepreciation(sku);
                                // Add the total depreciation amount (not multiplied by weight)
                                totalDepreciationAmount += skuDepreciation;
                                totalWeight += vkg;
                              }
                            }
                          }

                          // Depreciation per kg = Total depreciation amount / Total weight
                          const depreciationPerKg =
                            totalWeight > 0
                              ? totalDepreciationAmount / totalWeight
                              : 0;

                          const ebit = ebitda - depreciationPerKg;

                          // Calculate interest per kg
                          let totalInvestment = 0;
                          for (const s of bySku) {
                            const vkg = s.volumes[i]?.weightKg || 0;
                            if (vkg > 0) {
                              const sku = scenario.skus.find(
                                (sku) => sku.id === s.skuId
                              );
                              if (sku) {
                                const totalCapex =
                                  (sku.ops?.costOfNewMachine || 0) +
                                  (sku.npd?.mouldCost || 0) +
                                  (sku.ops?.costOfNewInfra || 0);
                                const workingCapitalDays =
                                  sku.capex?.workingCapitalDays || 60;
                                const yearRevenue =
                                  calc.pnl[i]?.revenueNet || 0;
                                const workingCapitalInvestment =
                                  yearRevenue * (workingCapitalDays / 365);
                                totalInvestment +=
                                  totalCapex + workingCapitalInvestment;
                              }
                            }
                          }
                          const interestPerKg =
                            totalWeight > 0
                              ? (totalInvestment *
                                  scenario.finance.costOfDebtPct) /
                                totalWeight
                              : 0;

                          const pbt = ebit - interestPerKg;
                          const tax =
                            pbt * scenario.finance.corporateTaxRatePct;
                          // PAT = PBT - Tax
                          return pbt - tax;
                        },
                      ],
                    ] as const;
                    return rows.map(([label, getter]) => (
                      <tr
                        key={label as string}
                        className="border-b border-slate-100"
                      >
                        <td className="p-2 text-slate-700">
                          {label as string}
                        </td>
                        {Array.from({ length: 5 }, (_, idx) => (
                          <td key={idx} className="p-2 text-right font-mono">
                            {formatPerKg(getter(idx))}
                          </td>
                        ))}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="P&L (Aggregated)">
            <div className="overflow-x-auto text-slate-900">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-2">Line</th>
                    {calc.pnl.map((y) => (
                      <th key={y.year} className="text-right p-2">
                        Y{y.year}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      [
                        "Revenue (net)",
                        (y: (typeof calc.pnl)[number]) => y.revenueNet,
                      ],
                      [
                        "Material cost",
                        (y: (typeof calc.pnl)[number]) => y.materialCost,
                      ],
                      [
                        "Material margin",
                        (y: (typeof calc.pnl)[number]) =>
                          y.revenueNet - y.materialCost,
                      ],
                      [
                        "Conversion cost",
                        (y: (typeof calc.pnl)[number]) => y.conversionCost,
                      ],
                      [
                        "Gross margin",
                        (y: (typeof calc.pnl)[number]) =>
                          y.revenueNet - y.materialCost - y.conversionCost,
                      ],
                      [
                        "SG&A cost",
                        (y: (typeof calc.pnl)[number]) => y.sgaCost,
                      ],
                      ["EBITDA", (y: (typeof calc.pnl)[number]) => y.ebitda],
                      [
                        "Depreciation",
                        (y: (typeof calc.pnl)[number]) => {
                          // Calculate total depreciation across all SKUs for this year
                          return scenario.skus.reduce((total, sku) => {
                            return total + calculateTotalDepreciation(sku);
                          }, 0);
                        },
                      ],
                      [
                        "EBIT",
                        (y: (typeof calc.pnl)[number]) => {
                          const ebitda = y.ebitda;
                          // Calculate total depreciation across all SKUs for this year
                          const depreciation = scenario.skus.reduce(
                            (total, sku) => {
                              return total + calculateTotalDepreciation(sku);
                            },
                            0
                          );
                          return ebitda - depreciation;
                        },
                      ],
                      [
                        "Interest",
                        (y: (typeof calc.pnl)[number]) => {
                          // Calculate total investment across all SKUs
                          console.log(
                            `=== Year ${y.year} Investment Calculation Start ===`
                          );
                          console.log(`Total SKUs: ${scenario.skus.length}`);
                          console.log(
                            `SKUs data structure:`,
                            scenario.skus.map((sku) => ({
                              name: sku.name,
                              hasOps: !!sku.ops,
                              hasNpd: !!sku.npd,
                              hasCapex: !!sku.capex,
                              opsKeys: sku.ops ? Object.keys(sku.ops) : [],
                              npdKeys: sku.npd ? Object.keys(sku.npd) : [],
                              capexKeys: sku.capex
                                ? Object.keys(sku.capex)
                                : [],
                            }))
                          );

                          const totalCapex = scenario.skus.reduce(
                            (total, sku) => {
                              console.log(`Processing SKU ${sku.name}:`, {
                                rawOps: sku.ops,
                                rawNpd: sku.npd,
                                machineCost: sku.ops?.costOfNewMachine,
                                mouldCost: sku.npd?.mouldCost,
                                infraCost: sku.ops?.costOfNewInfra,
                                workingCapitalDays:
                                  sku.capex?.workingCapitalDays,
                              });

                              const skuCapex =
                                (sku.ops?.costOfNewMachine || 0) +
                                (sku.npd?.mouldCost || 0) +
                                (sku.ops?.costOfNewInfra || 0);
                              console.log(`SKU ${sku.name} Capex:`, {
                                machineCost: sku.ops?.costOfNewMachine || 0,
                                mouldCost: sku.npd?.mouldCost || 0,
                                infraCost: sku.ops?.costOfNewInfra || 0,
                                totalSkuCapex: skuCapex,
                                runningTotal: total + skuCapex,
                              });
                              return total + skuCapex;
                            },
                            0
                          );

                          console.log(`Final Total Capex: ${totalCapex}`);

                          // Working capital investment = Total revenue * WC Days
                          const workingCapitalDaysArray = scenario.skus.map(
                            (s) => s.capex?.workingCapitalDays || 60
                          );
                          const workingCapitalDays = Math.max(
                            60,
                            ...workingCapitalDaysArray
                          );
                          const workingCapitalInvestment =
                            y.revenueNet * (workingCapitalDays / 365);

                          console.log(`Working Capital Calculation:`, {
                            revenueNet: y.revenueNet,
                            workingCapitalDays,
                            workingCapitalDaysArray,
                            workingCapitalInvestment,
                            workingCapitalFormula: `${
                              y.revenueNet
                            } * (${workingCapitalDays} / 365) = ${
                              y.revenueNet * (workingCapitalDays / 365)
                            }`,
                          });

                          // Total investment = Total capex + working capital investment
                          const totalInvestment =
                            totalCapex + workingCapitalInvestment;

                          console.log(`Total Investment Calculation:`, {
                            totalCapex,
                            workingCapitalInvestment,
                            totalInvestment,
                          });

                          // Interest = Total investment * Cost of Debt
                          const interest =
                            totalInvestment * scenario.finance.costOfDebtPct;

                          // Debug logs
                          console.log(`Year ${y.year} Interest Calculation:`, {
                            totalCapex,
                            workingCapitalDays,
                            workingCapitalInvestment,
                            totalInvestment,
                            costOfDebtPct: scenario.finance.costOfDebtPct,
                            interest,
                            revenueNet: y.revenueNet,
                          });

                          // Additional debug for finance values
                          console.log(`Finance object debug:`, {
                            finance: scenario.finance,
                            debtPctType: typeof scenario.finance.debtPct,
                            costOfDebtPctType:
                              typeof scenario.finance.costOfDebtPct,
                            debtPctValue: scenario.finance.debtPct,
                            costOfDebtPctValue: scenario.finance.costOfDebtPct,
                            isDebtPctZero: scenario.finance.debtPct === 0,
                            isCostOfDebtPctZero:
                              scenario.finance.costOfDebtPct === 0,
                            isDebtPctUndefined:
                              scenario.finance.debtPct === undefined,
                            isCostOfDebtPctUndefined:
                              scenario.finance.costOfDebtPct === undefined,
                          });

                          return interest;
                        },
                      ],
                      [
                        "PBT",
                        (y: (typeof calc.pnl)[number]) => {
                          const ebitda = y.ebitda;
                          // Calculate total depreciation across all SKUs for this year
                          const depreciation = scenario.skus.reduce(
                            (total, sku) => {
                              return total + calculateTotalDepreciation(sku);
                            },
                            0
                          );
                          const ebit = ebitda - depreciation;

                          // Calculate interest
                          const totalCapex = scenario.skus.reduce(
                            (total, sku) => {
                              return (
                                total +
                                (sku.ops?.costOfNewMachine || 0) +
                                (sku.npd?.mouldCost || 0) +
                                (sku.ops?.costOfNewInfra || 0)
                              );
                            },
                            0
                          );
                          const workingCapitalDays = Math.max(
                            60,
                            ...scenario.skus.map(
                              (s) => s.capex?.workingCapitalDays || 60
                            )
                          );
                          const workingCapitalInvestment =
                            y.revenueNet * (workingCapitalDays / 365);
                          const totalInvestment =
                            totalCapex + workingCapitalInvestment;
                          const interest =
                            totalInvestment * scenario.finance.costOfDebtPct;

                          // Debug logs for PBT
                          console.log(`Year ${y.year} PBT Calculation:`, {
                            ebitda: y.ebitda,
                            depreciation,
                            ebit,
                            totalInvestment,
                            costOfDebtPct: scenario.finance.costOfDebtPct,
                            interest,
                            pbt: ebit - interest,
                          });

                          // PBT = EBIT - Interest
                          return ebit - interest;
                        },
                      ],
                      [
                        "Tax",
                        (y: (typeof calc.pnl)[number]) => {
                          const ebitda = y.ebitda;
                          // Calculate total depreciation across all SKUs for this year
                          const depreciation = scenario.skus.reduce(
                            (total, sku) => {
                              return total + calculateTotalDepreciation(sku);
                            },
                            0
                          );
                          const ebit = ebitda - depreciation;

                          // Calculate interest
                          const totalCapex = scenario.skus.reduce(
                            (total, sku) => {
                              return (
                                total +
                                (sku.ops?.costOfNewMachine || 0) +
                                (sku.npd?.mouldCost || 0) +
                                (sku.ops?.costOfNewInfra || 0)
                              );
                            },
                            0
                          );
                          const workingCapitalDays = Math.max(
                            60,
                            ...scenario.skus.map(
                              (s) => s.capex?.workingCapitalDays || 60
                            )
                          );
                          const workingCapitalInvestment =
                            y.revenueNet * (workingCapitalDays / 365);
                          const totalInvestment =
                            totalCapex + workingCapitalInvestment;
                          const interest =
                            totalInvestment * scenario.finance.costOfDebtPct;

                          const pbt = ebit - interest;
                          // Tax = Tax Rate × PBT
                          return pbt * scenario.finance.corporateTaxRatePct;
                        },
                      ],
                      [
                        "PAT",
                        (y: (typeof calc.pnl)[number]) => {
                          const ebitda = y.ebitda;
                          // Calculate total depreciation across all SKUs for this year
                          const depreciation = scenario.skus.reduce(
                            (total, sku) => {
                              return total + calculateTotalDepreciation(sku);
                            },
                            0
                          );
                          const ebit = ebitda - depreciation;

                          // Calculate interest
                          const totalCapex = scenario.skus.reduce(
                            (total, sku) => {
                              return (
                                total +
                                (sku.ops?.costOfNewMachine || 0) +
                                (sku.npd?.mouldCost || 0) +
                                (sku.ops?.costOfNewInfra || 0)
                              );
                            },
                            0
                          );
                          const workingCapitalDays = Math.max(
                            60,
                            ...scenario.skus.map(
                              (s) => s.capex?.workingCapitalDays || 60
                            )
                          );
                          const workingCapitalInvestment =
                            y.revenueNet * (workingCapitalDays / 365);
                          const totalInvestment =
                            totalCapex + workingCapitalInvestment;
                          const interest =
                            totalInvestment * scenario.finance.costOfDebtPct;

                          const pbt = ebit - interest;
                          const tax =
                            pbt * scenario.finance.corporateTaxRatePct;
                          // PAT = PBT - Tax
                          return pbt - tax;
                        },
                      ],
                    ] as const
                  ).map(([label, getter]) => (
                    <tr
                      key={label as string}
                      className="border-b border-slate-100"
                    >
                      <td className="p-2 text-slate-700">{label as string}</td>
                      {calc.pnl.map((y) => (
                        <td key={y.year} className="p-2 text-right font-mono">
                          {formatCrores(getter(y))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      </div>

      {/* Case Metrics Charts - placed above Debug Panel */}
      <Section title="📈 Case Performance Charts" className="mt-6">
        <CaseMetricsCharts calcOutput={calc} />
      </Section>

      {/* Debug Panel */}
      <Section
        title="🔍 Debug Panel - Atomic Calculations"
        className="bg-gray-50 border-gray-300"
      >
        <div className="space-y-6 text-slate-900">
          {/* SKU-level Debug Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-3">
              SKU-Level Calculations
            </h4>
            <div className="space-y-4">
              {calc.bySku?.map((skuCalc, skuIndex) => (
                <div
                  key={skuCalc.skuId}
                  className="bg-white p-4 rounded-lg border border-gray-200"
                >
                  <h5 className="font-medium text-gray-700 mb-2">
                    SKU: {skuCalc.name || skuCalc.skuId}
                  </h5>

                  {/* Volumes and Weights */}
                  <div className="mb-3">
                    <h6 className="text-sm font-medium text-gray-600 mb-2">
                      📊 Volumes & Weights
                    </h6>
                    <div className="grid grid-cols-6 gap-2 text-xs">
                      <div className="font-medium">Year</div>
                      <div className="font-medium">Volume (pcs)</div>
                      <div className="font-medium">Weight (kg)</div>
                      <div className="font-medium">Weight/pc (kg)</div>
                      <div className="font-medium">Growth Factor</div>
                      <div className="font-medium">Base Volume</div>
                      {skuCalc.volumes.map((vol, idx) => {
                        const baseVolume =
                          scenario.skus[skuIndex]?.sales
                            .baseAnnualVolumePieces || 0;
                        const growthFactor = 1; // No growth - simplified
                        const weightPerPiece = vol.weightKg / vol.volumePieces;
                        return (
                          <React.Fragment key={vol.year}>
                            <div className="font-medium">Y{vol.year}</div>
                            <div className="font-mono">
                              {vol.volumePieces.toLocaleString()}
                            </div>
                            <div className="font-mono">
                              {vol.weightKg.toFixed(2)}
                            </div>
                            <div className="font-mono">
                              {weightPerPiece.toFixed(4)}
                            </div>
                            <div className="font-mono">
                              {growthFactor.toFixed(3)}
                            </div>
                            <div className="font-mono">
                              {baseVolume.toLocaleString()}
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price Components Per Kg */}
                  <div className="mb-3">
                    <h6 className="text-sm font-medium text-gray-600 mb-2">
                      💰 Price Components Per Kg
                    </h6>
                    <div className="grid grid-cols-7 gap-2 text-xs">
                      <div className="font-medium">Year</div>
                      <div className="font-medium">RM</div>
                      <div className="font-medium">MB</div>
                      <div className="font-medium">Value Add</div>
                      <div className="font-medium">Packaging</div>
                      <div className="font-medium">Freight Out</div>
                      <div className="font-medium">Total</div>
                      {skuCalc.prices.map((price) => (
                        <>
                          <div className="font-medium">Y{price.year}</div>
                          <div className="font-mono">
                            {price.perKg.rmPerKg.toFixed(2)}
                          </div>
                          <div className="font-mono">
                            {price.perKg.mbPerKg.toFixed(2)}
                          </div>
                          <div className="font-mono">
                            {price.perKg.valueAddPerKg.toFixed(2)}
                          </div>
                          <div className="font-mono">
                            {price.perKg.packagingPerKg.toFixed(2)}
                          </div>
                          <div className="font-mono">
                            {price.perKg.freightOutPerKg.toFixed(2)}
                          </div>
                          <div className="font-medium font-mono">
                            {price.perKg.totalPerKg.toFixed(2)}
                          </div>
                        </>
                      ))}
                    </div>
                  </div>

                  {/* Price Per Piece */}
                  <div className="mb-3">
                    <h6 className="text-sm font-medium text-gray-600 mb-2">
                      💵 Price Per Piece
                    </h6>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="font-medium">Year</div>
                      <div className="font-medium">Price (Rs/pc)</div>
                      <div className="font-medium">Revenue Per Kg</div>
                      {skuCalc.prices.map((price) => {
                        const revenuePerKg =
                          price.pricePerPiece /
                          (skuCalc.volumes[price.year - 1]?.weightKg /
                            skuCalc.volumes[price.year - 1]?.volumePieces || 1);
                        return (
                          <>
                            <div className="font-medium">Y{price.year}</div>
                            <div className="font-mono">
                              {price.pricePerPiece.toFixed(2)}
                            </div>
                            <div className="font-mono">
                              {revenuePerKg.toFixed(2)}
                            </div>
                          </>
                        );
                      })}
                    </div>
                  </div>

                  {/* P&L Breakdown */}
                  <div>
                    <h6 className="text-sm font-medium text-gray-600 mb-2">
                      📈 P&L Breakdown
                    </h6>
                    <div className="grid grid-cols-8 gap-2 text-xs">
                      <div className="font-medium">Year</div>
                      <div className="font-medium">Revenue</div>
                      <div className="font-medium">Material Cost</div>
                      <div className="font-medium">Conversion</div>
                      <div className="font-medium">Gross Margin</div>
                      <div className="font-medium">EBITDA</div>
                      <div className="font-medium">PAT</div>
                      <div className="font-medium">ROCE %</div>
                      {skuCalc.pnl.map((pnl) => (
                        <>
                          <div className="font-medium">Y{pnl.year}</div>
                          <div className="font-mono">
                            {formatCrores(pnl.revenueNet)}
                          </div>
                          <div className="font-mono">
                            {formatCrores(pnl.materialCost)}
                          </div>
                          <div className="font-mono">
                            {formatCrores(pnl.conversionCost)}
                          </div>
                          <div className="font-mono">
                            {formatCrores(pnl.grossMargin)}
                          </div>
                          <div className="font-mono">
                            {formatCrores(pnl.ebitda)}
                          </div>
                          <div className="font-mono">
                            {formatCrores(pnl.pat)}
                          </div>
                          <div className="font-mono">
                            {((pnl.pat / (pnl.revenueNet || 1)) * 100).toFixed(
                              1
                            )}
                            %
                          </div>
                        </>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weighted Average Calculations */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-3">
              Weighted Average Calculations
            </h4>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h6 className="text-sm font-medium text-gray-600 mb-2">
                📊 Weighted Average Price Per Kg
              </h6>
              <div className="grid grid-cols-7 gap-2 text-xs">
                <div className="font-medium">Component</div>
                <div className="font-medium">Y1</div>
                <div className="font-medium">Y2</div>
                <div className="font-medium">Y3</div>
                <div className="font-medium">Y4</div>
                <div className="font-medium">Y5</div>
                <div className="font-medium">Formula</div>
                {[
                  {
                    label: "RM",
                    key: "rmPerKg",
                    formula: "Σ(rmPerKg × weightKg) / Σ(weightKg)",
                  },
                  {
                    label: "MB",
                    key: "mbPerKg",
                    formula: "Σ(mbPerKg × weightKg) / Σ(weightKg)",
                  },
                  {
                    label: "Value Add",
                    key: "valueAddPerKg",
                    formula: "Σ(valueAddPerKg × weightKg) / Σ(weightKg)",
                  },
                  {
                    label: "Packaging",
                    key: "packagingPerKg",
                    formula: "Σ(packagingPerKg × weightKg) / Σ(weightKg)",
                  },
                  {
                    label: "Freight Out",
                    key: "freightOutPerKg",
                    formula: "Σ(freightOutPerKg × weightKg) / Σ(weightKg)",
                  },
                  {
                    label: "Total",
                    key: "totalPerKg",
                    formula: "Σ(totalPerKg × weightKg) / Σ(weightKg)",
                  },
                  {
                    label: "Revenue per kg",
                    key: "custom",
                    formula:
                      "Σ((rm+mb+pack+freight+conv) × weightKg) / Σ(weightKg)",
                  },
                ].map(({ label, key, formula }) => (
                  <>
                    <div className="font-medium">{label}</div>
                    {Array.from({ length: 5 }, (_, i) => {
                      let value: number;
                      if (key === "custom") {
                        value = waRevenuePerKg(i);
                      } else {
                        value = waPerKg(
                          i,
                          key as keyof (typeof calc.prices)[number]["perKg"]
                        );
                      }
                      return (
                        <div
                          key={i}
                          className="font-mono bg-gray-50 p-1 rounded"
                        >
                          {value.toFixed(2)}
                        </div>
                      );
                    })}
                    <div className="text-xs text-gray-600 font-mono">
                      {formula}
                    </div>
                  </>
                ))}
              </div>
            </div>
          </div>

          {/* Plant Master Data */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-3">
              🏭 Plant Master Data
            </h4>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-600">Plant</div>
                  <div className="font-mono">
                    {scenario.skus[0]?.plantMaster?.plant || "N/A"}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">
                    Manpower Rate/Shift
                  </div>
                  <div className="font-mono">
                    ₹{scenario.skus[0]?.plantMaster?.manpowerRatePerShift || 0}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">
                    Power Rate/Unit
                  </div>
                  <div className="font-mono">
                    ₹{scenario.skus[0]?.plantMaster?.powerRatePerUnit || 0}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">R&M per kg</div>
                  <div className="font-mono">
                    ₹{scenario.skus[0]?.plantMaster?.rAndMPerKg || 0}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">
                    Other Mfg per kg
                  </div>
                  <div className="font-mono">
                    ₹{scenario.skus[0]?.plantMaster?.otherMfgPerKg || 0}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">
                    Plant SGA per kg
                  </div>
                  <div className="font-mono">
                    ₹{scenario.skus[0]?.plantMaster?.plantSgaPerKg || 0}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">
                    Corp SGA per kg
                  </div>
                  <div className="font-mono">
                    ₹{scenario.skus[0]?.plantMaster?.corpSgaPerKg || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Input Parameters Summary */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-3">
              ⚙️ Input Parameters Summary
            </h4>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {scenario.skus.map((sku, idx) => (
                  <div key={sku.id} className="border-l-4 border-blue-500 pl-4">
                    <h6 className="font-medium text-gray-700 mb-2">
                      SKU {idx + 1}: {sku.name || sku.id}
                    </h6>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-gray-600">Product Weight:</span>{" "}
                        {sku.sales.productWeightGrams}g
                      </div>
                      <div>
                        <span className="text-gray-600">Base Volume:</span>{" "}
                        {sku.sales.baseAnnualVolumePieces.toLocaleString()} pcs
                      </div>
                      <div>
                        <span className="text-gray-600">Resin Price:</span> ₹
                        {sku.costing.resinRsPerKg}/kg
                      </div>
                      <div>
                        <span className="text-gray-600">MB Price:</span> ₹
                        {sku.costing.mbRsPerKg}/kg
                      </div>
                      <div>
                        <span className="text-gray-600">Value Add:</span> ₹
                        {sku.costing.valueAddRsPerPiece}/pc
                      </div>
                      <div>
                        <span className="text-gray-600">Packaging:</span> ₹
                        {sku.costing.packagingRsPerKg}/kg
                      </div>
                      <div>
                        <span className="text-gray-600">Freight Out:</span> ₹
                        {sku.costing.freightOutRsPerKg}/kg
                      </div>
                      <div>
                        <span className="text-gray-600">
                          Conversion Recovery:
                        </span>{" "}
                        ₹{sku.sales.conversionRecoveryRsPerPiece || 0}/pc
                      </div>
                      <div>
                        <span className="text-gray-600">Machine Cost:</span> ₹
                        {formatCrores(sku.ops?.costOfNewMachine || 0)}
                      </div>
                      <div>
                        <span className="text-gray-600">Mould Cost:</span> ₹
                        {formatCrores(sku.npd?.mouldCost || 0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Calculation Flow */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-3">
              🔄 Calculation Flow
            </h4>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="font-medium text-blue-800">
                    1. Volume & Weight Calculation
                  </div>
                  <div className="text-blue-700 mt-1">
                    Volume<sub>Y</sub> = Base Volume × Growth Factor<sub>Y</sub>
                    <br />
                    Weight<sub>Y</sub> = Volume<sub>Y</sub> × Product Weight
                    (kg)
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="font-medium text-green-800">
                    2. Price Per Kg Components
                  </div>
                  <div className="text-green-700 mt-1">
                    RM<sub>Y</sub> = RM<sub>Y1</sub> × Inflation Factor
                    <sub>Y</sub>
                    <br />
                    MB<sub>Y</sub> = MB<sub>Y1</sub> × Inflation Factor
                    <sub>Y</sub>
                    <br />
                    Other components follow similar pattern
                  </div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="font-medium text-yellow-800">
                    3. Weighted Average Calculation
                  </div>
                  <div className="text-yellow-700 mt-1">
                    WA Component<sub>Y</sub> = Σ(Component<sub>Y</sub> × Weight
                    <sub>Y</sub>) / Σ(Weight<sub>Y</sub>)
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="font-medium text-purple-800">
                    4. Revenue Per Kg
                  </div>
                  <div className="text-purple-700 mt-1">
                    Revenue Per Kg = RM + MB + Packaging + Freight Out +
                    Conversion
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
