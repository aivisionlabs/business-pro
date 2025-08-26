import React, { useState } from "react";
import { formatCrores, formatPerKg } from "@/lib/utils";
import { CalcOutput } from "@/lib/types";
import { CalculationEngine } from "@/lib/calc/engines";
import { CALCULATION_CONFIG } from "@/lib/calc/config";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import SettingsIcon from "@mui/icons-material/Settings";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Slider from "@mui/material/Slider";

interface MergedPnlTableProps {
  calc: CalcOutput;
  pnlAggregated: {
    revenueNet: number[];
    materialCost: number[];
    materialMargin: number[];
    conversionCost: number[];
    grossMargin: number[];
    sgaCost: number[];
    ebitda: number[];
    depreciation: number[];
    ebit: number[];
    interest: number[];
    pbt: number[];
    tax: number[];
    pat: number[];
  };
}

interface DecimalPrecisionConfig {
  crores: number;
  perKg: number;
  volumes: number;
}

export default function MergedPnlTable({
  calc,
  pnlAggregated,
}: MergedPnlTableProps) {
  const [precisionConfig, setPrecisionConfig] =
    useState<DecimalPrecisionConfig>({
      crores: 2,
      perKg: 2,
      volumes: 0,
    });
  const [showPrecisionDialog, setShowPrecisionDialog] = useState(false);

  // Calculate volumes for the first SKU (assuming all SKUs have same growth rate)
  const volumes = React.useMemo(() => {
    if (calc.volumes.length === 0) return [];
    return calc.volumes;
  }, [calc]);

  const rows = [
    {
      label: "Volume (pieces)",
      type: "volume" as const,
      values: volumes.map((v) => v.volumePieces),
    },
    {
      label: "Volume (kg)",
      type: "volume" as const,
      values: volumes.map((v) => v.weightKg),
    },
    {
      label: "Revenue (net)",
      type: "both" as const,
      aggregatedValues: pnlAggregated.revenueNet,
    },
    {
      label: "Material cost",
      type: "both" as const,
      aggregatedValues: pnlAggregated.materialCost,
    },
    {
      label: "Material margin",
      type: "both" as const,
      aggregatedValues: pnlAggregated.materialMargin,
    },
    {
      label: "Conversion cost",
      type: "both" as const,
      aggregatedValues: pnlAggregated.conversionCost,
    },
    {
      label: "Gross margin",
      type: "both" as const,
      aggregatedValues: pnlAggregated.grossMargin,
    },
    {
      label: "SG&A cost",
      type: "both" as const,
      aggregatedValues: pnlAggregated.sgaCost,
    },
    {
      label: "EBITDA",
      type: "both" as const,
      aggregatedValues: pnlAggregated.ebitda,
    },
    {
      label: "Depreciation",
      type: "both" as const,
      aggregatedValues: pnlAggregated.depreciation,
    },
    {
      label: "EBIT",
      type: "both" as const,
      aggregatedValues: pnlAggregated.ebit,
    },
    {
      label: "Interest",
      type: "both" as const,
      aggregatedValues: pnlAggregated.interest,
    },
    {
      label: "PBT",
      type: "both" as const,
      aggregatedValues: pnlAggregated.pbt,
    },
    {
      label: "Tax",
      type: "both" as const,
      aggregatedValues: pnlAggregated.tax,
    },
    {
      label: "PAT",
      type: "both" as const,
      aggregatedValues: pnlAggregated.pat,
    },
  ];

  const formatValue = (
    value: number,
    type: "volume" | "both",
    metric: keyof DecimalPrecisionConfig
  ) => {
    if (type === "volume") {
      if (metric === "volumes") {
        return precisionConfig.volumes === 0
          ? Math.round(value).toLocaleString()
          : value.toFixed(precisionConfig[metric]);
      }
      return value.toFixed(precisionConfig[metric]);
    }

    if (metric === "crores") {
      return formatCrores(value, precisionConfig.crores);
    }
    if (metric === "perKg") {
      return formatPerKg(value, precisionConfig.perKg);
    }
    return value.toFixed(precisionConfig[metric]);
  };

  const getPerKgValue = (rowIndex: number, yearIndex: number) => {
    try {
      const result = CalculationEngine.calculatePerKgForYear(
        calc,
        yearIndex,
        pnlAggregated
      );
      const rowLabel = rows[rowIndex].label.toLowerCase();

      if (rowLabel.includes("revenue")) return result?.revenueNetPerKg ?? 0;
      if (rowLabel.includes("material cost"))
        return result?.materialCostPerKg ?? 0;
      if (rowLabel.includes("material margin"))
        return result?.materialMarginPerKg ?? 0;
      if (rowLabel.includes("conversion cost"))
        return result?.conversionCostPerKg ?? 0;
      if (rowLabel.includes("gross margin"))
        return result?.grossMarginPerKg ?? 0;
      if (rowLabel.includes("sg&a cost")) return result?.sgaCostPerKg ?? 0;
      if (rowLabel.includes("ebitda")) return result?.ebitdaPerKg ?? 0;
      if (rowLabel.includes("depreciation"))
        return result?.depreciationPerKg ?? 0;
      if (rowLabel.includes("ebit")) return result?.ebitPerKg ?? 0;
      if (rowLabel.includes("interest")) return result?.interestPerKg ?? 0;
      if (rowLabel.includes("tax")) return result?.taxPerKg ?? 0;
      if (rowLabel.includes("pbt")) return result?.pbtPerKg ?? 0;
      if (rowLabel.includes("pat")) return result?.patPerKg ?? 0;

      return 0;
    } catch {
      return 0;
    }
  };

  return (
    <>
      <Card variant="outlined">
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              Comprehensive P&L Analysis
            </Typography>
            <IconButton
              size="small"
              onClick={() => setShowPrecisionDialog(true)}
            >
              <SettingsIcon />
            </IconButton>
          </Box>

          <Box sx={{ overflowX: "auto", width: "100%" }}>
            <TableContainer
              sx={{
                minWidth: { xs: 400, sm: 500, md: 600, lg: 800 },
                maxWidth: "100%",
              }}
            >
              <Table size="small" sx={{ "td, th": { py: 1.25 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        minWidth: { xs: 100, sm: 120, md: 140 },
                        wordBreak: "break-word",
                        backgroundColor: "grey.50",
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={600}>
                        Metric
                      </Typography>
                    </TableCell>
                    {Array.from(
                      { length: CALCULATION_CONFIG.UI_DISPLAY_YEARS },
                      (_, index) => (
                        <TableCell
                          key={index}
                          align="center"
                          sx={{
                            minWidth: { xs: 80, sm: 100, md: 120 },
                            wordBreak: "break-word",
                            backgroundColor: "grey.50",
                          }}
                        >
                          <Typography variant="subtitle2" fontWeight={600}>
                            Y{index + 1}
                          </Typography>
                        </TableCell>
                      )
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, rowIndex) => (
                    <TableRow key={row.label} hover>
                      <TableCell
                        sx={{
                          color: "text.secondary",
                          fontWeight: row.type === "volume" ? 600 : 500,
                          backgroundColor:
                            row.type === "volume"
                              ? "primary.50"
                              : "transparent",
                        }}
                      >
                        {row.label}
                      </TableCell>
                      {Array.from(
                        { length: CALCULATION_CONFIG.UI_DISPLAY_YEARS },
                        (_, yearIndex) => (
                          <TableCell
                            key={yearIndex}
                            align="center"
                            sx={{
                              fontFamily:
                                "ui-monospace, SFMono-Regular, Menlo, monospace",
                              lineHeight: 1.6,
                            }}
                          >
                            {row.type === "volume" ? (
                              <Typography variant="body2">
                                {formatValue(
                                  row.values[yearIndex],
                                  row.type,
                                  "volumes"
                                )}
                              </Typography>
                            ) : (
                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 0.5,
                                }}
                              >
                                <Typography variant="body2" fontWeight={500}>
                                  {formatValue(
                                    row.aggregatedValues[yearIndex],
                                    row.type,
                                    "crores"
                                  )}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {formatValue(
                                    getPerKgValue(rowIndex, yearIndex),
                                    row.type,
                                    "perKg"
                                  )}
                                </Typography>
                              </Box>
                            )}
                          </TableCell>
                        )
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Precision Configuration Dialog */}
      <Dialog
        open={showPrecisionDialog}
        onClose={() => setShowPrecisionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Decimal Precision Configuration</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Crores (Cr) - {precisionConfig.crores} decimal places
            </Typography>
            <Slider
              value={precisionConfig.crores}
              onChange={(_, value) =>
                setPrecisionConfig((prev) => ({
                  ...prev,
                  crores: value as number,
                }))
              }
              min={0}
              max={4}
              step={1}
              marks
              valueLabelDisplay="auto"
              sx={{ mb: 3 }}
            />

            <Typography variant="subtitle2" gutterBottom>
              Per Kg (₹) - {precisionConfig.perKg} decimal places
            </Typography>
            <Slider
              value={precisionConfig.perKg}
              onChange={(_, value) =>
                setPrecisionConfig((prev) => ({
                  ...prev,
                  perKg: value as number,
                }))
              }
              min={0}
              max={4}
              step={1}
              marks
              valueLabelDisplay="auto"
              sx={{ mb: 3 }}
            />

            <Typography variant="subtitle2" gutterBottom>
              Volumes - {precisionConfig.volumes} decimal places
            </Typography>
            <Slider
              value={precisionConfig.volumes}
              onChange={(_, value) =>
                setPrecisionConfig((prev) => ({
                  ...prev,
                  volumes: value as number,
                }))
              }
              min={0}
              max={2}
              step={1}
              marks
              valueLabelDisplay="auto"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPrecisionDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
