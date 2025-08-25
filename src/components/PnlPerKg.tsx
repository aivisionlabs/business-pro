import React from "react";
import { formatPerKg } from "@/lib/utils";
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

interface PnlPerKgProps {
  calc: CalcOutput;
  pnlAggregated: {
    depreciation: number[];
    ebit: number[];
    interest: number[];
    tax: number[];
    pat: number[];
  };
}

export default function PnlPerKg({ calc, pnlAggregated }: PnlPerKgProps) {
  const rows = [
    {
      label: "Revenue (net)",
      getter: (i: number) =>
        CalculationEngine.calculatePerKgForYear(calc, i, pnlAggregated)
          .revenueNetPerKg,
    },
    {
      label: "Material cost",
      getter: (i: number) =>
        CalculationEngine.calculatePerKgForYear(calc, i, pnlAggregated)
          .materialCostPerKg,
    },
    {
      label: "Material margin",
      getter: (i: number) =>
        CalculationEngine.calculatePerKgForYear(calc, i, pnlAggregated)
          .materialMarginPerKg,
    },
    {
      label: "Conversion cost",
      getter: (i: number) =>
        CalculationEngine.calculatePerKgForYear(calc, i, pnlAggregated)
          .conversionCostPerKg,
    },
    {
      label: "Gross margin",
      getter: (i: number) =>
        CalculationEngine.calculatePerKgForYear(calc, i, pnlAggregated)
          .grossMarginPerKg,
    },
    {
      label: "SG&A cost",
      getter: (i: number) =>
        CalculationEngine.calculatePerKgForYear(calc, i, pnlAggregated)
          .sgaCostPerKg,
    },
    {
      label: "EBITDA",
      getter: (i: number) =>
        CalculationEngine.calculatePerKgForYear(calc, i, pnlAggregated)
          .ebitdaPerKg,
    },
    {
      label: "Depreciation",
      getter: (i: number) =>
        CalculationEngine.calculatePerKgForYear(calc, i, pnlAggregated)
          .depreciationPerKg,
    },
    {
      label: "EBIT",
      getter: (i: number) =>
        CalculationEngine.calculatePerKgForYear(calc, i, pnlAggregated)
          .ebitPerKg,
    },
    {
      label: "Interest",
      getter: (i: number) =>
        CalculationEngine.calculatePerKgForYear(calc, i, pnlAggregated)
          .interestPerKg,
    },
    {
      label: "Tax",
      getter: (i: number) =>
        CalculationEngine.calculatePerKgForYear(calc, i, pnlAggregated)
          .taxPerKg,
    },
    {
      label: "PBT",
      getter: (i: number) =>
        CalculationEngine.calculatePerKgForYear(calc, i, pnlAggregated)
          .pbtPerKg,
    },
    {
      label: "PAT",
      getter: (i: number) =>
        CalculationEngine.calculatePerKgForYear(calc, i, pnlAggregated)
          .patPerKg,
    },
  ];

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ overflowX: "auto", width: "100%" }}>
          <TableContainer
            sx={{
              minWidth: { xs: 400, sm: 500, md: 600, lg: 700 },
              maxWidth: "100%",
            }}
          >
            <Table size="small" sx={{ "td, th": { py: 1.25 } }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      minWidth: { xs: 80, sm: 100, md: 120 },
                      wordBreak: "break-word",
                    }}
                  >
                    <Typography variant="subtitle2">Metric</Typography>
                  </TableCell>
                  {Array.from(
                    { length: CALCULATION_CONFIG.UI_DISPLAY_YEARS },
                    (_, index) => (
                      <TableCell
                        key={index}
                        align="right"
                        sx={{
                          minWidth: { xs: 60, sm: 80, md: 100 },
                          wordBreak: "break-word",
                        }}
                      >
                        <Typography variant="subtitle2">
                          Y{index + 1}
                        </Typography>
                      </TableCell>
                    )
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(({ label, getter }) => (
                  <TableRow key={label} hover>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {label}
                    </TableCell>
                    {Array.from(
                      { length: CALCULATION_CONFIG.UI_DISPLAY_YEARS },
                      (_, idx) => (
                        <TableCell
                          key={idx}
                          align="right"
                          sx={{
                            fontFamily:
                              "ui-monospace, SFMono-Regular, Menlo, monospace",
                            lineHeight: 1.6,
                          }}
                        >
                          {formatPerKg(getter(idx))}
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
  );
}
