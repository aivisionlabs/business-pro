"use client";

import { useState } from "react";
import { useBusinessCases } from "@/lib/hooks/useFirestore";
import Link from "next/link";

// Progress calculation functions (copied from CaseProgressBar)
interface TeamProgress {
  name: string;
  percentage: number;
  filledFields: number;
  totalFields: number;
  missingFields: string[];
  isComplete: boolean;
}

// Field configurations for each team
const TEAM_FIELD_CONFIGS = {
  finance: [
    {
      field: "corporateTaxRatePct",
      path: "finance.corporateTaxRatePct",
      mandatory: true,
    },
    { field: "debtPct", path: "finance.debtPct", mandatory: true },
    { field: "costOfDebtPct", path: "finance.costOfDebtPct", mandatory: true },
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
  npd: [
    { field: "machineName", path: "npd.machineName", mandatory: true },
    { field: "cavities", path: "npd.cavities", mandatory: true },
    {
      field: "cycleTimeSeconds",
      path: "npd.cycleTimeSeconds",
      mandatory: true,
    },
    { field: "plant", path: "plantMaster.plant", mandatory: true },
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
    {
      field: "newInfraRequired",
      path: "ops.newInfraRequired",
      mandatory: true,
    },
    {
      field: "costOfNewMachine",
      path: "ops.costOfNewMachine",
      mandatory: false,
    },
    {
      field: "costOfOldMachine",
      path: "ops.costOfOldMachine",
      mandatory: false,
    },
    { field: "costOfNewMould", path: "ops.costOfNewMould", mandatory: false },
    { field: "costOfOldMould", path: "ops.costOfOldMould", mandatory: false },
    { field: "costOfNewInfra", path: "ops.costOfNewInfra", mandatory: false },
    { field: "costOfOldInfra", path: "ops.costOfOldInfra", mandatory: false },
  ],
};

// Helper function to get value from nested object path
function getValueFromPath(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

// Calculate team progress for a specific SKU
function calculateTeamProgress(
  sku: any,
  team: keyof typeof TEAM_FIELD_CONFIGS,
  scenario: any
): TeamProgress {
  const config = TEAM_FIELD_CONFIGS[team];
  let completedFields = 0;
  let totalFields = 0;
  const missingFields: string[] = [];

  config.forEach(({ field, path, mandatory }) => {
    if (mandatory || team === "finance") {
      totalFields++;

      let value: any;
      if (path === "name") {
        value = sku.name;
      } else if (path.startsWith("finance.")) {
        value = getValueFromPath(scenario.finance, path.split(".")[1]);
      } else {
        value = getValueFromPath(sku, path);
      }

      if (value !== undefined && value !== null && value !== "") {
        completedFields++;
      } else if (mandatory) {
        missingFields.push(field);
      }
    }
  });

  // Special handling for Ops team - mark as complete if any field is filled
  let isComplete = false;
  if (team === "ops") {
    isComplete = completedFields > 0; // Complete if any field is filled
  } else {
    isComplete = completedFields === totalFields;
  }

  const percentage =
    totalFields > 0 ? (completedFields / totalFields) * 100 : 100;

  return {
    name: team.charAt(0).toUpperCase() + team.slice(1),
    percentage: Math.max(0, Math.min(100, percentage)),
    filledFields: completedFields,
    totalFields,
    missingFields,
    isComplete,
  };
}

// Calculate overall case progress
function calculateCaseProgress(scenario: any): number {
  if (scenario.skus?.length === 0) {
    return 0;
  }

  // Calculate progress for each team across all SKUs
  const teamProgress: TeamProgress[] = [];
  const teams: (keyof typeof TEAM_FIELD_CONFIGS)[] = [
    "finance",
    "sales",
    "npd",
    "pricing",
    "ops",
  ];

  teams.forEach((team) => {
    if (team === "finance") {
      // Finance is case-level, calculate once
      const progress = calculateTeamProgress(scenario.skus[0], team, scenario);
      teamProgress.push(progress);
    } else {
      // For SKU-level teams, calculate average across all SKUs
      let totalPercentage = 0;
      let totalFilledFields = 0;
      let totalTotalFields = 0;
      const allMissingFields = new Set<string>();

      scenario.skus.forEach((sku: any) => {
        const progress = calculateTeamProgress(sku, team, scenario);
        totalPercentage += progress.percentage;
        totalFilledFields += progress.filledFields;
        totalTotalFields += progress.totalFields;
        progress.missingFields.forEach((field) => allMissingFields.add(field));
      });

      const avgProgress: TeamProgress = {
        name: team.charAt(0).toUpperCase() + team.slice(1),
        percentage: totalPercentage / scenario.skus.length,
        filledFields: totalFilledFields,
        totalFields: totalTotalFields,
        missingFields: Array.from(allMissingFields),
        isComplete: scenario.skus.every(
          (sku: any) => calculateTeamProgress(sku, team, scenario).isComplete
        ),
      };

      teamProgress.push(avgProgress);
    }
  });

  // Calculate overall percentage (average of all teams)
  const overallPercentage =
    teamProgress.reduce((sum, team) => sum + team.percentage, 0) /
    teamProgress.length;

  return Math.round(overallPercentage);
}

// Progress Pill Component
function ProgressPill({ percentage }: { percentage: number }) {
  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-100 text-green-800 border-green-200";
    if (percentage >= 60)
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (percentage >= 40)
      return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  return (
    <div
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getProgressColor(
        percentage
      )}`}
    >
      {percentage}% Complete
    </div>
  );
}

export default function CasesPage() {
  const { businessCases, loading, error } = useBusinessCases();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  async function handleCreateCase() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      // Use the API route instead of the hook directly to avoid type issues
      const res = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        throw new Error("Failed to create case");
      }

      const { id: newId } = await res.json();

      // Clear the input
      setName("");

      // Redirect to the new case
      window.location.href = `/cases/${newId}`;
    } catch (error) {
      console.error("Error creating case:", error);
      alert("Failed to create case. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="mx-auto max-w-4xl px-4 py-10 pt-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading cases...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="mx-auto max-w-4xl px-4 py-10 pt-16">
          <div className="text-center">
            <div className="text-red-600 text-xl font-semibold mb-4">
              Error loading cases
            </div>
            <p className="text-slate-600">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="mx-auto max-w-4xl px-4 py-10 pt-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Business Case Manager
          </h1>
          <p className="text-slate-600">
            Create and manage your business cases
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Create a new case
          </h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter case name"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === "Enter" && handleCreateCase()}
            />
            <button
              onClick={handleCreateCase}
              disabled={creating || !name.trim()}
              className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Your cases ({businessCases.length})
          </h2>

          {businessCases.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No business cases yet. Create your first one above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {businessCases.map((businessCase) => {
                const progress = calculateCaseProgress(businessCase);
                return (
                  <Link
                    key={businessCase.id}
                    href={`/cases/${businessCase.id}`}
                    className="block p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-slate-900">
                            {businessCase.name}
                          </h3>
                          <ProgressPill percentage={progress} />
                        </div>
                        <p className="text-sm text-slate-500">
                          {businessCase.skus?.length || 0} SKU
                          {businessCase.skus?.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">
                          {new Date(
                            businessCase.updatedAt
                          ).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(
                            businessCase.updatedAt
                          ).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
