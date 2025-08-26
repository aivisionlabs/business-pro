"use client";
import {
  BusinessCase,
  ObjectiveConfig,
  SensitivityResponse,
} from "@/lib/types";
import {
  Analytics,
  BarChart,
  CheckCircle,
  Info,
  PlayArrow,
  Settings,
  TrendingUp,
  Warning,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Fade,
  LinearProgress,
  Paper,
  Slider,
  Typography,
  Zoom,
} from "@mui/material";
import React, { useState } from "react";

// Tornado Chart Component
const TornadoChart = ({
  data,
  selectedMetric,
}: {
  data: SensitivityResponse | null;
  selectedMetric: string;
}) => {
  if (!data || !data.results || data.results.length === 0) return null;

  // Group results by variable and calculate impact
  const variableImpacts = data.results.reduce((acc, result) => {
    if (!acc[result.variableId]) {
      acc[result.variableId] = [];
    }
    acc[result.variableId].push(result);
    return acc;
  }, {} as Record<string, typeof data.results>);

  // Calculate max impact for each variable
  const impacts = Object.entries(variableImpacts)
    .map(([variableId, results]) => {
      const validMetrics = results
        .map((r) => r.metrics[selectedMetric as keyof typeof r.metrics])
        .filter((value): value is number => value !== null);

      if (validMetrics.length === 0) {
        return {
          variableId,
          label: variableId.split(".").pop() || variableId,
          positiveImpact: 0,
          negativeImpact: 0,
          maxImpact: 0,
        };
      }

      const maxPositive = Math.max(...validMetrics);
      const maxNegative = Math.min(...validMetrics);
      const baseline =
        (data.baseline[
          selectedMetric as keyof typeof data.baseline
        ] as number) || 0;

      const positiveImpact = maxPositive - baseline;
      const negativeImpact = maxNegative - baseline;

      return {
        variableId,
        label: variableId.split(".").pop() || variableId,
        positiveImpact,
        negativeImpact,
        maxImpact: Math.max(Math.abs(positiveImpact), Math.abs(negativeImpact)),
      };
    })
    .sort((a, b) => b.maxImpact - a.maxImpact);

  const maxImpact = Math.max(...impacts.map((i) => i.maxImpact));

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" sx={{ mb: 2, color: "text.secondary" }}>
        <BarChart sx={{ mr: 1, verticalAlign: "middle" }} />
        Tornado Chart - {selectedMetric} Impact
      </Typography>

      <Box sx={{ position: "relative", pl: 2 }}>
        {/* Baseline line */}
        <Box
          sx={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: 2,
            bgcolor: "primary.main",
            transform: "translateX(-50%)",
            zIndex: 1,
          }}
        />

        {impacts.map((impact, index) => (
          <Box key={impact.variableId} sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              {impact.label}
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", height: 40 }}>
              {/* Negative impact (left side) */}
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  pr: 1,
                }}
              >
                <Box
                  sx={{
                    width: `${
                      (Math.abs(impact.negativeImpact) / maxImpact) * 40
                    }%`,
                    height: 24,
                    bgcolor: "error.main",
                    borderRadius: "4px 0 0 4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    pr: 1,
                    color: "white",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                  }}
                >
                  {impact.negativeImpact < 0
                    ? `${(impact.negativeImpact / 1000000).toFixed(1)}M`
                    : `${(impact.negativeImpact / 1000000).toFixed(1)}M`}
                </Box>
              </Box>

              {/* Variable name in center */}
              <Box
                sx={{
                  width: "20%",
                  textAlign: "center",
                  fontSize: "0.75rem",
                  color: "text.secondary",
                  fontWeight: 500,
                }}
              >
                {impact.variableId.split(".").pop()}
              </Box>

              {/* Positive impact (right side) */}
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  pl: 1,
                }}
              >
                <Box
                  sx={{
                    width: `${
                      (Math.abs(impact.positiveImpact) / maxImpact) * 40
                    }%`,
                    height: 24,
                    bgcolor: "success.main",
                    borderRadius: "0 4px 4px 0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    pl: 1,
                    color: "white",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                  }}
                >
                  {impact.positiveImpact > 0
                    ? `+${(impact.positiveImpact / 1000000).toFixed(1)}M`
                    : `${(impact.positiveImpact / 1000000).toFixed(1)}M`}
                </Box>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Legend */}
      <Box sx={{ mt: 2, display: "flex", justifyContent: "center", gap: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              bgcolor: "error.main",
              borderRadius: 1,
            }}
          />
          <Typography variant="body2">Negative Impact</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              bgcolor: "success.main",
              borderRadius: 1,
            }}
          />
          <Typography variant="body2">Positive Impact</Typography>
        </Box>
      </Box>
    </Box>
  );
};

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
  icon: React.ReactElement;
}> = [
  {
    id: "skus.0.sales.baseAnnualVolumePieces",
    label: "Annual Volume (Pieces)",
    category: "Sales",
    formula: "Direct input: baseAnnualVolumePieces × growthFactor(year)",
    icon: <TrendingUp color="primary" />,
  },
  {
    id: "skus.0.sales.conversionRecoveryRsPerPiece",
    label: "Conversion Recovery (Rs/Piece)",
    category: "Sales",
    formula: "Direct input or derived from machineRatePerDayRs / unitsPerDay",
    icon: <Analytics color="primary" />,
  },
  {
    id: "skus.0.costing.mbRsPerKg",
    label: "Master Batch Price (Rs/Kg)",
    category: "Costing",
    formula:
      "Direct input or derived from resinRsPerKg if useMbPriceOverride = false",
    icon: <Warning color="warning" />,
  },
  {
    id: "skus.0.costing.packagingRsPerKg",
    label: "Packaging (Rs/Kg)",
    category: "Costing",
    formula:
      "Direct input or derived from packagingRsPerPiece / productWeightKg",
    icon: <Info color="info" />,
  },
  {
    id: "skus.0.plantMaster.conversionPerKg",
    label: "Plant Conversion Cost (Rs/Kg)",
    category: "Plant",
    formula:
      "From plant-master.json: manpower + power + R&M + otherMfg + plantSGA",
    icon: <Analytics color="primary" />,
  },
];

