"use client";
import React, { useState } from "react";
import {
  BusinessCase,
  ObjectiveConfig,
  ScenarioDefinition,
  ScenarioResponse,
} from "@/lib/types";

type Props = { scenario: BusinessCase };

const DEFAULT_SCENARIOS: ScenarioDefinition[] = [
  {
    id: "recession",
    name: "Recession",
    overrides: {
      "skus.0.sales.baseAnnualVolumePieces": 0.8, // Will be interpreted as absolute value; consider later percent support
    },
  },
  {
    id: "high-demand",
    name: "High Demand",
    overrides: {
      "skus.0.sales.baseAnnualVolumePieces": 1.2,
    },
  },
  {
    id: "supply-disruption",
    name: "Supply Disruption",
    overrides: {
      "skus.0.costing.resinRsPerKg": 1.1,
    },
  },
];

const DEFAULT_OBJECTIVE: ObjectiveConfig = {
  metrics: ["NPV", "IRR", "PNL_Y1", "PNL_TOTAL"],
};

export default function RiskScenarios({ scenario }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ScenarioResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/simulations/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessCase: scenario,
          scenarios: DEFAULT_SCENARIOS,
          objective: DEFAULT_OBJECTIVE,
        }),
      });
      if (!resp.ok) throw new Error(`Request failed: ${resp.status}`);
      const json = await resp.json();
      setData(json.data as ScenarioResponse);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to run scenarios";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-800">
          Scenario Modeling
        </div>
        <button
          onClick={run}
          disabled={loading}
          className={`px-3 py-1.5 rounded text-white ${
            loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Running..." : "Run Scenarios"}
        </button>
      </div>
      {error && (
        <div className="p-2 rounded bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}
      {!data ? (
        <div className="text-slate-600 text-sm">
          Select presets and run to compare with baseline.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2">Scenario</th>
                <th className="text-right p-2">NPV (Cr)</th>
                <th className="text-right p-2">IRR</th>
                <th className="text-right p-2">PAT Y1 (Cr)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="p-2 text-slate-700">Baseline</td>
                <td className="p-2 text-right font-mono">
                  {Math.round(((data.baseline.NPV || 0) / 1e7) * 10) / 10}
                </td>
                <td className="p-2 text-right font-mono">
                  {data.baseline.IRR === null
                    ? "—"
                    : `${Math.round((data.baseline.IRR || 0) * 1000) / 10}%`}
                </td>
                <td className="p-2 text-right font-mono">
                  {Math.round(((data.baseline.PNL_Y1 || 0) / 1e7) * 10) / 10}
                </td>
              </tr>
              {data.results.map((r) => (
                <tr key={r.scenarioId} className="border-b border-slate-100">
                  <td className="p-2 text-slate-700">{r.name}</td>
                  <td className="p-2 text-right font-mono">
                    {Math.round(((r.metrics.NPV || 0) / 1e7) * 10) / 10}
                  </td>
                  <td className="p-2 text-right font-mono">
                    {r.metrics.IRR === null
                      ? "—"
                      : `${Math.round((r.metrics.IRR || 0) * 1000) / 10}%`}
                  </td>
                  <td className="p-2 text-right font-mono">
                    {Math.round(((r.metrics.PNL_Y1 || 0) / 1e7) * 10) / 10}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
