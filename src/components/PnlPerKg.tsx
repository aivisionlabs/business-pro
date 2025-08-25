import React from "react";
import { formatPerKg } from "@/lib/utils";
import { CalcOutput } from "@/lib/types";
import { CalculationEngine } from "@/lib/calc/engines";
import { CALCULATION_CONFIG } from "@/lib/calc/config";

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
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto text-slate-900">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left p-2">Metric</th>
              {Array.from(
                { length: CALCULATION_CONFIG.UI_DISPLAY_YEARS },
                (_, index) => (
                  <th key={index} className="text-right p-2">
                    Y{index + 1}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {[
              {
                label: "Revenue (net)",
                getter: (i: number) =>
                  CalculationEngine.calculatePerKgForYear(
                    calc,
                    i,
                    pnlAggregated
                  ).revenueNetPerKg,
              },
              {
                label: "Material cost",
                getter: (i: number) =>
                  CalculationEngine.calculatePerKgForYear(
                    calc,
                    i,
                    pnlAggregated
                  ).materialCostPerKg,
              },
              {
                label: "Material margin",
                getter: (i: number) =>
                  CalculationEngine.calculatePerKgForYear(
                    calc,
                    i,
                    pnlAggregated
                  ).materialMarginPerKg,
              },
              {
                label: "Conversion cost",
                getter: (i: number) =>
                  CalculationEngine.calculatePerKgForYear(
                    calc,
                    i,
                    pnlAggregated
                  ).conversionCostPerKg,
              },
              {
                label: "Gross margin",
                getter: (i: number) =>
                  CalculationEngine.calculatePerKgForYear(
                    calc,
                    i,
                    pnlAggregated
                  ).grossMarginPerKg,
              },
              {
                label: "SG&A cost",
                getter: (i: number) =>
                  CalculationEngine.calculatePerKgForYear(
                    calc,
                    i,
                    pnlAggregated
                  ).sgaCostPerKg,
              },
              {
                label: "EBITDA",
                getter: (i: number) =>
                  CalculationEngine.calculatePerKgForYear(
                    calc,
                    i,
                    pnlAggregated
                  ).ebitdaPerKg,
              },
              {
                label: "Depreciation",
                getter: (i: number) =>
                  CalculationEngine.calculatePerKgForYear(
                    calc,
                    i,
                    pnlAggregated
                  ).depreciationPerKg,
              },
              {
                label: "EBIT",
                getter: (i: number) =>
                  CalculationEngine.calculatePerKgForYear(
                    calc,
                    i,
                    pnlAggregated
                  ).ebitPerKg,
              },
              {
                label: "Interest",
                getter: (i: number) =>
                  CalculationEngine.calculatePerKgForYear(
                    calc,
                    i,
                    pnlAggregated
                  ).interestPerKg,
              },
              {
                label: "Tax",
                getter: (i: number) =>
                  CalculationEngine.calculatePerKgForYear(
                    calc,
                    i,
                    pnlAggregated
                  ).taxPerKg,
              },
              {
                label: "PBT",
                getter: (i: number) =>
                  CalculationEngine.calculatePerKgForYear(
                    calc,
                    i,
                    pnlAggregated
                  ).pbtPerKg,
              },
              {
                label: "PAT",
                getter: (i: number) =>
                  CalculationEngine.calculatePerKgForYear(
                    calc,
                    i,
                    pnlAggregated
                  ).patPerKg,
              },
            ].map(({ label, getter }) => (
              <tr key={label} className="border-b border-slate-100">
                <td className="p-2 text-slate-700">{label}</td>
                {Array.from(
                  { length: CALCULATION_CONFIG.UI_DISPLAY_YEARS },
                  (_, idx) => (
                    <td key={idx} className="p-2 text-right font-mono">
                      {formatPerKg(getter(idx))}
                    </td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
