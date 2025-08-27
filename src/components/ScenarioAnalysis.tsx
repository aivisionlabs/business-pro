"use client";

import React, { useMemo, useState } from "react";
import { Box, Card, CardContent, Slider, Typography } from "@mui/material";
import { BusinessCase } from "@/lib/types";
import { calculateScenario } from "@/lib/calc";
import { CalculationEngine } from "@/lib/calc/engines";
import StickyMetricsBar from "./common/StickyMetricsBar";
import { formatCrores } from "@/lib/utils";

type Props = { scenario: BusinessCase };

type CustomInputs = {
  volumePct: number; // +/- percent
  conversionCostPct: number; // +/- percent
  wcDaysPct: number; // +/- percent
};

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function applyScenario(
  s: BusinessCase,
  opts: Partial<{
    volumePct: number;
    conversionRecoveryPct: number;
    conversionCostPct: number;
    wcDaysPct: number;
  }>
): BusinessCase {
  const b = clone(s);
  const vol = opts.volumePct ?? 0;
  const convRec = opts.conversionRecoveryPct ?? 0;
  const convCost = opts.conversionCostPct ?? 0;
  const wcDays = opts.wcDaysPct ?? 0;

  b.skus.forEach((sku) => {
    if (vol !== 0) {
      sku.sales.baseAnnualVolumePieces = Math.max(
        0,
        Math.round(sku.sales.baseAnnualVolumePieces * (1 + vol / 100))
      );
    }

    if (convRec !== 0 && sku.sales.conversionRecoveryRsPerPiece !== undefined) {
      sku.sales.conversionRecoveryRsPerPiece = Math.max(
        0,
        sku.sales.conversionRecoveryRsPerPiece * (1 + convRec / 100)
      );
    }

    if (convCost !== 0) {
      sku.plantMaster.conversionPerKg = Math.max(
        0,
        sku.plantMaster.conversionPerKg * (1 + convCost / 100)
      );
    }

    // Working capital days: apply delta relative to current value (default 60 if undefined)
    if (wcDays !== 0) {
      const current = sku.ops?.workingCapitalDays ?? 60;
      if (!sku.ops) sku.ops = {} as any;
      sku.ops.workingCapitalDays = Math.max(
        0,
        Math.round(current * (1 + wcDays / 100))
      );
    }
  });

  return b;
}

function buildMetrics(s: BusinessCase) {
  const calc = calculateScenario(s);
  const ebitY1 = calc.pnl[0]?.ebit ?? 0;
  const revenueY1 = calc.pnl[0]?.revenueNet ?? 0;
  const roceY1 = CalculationEngine.buildRoce(s, ebitY1, 1, revenueY1);
  return {
    npv: calc.returns.npv,
    irr: calc.returns.irr,
    payback: calc.returns.paybackYears,
    roceY1,
  };
}

