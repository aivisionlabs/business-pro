"use client";
import React, { useState, useMemo } from "react";
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
    description: "Economic downturn with reduced demand",
    overrides: {
      "skus.0.sales.baseAnnualVolumePieces": 0.8,
    },
  },
  {
    id: "high-demand",
    name: "High Demand",
    description: "Strong market growth and increased sales",
    overrides: {
      "skus.0.sales.baseAnnualVolumePieces": 1.2,
    },
  },
  {
    id: "supply-disruption",
    name: "Supply Disruption",
    description: "Raw material cost increase",
    overrides: {
      "skus.0.costing.resinRsPerKg": 1.1,
    },
  },
  {
    id: "price-pressure",
    name: "Price Pressure",
    description: "Competitive pricing pressure",
    overrides: {
      "skus.0.sales.netPricePerPiece": 0.9,
    },
  },
  {
    id: "cost-inflation",
    name: "Cost Inflation",
    description: "General cost inflation across inputs",
    overrides: {
      "skus.0.costing.laborRsPerKg": 1.15,
      "skus.0.costing.overheadRsPerKg": 1.1,
    },
  },
];

const DEFAULT_OBJECTIVE: ObjectiveConfig = {
  metrics: ["NPV", "IRR", "PNL_Y1", "PNL_TOTAL"],
};

// Available variables for scenario creation
const AVAILABLE_VARIABLES = [
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
    id: "skus.0.costing.resinRsPerKg",
    label: "Resin Cost (Rs/Kg)",
    category: "Costing",
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
];

