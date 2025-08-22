"use client";
import React, { useMemo, useState } from "react";
import {
  BusinessCase,
  ObjectiveConfig,
  OutcomeMetric,
  PerturbationSpec,
  SensitivityResponse,
} from "@/lib/types";

type Props = {
  scenario: BusinessCase;
};

const DEFAULT_OBJECTIVE: ObjectiveConfig = {
  metrics: ["NPV", "IRR", "PNL_Y1", "PNL_TOTAL"],
};

// Available variables for configuration
const AVAILABLE_VARIABLES = [
  {
    id: "skus.0.costing.resinRsPerKg",
    label: "Resin Cost (Rs/Kg)",
    category: "Costing",
  },
  {
    id: "skus.0.sales.baseAnnualVolumePieces",
    label: "Annual Volume (Pieces)",
    category: "Sales",
  },
  {
    id: "skus.0.sales.netPricePerPiece",
    label: "Net Price per Piece",
    category: "Sales",
  },
  {
    id: "finance.costOfDebtPct",
    label: "Cost of Debt (%)",
    category: "Finance",
  },
  {
    id: "finance.equityContributionPct",
    label: "Equity Contribution (%)",
    category: "Finance",
  },
  {
    id: "skus.0.costing.laborRsPerKg",
    label: "Labor Cost (Rs/Kg)",
    category: "Costing",
  },
  {
    id: "skus.0.costing.overheadRsPerKg",
    label: "Overhead Cost (Rs/Kg)",
    category: "Costing",
  },
];

export default function RiskSensitivity({ scenario }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SensitivityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariables, setSelectedVariables] = useState<string[]>([
    "skus.0.costing.resinRsPerKg",
    "skus.0.sales.baseAnnualVolumePieces",
    "finance.costOfDebtPct",
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
    <div className="w-full bg-white rounded-xl shadow-lg border border-slate-200 p-6">
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
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selectedVariables.includes(variable.id)
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-xs text-slate-500 mb-1">
                    {variable.category}
                  </div>
                  <div className="text-sm font-medium">{variable.label}</div>
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
                {Math.round((data.baseline.NPV || 0) / 1e7) / 10} Cr
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Tornado Chart - Variable Impact
            </h3>
            <div className="space-y-3">
              {ranked.slice(0, 10).map((row, index) => (
                <div key={row.variableId} className="flex items-center gap-4">
                  <div className="w-8 text-sm font-medium text-slate-600 text-right">
                    {index + 1}
                  </div>
                  <div
                    className="w-64 text-sm text-slate-700 truncate"
                    title={row.variableId}
                  >
                    {AVAILABLE_VARIABLES.find((v) => v.id === row.variableId)
                      ?.label || row.variableId}
                  </div>
                  <div className="flex-1 h-4 bg-slate-100 rounded-full relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (row.impact || 0) > 0
                            ? 10 + Math.log10(row.impact + 1) * 25
                            : 0
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="w-24 text-right text-sm font-mono text-slate-800">
                    {Math.round((row.impact || 0) / 1e7) / 10} Cr
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
