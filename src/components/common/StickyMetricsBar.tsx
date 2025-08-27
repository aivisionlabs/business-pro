"use client";

import React, { useMemo } from "react";
import { BusinessCase } from "@/lib/types";
import { calculateScenario } from "@/lib/calc";
import { CalculationEngine } from "@/lib/calc/engines";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";

import { formatCrores, formatPct } from "@/lib/utils";
import { formatPaybackPeriod } from "@/lib/calc/utils";

type Props = {
  scenario: BusinessCase;
};

export default function StickyMetricsBar({ scenario }: Props) {
  const calc = useMemo(() => calculateScenario(scenario), [scenario]);

  const metrics = useMemo(() => {
    const roceY1 = CalculationEngine.buildRoce(
      scenario,
      calc.pnl[0]?.ebit ?? 0,
      1,
      calc.pnl[0]?.revenueNet ?? 0
    );
    return {
      npv: calc.returns.npv,
      irr: calc.returns.irr,
      payback: calc.returns.paybackYears,
      roceY1,
    };
  }, [calc, scenario]);

  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        position: "sticky",
        top: theme.spacing(10),
        zIndex: theme.zIndex.appBar - 1,
      })}
    >
      <CardContent>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
            gap: 2,
          }}
        >
          <Box textAlign="center">
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              NPV
            </Typography>
            <Typography variant="subtitle1" fontWeight={700}>
              {formatCrores(metrics.npv)}
            </Typography>
          </Box>
          <Box textAlign="center">
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              IRR
            </Typography>
            <Typography variant="subtitle1" fontWeight={700}>
              {metrics.irr === null ? "—" : formatPct(metrics.irr)}
            </Typography>
          </Box>
          <Box textAlign="center">
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              RoCE (Y1)
            </Typography>
            <Typography variant="subtitle1" fontWeight={700}>
              {formatPct(metrics.roceY1)}
            </Typography>
          </Box>
          <Box textAlign="center">
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              Payback
            </Typography>
            <Typography variant="subtitle1" fontWeight={700}>
              {formatPaybackPeriod(metrics.payback)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
