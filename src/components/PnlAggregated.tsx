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

interface PnlAggregatedProps {
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

export default function PnlAggregated({ pnlAggregated }: PnlAggregatedProps) {
  const rows = [
    { label: "Revenue (net)", values: pnlAggregated.revenueNet },
    { label: "Material cost", values: pnlAggregated.materialCost },
    { label: "Material margin", values: pnlAggregated.materialMargin },
    { label: "Conversion cost", values: pnlAggregated.conversionCost },
    { label: "Gross margin", values: pnlAggregated.grossMargin },
    { label: "SG&A cost", values: pnlAggregated.sgaCost },
    { label: "EBITDA", values: pnlAggregated.ebitda },
    { label: "Depreciation", values: pnlAggregated.depreciation },
    { label: "EBIT", values: pnlAggregated.ebit },
    { label: "Interest", values: pnlAggregated.interest },
    { label: "PBT", values: pnlAggregated.pbt },
    { label: "Tax", values: pnlAggregated.tax },
    { label: "PAT", values: pnlAggregated.pat },
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
                    <Typography variant="subtitle2">Line</Typography>
                  </TableCell>
                  {pnlAggregated.revenueNet.map((_, index) => (
                    <TableCell
                      key={index}
                      align="right"
                      sx={{
                        minWidth: { xs: 60, sm: 80, md: 100 },
                        wordBreak: "break-word",
                      }}
                    >
                      <Typography variant="subtitle2">Y{index + 1}</Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(({ label, values }) => (
                  <TableRow key={label} hover>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {label}
                    </TableCell>
                    {values.map((value, index) => (
                      <TableCell
                        key={index}
                        align="right"
                        sx={{
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, monospace",
                          lineHeight: 1.6,
                        }}
                      >
                        {formatCrores(value ?? 0)}
                      </TableCell>
                    ))}
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
