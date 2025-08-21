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

const DEFAULT_SPECS: PerturbationSpec[] = [
  {
    variableId: "skus.0.costing.resinRsPerKg",
    deltas: [-0.1, -0.05, 0.05, 0.1],
    percent: true,
  },
  {
    variableId: "skus.0.sales.baseAnnualVolumePieces",
    deltas: [-0.15, -0.1, 0.1, 0.15],
    percent: true,
  },
  {
    variableId: "finance.costOfDebtPct",
    deltas: [-0.02, 0.02],
    percent: false,
  },
];

const DEFAULT_OBJECTIVE: ObjectiveConfig = {
  metrics: ["NPV", "IRR", "PNL_Y1", "PNL_TOTAL"],
};

export default function RiskSensitivity({ scenario }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SensitivityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/simulations/sensitivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessCase: scenario,
          specs: DEFAULT_SPECS,
          objective: DEFAULT_OBJECTIVE,
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-800">
          Sensitivity (Tornado preview)
        </div>
        <button
          onClick={run}
          disabled={loading}
          className={`px-3 py-1.5 rounded text-white ${
            loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Running..." : "Run Sensitivity"}
        </button>
      </div>
      {error && (
        <div className="p-2 rounded bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}
      {!data ? (
        <div className="text-slate-600 text-sm">
          Configure variables and run to see impact.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-slate-600">
            Baseline NPV:{" "}
            <span className="font-medium text-slate-800">
              {Math.round((data.baseline.NPV || 0) / 1e7) / 10} Cr
            </span>
          </div>
          <div className="space-y-1">
            {ranked.slice(0, 8).map((row) => (
              <div key={row.variableId} className="flex items-center gap-3">
                <div
                  className="w-64 text-xs text-slate-700 truncate"
                  title={row.variableId}
                >
                  {row.variableId}
                </div>
                <div className="flex-1 h-3 bg-slate-100 rounded relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-blue-500"
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
                <div className="w-24 text-right text-xs font-mono text-slate-800">
                  {Math.round((row.impact || 0) / 1e7) / 10} Cr
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