export default function RiskScenarios({ scenario }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ScenarioResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([
    "recession",
    "high-demand",
    "supply-disruption",
  ]);
  const [showConfig, setShowConfig] = useState(false);
  const [customScenarios, setCustomScenarios] = useState<ScenarioDefinition[]>(
    []
  );

  const activeScenarios = useMemo(() => {
    return [
      ...DEFAULT_SCENARIOS.filter((s) => selectedScenarios.includes(s.id)),
      ...customScenarios,
    ];
  }, [selectedScenarios, customScenarios]);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/simulations/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessCase: scenario,
          scenarios: activeScenarios,
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

  const toggleScenario = (scenarioId: string) => {
    setSelectedScenarios((prev) =>
      prev.includes(scenarioId)
        ? prev.filter((s) => s !== scenarioId)
        : [...prev, scenarioId]
    );
  };

  const addCustomScenario = () => {
    const newScenario: ScenarioDefinition = {
      id: `custom-${Date.now()}`,
      name: "Custom Scenario",
      description: "Custom scenario description",
      overrides: {},
    };
    setCustomScenarios((prev) => [...prev, newScenario]);
  };

  const removeCustomScenario = (scenarioId: string) => {
    setCustomScenarios((prev) => prev.filter((s) => s.id !== scenarioId));
    setSelectedScenarios((prev) => prev.filter((s) => s !== scenarioId));
  };

  const updateCustomScenario = (
    scenarioId: string,
    updates: Partial<ScenarioDefinition>
  ) => {
    setCustomScenarios((prev) =>
      prev.map((s) => (s.id === scenarioId ? { ...s, ...updates } : s))
    );
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Scenario Modeling
          </h2>
          <p className="text-slate-600 mt-1">
            Select presets and run to compare with baseline
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {showConfig ? "Hide Config" : "Configure Scenarios"}
          </button>
          <button
            onClick={run}
            disabled={loading || activeScenarios.length === 0}
            className={`px-6 py-2 rounded-lg text-white font-medium transition-colors ${
              loading || activeScenarios.length === 0
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Running..." : "Run Scenarios"}
          </button>
        </div>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">
              Preset Scenarios
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {DEFAULT_SCENARIOS.map((scenario) => (
                <div
                  key={scenario.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedScenarios.includes(scenario.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                  onClick={() => toggleScenario(scenario.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-800">
                        {scenario.name}
                      </h4>
                      <p className="text-sm text-slate-600 mt-1">
                        {scenario.description}
                      </p>
                      <div className="text-xs text-slate-500 mt-2">
                        {Object.entries(scenario.overrides).map(
                          ([key, value]) => (
                            <div key={key}>
                              {AVAILABLE_VARIABLES.find((v) => v.id === key)
                                ?.label || key}
                              :{" "}
                              {value > 1
                                ? `+${Math.round((value - 1) * 100)}%`
                                : `${Math.round((value - 1) * 100)}%`}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded border-2 ${
                        selectedScenarios.includes(scenario.id)
                          ? "border-blue-500 bg-blue-500"
                          : "border-slate-300"
                      }`}
                    >
                      {selectedScenarios.includes(scenario.id) && (
                        <svg
                          className="w-full h-full text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-800">
                Custom Scenarios
              </h3>
              <button
                onClick={addCustomScenario}
                className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 transition-colors"
              >
                + Add Custom
              </button>
            </div>

            {customScenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="mb-3 p-3 bg-white rounded-lg border border-slate-200"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={scenario.name}
                    onChange={(e) =>
                      updateCustomScenario(scenario.id, {
                        name: e.target.value,
                      })
                    }
                    placeholder="Scenario Name"
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                  <input
                    type="text"
                    value={scenario.description}
                    onChange={(e) =>
                      updateCustomScenario(scenario.id, {
                        description: e.target.value,
                      })
                    }
                    placeholder="Description"
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleScenario(scenario.id)}
                      className={`px-3 py-2 rounded-md text-sm ${
                        selectedScenarios.includes(scenario.id)
                          ? "bg-blue-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {selectedScenarios.includes(scenario.id)
                        ? "Selected"
                        : "Select"}
                    </button>
                    <button
                      onClick={() => removeCustomScenario(scenario.id)}
                      className="px-3 py-2 rounded-md bg-red-100 text-red-700 text-sm hover:bg-red-200"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <p className="text-slate-600">
            {activeScenarios.length === 0
              ? "Select scenarios to analyze"
              : `Ready to run ${activeScenarios.length} scenario${
                  activeScenarios.length !== 1 ? "s" : ""
                }`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800">
              <span className="font-medium">
                Analysis completed for {activeScenarios.length} scenario
                {activeScenarios.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 font-semibold text-slate-800">
                    Scenario
                  </th>
                  <th className="text-right p-3 font-semibold text-slate-800">
                    NPV (Cr)
                  </th>
                  <th className="text-right p-3 font-semibold text-slate-800">
                    IRR
                  </th>
                  <th className="text-right p-3 font-semibold text-slate-800">
                    PAT Y1 (Cr)
                  </th>
                  <th className="text-right p-3 font-semibold text-slate-800">
                    Change vs Baseline
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-800">
                <tr className="border-b border-slate-100 bg-slate-50 ">
                  <td className="p-3 text-slate-700 font-medium">Baseline</td>
                  <td className="p-3 text-right font-mono font-medium">
                    {Math.round(((data.baseline.NPV || 0) / 1e7) * 10) / 10}
                  </td>
                  <td className="p-3 text-right font-mono font-medium">
                    {data.baseline.IRR === null
                      ? "—"
                      : `${Math.round((data.baseline.IRR || 0) * 1000) / 10}%`}
                  </td>
                  <td className="p-3 text-right font-mono font-medium">
                    {Math.round(((data.baseline.PNL_Y1 || 0) / 1e7) * 10) / 10}
                  </td>
                  <td className="p-3 text-right text-slate-500">—</td>
                </tr>
                {data.results.map((r) => {
                  const npvChange =
                    (((r.metrics.NPV || 0) - (data.baseline.NPV || 0)) /
                      (data.baseline.NPV || 1)) *
                    100;
                  return (
                    <tr
                      key={r.scenarioId}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="p-3 text-slate-700">{r.name}</td>
                      <td className="p-3 text-right font-mono">
                        {Math.round(((r.metrics.NPV || 0) / 1e7) * 10) / 10}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {r.metrics.IRR === null
                          ? "—"
                          : `${Math.round((r.metrics.IRR || 0) * 1000) / 10}%`}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {Math.round(((r.metrics.PNL_Y1 || 0) / 1e7) * 10) / 10}
                      </td>
                      <td
                        className={`p-3 text-right font-medium ${
                          npvChange > 0
                            ? "text-green-600"
                            : npvChange < 0
                            ? "text-red-600"
                            : "text-slate-500"
                        }`}
                      >
                        {npvChange > 0 ? "+" : ""}
                        {Math.round(npvChange * 10) / 10}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
