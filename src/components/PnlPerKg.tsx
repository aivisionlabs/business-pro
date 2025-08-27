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
      getter: (i: number) => {
        try {
          const result = CalculationEngine.calculatePerKgForYear(
            calc,
            i,
            pnlAggregated
          );
          return result?.revenueNetPerKg ?? 0;
        } catch (error) {
          return 0;
        }
      },
    },
    {
      label: "Material cost",
      getter: (i: number) => {
        try {
          const result = CalculationEngine.calculatePerKgForYear(
            calc,
            i,
            pnlAggregated
          );
          return result?.materialCostPerKg ?? 0;
        } catch (error) {
          return 0;
        }
      },
    },
    {
      label: "Material margin",
      getter: (i: number) => {
        try {
          const result = CalculationEngine.calculatePerKgForYear(
            calc,
            i,
            pnlAggregated
          );
          return result?.materialMarginPerKg ?? 0;
        } catch (error) {
          return 0;
        }
      },
    },
    {
      label: "Conversion cost",
      getter: (i: number) => {
        try {
          const result = CalculationEngine.calculatePerKgForYear(
            calc,
            i,
            pnlAggregated
          );
          return result?.conversionCostPerKg ?? 0;
        } catch (error) {
          return 0;
        }
      },
    },
    {
      label: "Gross margin",
      getter: (i: number) => {
        try {
          const result = CalculationEngine.calculatePerKgForYear(
            calc,
            i,
            pnlAggregated
          );
          return result?.grossMarginPerKg ?? 0;
        } catch (error) {
          return 0;
        }
      },
    },
    {
      label: "SG&A cost",
      getter: (i: number) => {
        try {
          const result = CalculationEngine.calculatePerKgForYear(
            calc,
            i,
            pnlAggregated
          );
          return result?.sgaCostPerKg ?? 0;
        } catch (error) {
          return 0;
        }
      },
    },
    {
      label: "EBITDA",
      getter: (i: number) => {
        try {
          const result = CalculationEngine.calculatePerKgForYear(
            calc,
            i,
            pnlAggregated
          );
          return result?.ebitdaPerKg ?? 0;
        } catch (error) {
          return 0;
        }
      },
    },
    {
      label: "Depreciation",
      getter: (i: number) => {
        try {
          const result = CalculationEngine.calculatePerKgForYear(
            calc,
            i,
            pnlAggregated
          );
          return result?.depreciationPerKg ?? 0;
        } catch (error) {
          return 0;
        }
      },
    },
    {
      label: "EBIT",
      getter: (i: number) => {
        try {
          const result = CalculationEngine.calculatePerKgForYear(
            calc,
            i,
            pnlAggregated
          );
          return result?.ebitPerKg ?? 0;
        } catch (error) {
          return 0;
        }
      },
    },
    {
      label: "Interest",
      getter: (i: number) => {
        try {
          const result = CalculationEngine.calculatePerKgForYear(
            calc,
            i,
            pnlAggregated
          );
          return result?.interestPerKg ?? 0;
        } catch (error) {
          return 0;
        }
      },
    },
    {
      label: "Tax",
      getter: (i: number) => {
        try {
          const result = CalculationEngine.calculatePerKgForYear(
            calc,
            i,
            pnlAggregated
          );
          return result?.taxPerKg ?? 0;
        } catch (error) {
          return 0;
        }
      },
    },
    {
      label: "PBT",
      getter: (i: number) => {
        try {
          const result = CalculationEngine.calculatePerKgForYear(
            calc,
            i,
            pnlAggregated
          );
          return result?.pbtPerKg ?? 0;
        } catch (error) {
          return 0;
        }
      },
    },
    {
      label: "PAT",
      getter: (i: number) => {
        try {
          const result = CalculationEngine.calculatePerKgForYear(
            calc,
            i,
            pnlAggregated
          );
          return result?.patPerKg ?? 0;
        } catch (error) {
          return 0;
        }
      },
    },
    {
      label: "RoCE %",
      getter: (i: number) => {
        try {
          // Use the pre-calculated RoCE from the main calculation engine
          const roceData = calc.returns.roceByYear.find(
            (item) => item.year === i + 1
          );
          return roceData?.roce ? roceData.roce * 100 : 0; // Convert to percentage
        } catch (error) {
          return 0;
        }
      },
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
                          {label === "RoCE %"
                            ? `${(getter(idx) ?? 0).toFixed(2)}%`
                            : formatPerKg(getter(idx) ?? 0)}
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
