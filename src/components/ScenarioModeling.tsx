"use client";
import { BusinessCase } from "@/lib/types";
import {
  Add,
  Analytics,
  Assessment,
  CheckCircle,
  CompareArrows,
  Delete,
  Info,
  Settings,
  ShowChart,
  Timeline,
  TrendingDown,
  TrendingUp,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fade,
  FormControl,
  GridLegacy,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Zoom,
} from "@mui/material";
import { useMemo, useState } from "react";

type Props = {
  businessCase: BusinessCase;
  onScenarioComplete?: (results: any) => void;
};

interface ScenarioModel {
  id: string;
  name: string;
  description: string;
  category: "optimistic" | "pessimistic" | "realistic" | "custom";
  variables: ScenarioVariable[];
  color: string;
}

interface ScenarioVariable {
  path: string;
  label: string;
  currentValue: number;
  newValue: number;
  unit: string;
  impact: "high" | "medium" | "low";
}

const DEFAULT_SCENARIOS: ScenarioModel[] = [
  {
    id: "optimistic",
    name: "🚀 Optimistic Growth",
    description:
      "Best-case scenario with strong market conditions and operational efficiency",
    category: "optimistic",
    color: "#10b981",
    variables: [
      {
        path: "skus.0.sales.baseAnnualVolumePieces",
        label: "Annual Volume",
        currentValue: 10000,
        newValue: 12000,
        unit: "pieces",
        impact: "high",
      },
      {
        path: "skus.0.sales.netPricePerPiece",
        label: "Net Price",
        currentValue: 95,
        newValue: 100,
        unit: "₹/piece",
        impact: "high",
      },
    ],
  },
  {
    id: "pessimistic",
    name: "⚠️ Pessimistic Downturn",
    description:
      "Worst-case scenario with economic challenges and cost pressures",
    category: "pessimistic",
    color: "#ef4444",
    variables: [
      {
        path: "skus.0.sales.baseAnnualVolumePieces",
        label: "Annual Volume",
        currentValue: 10000,
        newValue: 8000,
        unit: "pieces",
        impact: "high",
      },
      {
        path: "skus.0.costing.resinRsPerKg",
        label: "Resin Cost",
        currentValue: 80,
        newValue: 88,
        unit: "₹/kg",
        impact: "medium",
      },
    ],
  },
  {
    id: "realistic",
    name: "📊 Realistic Baseline",
    description:
      "Moderate scenario with realistic market conditions and gradual improvements",
    category: "realistic",
    color: "#3b82f6",
    variables: [
      {
        path: "skus.0.sales.baseAnnualVolumePieces",
        label: "Annual Volume",
        currentValue: 10000,
        newValue: 10500,
        unit: "pieces",
        impact: "medium",
      },
    ],
  },
];

