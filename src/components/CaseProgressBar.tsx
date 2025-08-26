import React from "react";
import { BusinessCase, Sku } from "@/lib/types";
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";

interface TeamProgress {
  name: string;
  percentage: number;
  filledFields: number;
  totalFields: number;
  missingFields: string[];
  isComplete: boolean;
}

interface CaseProgressBarProps {
  scenario: BusinessCase;
  onTeamCardClick?: (teamName: string) => void;
  expandedTeam?: string | null;
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
  sku: Sku,
  team: keyof typeof TEAM_FIELD_CONFIGS,
  scenario: BusinessCase
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
function calculateCaseProgress(scenario: BusinessCase): {
  overallPercentage: number;
  teamProgress: TeamProgress[];
} {
  if (scenario.skus.length === 0) {
    return {
      overallPercentage: 0,
      teamProgress: [],
    };
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

      scenario.skus.forEach((sku) => {
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
          (sku) => calculateTeamProgress(sku, team, scenario).isComplete
        ),
      };

      teamProgress.push(avgProgress);
    }
  });

  // Calculate overall percentage (average of all teams)
  const overallPercentage =
    teamProgress.reduce((sum, team) => sum + team.percentage, 0) /
    teamProgress.length;

  return {
    overallPercentage: Math.round(overallPercentage),
    teamProgress,
  };
}

export default function CaseProgressBar({
  scenario,
  onTeamCardClick,
  expandedTeam,
}: CaseProgressBarProps) {
  const { overallPercentage, teamProgress } = calculateCaseProgress(scenario);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "success";
    if (percentage >= 60) return "warning";
    return "error";
  };

  const getTeamIcon = (team: TeamProgress) => {
    if (team.isComplete) return <CheckCircleIcon color="success" />;
    if (team.percentage >= 50) return <WarningIcon color="warning" />;
    return <InfoIcon color="info" />;
  };

  const handleTeamCardClick = (teamName: string) => {
    if (onTeamCardClick) {
      onTeamCardClick(teamName);
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        {/* Overall Progress Header */}
        <Box sx={{ mb: 3 }}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={2}
          >
            <Typography variant="h6" fontWeight={600}>
              Case Progress
            </Typography>
            <Chip
              label={`${overallPercentage}% Complete`}
              color={getProgressColor(overallPercentage)}
              variant="filled"
              size="medium"
            />
          </Box>
          <LinearProgress
            variant="determinate"
            value={overallPercentage}
            color={getProgressColor(overallPercentage)}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Team Progress Grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(5, 1fr)",
            },
            gap: 2,
          }}
        >
          {teamProgress.map((team) => {
            const isExpanded = expandedTeam === team.name.toLowerCase();
            return (
              <Box
                key={team.name}
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: team.isComplete ? "success.main" : "divider",
                  borderRadius: 2,
                  backgroundColor: team.isComplete
                    ? "success.50"
                    : "background.paper",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    backgroundColor: team.isComplete
                      ? "success.100"
                      : "grey.50",
                    transform: "translateY(-2px)",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                  },
                }}
                onClick={() => handleTeamCardClick(team.name)}
              >
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  mb={1}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    {getTeamIcon(team)}
                    <Typography variant="subtitle2" fontWeight={600}>
                      {team.name}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </Box>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={team.percentage}
                  color={getProgressColor(team.percentage)}
                  sx={{ height: 6, borderRadius: 3, mb: 1 }}
                />

                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="caption" color="text.secondary">
                    {team.filledFields}/{team.totalFields}
                  </Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {Math.round(team.percentage)}%
                  </Typography>
                </Box>

                {/* Missing Fields Tooltip */}
                {team.missingFields.length > 0 && (
                  <Tooltip
                    title={
                      <Box>
                        <Typography variant="caption" fontWeight={600}>
                          Missing fields:
                        </Typography>
                        <ul style={{ margin: "4px 0", paddingLeft: "16px" }}>
                          {team.missingFields.map((field) => (
                            <li key={field}>
                              <Typography variant="caption">{field}</Typography>
                            </li>
                          ))}
                        </ul>
                      </Box>
                    }
                    arrow
                  >
                    <Chip
                      label={`${team.missingFields.length} missing`}
                      color="warning"
                      variant="outlined"
                      size="small"
                      sx={{ mt: 1, fontSize: "0.7rem" }}
                    />
                  </Tooltip>
                )}

                {/* Completion Status */}
                {team.isComplete && (
                  <Chip
                    label="Complete"
                    color="success"
                    variant="outlined"
                    size="small"
                    sx={{ mt: 1, fontSize: "0.7rem" }}
                  />
                )}

                {/* Click to expand hint */}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    mt: 1,
                    display: "block",
                    fontStyle: "italic",
                    textAlign: "center",
                  }}
                >
                  Click to {isExpanded ? "collapse" : "expand"}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Progress Summary */}
        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "divider" }}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {overallPercentage === 100
              ? "🎉 Case is complete! All required fields have been filled."
              : `Complete ${scenario.skus.length} more field${
                  scenario.skus.length !== 1 ? "s" : ""
                } to finish the case.`}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