export default function ScenarioAnalysis({ scenario }: Props) {
  const [c1, setC1] = useState<CustomInputs>({
    volumePct: 0,
    conversionCostPct: 0,
    wcDaysPct: 0,
  });
  const [c2, setC2] = useState<CustomInputs>({
    volumePct: 0,
    conversionCostPct: 0,
    wcDaysPct: 0,
  });

  const baseline = useMemo(() => buildMetrics(scenario), [scenario]);

  const optimistic = useMemo(() => {
    const modified = applyScenario(scenario, {
      volumePct: 5,
      conversionRecoveryPct: 5,
    });
    return buildMetrics(modified);
  }, [scenario]);

  const pessimistic = useMemo(() => {
    const modified = applyScenario(scenario, {
      volumePct: -20,
      conversionCostPct: 10,
    });
    return buildMetrics(modified);
  }, [scenario]);

  const custom1 = useMemo(() => {
    const modified = applyScenario(scenario, c1);
    return buildMetrics(modified);
  }, [scenario, c1]);

  const custom2 = useMemo(() => {
    const modified = applyScenario(scenario, c2);
    return buildMetrics(modified);
  }, [scenario, c2]);

  // Local precise formatters (4 decimals)
  const formatPct4 = (n: number): string => `${(n * 100).toFixed(4)}%`;
  const formatPayback4 = (years: number | null): string =>
    years === null || years === undefined ? "—" : `${years.toFixed(4)}y`;

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
        {/* Controls */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Scenario Controls
            </Typography>

            {/* Presets description */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Optimistic
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Volume +5%, Conversion recovery +5%
              </Typography>
            </Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Pessimistic
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Volume -20%, Conversion cost +10%
              </Typography>
            </Box>

            {/* Custom 1 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Custom Scenario 1
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Volume ({c1.volumePct}% )
              </Typography>
              <Slider
                value={c1.volumePct}
                onChange={(_, v) =>
                  setC1((p) => ({ ...p, volumePct: v as number }))
                }
                min={-30}
                max={30}
                step={1}
                sx={{ mt: 0.5, mb: 1.5 }}
              />
              <Typography variant="caption" color="text.secondary">
                Conversion cost ({c1.conversionCostPct}% )
              </Typography>
              <Slider
                value={c1.conversionCostPct}
                onChange={(_, v) =>
                  setC1((p) => ({ ...p, conversionCostPct: v as number }))
                }
                min={-30}
                max={30}
                step={1}
                sx={{ mt: 0.5, mb: 1.5 }}
              />
              <Typography variant="caption" color="text.secondary">
                WC Days ({c1.wcDaysPct}% )
              </Typography>
              <Slider
                value={c1.wcDaysPct}
                onChange={(_, v) =>
                  setC1((p) => ({ ...p, wcDaysPct: v as number }))
                }
                min={-50}
                max={50}
                step={1}
                sx={{ mt: 0.5 }}
              />
            </Box>

            {/* Custom 2 */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Custom Scenario 2
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Volume ({c2.volumePct}% )
              </Typography>
              <Slider
                value={c2.volumePct}
                onChange={(_, v) =>
                  setC2((p) => ({ ...p, volumePct: v as number }))
                }
                min={-30}
                max={30}
                step={1}
                sx={{ mt: 0.5, mb: 1.5 }}
              />
              <Typography variant="caption" color="text.secondary">
                Conversion cost ({c2.conversionCostPct}% )
              </Typography>
              <Slider
                value={c2.conversionCostPct}
                onChange={(_, v) =>
                  setC2((p) => ({ ...p, conversionCostPct: v as number }))
                }
                min={-30}
                max={30}
                step={1}
                sx={{ mt: 0.5, mb: 1.5 }}
              />
              <Typography variant="caption" color="text.secondary">
                WC Days ({c2.wcDaysPct}% )
              </Typography>
              <Slider
                value={c2.wcDaysPct}
                onChange={(_, v) =>
                  setC2((p) => ({ ...p, wcDaysPct: v as number }))
                }
                min={-50}
                max={50}
                step={1}
                sx={{ mt: 0.5 }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Results */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Scenario Analysis (Key Returns)
            </Typography>

            {/* Header */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "150px repeat(5, 1fr)",
                  md: "220px repeat(5, 1fr)",
                },
                alignItems: "center",
                gap: 1,
                borderBottom: "1px solid #e0e0e0",
                pb: 1.5,
                mb: 2,
                fontWeight: 600,
                color: "text.secondary",
              }}
            >
              <Box />
              <Box textAlign="center">Optimistic</Box>
              <Box textAlign="center">Pessimistic</Box>
              <Box textAlign="center">Baseline</Box>
              <Box textAlign="center">Custom 1</Box>
              <Box textAlign="center">Custom 2</Box>
            </Box>

            {[
              {
                key: "npv",
                label: "NPV",
                format: (v: number) => formatCrores(v, 4),
              },
              {
                key: "irr",
                label: "IRR",
                format: (v: number | null) =>
                  v === null ? "—" : formatPct4(v),
              },
              {
                key: "payback",
                label: "Payback Period",
                format: (v: number | null) => formatPayback4(v),
              },
              {
                key: "roceY1",
                label: "RoCE (y1)",
                format: (v: number) => formatPct4(v),
              },
            ].map((row) => (
              <Box
                key={row.key}
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "150px repeat(5, 1fr)",
                    md: "220px repeat(5, 1fr)",
                  },
                  alignItems: "center",
                  gap: 1,
                  bgcolor: "action.hover",
                  borderRadius: 1,
                  mb: 1.25,
                  p: 1,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {row.label}
                </Typography>
                <Box textAlign="center">
                  {row.format((optimistic as any)[row.key])}
                </Box>
                <Box textAlign="center">
                  {row.format((pessimistic as any)[row.key])}
                </Box>
                <Box textAlign="center">
                  {row.format((baseline as any)[row.key])}
                </Box>
                <Box textAlign="center">
                  {row.format((custom1 as any)[row.key])}
                </Box>
                <Box textAlign="center">
                  {row.format((custom2 as any)[row.key])}
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
