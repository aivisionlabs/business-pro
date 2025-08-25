import React from "react";
import { formatCrores } from "@/lib/utils";
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
                      minWidth: { xs: 50, sm: 60, md: 80 },
                      wordBreak: "break-word",
                    }}
                  >
                    Year
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      minWidth: { xs: 70, sm: 80, md: 100 },
                      wordBreak: "break-word",
                    }}
                  >
                    EBITDA
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      minWidth: { xs: 70, sm: 80, md: 100 },
                      wordBreak: "break-word",
                    }}
                  >
                    Interest
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      minWidth: { xs: 70, sm: 80, md: 100 },
                      wordBreak: "break-word",
                    }}
                  >
                    Tax
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      minWidth: { xs: 100, sm: 120, md: 140 },
                      wordBreak: "break-word",
                    }}
                  >
                    Δ Working Capital
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      minWidth: { xs: 80, sm: 100, md: 120 },
                      wordBreak: "break-word",
                    }}
                  >
                    Free Cash Flow
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      minWidth: { xs: 100, sm: 120, md: 140 },
                      wordBreak: "break-word",
                    }}
                  >
                    Cumulative FCF
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cashflow.map((yearData) => {
                  const breakdown = getFcfBreakdown(yearData.year);
                  if (!breakdown) return null;
                  const wcPositive = breakdown.changeInNwc > 0;
                  const fcfPositive = breakdown.fcf >= 0;
                  const cumPositive = yearData.cumulativeFcf >= 0;
                  return (
                    <TableRow key={yearData.year} hover>
                      <TableCell
                        sx={{ color: "text.secondary", fontWeight: 600 }}
                      >
                        {yearData.year === 0 ? "Initial" : `Y${yearData.year}`}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, monospace",
                          lineHeight: 1.6,
                        }}
                      >
                        {formatCrores(breakdown.ebitda)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, monospace",
                          lineHeight: 1.6,
                        }}
                      >
                        {formatCrores(breakdown.interest)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, monospace",
                          lineHeight: 1.6,
                        }}
                      >
                        {formatCrores(breakdown.tax)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: wcPositive ? "error.main" : "success.main",
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, monospace",
                          lineHeight: 1.6,
                        }}
                      >
                        {formatCrores(breakdown.changeInNwc)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: fcfPositive ? "success.main" : "error.main",
                          fontWeight: 700,
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, monospace",
                          lineHeight: 1.6,
                        }}
                      >
                        {formatCrores(breakdown.fcf)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: cumPositive ? "success.main" : "error.main",
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, monospace",
                          lineHeight: 1.6,
                        }}
                      >
                        {formatCrores(yearData.cumulativeFcf)}
                      </TableCell>
                    </TableRow>
                  );
                })}
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