export default function ScenarioModeling({
  businessCase,
  onScenarioComplete,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([
    "realistic",
  ]);
  const [showConfig, setShowConfig] = useState(false);
  const [customScenarios, setCustomScenarios] = useState<ScenarioModel[]>([]);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [newCustomScenario, setNewCustomScenario] = useState<
    Partial<ScenarioModel>
  >({
    name: "",
    description: "",
    category: "custom",
    color: "#8b5cf6",
  });
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const activeScenarios = useMemo(() => {
    return [
      ...DEFAULT_SCENARIOS.filter((s) => selectedScenarios.includes(s.id)),
      ...customScenarios.filter((s) => selectedScenarios.includes(s.id)),
    ];
  }, [selectedScenarios, customScenarios]);

  const toggleScenario = (scenarioId: string) => {
    setSelectedScenarios((prev) =>
      prev.includes(scenarioId)
        ? prev.filter((id) => id !== scenarioId)
        : [...prev, scenarioId]
    );
  };

  const addCustomScenario = () => {
    if (newCustomScenario.name && newCustomScenario.description) {
      const scenario: ScenarioModel = {
        id: `custom-${Date.now()}`,
        name: newCustomScenario.name,
        description: newCustomScenario.description,
        category: "custom",
        color: newCustomScenario.color || "#8b5cf6",
        variables: [],
      };
      setCustomScenarios((prev) => [...prev, scenario]);
      setSelectedScenarios((prev) => [...prev, scenario.id]);
      setNewCustomScenario({
        name: "",
        description: "",
        category: "custom",
        color: "#8b5cf6",
      });
      setShowCustomDialog(false);
    }
  };

  const removeCustomScenario = (scenarioId: string) => {
    setCustomScenarios((prev) => prev.filter((s) => s.id !== scenarioId));
    setSelectedScenarios((prev) => prev.filter((id) => id !== scenarioId));
  };

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);

    // Simulate 5-second calculation time for better UX
    await new Promise((resolve) => setTimeout(resolve, 5000));

    try {
      // Convert selected scenarios to the format expected by the API
      const scenarioDefinitions = selectedScenarios.map((scenarioId) => {
        const scenarioData = [...DEFAULT_SCENARIOS, ...customScenarios].find(
          (s) => s.id === scenarioId
        );
        if (!scenarioData) throw new Error(`Scenario ${scenarioId} not found`);

        // Convert variables to overrides format
        const overrides: Record<string, number> = {};
        scenarioData.variables.forEach((variable) => {
          overrides[variable.path] = variable.newValue;
        });

        return {
          id: scenarioData.id,
          name: scenarioData.name,
          overrides,
        };
      });

      // Call the scenario simulation API
      const response = await fetch("/api/simulations/scenario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessCase,
          scenarios: scenarioDefinitions,
          objective: {
            metrics: ["NPV", "IRR", "PNL_Y1", "PNL_TOTAL"],
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "API call failed");
      }

      // Transform API response to match expected format
      const transformedResults = {
        baseline: {
          npv: result.data.baseline.NPV || 0,
          irr: result.data.baseline.IRR || 0,
          payback: 0, // Not provided by API, could be calculated
          roi: 0, // Not provided by API, could be calculated
        },
        scenarios: result.data.results.map((scenarioResult: any) => {
          const scenarioData = [...DEFAULT_SCENARIOS, ...customScenarios].find(
            (s) => s.id === scenarioResult.scenarioId
          );
          return {
            id: scenarioResult.scenarioId,
            name: scenarioData?.name || scenarioResult.scenarioId,
            npv: scenarioResult.metrics.NPV || 0,
            irr: scenarioResult.metrics.IRR || 0,
            payback: 0, // Not provided by API
            roi: 0, // Not provided by API
          };
        }),
      };

      setResults(transformedResults);
      onScenarioComplete?.(transformedResults);
    } catch (e) {
      console.error("Scenario analysis error:", e);
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "#ef4444";
      case "medium":
        return "#f59e0b";
      case "low":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "optimistic":
        return <TrendingUp />;
      case "pessimistic":
        return <TrendingDown />;
      case "realistic":
        return <Analytics />;
      case "custom":
        return <Settings />;
      default:
        return <Info />;
    }
  };

  return (
    <Box>
      {/* Premium Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: 4,
          p: 5,
          mb: 4,
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 300,
            height: 300,
            background: "rgba(255,255,255,0.1)",
            borderRadius: "50%",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -50,
            left: -50,
            width: 200,
            height: 200,
            background: "rgba(255,255,255,0.05)",
            borderRadius: "50%",
          }}
        />

        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
            🌟 Advanced Scenario Modeling
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: 700, mb: 2 }}>
            Transform your business planning with AI-powered scenario analysis.
            Explore multiple futures and make data-driven decisions with
            confidence.
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Chip
              icon={<Timeline />}
              label="Multi-Scenario Analysis"
              sx={{ background: "rgba(255,255,255,0.2)", color: "white" }}
            />
            <Chip
              icon={<Assessment />}
              label="Risk Assessment"
              sx={{ background: "rgba(255,255,255,0.2)", color: "white" }}
            />
            <Chip
              icon={<ShowChart />}
              label="Financial Modeling"
              sx={{ background: "rgba(255,255,255,0.2)", color: "white" }}
            />
          </Box>
        </Box>
      </Box>

      {/* Configuration Panel */}
      <Card
        elevation={0}
        sx={{
          border: "2px solid #f0f0f0",
          borderRadius: 3,
          mb: 4,
          background: "linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)",
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 3,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#2c3e50" }}>
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
                px: 3,
                py: 1.5,
              }}
            >
              {showConfig ? "Hide Config" : "Configure Scenarios"}
            </Button>
          </Box>

          <Collapse in={showConfig}>
            <Box sx={{ mt: 4 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, mb: 3, color: "#34495e" }}
              >
                🎯 Select Scenarios to Analyze
              </Typography>

              {/* Preset Scenarios */}
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, mb: 3, color: "#374151" }}
                >
                  📋 Preset Scenarios
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {DEFAULT_SCENARIOS.map((scenario) => (
                    <Paper
                      key={scenario.id}
                      elevation={0}
                      sx={{
                        p: 4,
                        cursor: "pointer",
                        border: "2px solid",
                        borderRadius: 3,
                        transition: "all 0.3s ease",
                        transform: selectedScenarios.includes(scenario.id)
                          ? "scale(1.02)"
                          : "scale(1)",
                        borderColor: selectedScenarios.includes(scenario.id)
                          ? scenario.color
                          : "#e5e7eb",
                        background: selectedScenarios.includes(scenario.id)
                          ? `linear-gradient(145deg, ${scenario.color}15 0%, ${scenario.color}25 100%)`
                          : "linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)",
                        position: "relative",
                        "&:hover": {
                          borderColor: scenario.color,
                          transform: "scale(1.02)",
                          boxShadow: `0 8px 25px ${scenario.color}20`,
                        },
                      }}
                      onClick={() => toggleScenario(scenario.id)}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          mb: 3,
                        }}
                      >
                        <Box
                          sx={{
                            color: scenario.color,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {getCategoryIcon(scenario.category)}
                        </Box>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 700, color: "#1f2937" }}
                        >
                          {scenario.name}
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ color: "#6b7280", mb: 3 }}
                      >
                        {scenario.description}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                        {scenario.variables.map((variable, index) => (
                          <Chip
                            key={index}
                            label={`${variable.label}: ${
                              variable.newValue > variable.currentValue
                                ? "+"
                                : ""
                            }${(
                              (variable.newValue / variable.currentValue - 1) *
                              100
                            ).toFixed(0)}%`}
                            size="small"
                            sx={{
                              background: getImpactColor(variable.impact),
                              color: "white",
                              fontSize: "0.75rem",
                              height: 24,
                              px: 1.5,
                              fontWeight: 500,
                            }}
                          />
                        ))}
                      </Box>
                      {selectedScenarios.includes(scenario.id) && (
                        <CheckCircle
                          sx={{
                            position: "absolute",
                            top: 16,
                            right: 16,
                            color: scenario.color,
                            fontSize: 28,
                          }}
                        />
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
          onClick={runAnalysis}
          disabled={loading || activeScenarios.length === 0}
          startIcon={loading ? null : <CompareArrows />}
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: 3,
            px: 8,
            py: 3,
            fontSize: "1.2rem",
            fontWeight: 700,
            textTransform: "none",
            boxShadow: "0 15px 35px rgba(102, 126, 234, 0.4)",
            "&:hover": {
              background: "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)",
              boxShadow: "0 20px 40px rgba(102, 126, 234, 0.5)",
              transform: "translateY(-3px)",
            },
            "&:disabled": {
              background: "#e5e7eb",
              boxShadow: "none",
              transform: "none",
            },
          }}
        >
          {loading ? "Analyzing..." : "🚀 Run Advanced Scenario Analysis"}
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
              mb: 4,
              background: "linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)",
            }}
          >
            <CardContent sx={{ p: 5, textAlign: "center" }}>
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: "#2c3e50", mb: 3 }}
                >
                  🔬 Running Advanced Scenario Analysis
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ color: "#6b7280", mb: 4, maxWidth: 600, mx: "auto" }}
                >
                  Our AI-powered engine is analyzing {selectedScenarios.length}{" "}
                  scenarios with advanced financial modeling, Monte Carlo
                  simulations, and risk assessment algorithms...
                </Typography>
                <LinearProgress
                  sx={{
                    height: 12,
                    borderRadius: 6,
                    background: "#e5e7eb",
                    mb: 3,
                    "& .MuiLinearProgress-bar": {
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      borderRadius: 6,
                    },
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{ color: "#9ca3af", fontStyle: "italic" }}
                >
                  This may take a few moments as we process complex financial
                  calculations...
                </Typography>
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
                    icon={getCategoryIcon(scenario.category)}
                    sx={{
                      background: `linear-gradient(145deg, ${scenario.color}15 0%, ${scenario.color}25 100%)`,
                      border: `1px solid ${scenario.color}`,
                      color: scenario.color,
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
      {results && !loading && (
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
                variant="h5"
                sx={{ fontWeight: 700, mb: 4, color: "#2c3e50" }}
              >
                📊 Scenario Analysis Results
              </Typography>

              {/* Results Grid */}
              <GridLegacy container spacing={3}>
                {/* Baseline */}
                <GridLegacy item xs={12} md={6} lg={3}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      background:
                        "linear-gradient(145deg, #f0f9ff 0%, #e0f2fe 100%)",
                      border: "2px solid #0ea5e9",
                      borderRadius: 3,
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, color: "#0c4a6e", mb: 2 }}
                    >
                      📈 Baseline
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 800, color: "#0ea5e9", mb: 1 }}
                    >
                      ₹{(results.baseline.npv / 10000000).toFixed(1)} Cr
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#0369a1" }}>
                      NPV
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 1,
                      }}
                    >
                      <Box>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 700, color: "#0ea5e9" }}
                        >
                          {(results.baseline.irr * 100).toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#0369a1" }}>
                          IRR
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 700, color: "#0ea5e9" }}
                        >
                          {results.baseline.payback.toFixed(1)}y
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#0369a1" }}>
                          Payback
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </GridLegacy>

                {/* Scenarios */}
                {results.scenarios.map((scenario: any) => {
                  const scenarioData = activeScenarios.find(
                    (s) => s.id === scenario.id
                  );
                  return (
                    <GridLegacy item xs={12} md={6} lg={3} key={scenario.id}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 3,
                          background: `linear-gradient(145deg, ${scenarioData?.color}15 0%, ${scenarioData?.color}25 100%)`,
                          border: `2px solid ${scenarioData?.color}`,
                          borderRadius: 3,
                          textAlign: "center",
                          position: "relative",
                        }}
                      >
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 700,
                            color: scenarioData?.color,
                            mb: 2,
                          }}
                        >
                          {scenario.name}
                        </Typography>
                        <Typography
                          variant="h4"
                          sx={{
                            fontWeight: 800,
                            color: scenarioData?.color,
                            mb: 1,
                          }}
                        >
                          ₹{(scenario.npv / 10000000).toFixed(1)} Cr
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: scenarioData?.color }}
                        >
                          NPV
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 1,
                          }}
                        >
                          <Box>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 700,
                                color: scenarioData?.color,
                              }}
                            >
                              {(scenario.irr * 100).toFixed(1)}%
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: scenarioData?.color }}
                            >
                              IRR
                            </Typography>
                          </Box>
                          <Box>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 700,
                                color: scenarioData?.color,
                              }}
                            >
                              {scenario.payback.toFixed(1)}y
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: scenarioData?.color }}
                            >
                              Payback
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </GridLegacy>
                  );
                })}
              </GridLegacy>
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
          <CardContent sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6" sx={{ color: "#dc2626", mb: 2 }}>
              ❌ Analysis Failed
            </Typography>
            <Typography variant="body1" sx={{ color: "#991b1b" }}>
              {error}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Custom Scenario Dialog */}
      <Dialog
        open={showCustomDialog}
        onClose={() => setShowCustomDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#2c3e50" }}>
          🛠️ Create Custom Scenario
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Scenario Name"
              value={newCustomScenario.name}
              onChange={(e) =>
                setNewCustomScenario((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              sx={{ mb: 3 }}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newCustomScenario.description}
              onChange={(e) =>
                setNewCustomScenario((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              sx={{ mb: 3 }}
            />
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={newCustomScenario.category}
                onChange={(e) =>
                  setNewCustomScenario((prev) => ({
                    ...prev,
                    category: e.target.value as any,
                  }))
                }
                label="Category"
              >
                <MenuItem value="custom">Custom</MenuItem>
                <MenuItem value="optimistic">Optimistic</MenuItem>
                <MenuItem value="pessimistic">Pessimistic</MenuItem>
                <MenuItem value="realistic">Realistic</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setShowCustomDialog(false)}>Cancel</Button>
          <Button
            onClick={addCustomScenario}
            variant="contained"
            disabled={!newCustomScenario.name || !newCustomScenario.description}
            sx={{
              background: "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)",
              },
            }}
          >
            Create Scenario
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
