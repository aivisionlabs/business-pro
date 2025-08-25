"use client";
import React, { useMemo, useState } from "react";
import {
  BusinessCase,
  ObjectiveConfig,
  OutcomeMetric,
  SensitivityResponse,
} from "@/lib/types";

type Props = {
  scenario: BusinessCase;
};

const DEFAULT_OBJECTIVE: ObjectiveConfig = {
  metrics: ["NPV", "IRR", "PNL_Y1", "PNL_TOTAL"],
};

// Available variables for configuration
const AVAILABLE_VARIABLES: Array<{
  id: string;
  label: string;
  category: string;
  formula?: string;
}> = [
  {
    id: "skus.0.sales.baseAnnualVolumePieces",
    label: "Annual Volume (Pieces)",
    category: "Sales",
    formula: "Direct input: baseAnnualVolumePieces × growthFactor(year)",
  },

  {
    id: "skus.0.sales.conversionRecoveryRsPerPiece",
    label: "Conversion Recovery (Rs/Piece)",
    category: "Sales",
    formula: "Direct input or derived from machineRatePerDayRs / unitsPerDay",
  },
  {
    id: "skus.0.costing.mbRsPerKg",
    label: "Master Batch Price (Rs/Kg)",
    category: "Costing",
    formula:
      "Direct input or derived from resinRsPerKg if useMbPriceOverride = false",
  },
  {
    id: "skus.0.costing.packagingRsPerKg",
    label: "Packaging (Rs/Kg)",
    category: "Costing",
    formula:
      "Direct input or derived from packagingRsPerPiece / productWeightKg",
  },
  {
    id: "skus.0.plantMaster.conversionPerKg",
    label: "Plant Conversion Cost (Rs/Kg)",
    category: "Plant",
    formula:
      "From plant-master.json: manpower + power + R&M + otherMfg + plantSGA",
  },
];