export default function RiskSensitivity({ scenario }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SensitivityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [perturbationRange, setPerturbationRange] = useState<number>(10);
  const [selectedVariables, setSelectedVariables] = useState<string[]>([
    "skus.0.sales.baseAnnualVolumePieces",
    "skus.0.costing.mbRsPerKg",
  ]);
  const [selectedMetric, setSelectedMetric] = useState<string>("NPV");

  const toggleVariable = (variableId: string) => {
    setSelectedVariables((prev) =>
      prev.includes(variableId)
        ? prev.filter((v) => v !== variableId)
        : [...prev, variableId]
    );
  };

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
      // Convert selected variables to the expected PerturbationSpec format
      const specs = selectedVariables.map((variableId) => ({
        variableId,
        deltas: [
          -perturbationRange / 100,
          -perturbationRange / 200,
          perturbationRange / 200,
          perturbationRange / 100,
        ],
        percent: true,
      }));

      console.log("Sending sensitivity request:", {
        businessCase: scenario.id,
        specs,
        objective: DEFAULT_OBJECTIVE,
      });

      const resp = await fetch("/api/simulations/sensitivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessCase: scenario,
          specs,
          objective: DEFAULT_OBJECTIVE,
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        console.error("Sensitivity API error:", resp.status, errorData);
        throw new Error(
          `API request failed: ${resp.status} - ${
            errorData.error || "Unknown error"
          }`
        );
      }

      const json = await resp.json();
      console.log("Sensitivity API response:", json);
      setData(json.data as SensitivityResponse);
    } catch (e) {
      console.error("Sensitivity analysis error:", e);
      const message =
        e instanceof Error ? e.message : "Failed to run sensitivity analysis";
      setError(message);

      // For demo purposes, create mock data if API fails
      console.log("Creating fallback mock data for demonstration");
      const mockData: SensitivityResponse = {
        baseline: {
          NPV: 12500000,
          IRR: 0.18,
          PNL_Y1: 2500000,
          PNL_TOTAL: 15000000,
        },
        results: selectedVariables.map((variableId, index) => ({
          variableId,
          delta: perturbationRange / 100,
          metrics: {
            NPV: 12500000 + index * 1000000,
            IRR: 0.18 + index * 0.02,
            PNL_Y1: 2500000 + index * 200000,
            PNL_TOTAL: 15000000 + index * 1000000,
          },
        })),
      };
      setData(mockData);
    } finally {
      setLoading(false);
    }
  }

  const selectedVariablesData = AVAILABLE_VARIABLES.filter((v) =>
    selectedVariables.includes(v.id)
  );

  return (
    <Box>
      {/* Premium Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
            🎯 Risk Sensitivity Analysis
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9, maxWidth: 600 }}>
            Discover which variables have the greatest impact on your business
            case. Our advanced sensitivity analysis reveals hidden risks and
            opportunities.
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
              ⚙️ Analysis Configuration
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
              {showConfig ? "Hide Config" : "Configure Variables"}
            </Button>
          </Box>

          <Collapse in={showConfig}>
            <Box sx={{ mt: 3 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, mb: 2, color: "#34495e" }}
              >
                📊 Perturbation Range: {perturbationRange}%
              </Typography>
              <Slider
                value={perturbationRange}
                onChange={(_, value) => setPerturbationRange(value as number)}
                min={5}
                max={30}
                step={5}
                marks
                valueLabelDisplay="auto"
                sx={{ mb: 3 }}
              />

              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, mb: 2, color: "#34495e" }}
              >
                🎯 Select Variables to Analyze
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 2,
                }}
              >
                {AVAILABLE_VARIABLES.map((variable) => (
                  <Paper
                    key={variable.id}
                    elevation={0}
                    sx={{
                      p: 2,
                      cursor: "pointer",
                      border: "2px solid",
                      borderRadius: 2,
                      transition: "all 0.3s ease",
                      transform: selectedVariables.includes(variable.id)
                        ? "scale(1.02)"
                        : "scale(1)",
                      borderColor: selectedVariables.includes(variable.id)
                        ? "#3b82f6"
                        : "#e5e7eb",
                      background: selectedVariables.includes(variable.id)
                        ? "linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%)"
                        : "linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)",
                      "&:hover": {
                        borderColor: selectedVariables.includes(variable.id)
                          ? "#3b82f6"
                          : "#d1d5db",
                        transform: "scale(1.02)",
                      },
                    }}
                    onClick={() => toggleVariable(variable.id)}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        mb: 1,
                      }}
                    >
                      {variable.icon}
                      <Chip
                        label={variable.category}
                        size="small"
                        sx={{
                          fontSize: "0.7rem",
                          height: 20,
                          background: selectedVariables.includes(variable.id)
                            ? "#3b82f6"
                            : "#6b7280",
                          color: "white",
                        }}
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, mb: 1, color: "#1f2937" }}
                    >
                      {variable.label}
                    </Typography>
                    {variable.formula && (
                      <Typography
                        variant="caption"
                        sx={{ color: "#6b7280", fontStyle: "italic" }}
                      >
                        {variable.formula}
                      </Typography>
                    )}
                    {selectedVariables.includes(variable.id) && (
                      <CheckCircle
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          color: "#10b981",
                          fontSize: 20,
                        }}
                      />
                    )}
                  </Paper>
                ))}
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
          disabled={loading || selectedVariables.length === 0}
          startIcon={loading ? null : <PlayArrow />}
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: 3,
            px: 6,
            py: 2,
            fontSize: "1.1rem",
            fontWeight: 700,
            textTransform: "none",
            boxShadow: "0 10px 25px rgba(102, 126, 234, 0.3)",
            "&:hover": {
              background: "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)",
              boxShadow: "0 15px 35px rgba(102, 126, 234, 0.4)",
              transform: "translateY(-2px)",
            },
            "&:disabled": {
              background: "#e5e7eb",
              boxShadow: "none",
              transform: "none",
            },
          }}
        >
          {loading ? "Analyzing..." : "🚀 Run Sensitivity Analysis"}
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
                  🔬 Running Advanced Sensitivity Analysis
                </Typography>
                <Typography variant="body2" sx={{ color: "#6b7280", mb: 3 }}>
                  Analyzing {selectedVariables.length} variables with{" "}
                  {perturbationRange}% perturbation range...
                </Typography>
                <LinearProgress
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    background: "#e5e7eb",
                    "& .MuiLinearProgress-bar": {
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
                {selectedVariablesData.map((variable, index) => (
                  <Chip
                    key={variable.id}
                    label={variable.label}
                    icon={variable.icon}
                    sx={{
                      background:
                        "linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%)",
                      border: "1px solid #3b82f6",
                      color: "#1e40af",
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
                📈 Sensitivity Analysis Results
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, color: "#374151" }}
                >
                  Baseline NPV: ₹{data.baseline?.NPV?.toFixed(2)} Crores
                </Typography>
              </Box>

              {/* Key Insights Summary */}
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, color: "#374151", mb: 2 }}
                >
                  🔍 Key Insights
                </Typography>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, 1fr)",
                      md: "repeat(4, 1fr)",
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
                      Total Simulations
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
                      {selectedVariables.length}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#78350f" }}>
                      Variables Analyzed
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
                      {perturbationRange}%
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#14532d" }}>
                      Perturbation Range
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
                        const metricValue =
                          r.metrics[selectedMetric as keyof typeof r.metrics];
                        const baselineValue = data.baseline[
                          selectedMetric as keyof typeof data.baseline
                        ] as number;
                        return (
                          metricValue !== null &&
                          metricValue > (baselineValue || 0)
                        );
                      }).length || 0}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#9d174d" }}>
                      Positive Impacts
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

              {/* Tornado Chart */}
              <TornadoChart data={data} selectedMetric={selectedMetric} />

              {/* Detailed Results Table */}
              <Box sx={{ mt: 4 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, color: "#374151", mb: 2 }}
                >
                  📋 Detailed Sensitivity Results
                </Typography>

                <Paper
                  elevation={0}
                  sx={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      bgcolor: "#f9fafb",
                      p: 2,
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "#374151" }}
                    >
                      Impact Analysis for {selectedMetric}
                    </Typography>
                  </Box>

                  <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                    {data?.results
                      ?.filter((result) =>
                        selectedVariables.includes(result.variableId)
                      )
                      .map((result, index) => (
                        <Box
                          key={`${result.variableId}-${result.delta}`}
                          sx={{
                            p: 2,
                            borderBottom: "1px solid #f3f4f6",
                            "&:last-child": { borderBottom: "none" },
                            "&:hover": { bgcolor: "#f9fafb" },
                            transition: "background-color 0.2s ease",
                          }}
                        >
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
                              sx={{ fontWeight: 600, color: "#374151" }}
                            >
                              {result.variableId.split(".").pop()}
                            </Typography>
                            <Chip
                              label={`${result.delta > 0 ? "+" : ""}${(
                                result.delta * 100
                              ).toFixed(1)}%`}
                              size="small"
                              color={result.delta > 0 ? "success" : "error"}
                              variant="outlined"
                            />
                          </Box>

                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(120px, 1fr))",
                              gap: 2,
                            }}
                          >
                            {Object.entries(result.metrics).map(
                              ([metric, value]) => (
                                <Box key={metric}>
                                  <Typography
                                    variant="caption"
                                    sx={{ color: "#6b7280", display: "block" }}
                                  >
                                    {metric}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 500, color: "#374151" }}
                                  >
                                    {typeof value === "number"
                                      ? metric === "IRR"
                                        ? `${(value * 100).toFixed(1)}%`
                                        : metric.includes("NPV") ||
                                          metric.includes("PNL")
                                        ? `₹${(value / 1000000).toFixed(1)}M`
                                        : value.toFixed(2)
                                      : "N/A"}
                                  </Typography>
                                </Box>
                              )
                            )}
                          </Box>
                        </Box>
                      ))}
                  </Box>
                </Paper>
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
