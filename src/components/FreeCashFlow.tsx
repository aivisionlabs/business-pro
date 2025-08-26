import React from "react";
import { formatCrores } from "@/lib/utils";
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

interface FreeCashFlowProps {
  cashflow: {
    year: number;
    nwc: number;
    changeInNwc: number;
    fcf: number;
    pv: number;
    cumulativeFcf: number;
  }[];
  pnl: {
    year: number;
    ebitda: number;
    depreciation: number;
    ebit: number;
    interestCapex: number;
    pbt: number;
    tax: number;
  }[];
}

export default function FreeCashFlow({ cashflow, pnl }: FreeCashFlowProps) {
  // Calculate the components for each year
  const getFcfBreakdown = (year: number) => {
    const yearData = cashflow.find((c) => c.year === year);
    const yearPnl = pnl.find((p) => p.year === year);

    if (!yearData || !yearPnl) return null;

    const ebitda = yearPnl.ebitda;
    const interest = yearPnl.interestCapex;
    const tax = yearPnl.tax;
    const changeInNwc = yearData.changeInNwc;

    // FCF = EBITDA - Interest - Tax - Working Capital investment
    // Using aggregated P&L values from the main calculation
    const fcf = ebitda - interest - tax - changeInNwc;

    return {
      ebitda,
      interest,
      tax,
      changeInNwc,
      fcf,
    };
  };

  const rows = [
    {
      label: "EBITDA",
      getter: (i: number) => {
        const breakdown = getFcfBreakdown(i);
        return breakdown?.ebitda || 0;
      },
      color: "text.primary",
      fontWeight: "normal",
    },
    {
      label: "Interest",
      getter: (i: number) => {
        const breakdown = getFcfBreakdown(i);
        return breakdown?.interest || 0;
      },
      color: "text.primary",
      fontWeight: "normal",
    },
    {
      label: "Tax",
      getter: (i: number) => {
        const breakdown = getFcfBreakdown(i);
        return breakdown?.tax || 0;
      },
      color: "text.primary",
      fontWeight: "normal",
    },
    {
      label: "Δ Working Capital",
      getter: (i: number) => {
        const breakdown = getFcfBreakdown(i);
        return breakdown?.changeInNwc || 0;
      },
      color: (value: number) => (value > 0 ? "error.main" : "success.main"),
      fontWeight: "normal",
    },
    {
      label: "Free Cash Flow",
      getter: (i: number) => {
        const breakdown = getFcfBreakdown(i);
        return breakdown?.fcf || 0;
      },
      color: (value: number) => (value >= 0 ? "success.main" : "error.main"),
      fontWeight: 700,
    },
    {
      label: "Cumulative FCF",
      getter: (i: number) => {
        const yearData = cashflow.find((c) => c.year === i);
        return yearData?.cumulativeFcf || 0;
      },
      color: (value: number) => (value >= 0 ? "success.main" : "error.main"),
      fontWeight: "normal",
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
                          {index === 0 ? "Initial" : `Y${index}`}
                        </Typography>
                      </TableCell>
                    )
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(({ label, getter, color, fontWeight }) => (
                  <TableRow key={label} hover>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {label}
                    </TableCell>
                    {Array.from(
                      { length: CALCULATION_CONFIG.UI_DISPLAY_YEARS },
                      (_, idx) => {
                        const value = getter(idx);
                        const cellColor =
                          typeof color === "function" ? color(value) : color;
                        return (
                          <TableCell
                            key={idx}
                            align="right"
                            sx={{
                              color: cellColor,
                              fontWeight: fontWeight,
                              fontFamily:
                                "ui-monospace, SFMono-Regular, Menlo, monospace",
                              lineHeight: 1.6,
                            }}
                          >
                            {formatCrores(value)}
                          </TableCell>
                        );
                      }
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Card sx={{ mt: 2 }} variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Free Cash Flow Formula
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>FCF = EBITDA - Interest - Tax - Δ Working Capital</strong>
            </Typography>
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
            >
              Where Δ Working Capital = Current Year NWC - Previous Year NWC
            </Typography>
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
            >
              Note: All values (EBITDA, Interest, Tax) are calculated from
              aggregated P&L across all SKUs
            </Typography>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