export default function RiskSensitivity({ scenario }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SensitivityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariables, setSelectedVariables] = useState<string[]>([
    "skus.0.sales.baseAnnualVolumePieces",
  ]);
  const [perturbationRange, setPerturbationRange] = useState(0.1); // 10% default
  const [showConfig, setShowConfig] = useState(false);

  const specs = useMemo(() => {
    return selectedVariables.map((variableId) => ({
      variableId,
      deltas: [
        -perturbationRange,
        -perturbationRange / 2,
        perturbationRange / 2,
        perturbationRange,
      ],
      percent: true,
    }));
  }, [selectedVariables, perturbationRange]);

  // Format helpers for consistent display in Crores with sign and 2 decimals
  const formatCr = (value: number) => {
    const cr = value / 1e7;
    const sign = cr > 0 ? "+" : cr < 0 ? "" : "";
    return `${sign}${cr.toFixed(2)} Cr`;
  };

  async function run() {
    setLoading(true);
    setError(null);
    try {
      // Compute baseline locally to align with current engine state
      const baselineResp = await fetch("/api/calc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scenario),
      });
      if (!baselineResp.ok)
        throw new Error(`Baseline failed: ${baselineResp.status}`);
      const baselineJson = await baselineResp.json();
      const baseline = {
        NPV: baselineJson?.returns?.npv ?? null,
        IRR: baselineJson?.returns?.irr ?? null,
        PNL_Y1: baselineJson?.pnl?.[0]?.pat ?? null,
        PNL_TOTAL: Array.isArray(baselineJson?.pnl)
          ? baselineJson.pnl.reduce((s: number, y: any) => s + (y?.pat || 0), 0)
          : null,
      } as Record<OutcomeMetric, number | null>;

      // Debug logging
      console.log("🔍 Sensitivity Analysis Debug:");
      console.log("📊 Baseline:", baseline);
      console.log("⚙️ Specs:", specs);
      console.log("📋 Objective:", DEFAULT_OBJECTIVE);

      const resp = await fetch("/api/simulations/sensitivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessCase: scenario,
          specs,
          objective: DEFAULT_OBJECTIVE,
          baseline,
        }),
      });
      if (!resp.ok) throw new Error(`Request failed: ${resp.status}`);
      const json = await resp.json();
      console.log("📈 Sensitivity Results:", json.data);
      setData(json.data as SensitivityResponse);
    } catch (e: any) {
      setError(e?.message || "Failed to run sensitivity");
    } finally {
      setLoading(false);
    }
  }

  const ranked = useMemo(() => {
    if (!data)
      return [] as {
        variableId: string;
        impact: number;
        metric: OutcomeMetric;
      }[];
    const metric: OutcomeMetric = "NPV";
    const groups: Record<string, number[]> = {};
    for (const r of data.results) {
      const v = (r.metrics[metric] ?? 0) as number;
      const key = r.variableId;
      if (!groups[key]) groups[key] = [];
      groups[key].push(v);
    }
    return Object.entries(groups)
      .map(([k, values]) => ({
        variableId: k,
        impact: Math.max(...values) - Math.min(...values),
        metric,
      }))
      .sort((a, b) => b.impact - a.impact);
  }, [data]);

  const toggleVariable = (variableId: string) => {
    setSelectedVariables((prev) =>
      prev.includes(variableId)
        ? prev.filter((v) => v !== variableId)
        : [...prev, variableId]
    );
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-lg border border-slate-200 p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Sensitivity Analysis
          </h2>
          <p className="text-slate-600 mt-1">
            Configure variables and run to see impact on key metrics
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {showConfig ? "Hide Config" : "Configure Variables"}
          </button>
          <button
            onClick={run}
            disabled={loading || selectedVariables.length === 0}
            className={`px-6 py-2 rounded-lg text-white font-medium transition-colors ${
              loading || selectedVariables.length === 0
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Running..." : "Run Sensitivity"}
          </button>
        </div>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Perturbation Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.05"
                  max="0.3"
                  step="0.05"
                  value={perturbationRange}
                  onChange={(e) =>
                    setPerturbationRange(parseFloat(e.target.value))
                  }
                  className="flex-1"
                />
                <span className="text-sm font-medium text-slate-700 w-16">
                  {Math.round(perturbationRange * 100)}%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Variables will be tested at ±
                {Math.round(perturbationRange * 100)}% and ±
                {Math.round(perturbationRange * 50)}%
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Selected Variables ({selectedVariables.length})
              </label>
              <div className="text-xs text-slate-500 mb-2">
                Click variables to include/exclude from analysis
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {AVAILABLE_VARIABLES.map((variable) => (
                <button
                  key={variable.id}
                  onClick={() => toggleVariable(variable.id)}
                  className={`p-3 rounded-lg border text-left transition-colors relative group ${
                    selectedVariables.includes(variable.id)
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  title={
                    variable.formula
                      ? `Formula: ${variable.formula}`
                      : undefined
                  }
                >
                  <div className="text-xs text-slate-500 mb-1">
                    {variable.category}
                  </div>
                  <div className="text-sm font-medium">{variable.label}</div>
                  {variable.formula && (
                    <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-4 h-4 text-blue-500">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {!data ? (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <p className="text-slate-600">
            {selectedVariables.length === 0
              ? "Select variables to analyze"
              : "Click 'Run Sensitivity' to see the impact of variable changes"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800">
              <span className="font-medium">Baseline NPV:</span>{" "}
              <span className="font-bold text-lg">
                {formatCr(data.baseline.NPV || 0)}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-slate-800 mb-6">
              Tornado Chart - Variable Impact
            </h3>
            <div className="flex items-center gap-6 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded"></div>
                <span className="text-slate-600">Positive Impact Range</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gradient-to-l from-rose-400 to-rose-600 rounded"></div>
                <span className="text-slate-600">Negative Impact Range</span>
              </div>
            </div>

            <div className="text-sm text-slate-600 mb-4">
              <p>
                Each bar shows the range of NPV impacts when varying this
                variable. Green bars extend right (positive impact), red bars
                extend left (negative impact).
              </p>
            </div>

            {/* Chart Header with Axis Labels */}
            <div className="flex items-center gap-6 mb-2 px-3">
              <div className="w-10 text-sm font-medium text-slate-600 text-center">
                Rank
              </div>
              <div className="w-72 text-sm font-medium text-slate-600">
                Variable
              </div>
              <div className="flex-1 text-center">
                <div className="text-sm font-medium text-slate-600 mb-1">
                  NPV Impact Range
                </div>
                <div className="text-xs text-slate-500">
                  Negative ← Baseline → Positive
                </div>
              </div>
              <div className="w-28 text-sm font-medium text-slate-600 text-center">
                Net Impact
              </div>
            </div>

            {/* Y-axis line */}
            <div className="flex items-center gap-6 mb-4">
              <div className="w-10"></div>
              <div className="w-72"></div>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-px h-6 bg-slate-300"></div>
              </div>
              <div className="w-28"></div>
            </div>

            {/* X-axis tick marks and labels */}
            <div className="flex items-center gap-6 mb-2">
              <div className="w-10"></div>
              <div className="w-72"></div>
              <div className="flex-1 flex items-center justify-between px-2">
                <div className="flex flex-col items-center">
                  <div className="w-px h-3 bg-slate-300"></div>
                  <span className="text-xs text-slate-500 mt-1">
                    Max Negative
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-px h-3 bg-slate-300"></div>
                  <span className="text-xs text-slate-500 mt-1">Baseline</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-px h-3 bg-slate-300"></div>
                  <span className="text-xs text-slate-500 mt-1">
                    Max Positive
                  </span>
                </div>
              </div>
              <div className="w-28"></div>
            </div>

            <div className="space-y-4">
              {ranked
                .slice(0, 10)
                .filter(() => {
                  const maxImpact = Math.max(
                    ...ranked.map((r) => r.impact || 0)
                  );
                  return maxImpact > 0;
                })
                .map((row, index) => {
                  const maxImpact = Math.max(
                    ...ranked.map((r) => r.impact || 0)
                  );

                  // Get the actual variable data to show proper impact direction
                  const variableData = data.results.filter(
                    (r) => r.variableId === row.variableId
                  );
                  const baselineValue = data.baseline.NPV || 0;
                  const maxPositiveImpact = Math.max(
                    ...variableData.map(
                      (r) => (r.metrics.NPV || 0) - baselineValue
                    )
                  );
                  const maxNegativeImpact = Math.min(
                    ...variableData.map(
                      (r) => (r.metrics.NPV || 0) - baselineValue
                    )
                  );
                  const actualImpact = maxPositiveImpact - maxNegativeImpact;

                  return (
                    <div
                      key={row.variableId}
                      className="flex items-center gap-6 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-10 text-sm font-medium text-slate-600 text-right">
                        {index + 1}
                      </div>
                      <div
                        className="w-72 text-sm font-medium text-slate-700 truncate"
                        title={row.variableId}
                      >
                        {AVAILABLE_VARIABLES.find(
                          (v) => v.id === row.variableId
                        )?.label || row.variableId}
                      </div>

                      {/* Chart area with axis and bars */}
                      <div className="flex-1 relative">
                        {/* X-axis line */}
                        <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-300 transform -translate-y-1/2"></div>

                        {/* Grid lines for better readability */}
                        <div className="absolute top-1/4 left-0 right-0 h-px bg-slate-200"></div>
                        <div className="absolute top-3/4 left-0 right-0 h-px bg-slate-200"></div>

                        {/* Bar container */}
                        <div className="relative h-6 flex items-center justify-center">
                          {/* Center point indicator */}
                          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-slate-600 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-10"></div>

                          {/* Background track */}
                          <div className="w-full h-6 bg-slate-100 rounded-full relative shadow-inner">
                            {/* Positive impact bar (right side from center) */}
                            {maxPositiveImpact > 0 && (
                              <div
                                className="absolute inset-y-0 left-1/2 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-r-full transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer ring-1 ring-emerald-600/20"
                                style={{
                                  width: `${Math.max(
                                    (maxPositiveImpact / maxImpact) * 50,
                                    0.6
                                  )}%`,
                                }}
                                title={`Positive impact: ${formatCr(
                                  maxPositiveImpact
                                )}`}
                              />
                            )}

                            {/* Negative impact bar (left side from center) */}
                            {maxNegativeImpact < 0 && (
                              <div
                                className="absolute inset-y-0 right-1/2 bg-gradient-to-l from-rose-400 to-rose-600 rounded-l-full transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer ring-1 ring-rose-600/20"
                                style={{
                                  width: `${Math.max(
                                    (Math.abs(maxNegativeImpact) / maxImpact) *
                                      50,
                                    0.6
                                  )}%`,
                                }}
                                title={`Negative impact: ${formatCr(
                                  maxNegativeImpact
                                )}`}
                              />
                            )}
                          </div>
                        </div>

                        {/* Left side label (negative impact) */}
                        <div className="absolute left-0 top-8 text-xs text-slate-500 font-medium">
                          {formatCr(maxNegativeImpact)}
                        </div>

                        {/* Right side label (positive impact) */}
                        <div className="absolute right-0 top-8 text-xs text-slate-500 font-medium">
                          {formatCr(maxPositiveImpact)}
                        </div>
                      </div>

                      <div className="w-28 text-right text-sm font-mono text-slate-800">
                        {formatCr(actualImpact)}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
