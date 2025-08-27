"use client";
import React, { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Slider,
  Typography,
} from "@mui/material";
import { BusinessCase } from "@/lib/types";
import StickyMetricsBar from "./common/StickyMetricsBar";
import { calculateScenario } from "@/lib/calc";
import { CalculationEngine } from "@/lib/calc/engines";

type Props = { scenario: BusinessCase };

type SensVar = {
  id: string;
  label: string;
};

const VARIABLES: SensVar[] = [
  { id: "volume", label: "Volume" },
  { id: "conversionRecovery", label: "Conversion Recovery" },
  { id: "resinPrice", label: "Resin price" },
  { id: "conversionCost", label: "Conversion cost" },
  { id: "oee", label: "Operating Efficiency" },
  { id: "machineCost", label: "Machine Cost" },
  { id: "mouldCost", label: "Mould Cost" },
  { id: "sga", label: "S, G&A" },
];

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function getVariableValue(s: BusinessCase, varId: string): any {
  switch (varId) {
    case "volume":
      return s.skus.map((sku) => sku.sales.baseAnnualVolumePieces);
    case "conversionRecovery":
      return s.skus.map((sku) => sku.sales.conversionRecoveryRsPerPiece);
    case "resinPrice":
      return s.skus.map((sku) => ({
        resin: sku.costing.resinRsPerKg,
        mb: sku.costing.mbRsPerKg,
      }));
    case "conversionCost":
      return s.skus.map((sku) => sku.plantMaster.conversionPerKg);
    case "oee":
      return s.skus.map((sku) => sku.ops.oee);
    case "machineCost":
      return s.skus.map((sku) => sku.ops.costOfNewMachine);
    case "mouldCost":
      return s.skus.map((sku) => sku.ops.costOfNewMould);
    case "sga":
      return s.skus.map(
        (sku) => sku.plantMaster.sellingGeneralAndAdministrativeExpensesPerKg
      );
    default:
      return "unknown";
  }
}

function applyDelta(
  s: BusinessCase,
  v: SensVar,
  deltaPct: number
): BusinessCase {
  const b = clone(s);

  console.log(`🔧 Applying ${(deltaPct * 100).toFixed(1)}% delta to ${v.id}:`);
  console.log(`   Before: ${JSON.stringify(getVariableValue(s, v.id))}`);

  // Apply delta to all SKUs
  b.skus.forEach((sku, index) => {
    switch (v.id) {
      case "volume":
        const oldVolume = sku.sales.baseAnnualVolumePieces;
        sku.sales.baseAnnualVolumePieces = Math.max(
          0,
          Math.round(sku.sales.baseAnnualVolumePieces * (1 + deltaPct))
        );
        console.log(
          `   SKU ${index + 1} Volume: ${oldVolume} → ${
            sku.sales.baseAnnualVolumePieces
          }`
        );
        break;
      case "conversionRecovery":
        if (sku.sales.conversionRecoveryRsPerPiece !== undefined) {
          const oldConv = sku.sales.conversionRecoveryRsPerPiece;
          sku.sales.conversionRecoveryRsPerPiece = Math.max(
            0,
            sku.sales.conversionRecoveryRsPerPiece * (1 + deltaPct)
          );
          console.log(
            `   SKU ${index + 1} Conversion Recovery: ${oldConv} → ${
              sku.sales.conversionRecoveryRsPerPiece
            }`
          );
        }
        break;
      case "resinPrice":
        const oldResin = sku.costing.resinRsPerKg;
        const oldMb = sku.costing.mbRsPerKg;
        sku.costing.resinRsPerKg = Math.max(
          0,
          sku.costing.resinRsPerKg * (1 + deltaPct)
        );
        sku.costing.mbRsPerKg = Math.max(
          0,
          sku.costing.mbRsPerKg * (1 + deltaPct)
        );
        console.log(
          `   SKU ${index + 1} Resin: ${oldResin} → ${sku.costing.resinRsPerKg}`
        );
        console.log(
          `   SKU ${index + 1} MB: ${oldMb} → ${sku.costing.mbRsPerKg}`
        );
        break;
      case "conversionCost":
        const oldConvCost = sku.plantMaster.conversionPerKg;
        sku.plantMaster.conversionPerKg = Math.max(
          0,
          sku.plantMaster.conversionPerKg * (1 + deltaPct)
        );
        console.log(
          `   SKU ${index + 1} Conversion Cost: ${oldConvCost} → ${
            sku.plantMaster.conversionPerKg
          }`
        );
        break;
      case "oee":
        const oldOee = sku.ops.oee;
        sku.ops.oee = Math.min(1, Math.max(0, sku.ops.oee * (1 + deltaPct)));
        console.log(`   SKU ${index + 1} OEE: ${oldOee} → ${sku.ops.oee}`);
        break;
      case "machineCost":
        const oldMachine = sku.ops.costOfNewMachine;
        sku.ops.costOfNewMachine = Math.max(
          0,
          sku.ops.costOfNewMachine * (1 + deltaPct)
        );
        console.log(
          `   SKU ${index + 1} Machine Cost: ${oldMachine} → ${
            sku.ops.costOfNewMachine
          }`
        );
        break;
      case "mouldCost":
        const oldMould = sku.ops.costOfNewMould;
        sku.ops.costOfNewMould = Math.max(
          0,
          sku.ops.costOfNewMould * (1 + deltaPct)
        );
        console.log(
          `   SKU ${index + 1} Mould Cost: ${oldMould} → ${
            sku.ops.costOfNewMould
          }`
        );
        break;
      case "sga":
        const oldSga =
          sku.plantMaster.sellingGeneralAndAdministrativeExpensesPerKg;
        sku.plantMaster.sellingGeneralAndAdministrativeExpensesPerKg = Math.max(
          0,
          sku.plantMaster.sellingGeneralAndAdministrativeExpensesPerKg *
            (1 + deltaPct)
        );
        console.log(
          `   SKU ${index + 1} SGA: ${oldSga} → ${
            sku.plantMaster.sellingGeneralAndAdministrativeExpensesPerKg
          }`
        );
        break;
      default:
        break;
    }
  });

  console.log(`   After: ${JSON.stringify(getVariableValue(b, v.id))}`);
  return b;
}

