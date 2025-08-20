import React from "react";
import { formatPerKg } from "@/lib/utils";
import { CalcOutput } from "@/lib/types";
import {
  calculateRevenueNetPerKg,
  calculateMaterialCostPerKg,
  calculateMaterialMarginPerKg,
  calculateConversionCostPerKg,
  calculateGrossMarginPerKg,
  calculateSgaCostPerKg,
  calculateEbitdaPerKg,
  calculateDepreciationPerKg,
  calculateEbitPerKg,
  calculateInterestPerKg,
  calculateTaxPerKg,
  calculatePbtPerKg,
  calculatePatPerKg,
} from "@/lib/calc/pnl-calculations";

interface PnlPerKgProps {
  calc: CalcOutput;
  pnlAggregated: {
    depreciation: number[];
    ebit: number[];
    interest: number[];
    tax: number[];
    pbt: number[];
    pat: number[];
  };
}

export default function PnlPerKg({ calc, pnlAggregated }: PnlPerKgProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-slate-900">
        <thead>
          <tr className="border-b border-slate-200 text-slate-700">
            <th className="text-left p-2">Line Item</th>
            {Array.from({ length: 5 }, (_, i) => i + 1).map((y) => (
              <th key={y} className="text-right p-2">
                Y{y}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            {
              label: "Revenue (net)",
              getter: (i: number) => calculateRevenueNetPerKg(calc, i),
            },
            {
              label: "Material cost",
              getter: (i: number) => calculateMaterialCostPerKg(calc, i),
            },
            {
              label: "Material margin",
              getter: (i: number) => calculateMaterialMarginPerKg(calc, i),
            },
            {
              label: "Conversion cost",
              getter: (i: number) => calculateConversionCostPerKg(calc, i),
            },
            {
              label: "Gross margin",
              getter: (i: number) => calculateGrossMarginPerKg(calc, i),
            },
            {
              label: "SG&A cost",
              getter: (i: number) => calculateSgaCostPerKg(calc, i),
            },
            {
              label: "EBITDA",
              getter: (i: number) => calculateEbitdaPerKg(calc, i),
            },
            {
              label: "Depreciation",
              getter: (i: number) =>
                calculateDepreciationPerKg(calc, i, pnlAggregated),
            },
            {
              label: "EBIT",
              getter: (i: number) => calculateEbitPerKg(calc, i, pnlAggregated),
            },
            {
              label: "Interest",
              getter: (i: number) =>
                calculateInterestPerKg(calc, i, pnlAggregated),
            },
            {
              label: "Tax",
              getter: (i: number) => calculateTaxPerKg(calc, i, pnlAggregated),
            },
            {
              label: "PBT",
              getter: (i: number) => calculatePbtPerKg(calc, i, pnlAggregated),
            },
            {
              label: "PAT",
              getter: (i: number) => calculatePatPerKg(calc, i, pnlAggregated),
            },
          ].map(({ label, getter }) => (
            <tr key={label} className="border-b border-slate-100">
              <td className="p-2 text-slate-700">{label}</td>
              {Array.from({ length: 5 }, (_, idx) => (
                <td key={idx} className="p-2 text-right font-mono">
                  {formatPerKg(getter(idx))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
