"use client";
import React, { useState, useMemo } from "react";
import {
  BusinessCase,
  ScenarioResponse,
  ScenarioDefinition,
  ObjectiveConfig,
  OutcomeMetric,
} from "@/lib/types";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  LinearProgress,
  Typography,
  Fade,
  Zoom,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from "@mui/material";
import {
  Analytics,
  TrendingUp,
  TrendingDown,
  Settings,
  PlayArrow,
  CheckCircle,
  Warning,
  Info,
  BarChart,
  ShowChart,
  Radar,
  CompareArrows,
  Timeline,
  Assessment,
  Add,
  Delete,
} from "@mui/icons-material";

// Radar Chart Component for Scenario Comparison
const ScenarioRadarChart = ({
  data,
  selectedMetrics,
}: {
  data: ScenarioResponse | null;
  selectedMetrics: string[];
}) => {
  if (!data || !data.results || data.results.length === 0) return null;

  const maxValues = selectedMetrics.reduce((acc, metric) => {
    const values = data.results.map(
      (r) => (r.metrics[metric as keyof typeof r.metrics] as number) || 0
    );
    acc[metric] = Math.max(
      ...values,
      (data.baseline[metric as keyof typeof data.baseline] as number) || 0
    );
    return acc;
  }, {} as Record<string, number>);

  const minValues = selectedMetrics.reduce((acc, metric) => {
    const values = data.results.map(
      (r) => (r.metrics[metric as keyof typeof r.metrics] as number) || 0
    );
    acc[metric] = Math.min(
      ...values,
      (data.baseline[metric as keyof typeof data.baseline] as number) || 0
    );
    return acc;
  }, {} as Record<string, number>);

  return (
    <Box
      sx={{
        mt: 3,
        p: 3,
        bgcolor: "#f8fafc",
        borderRadius: 2,
        border: "1px solid #e2e8f0",
      }}
    >
      <Typography
        variant="h6"
        sx={{ mb: 3, color: "text.secondary", textAlign: "center" }}
      >
        <Radar sx={{ mr: 1, verticalAlign: "middle" }} />
        Scenario Performance Radar
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 3,
        }}
      >
        {selectedMetrics.map((metric) => {
          const baseline =
            (data.baseline[metric as keyof typeof data.baseline] as number) ||
            0;
          const maxVal = maxValues[metric];
          const minVal = minValues[metric];
          const range = Math.max(Math.abs(maxVal), Math.abs(minVal));

          // Calculate normalized position (0-100%)
          const normalizedPosition =
            range > 0 ? ((baseline - minVal) / (maxVal - minVal)) * 100 : 50;

          return (
            <Paper
              key={metric}
              elevation={0}
              sx={{
                p: 2,
                textAlign: "center",
                border: "1px solid #e2e8f0",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                },
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, fontWeight: 600, color: "text.secondary" }}
              >
                {metric}
              </Typography>

              {/* Enhanced Circular Progress Indicator */}
              <Box sx={{ position: "relative", display: "inline-flex", mb: 2 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: `conic-gradient(from 0deg,
                      ${baseline >= 0 ? "#3b82f6" : "#ef4444"} 0deg,
                      ${baseline >= 0 ? "#3b82f6" : "#ef4444"} ${
                      normalizedPosition * 3.6
                    }deg,
                      #e5e7eb ${normalizedPosition * 3.6}deg, #e5e7eb 360deg)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      bgcolor: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      color: baseline >= 0 ? "#0369a1" : "#dc2626",
                    }}
                  >
                    {metric === "IRR"
                      ? `${(baseline * 100).toFixed(1)}%`
                      : metric.includes("NPV") || metric.includes("PNL")
                      ? `${(baseline / 10000000).toFixed(1)}Cr`
                      : baseline.toFixed(0)}
                  </Box>
                </Box>

                {/* Performance indicator dot */}
                <Box
                  sx={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    bgcolor: baseline >= 0 ? "#10b981" : "#ef4444",
                    border: "2px solid white",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  }}
                />
              </Box>

              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Baseline:{" "}
                {metric === "IRR"
                  ? `${(baseline * 100).toFixed(1)}%`
                  : metric.includes("NPV") || metric.includes("PNL")
                  ? `₹${(baseline / 10000000).toFixed(1)}Cr`
                  : baseline.toFixed(0)}
              </Typography>

              {/* Range indicator */}
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", display: "block", mt: 0.5 }}
              >
                Range:{" "}
                {metric.includes("NPV") || metric.includes("PNL")
                  ? `₹${(minVal / 10000000).toFixed(1)}Cr - ₹${(
                      maxVal / 10000000
                    ).toFixed(1)}Cr`
                  : `${minVal.toFixed(1)} - ${maxVal.toFixed(1)}`}
              </Typography>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
};

// Comparison Bars Component
const ScenarioComparisonBars = ({
  data,
  selectedMetric,
}: {
  data: ScenarioResponse | null;
  selectedMetric: string;
}) => {
  if (!data || !data.results || data.results.length === 0) return null;

  const baseline =
    (data.baseline[selectedMetric as keyof typeof data.baseline] as number) ||
    0;
  const maxValue = Math.max(
    ...data.results.map(
      (r) =>
        (r.metrics[selectedMetric as keyof typeof r.metrics] as number) || 0
    ),
    baseline
  );
  const minValue = Math.min(
    ...data.results.map(
      (r) =>
        (r.metrics[selectedMetric as keyof typeof r.metrics] as number) || 0
    ),
    baseline
  );

  return (
    <Box
      sx={{
        mt: 3,
        p: 3,
        bgcolor: "#fefefe",
        borderRadius: 2,
        border: "1px solid #e2e8f0",
      }}
    >
      <Typography
        variant="h6"
        sx={{ mb: 3, color: "text.secondary", textAlign: "center" }}
      >
        <BarChart sx={{ mr: 1, verticalAlign: "middle" }} />
        {selectedMetric} Comparison
      </Typography>

      <Box sx={{ position: "relative" }}>
        {/* Enhanced Baseline line */}
        <Box
          sx={{
            position: "absolute",
            left: `${
              (Math.abs(baseline - minValue) / Math.abs(maxValue - minValue)) *
              100
            }%`,
            top: 0,
            bottom: 0,
            width: 3,
            bgcolor: "primary.main",
            zIndex: 2,
            borderRadius: 1,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        />

        {/* Baseline label */}
        <Box
          sx={{
            position: "absolute",
            left: `${
              (Math.abs(baseline - minValue) / Math.abs(maxValue - minValue)) *
              100
            }%`,
            top: -25,
            transform: "translateX(-50%)",
            px: 1,
            py: 0.5,
            bgcolor: "primary.main",
            color: "white",
            borderRadius: 1,
            fontSize: "0.7rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
            zIndex: 3,
          }}
        >
          Baseline
        </Box>

        {data.results.map((scenario, index) => {
          const value =
            (scenario.metrics[
              selectedMetric as keyof typeof scenario.metrics
            ] as number) || 0;
          const percentage =
            (Math.abs(value - minValue) / Math.abs(maxValue - minValue)) * 100;
          const isPositive = value > baseline;

          return (
            <Box key={scenario.scenarioId} sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: "text.primary" }}
                >
                  {scenario.name}
                </Typography>
                <Chip
                  label={
                    scenario.metrics[
                      selectedMetric as keyof typeof scenario.metrics
                    ]
                      ? selectedMetric === "IRR"
                        ? `${(value * 100).toFixed(1)}%`
                        : selectedMetric.includes("NPV") ||
                          selectedMetric.includes("PNL")
                        ? `₹${(value / 10000000).toFixed(1)}Cr`
                        : value.toFixed(0)
                      : "N/A"
                  }
                  size="small"
                  color={isPositive ? "success" : "error"}
                  variant="outlined"
                  sx={{
                    fontWeight: 600,
                    minWidth: 80,
                    justifyContent: "center",
                  }}
                />
              </Box>

              <Box
                sx={{
                  position: "relative",
                  height: 40,
                  bgcolor: "#f1f5f9",
                  borderRadius: 2,
                  overflow: "hidden",
                  border: "1px solid #e2e8f0",
                }}
              >
                {/* Enhanced bar with gradient and shadow */}
                <Box
                  sx={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    height: "100%",
                    width: `${percentage}%`,
                    background: isPositive
                      ? "linear-gradient(90deg, #10b981 0%, #059669 100%)"
                      : "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)",
                    borderRadius: 2,
                    transition: "width 0.8s ease, box-shadow 0.3s ease",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    zIndex: 1,
                    "&:hover": {
                      boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                    },
                  }}
                />

                {/* Enhanced percentage change indicator */}
                {baseline !== 0 && (
                  <Box
                    sx={{
                      position: "absolute",
                      left:
                        percentage < 10
                          ? "15%"
                          : `${Math.max(5, Math.min(percentage - 5, 85))}%`,
                      top: "50%",
                      transform: "translateY(-50%)",
                      px: 1.5,
                      py: 0.5,
                      bgcolor: "white",
                      borderRadius: 1,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: isPositive ? "#059669" : "#dc2626",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                      zIndex: 10,
                      border: "1px solid",
                      borderColor: isPositive ? "#d1fae5" : "#fecaca",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isPositive ? "+" : ""}
                    {(((value - baseline) / Math.abs(baseline)) * 100).toFixed(
                      1
                    )}
                    %
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// Trend Lines Component
const ScenarioTrendLines = ({
  data,
  selectedMetric,
}: {
  data: ScenarioResponse | null;
  selectedMetric: string;
}) => {
  if (!data || !data.results || data.results.length === 0) return null;

  const baseline =
    (data.baseline[selectedMetric as keyof typeof data.baseline] as number) ||
    0;
  const sortedScenarios = [...data.results].sort((a, b) => {
    const aVal =
      (a.metrics[selectedMetric as keyof typeof a.metrics] as number) || 0;
    const bVal =
      (b.metrics[selectedMetric as keyof typeof b.metrics] as number) || 0;
    return aVal - bVal;
  });

  // Calculate the range for better scaling
  const values = sortedScenarios.map(
    (s) => (s.metrics[selectedMetric as keyof typeof s.metrics] as number) || 0
  );
  const minVal = Math.min(...values, baseline);
  const maxVal = Math.max(...values, baseline);
  const range = maxVal - minVal;

  return (
    <Box
      sx={{
        mt: 3,
        p: 3,
        bgcolor: "#fefefe",
        borderRadius: 2,
        border: "1px solid #e2e8f0",
      }}
    >
      <Typography
        variant="h6"
        sx={{ mb: 3, color: "text.secondary", textAlign: "center" }}
      >
        <Timeline sx={{ mr: 1, verticalAlign: "middle" }} />
        {selectedMetric} Trend Analysis
      </Typography>

      <Box sx={{ position: "relative", height: 250, p: 2 }}>
        {/* Enhanced Y-axis labels */}
        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 80,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "flex-end",
            pr: 2,
          }}
        >
          {[0, 25, 50, 75, 100].map((percent) => (
            <Box
              key={percent}
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 1,
                  bgcolor: "#e2e8f0",
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontSize: "0.7rem",
                  fontWeight: 500,
                }}
              >
                {percent}%
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Chart area */}
        <Box
          sx={{ position: "absolute", left: 80, top: 0, right: 0, bottom: 0 }}
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((percent) => (
            <Box
              key={percent}
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${percent}%`,
                height: 1,
                bgcolor: "#f1f5f9",
                zIndex: 1,
              }}
            />
          ))}

          {/* Enhanced Baseline line */}
          <Box
            sx={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "50%",
              height: 2,
              bgcolor: "primary.main",
              opacity: 0.8,
              zIndex: 2,
              borderRadius: 1,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          />

          {/* Baseline label */}
          <Box
            sx={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              px: 1.5,
              py: 0.5,
              bgcolor: "primary.main",
              color: "white",
              borderRadius: 1,
              fontSize: "0.7rem",
              fontWeight: 600,
              zIndex: 3,
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            Baseline
          </Box>

          {/* Enhanced Trend line with connecting lines */}
          <Box
            sx={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              zIndex: 2,
            }}
          >
            {/* Connect scenarios with lines */}
            {sortedScenarios.map((scenario, index) => {
              if (index === 0) return null;

              const prevValue =
                (sortedScenarios[index - 1].metrics[
                  selectedMetric as OutcomeMetric
                ] as number) || 0;
              const currentValue =
                (scenario.metrics[selectedMetric as OutcomeMetric] as number) ||
                0;

              const prevX = ((index - 1) / (sortedScenarios.length - 1)) * 100;
              const currentX = (index / (sortedScenarios.length - 1)) * 100;

              const prevY = 100 - ((prevValue - minVal) / range) * 100;
              const currentY = 100 - ((currentValue - minVal) / range) * 100;

              return (
                <Box
                  key={`line-${index}`}
                  sx={{
                    position: "absolute",
                    left: `${prevX}%`,
                    top: `${prevY}%`,
                    width: `${currentX - prevX}%`,
                    height: 2,
                    background:
                      "linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)",
                    transform: `rotate(${
                      Math.atan2(currentY - prevY, currentX - prevX) *
                      (180 / Math.PI)
                    }deg)`,
                    transformOrigin: "0 0",
                    zIndex: 1,
                    opacity: 0.6,
                  }}
                />
              );
            })}

            {/* Enhanced data points */}
            {sortedScenarios.map((scenario, index) => {
              const value =
                (scenario.metrics[
                  selectedMetric as keyof typeof scenario.metrics
                ] as number) || 0;
              const percentage =
                range > 0 ? ((value - baseline) / range) * 100 : 0;
              const x = (index / (sortedScenarios.length - 1)) * 100;
              const y = 100 - ((value - minVal) / range) * 100;

              return (
                <Box
                  key={scenario.scenarioId}
                  sx={{
                    position: "absolute",
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: "translate(-50%, -50%)",
                    zIndex: 3,
                  }}
                >
                  {/* Enhanced data point */}
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      bgcolor: percentage > 0 ? "#10b981" : "#ef4444",
                      border: "3px solid white",
                      boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "scale(1.2)",
                        boxShadow: "0 6px 12px rgba(0,0,0,0.3)",
                      },
                    }}
                  />

                  {/* Enhanced scenario label */}
                  <Typography
                    variant="caption"
                    sx={{
                      position: "absolute",
                      top: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      whiteSpace: "nowrap",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      color: "text.secondary",
                      mt: 1,
                      px: 1,
                      py: 0.5,
                      bgcolor: "white",
                      borderRadius: 1,
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {scenario.name}
                  </Typography>

                  {/* Value tooltip */}
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      mb: 1,
                      px: 1.5,
                      py: 0.5,
                      bgcolor: percentage > 0 ? "#10b981" : "#ef4444",
                      color: "white",
                      borderRadius: 1,
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      opacity: 0,
                      transition: "opacity 0.3s ease",
                      "&:hover": {
                        opacity: 1,
                      },
                    }}
                  >
                    {selectedMetric === "IRR"
                      ? `${(value * 100).toFixed(1)}%`
                      : selectedMetric.includes("NPV") ||
                        selectedMetric.includes("PNL")
                      ? `₹${(value / 10000000).toFixed(1)}Cr`
                      : value.toFixed(0)}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

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
    icon: <TrendingUp color="primary" />,
  },
  {
    id: "skus.0.sales.netPricePerPiece",
    label: "Net Price per Piece",
    category: "Sales",
    icon: <Analytics color="primary" />,
  },
  {
    id: "skus.0.costing.resinRsPerKg",
    label: "Resin Cost (Rs/Kg)",
    category: "Costing",
    icon: <Warning color="warning" />,
  },
  {
    id: "skus.0.costing.laborRsPerKg",
    label: "Labor Cost (Rs/Kg)",
    category: "Costing",
    icon: <Info color="info" />,
  },
  {
    id: "skus.0.costing.overheadRsPerKg",
    label: "Overhead Cost (Rs/Kg)",
    category: "Costing",
    icon: <Info color="info" />,
  },
  {
    id: "finance.costOfDebtPct",
    label: "Cost of Debt (%)",
    category: "Finance",
    icon: <Analytics color="primary" />,
  },
  {
    id: "finance.equityContributionPct",
    label: "Equity Contribution (%)",
    category: "Finance",
    icon: <Analytics color="primary" />,
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
  const [selectedMetric, setSelectedMetric] = useState<string>("NPV");

  const activeScenarios = useMemo(() => {
    return [
      ...DEFAULT_SCENARIOS.filter((s) => selectedScenarios.includes(s.id)),
      ...customScenarios,
    ];
  }, [selectedScenarios, customScenarios]);

  async function run() {
    setLoading(true);
    setError(null);

    // Validate BusinessCase structure
    if (!scenario.skus || scenario.skus.length === 0) {
      setError("Business case must have at least one SKU");
      setLoading(false);
      return;
    }

    // Check if the first SKU has the required properties
    const firstSku = scenario.skus[0];
    if (!firstSku.sales || !firstSku.costing || !firstSku.plantMaster) {
      setError("SKU must have sales, costing, and plantMaster properties");
      setLoading(false);
      return;
    }

    // Simulate 5-second calculation time
    await new Promise((resolve) => setTimeout(resolve, 5000));

    try {
      console.log("Sending scenario request:", {
        businessCase: scenario.id,
        scenarios: activeScenarios.map((s) => ({ id: s.id, name: s.name })),
        objective: DEFAULT_OBJECTIVE,
      });

      const resp = await fetch("/api/simulations/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessCase: scenario,
          scenarios: activeScenarios,
          objective: DEFAULT_OBJECTIVE,
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        console.error("Scenario API error:", resp.status, errorData);
        throw new Error(
          `API request failed: ${resp.status} - ${
            errorData.error || "Unknown error"
          }`
        );
      }

      const json = await resp.json();
      console.log("Scenario API response:", json);
      setData(json.data as ScenarioResponse);
    } catch (e) {
      console.error("Scenario analysis error:", e);
      const message =
        e instanceof Error ? e.message : "Failed to run scenarios";
      setError(message);

      // For demo purposes, create mock data if API fails
      console.log("Creating fallback mock data for demonstration");
      const mockData: ScenarioResponse = {
        baseline: {
          NPV: 12500000,
          IRR: 0.18,
          PNL_Y1: 2500000,
          PNL_TOTAL: 15000000,
        },
        results: activeScenarios.map((scenario, index) => ({
          scenarioId: scenario.id,
          name: scenario.name,
          metrics: {
            NPV: 12500000 + index * 2000000,
            IRR: 0.18 + index * 0.03,
            PNL_Y1: 2500000 + index * 300000,
            PNL_TOTAL: 15000000 + index * 2000000,
          },
        })),
      };
      setData(mockData);
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

  const removeCustomScenario = (scenarioId: string) =>
    setCustomScenarios((prev) => prev.filter((s) => s.id !== scenarioId));

  return (
    <Box>
      {/* Premium Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          borderRadius: 3,
          p: 4,
          mb: 3,
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            background: "rgba(255,255,255,0.1)",
            borderRadius: "50%",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -30,
            left: -30,
            width: 150,
            height: 150,
            background: "rgba(255,255,255,0.05)",
            borderRadius: "50%",
          }}
        />

        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            🌟 Scenario Modeling & Risk Assessment
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9, maxWidth: 600 }}>
            Explore multiple business scenarios and understand their impact on
            your financial metrics. Compare best-case, worst-case, and custom
            scenarios to make informed decisions.
          </Typography>
        </Box>
      </Box>

      {/* Configuration Panel */}
      <Card
        elevation={0}
        sx={{
          border: "2px solid #f0f0f0",
          borderRadius: 3,
          mb: 3,
          background: "linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#2c3e50" }}>
              ⚙️ Scenario Configuration
            </Typography>
            <Button
              variant="outlined"
              onClick={() => setShowConfig(!showConfig)}
              startIcon={<Settings />}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              {showConfig ? "Hide Config" : "Configure Scenarios"}
            </Button>
          </Box>

          <Collapse in={showConfig}>
            <Box sx={{ mt: 3 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, mb: 3, color: "#34495e" }}
              >
                🎯 Select Scenarios to Compare
              </Typography>

              {/* Preset Scenarios */}
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 600, mb: 2, color: "#374151" }}
                >
                  📋 Preset Scenarios
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  {DEFAULT_SCENARIOS.map((scenario) => (
                    <Paper
                      key={scenario.id}
                      elevation={0}
                      sx={{
                        p: 3,
                        cursor: "pointer",
                        border: "2px solid",
                        borderRadius: 3,
                        transition: "all 0.3s ease",
                        transform: selectedScenarios.includes(scenario.id)
                          ? "scale(1.02)"
                          : "scale(1)",
                        borderColor: selectedScenarios.includes(scenario.id)
                          ? "#8b5cf6"
                          : "#e5e7eb",
                        bgcolor: selectedScenarios.includes(scenario.id)
                          ? "#f3f4f6"
                          : "white",
                        "&:hover": {
                          transform: "scale(1.02)",
                          boxShadow: "0 8px 25px rgba(139, 92, 246, 0.2)",
                        },
                      }}
                      onClick={() => toggleScenario(scenario.id)}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          mb: 2,
                        }}
                      >
                        <Box>
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 600, color: "#1f2937" }}
                          >
                            {scenario.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ color: "#6b7280", fontSize: "0.875rem" }}
                          >
                            {scenario.description}
                          </Typography>
                        </Box>

                        {selectedScenarios.includes(scenario.id) && (
                          <CheckCircle
                            sx={{ color: "#8b5cf6", fontSize: "1.5rem" }}
                          />
                        )}
                      </Box>

                      {/* Variable Details Preview */}
                      {Object.keys(scenario.overrides || {}).length > 0 && (
                        <Box
                          sx={{
                            mt: 2,
                            pt: 2,
                            borderTop: "1px solid #f3f4f6",
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#6b7280",
                              fontWeight: 600,
                              display: "block",
                              mb: 1,
                            }}
                          >
                            Key Changes:
                          </Typography>
                          <Box
                            sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}
                          >
                            {Object.entries(scenario.overrides || {})
                              .slice(0, 3)
                              .map(([path, value]) => (
                                <Chip
                                  key={path}
                                  label={`${path.split(".").pop()}: ${
                                    typeof value === "number"
                                      ? path.includes("Pct")
                                        ? `${(value * 100).toFixed(1)}%`
                                        : path.includes("Rs")
                                        ? `₹${value.toFixed(2)}`
                                        : value.toFixed(2)
                                      : String(value)
                                  }`}
                                  size="medium"
                                  variant="outlined"
                                  sx={{
                                    fontSize: "0.75rem",
                                    height: 22,
                                    px: 1,
                                    "& .MuiChip-label": {
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    },
                                  }}
                                />
                              ))}
                            {Object.keys(scenario.overrides || {}).length >
                              3 && (
                              <Chip
                                label={`+${
                                  Object.keys(scenario.overrides || {}).length -
                                  3
                                } more`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: "0.75rem", height: 22, px: 1 }}
                              />
                            )}
                          </Box>
                        </Box>
                      )}
                    </Paper>
                  ))}
                </Box>
              </Box>
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* Run Button */}
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Button
          variant="contained"
          size="large"
          onClick={run}
          disabled={loading || activeScenarios.length === 0}
          startIcon={loading ? null : <CompareArrows />}
          sx={{
            background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            borderRadius: 3,
            px: 6,
            py: 2,
            fontSize: "1.1rem",
            fontWeight: 700,
            textTransform: "none",
            boxShadow: "0 10px 25px rgba(240, 147, 251, 0.3)",
            "&:hover": {
              background: "linear-gradient(135deg, #e085e8 0%, #e04a5f 100%)",
              boxShadow: "0 15px 35px rgba(240, 147, 251, 0.4)",
              transform: "translateY(-2px)",
            },
            "&:disabled": {
              background: "#e5e7eb",
              boxShadow: "none",
              transform: "none",
            },
          }}
        >
          {loading ? "Analyzing..." : "🚀 Run Scenario Analysis"}
        </Button>
      </Box>

      {/* Loading State */}
      {loading && (
        <Fade in={loading}>
          <Card
            elevation={0}
            sx={{
              border: "2px solid #f0f0f0",
              borderRadius: 3,
              mb: 3,
              background: "linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)",
            }}
          >
            <CardContent sx={{ p: 4, textAlign: "center" }}>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: "#2c3e50", mb: 2 }}
                >
                  🔬 Running Advanced Scenario Analysis
                </Typography>
                <Typography variant="body2" sx={{ color: "#6b7280", mb: 3 }}>
                  Analyzing {activeScenarios.length} scenarios with advanced
                  financial modeling...
                </Typography>
                <LinearProgress
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    background: "#e5e7eb",
                    "& .MuiLinearProgress-bar": {
                      background:
                        "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                      borderRadius: 4,
                    },
                  }}
                />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                {activeScenarios.map((scenario, index) => (
                  <Chip
                    key={scenario.id}
                    label={scenario.name}
                    sx={{
                      background:
                        "linear-gradient(145deg, #fdf2f8 0%, #fce7f3 100%)",
                      border: "1px solid #f093fb",
                      color: "#be185d",
                      fontWeight: 600,
                      animation: `pulse 2s infinite ${index * 0.2}s`,
                      "@keyframes pulse": {
                        "0%, 100%": { opacity: 1 },
                        "50%": { opacity: 0.7 },
                      },
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Fade>
      )}

      {/* Results */}
      {data && !loading && (
        <Zoom in={!loading}>
          <Card
            elevation={0}
            sx={{
              border: "2px solid #f0f0f0",
              borderRadius: 3,
              background: "linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)",
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, mb: 3, color: "#2c3e50" }}
              >
                📊 Scenario Analysis Results
              </Typography>

              {/* Summary Insights */}
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, color: "#374151", mb: 2 }}
                >
                  🔍 Key Insights Summary
                </Typography>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, 1fr)",
                      md: "repeat(3, 1fr)",
                    },
                    gap: 2,
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      textAlign: "center",
                      border: "1px solid #e5e7eb",
                      borderRadius: 2,
                      background:
                        "linear-gradient(145deg, #f0f9ff 0%, #e0f2fe 100%)",
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ color: "#0369a1", fontWeight: 700 }}
                    >
                      {data?.results?.length || 0}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#0c4a6e" }}>
                      Total Scenarios
                    </Typography>
                  </Paper>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      textAlign: "center",
                      border: "1px solid #e5e7eb",
                      borderRadius: 2,
                      background:
                        "linear-gradient(145deg, #fef3c7 0%, #fde68a 100%)",
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ color: "#92400e", fontWeight: 700 }}
                    >
                      {activeScenarios.length}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#78350f" }}>
                      Active Scenarios
                    </Typography>
                  </Paper>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      textAlign: "center",
                      border: "1px solid #e5e7eb",
                      borderRadius: 2,
                      background:
                        "linear-gradient(145deg, #dcfce7 0%, #bbf7d0 100%)",
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ color: "#166534", fontWeight: 700 }}
                    >
                      {data?.baseline?.NPV
                        ? `₹${(data.baseline.NPV / 10000000).toFixed(1)}Cr`
                        : "N/A"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#14532d" }}>
                      Baseline NPV
                    </Typography>
                  </Paper>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      textAlign: "center",
                      border: "1px solid #e5e7eb",
                      borderRadius: 2,
                      background:
                        "linear-gradient(145deg, #fce7f3 0%, #fbcfe8 100%)",
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ color: "#be185d", fontWeight: 700 }}
                    >
                      {data?.results?.filter((r) => {
                        const rMetric = r.metrics[
                          selectedMetric as keyof typeof r.metrics
                        ] as number;
                        const baselineMetric = data?.baseline?.[
                          selectedMetric as keyof typeof data.baseline
                        ] as number;
                        return rMetric > (baselineMetric || 0);
                      }).length || 0}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#9d174d" }}>
                      Positive Scenarios
                    </Typography>
                  </Paper>
                </Box>
              </Box>

              {/* Metric Selector */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, color: "#374151", mb: 2 }}
                >
                  📊 Select Metric for Analysis
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {["NPV", "IRR", "PNL_Y1", "PNL_TOTAL"].map((metric) => (
                    <Chip
                      key={metric}
                      label={metric}
                      onClick={() => setSelectedMetric(metric)}
                      variant={
                        selectedMetric === metric ? "filled" : "outlined"
                      }
                      color={selectedMetric === metric ? "primary" : "default"}
                      sx={{
                        cursor: "pointer",
                        fontWeight: 600,
                        "&:hover": {
                          transform: "scale(1.05)",
                        },
                        transition: "all 0.2s ease",
                      }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Scenario Variables & Assumptions */}
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, color: "#374151", mb: 2 }}
                >
                  🔍 Scenario Variables & Assumptions
                </Typography>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                    gap: 3,
                  }}
                >
                  {/* Preset Scenarios Variables */}
                  <Paper
                    elevation={0}
                    sx={{ p: 3, border: "1px solid #e2e8f0", borderRadius: 2 }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        mb: 2,
                        color: "#374151",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Analytics sx={{ fontSize: "1.2rem" }} />
                      Preset Scenarios
                    </Typography>

                    {activeScenarios
                      .filter((s) =>
                        DEFAULT_SCENARIOS.find((ds) => ds.id === s.id)
                      )
                      .map((scenario) => {
                        const defaultScenario = DEFAULT_SCENARIOS.find(
                          (ds) => ds.id === scenario.id
                        );
                        if (!defaultScenario) return null;

                        return (
                          <Box
                            key={scenario.id}
                            sx={{
                              mb: 2,
                              p: 2,
                              bgcolor: "#f8fafc",
                              borderRadius: 2,
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 600, color: "#374151", mb: 1 }}
                            >
                              {scenario.name}
                            </Typography>

                            {Object.entries(
                              defaultScenario.overrides || {}
                            ).map(([path, value]) => (
                              <Box
                                key={path}
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  mb: 0.5,
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "#6b7280",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {path.split(".").pop()}
                                </Typography>
                                <Chip
                                  label={
                                    typeof value === "number"
                                      ? path.includes("Pct")
                                        ? `${(value * 100).toFixed(1)}%`
                                        : path.includes("Rs")
                                        ? `₹${value.toFixed(2)}`
                                        : value.toFixed(2)
                                      : String(value)
                                  }
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  sx={{ fontSize: "0.7rem", height: 20 }}
                                />
                              </Box>
                            ))}

                            {(!defaultScenario.overrides ||
                              Object.keys(defaultScenario.overrides).length ===
                                0) && (
                              <Typography
                                variant="caption"
                                sx={{ color: "#9ca3af", fontStyle: "italic" }}
                              >
                                No specific overrides - uses baseline values
                              </Typography>
                            )}
                          </Box>
                        );
                      })}
                  </Paper>
                </Box>

                {/* Baseline Values Reference */}
                <Box
                  sx={{
                    mt: 3,
                    p: 3,
                    bgcolor: "#f0f9ff",
                    borderRadius: 2,
                    border: "1px solid #bae6fd",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      color: "#0369a1",
                      mb: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Info sx={{ fontSize: "1rem" }} />
                    Baseline Values Reference
                  </Typography>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, 1fr)",
                        md: "repeat(3, 1fr)",
                      },
                      gap: 2,
                    }}
                  >
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: "white",
                        borderRadius: 1,
                        border: "1px solid #dbeafe",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#1e40af",
                          fontWeight: 600,
                          display: "block",
                        }}
                      >
                        Sales Volume
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "#374151", fontWeight: 500 }}
                      >
                        {scenario?.skus?.[0]?.sales?.baseAnnualVolumePieces?.toLocaleString() ||
                          "N/A"}{" "}
                        pieces
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        p: 2,
                        bgcolor: "white",
                        borderRadius: 1,
                        border: "1px solid #dbeafe",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#1e40af",
                          fontWeight: 600,
                          display: "block",
                        }}
                      >
                        Resin Cost
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "#374151", fontWeight: 500 }}
                      >
                        ₹
                        {scenario?.skus?.[0]?.costing?.resinRsPerKg?.toFixed(
                          2
                        ) || "N/A"}
                        /kg
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        p: 2,
                        bgcolor: "white",
                        borderRadius: 1,
                        border: "1px solid #dbeafe",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#1e40af",
                          fontWeight: 600,
                          display: "block",
                        }}
                      >
                        Debt Cost
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "#374151", fontWeight: 500 }}
                      >
                        {(scenario?.finance?.costOfDebtPct * 100)?.toFixed(1) ||
                          "N/A"}
                        %
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Scenario Radar Chart */}
              <ScenarioRadarChart
                data={data}
                selectedMetrics={DEFAULT_OBJECTIVE.metrics}
              />

              {/* Selected Metric Comparison */}
              <ScenarioComparisonBars
                data={data}
                selectedMetric={selectedMetric}
              />

              {/* Trend Analysis */}
              {/* <ScenarioTrendLines data={data} selectedMetric={selectedMetric} /> */}

              {/* Metric Performance Overview */}
              {data && data.baseline && (
                <Box
                  sx={{
                    mt: 3,
                    p: 3,
                    bgcolor: "#f0f9ff",
                    borderRadius: 2,
                    border: "1px solid #bae6fd",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{ mb: 3, color: "#0369a1", textAlign: "center" }}
                  >
                    <ShowChart sx={{ mr: 1, verticalAlign: "middle" }} />
                    {selectedMetric} Performance Overview
                  </Typography>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                      gap: 2,
                    }}
                  >
                    <Paper
                      elevation={0}
                      sx={{ p: 2, textAlign: "center", bgcolor: "white" }}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          color: (() => {
                            const baselineValue =
                              (data.baseline[
                                selectedMetric as keyof typeof data.baseline
                              ] as number) || 0;
                            return baselineValue >= 0 ? "#0369a1" : "#dc2626";
                          })(),
                          fontWeight: 700,
                        }}
                      >
                        {selectedMetric === "IRR"
                          ? `${(
                              ((data.baseline[
                                selectedMetric as keyof typeof data.baseline
                              ] as number) || 0) * 100
                            ).toFixed(1)}%`
                          : selectedMetric.includes("NPV") ||
                            selectedMetric.includes("PNL")
                          ? `₹${(
                              ((data.baseline[
                                selectedMetric as keyof typeof data.baseline
                              ] as number) || 0) / 10000000
                            ).toFixed(1)}Cr`
                          : (
                              (data.baseline[
                                selectedMetric as keyof typeof data.baseline
                              ] as number) || 0
                            ).toFixed(0)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#0c4a6e" }}>
                        Baseline {selectedMetric}
                      </Typography>
                    </Paper>

                    <Paper
                      elevation={0}
                      sx={{ p: 2, textAlign: "center", bgcolor: "white" }}
                    >
                      <Typography
                        variant="h6"
                        sx={{ color: "#059669", fontWeight: 700 }}
                      >
                        {data.results?.filter((r) => {
                          const rMetric = r.metrics[
                            selectedMetric as keyof typeof r.metrics
                          ] as number;
                          const baselineMetric = data.baseline[
                            selectedMetric as keyof typeof data.baseline
                          ] as number;
                          return rMetric > (baselineMetric || 0);
                        }).length || 0}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#065f46" }}>
                        Scenarios Above Baseline
                      </Typography>
                    </Paper>

                    <Paper
                      elevation={0}
                      sx={{ p: 2, textAlign: "center", bgcolor: "white" }}
                    >
                      <Typography
                        variant="h6"
                        sx={{ color: "#7c3aed", fontWeight: 700 }}
                      >
                        {(() => {
                          const values =
                            data.results
                              ?.map(
                                (r) =>
                                  r.metrics[
                                    selectedMetric as keyof typeof r.metrics
                                  ] as number
                              )
                              .filter((v) => v !== null && v !== undefined) ||
                            [];
                          if (values.length === 0) return "N/A";

                          const min = Math.min(...values);
                          const max = Math.max(...values);

                          if (selectedMetric === "IRR") {
                            return `${(min * 100).toFixed(1)}% - ${(
                              max * 100
                            ).toFixed(1)}%`;
                          } else if (
                            selectedMetric.includes("NPV") ||
                            selectedMetric.includes("PNL")
                          ) {
                            return `₹${(min / 10000000).toFixed(1)}Cr - ₹${(
                              max / 10000000
                            ).toFixed(1)}Cr`;
                          } else {
                            return `${min.toFixed(0)} - ${max.toFixed(0)}`;
                          }
                        })()}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#5b21b6" }}>
                        Value Range
                      </Typography>
                    </Paper>
                  </Box>
                </Box>
              )}

              {/* Scenario Impact Summary */}
              <Box
                sx={{
                  mb: 4,
                  p: 3,
                  bgcolor: "#fefefe",
                  borderRadius: 2,
                  border: "1px solid #e2e8f0",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ mb: 3, color: "#374151", textAlign: "center" }}
                >
                  📈 Scenario Impact Summary
                </Typography>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, 1fr)",
                      md: "repeat(4, 1fr)",
                    },
                    gap: 3,
                  }}
                >
                  <Box sx={{ textAlign: "center", p: 2 }}>
                    <Typography
                      variant="h4"
                      sx={{ color: "#8b5cf6", fontWeight: 700, mb: 1 }}
                    >
                      {activeScenarios.length}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#6b7280" }}>
                      Active Scenarios
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: "center", p: 2 }}>
                    <Typography
                      variant="h4"
                      sx={{ color: "#059669", fontWeight: 700, mb: 1 }}
                    >
                      {(() => {
                        const allOverrides = activeScenarios.reduce(
                          (acc, scenario) => {
                            const defaultScenario = DEFAULT_SCENARIOS.find(
                              (ds) => ds.id === scenario.id
                            );
                            if (defaultScenario?.overrides) {
                              Object.entries(defaultScenario.overrides).forEach(
                                ([path, value]) => {
                                  if (!acc[path]) acc[path] = [];
                                  acc[path].push(value);
                                }
                              );
                            }
                            return acc;
                          },
                          {} as Record<string, any[]>
                        );

                        return Object.keys(allOverrides).length;
                      })()}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#6b7280" }}>
                      Variables Modified
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: "center", p: 2 }}>
                    <Typography
                      variant="h4"
                      sx={{ color: "#dc2626", fontWeight: 700, mb: 1 }}
                    >
                      {(() => {
                        const allOverrides = activeScenarios.reduce(
                          (acc, scenario) => {
                            const defaultScenario = DEFAULT_SCENARIOS.find(
                              (ds) => ds.id === scenario.id
                            );
                            if (defaultScenario?.overrides) {
                              Object.entries(defaultScenario.overrides).forEach(
                                ([path, value]) => {
                                  if (!acc[path]) acc[path] = [];
                                  acc[path].push(value);
                                }
                              );
                            }
                            return acc;
                          },
                          {} as Record<string, any[]>
                        );

                        const mostModified = Object.entries(allOverrides).sort(
                          ([, a], [, b]) => b.length - a.length
                        )[0];

                        return mostModified
                          ? mostModified[0].split(".").pop()
                          : "N/A";
                      })()}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#6b7280" }}>
                      Most Modified Variable
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: "center", p: 2 }}>
                    <Typography
                      variant="h4"
                      sx={{ color: "#7c3aed", fontWeight: 700, mb: 1 }}
                    >
                      {(() => {
                        const allOverrides = activeScenarios.reduce(
                          (acc, scenario) => {
                            const defaultScenario = DEFAULT_SCENARIOS.find(
                              (ds) => ds.id === scenario.id
                            );
                            if (defaultScenario?.overrides) {
                              Object.entries(defaultScenario.overrides).forEach(
                                ([path, value]) => {
                                  if (!acc[path]) acc[path] = [];
                                  acc[path].push(value);
                                }
                              );
                            }
                            return acc;
                          },
                          {} as Record<string, any[]>
                        );

                        const totalChanges = Object.values(allOverrides).reduce(
                          (sum, values) => sum + values.length,
                          0
                        );
                        return totalChanges;
                      })()}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#6b7280" }}>
                      Total Variable Changes
                    </Typography>
                  </Box>
                </Box>

                {/* Key Variables Affected */}
                <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid #e2e8f0" }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, color: "#374151", mb: 2 }}
                  >
                    🔑 Key Variables Affected Across Scenarios
                  </Typography>

                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {(() => {
                      const allOverrides = activeScenarios.reduce(
                        (acc, scenario) => {
                          const defaultScenario = DEFAULT_SCENARIOS.find(
                            (ds) => ds.id === scenario.id
                          );
                          if (defaultScenario?.overrides) {
                            Object.entries(defaultScenario.overrides).forEach(
                              ([path, value]) => {
                                if (!acc[path]) acc[path] = [];
                                acc[path].push(value);
                              }
                            );
                          }
                          return acc;
                        },
                        {} as Record<string, any[]>
                      );

                      return Object.entries(allOverrides)
                        .sort(([, a], [, b]) => b.length - a.length)
                        .slice(0, 6)
                        .map(([path, values]) => (
                          <Chip
                            key={path}
                            label={`${path.split(".").pop()} (${
                              values.length
                            } scenarios)`}
                            size="small"
                            variant="outlined"
                            color="primary"
                            sx={{
                              fontSize: "0.75rem",
                              "& .MuiChip-label": {
                                px: 1.5,
                              },
                            }}
                          />
                        ));
                    })()}
                  </Box>
                </Box>
              </Box>

              {/* Detailed Results Table */}
              <Box sx={{ mt: 4 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, color: "#374151", mb: 2 }}
                >
                  📋 Detailed Scenario Results
                </Typography>
                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{ background: "transparent" }}
                >
                  <Table>
                    <TableHead>
                      <TableRow
                        sx={{
                          background:
                            "linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%)",
                        }}
                      >
                        <TableCell sx={{ fontWeight: 600, color: "#374151" }}>
                          Scenario
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 600, color: "#374151" }}
                        >
                          NPV (₹ Cr)
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 600, color: "#374151" }}
                        >
                          IRR (%)
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 600, color: "#374151" }}
                        >
                          PAT Y1 (₹ Cr)
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 600, color: "#374151" }}
                        >
                          Total PAT (₹ Cr)
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data?.results?.map((scenario) => (
                        <TableRow
                          key={scenario.scenarioId}
                          sx={{
                            "&:hover": {
                              background:
                                "linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%)",
                            },
                          }}
                        >
                          <TableCell sx={{ fontWeight: 600, color: "#1f2937" }}>
                            {scenario.name}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontFamily: "monospace", color: "#059669" }}
                          >
                            {scenario.metrics.NPV
                              ? (scenario.metrics.NPV / 10000000).toFixed(2)
                              : "N/A"}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontFamily: "monospace", color: "#059669" }}
                          >
                            {scenario.metrics.IRR
                              ? `${(scenario.metrics.IRR * 100).toFixed(1)}%`
                              : "N/A"}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontFamily: "monospace", color: "#059669" }}
                          >
                            {scenario.metrics.PNL_Y1
                              ? (scenario.metrics.PNL_Y1 / 10000000).toFixed(2)
                              : "N/A"}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontFamily: "monospace", color: "#059669" }}
                          >
                            {scenario.metrics.PNL_TOTAL
                              ? (scenario.metrics.PNL_TOTAL / 10000000).toFixed(
                                  2
                                )
                              : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </CardContent>
          </Card>
        </Zoom>
      )}

      {/* Error State */}
      {error && (
        <Card
          elevation={0}
          sx={{
            border: "2px solid #fecaca",
            borderRadius: 3,
            background: "linear-gradient(145deg, #fef2f2 0%, #fee2e2 100%)",
          }}
        >
          <CardContent sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="h6" sx={{ color: "#dc2626", mb: 1 }}>
              ❌ Analysis Failed
            </Typography>
            <Typography variant="body2" sx={{ color: "#991b1b" }}>
              {error}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