function buildRoceY1(s: BusinessCase): number {
  const calc = calculateScenario(s);
  const ebitY1 = calc.pnl[0]?.ebit ?? 0;
  const revenueY1 = calc.pnl[0]?.revenueNet ?? 0;
  const roce = CalculationEngine.buildRoce(s, ebitY1, 1, revenueY1);
  console.log(
    `   📊 RoCE(Y1) calculation: EBIT=${ebitY1}, Revenue=${revenueY1}, RoCE=${(
      roce * 100
    ).toFixed(3)}%`
  );
  return roce;
}

export default function RiskSensitivity({ scenario }: Props) {
  const [percent, setPercent] = useState<number>(5);
  const [selected, setSelected] = useState<string[]>(
    VARIABLES.map((v) => v.id)
  );

  const baselineRoce = useMemo(() => buildRoceY1(scenario), [scenario]);

  const results = useMemo(() => {
    const deltas = [-(percent / 100), percent / 100];
    console.log(
      `\n🎯 Running sensitivity analysis with ${percent}% perturbation range`
    );
    console.log(`📊 Baseline RoCE (Y1): ${(baselineRoce * 100).toFixed(3)}%`);

    return VARIABLES.filter((v) => selected.includes(v.id))
      .map((v) => {
        console.log(`\n📈 Analyzing variable: ${v.label} (${v.id})`);

        const minus = buildRoceY1(applyDelta(scenario, v, deltas[0]));
        const plus = buildRoceY1(applyDelta(scenario, v, deltas[1]));

        const negativeImpact = minus - baselineRoce;
        const positiveImpact = plus - baselineRoce;

        console.log(
          `   -${percent}% perturbation: RoCE = ${(minus * 100).toFixed(
            3
          )}% (impact: ${(negativeImpact * 100).toFixed(3)}%)`
        );
        console.log(
          `   +${percent}% perturbation: RoCE = ${(plus * 100).toFixed(
            3
          )}% (impact: ${(positiveImpact * 100).toFixed(3)}%)`
        );

        return {
          id: v.id,
          label: v.label,
          negativeImpact,
          positiveImpact,
          maxImpact: Math.max(
            Math.abs(negativeImpact),
            Math.abs(positiveImpact)
          ),
        };
      })
      .sort((a, b) => b.maxImpact - a.maxImpact);
  }, [scenario, percent, selected, baselineRoce]);

  const maxImpact = results.length
    ? Math.max(...results.map((r) => r.maxImpact))
    : 1;

  return (
    <Box>
      <StickyMetricsBar scenario={scenario} />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "300px 1fr" },
          gap: 2,
          mt: 2,
        }}
      >
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Sensitivity Analysis
            </Typography>
            <Typography variant="body2">
              Perturbation Range: {percent}%
            </Typography>
            <Slider
              value={percent}
              onChange={(_, v) => setPercent(v as number)}
              min={0}
              max={30}
              step={1}
              sx={{ mt: 1, mb: 2 }}
            />
            <FormGroup>
              {VARIABLES.map((v) => (
                <FormControlLabel
                  key={v.id}
                  control={
                    <Checkbox
                      checked={selected.includes(v.id)}
                      onChange={(e) => {
                        setSelected((prev) =>
                          e.target.checked
                            ? Array.from(new Set([...prev, v.id]))
                            : prev.filter((x) => x !== v.id)
                        );
                      }}
                    />
                  }
                  label={v.label}
                />
              ))}
            </FormGroup>
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 8 }}>
              Tornado Chart - RoCE (Y1)
            </Typography>
            <Box sx={{ position: "relative", pl: 2 }}>
              {/* Single baseline line and 0% label for the entire chart */}
              <Box
                sx={{
                  position: "absolute",
                  left: "calc(150px + 4.5rem + 37.5%)", // Field name (150px) + margin (2rem) + left chart area (37.5%)
                  top: 0,
                  bottom: 0,
                  width: 2,
                  bgcolor: "primary.main",
                  opacity: 0.2,
                  transform: "translateX(-50%)",
                  zIndex: 1,
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  left: "calc(150px + 4.5rem + 37.5%)", // Same as baseline line
                  top: -25,
                  transform: "translateX(-50%)",
                  zIndex: 2,
                  bgcolor: "primary.main",
                  color: "white",
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                0%
              </Box>

              {/* Chart container with proper positioning */}
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                {results.map((r) => (
                  <Box
                    key={r.id}
                    sx={{ mb: 2, display: "flex", alignItems: "center" }}
                  >
                    {/* Field name - Fixed width */}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        width: "150px",
                        flexShrink: 0,
                        mr: 2,
                      }}
                    >
                      {r.label}
                    </Typography>

                    {/* Chart area - Fixed layout */}
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 80px 1fr",
                        alignItems: "center",
                        height: 34,
                        flexGrow: 1,
                        gap: 0,
                        position: "relative",
                      }}
                    >
                      {/* Left side - Impact of -5% perturbation */}
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "flex-end",
                          alignItems: "center",
                          pr: 2,
                        }}
                      >
                        {Math.abs(r.negativeImpact) > 0.001 ? (
                          <Box
                            sx={{
                              width: `${Math.min(
                                (Math.abs(r.negativeImpact) / maxImpact) * 35,
                                35
                              )}%`,
                              height: 24,
                              bgcolor:
                                r.negativeImpact < 0
                                  ? "error.main"
                                  : "success.main",
                              borderRadius: "4px 0 0 4px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              pr: 1,
                              color: "white",
                              fontSize: "0.7rem",
                              fontWeight: 500,
                              minWidth: "fit-content",
                            }}
                          >
                            {(r.negativeImpact * 100).toFixed(1)}%
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              height: 24,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              pr: 1,
                              color: "text.disabled",
                              fontSize: "0.7rem",
                              fontStyle: "italic",
                            }}
                          >
                            No change
                          </Box>
                        )}
                      </Box>

                      {/* Center baseline value */}
                      <Box
                        sx={{
                          textAlign: "center",
                          fontSize: "0.75rem",
                          color: "text.secondary",
                          fontWeight: 500,
                          bgcolor: "background.paper",
                          py: 0.5,
                          borderRadius: 1,
                          border: "1px solid #e0e0e0",
                          height: "24px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {(baselineRoce * 100).toFixed(1)}%
                      </Box>

                      {/* Right side - Impact of +5% perturbation */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          pl: 2,
                        }}
                      >
                        {Math.abs(r.positiveImpact) > 0.001 ? (
                          <Box
                            sx={{
                              width: `${Math.min(
                                (Math.abs(r.positiveImpact) / maxImpact) * 35,
                                35
                              )}%`,
                              height: 24,
                              bgcolor:
                                r.positiveImpact > 0
                                  ? "success.main"
                                  : "error.main",
                              borderRadius: "0 4px 4px 0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-start",
                              pl: 1,
                              color: "white",
                              fontSize: "0.7rem",
                              fontWeight: 500,
                              minWidth: "fit-content",
                            }}
                          >
                            {r.positiveImpact > 0 ? "+" : ""}
                            {(r.positiveImpact * 100).toFixed(1)}%
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              height: 24,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-start",
                              pl: 1,
                              color: "text.disabled",
                              fontSize: "0.7rem",
                              fontStyle: "italic",
                            }}
                          >
                            No change
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Legend */}
            <Box
              sx={{ mt: 3, display: "flex", justifyContent: "center", gap: 3 }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    bgcolor: "error.main",
                    borderRadius: 1,
                  }}
                />
                <Typography variant="body2">RoCE Decrease</Typography>
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
                <Typography variant="body2">RoCE Increase</Typography>
              </Box>
            </Box>
            <Box sx={{ mt: 1, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">
                Left: -5% perturbation impact | Right: +5% perturbation impact
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
