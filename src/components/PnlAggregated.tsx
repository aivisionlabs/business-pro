import React from "react";
import { formatCrores } from "@/lib/utils";

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
  return (
    <div className="overflow-x-auto text-slate-900">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left p-2">Line</th>
            {pnlAggregated.revenueNet.map((_, index) => (
              <th key={index} className="text-right p-2">
                Y{index + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            {
              label: "Revenue (net)",
              values: pnlAggregated.revenueNet,
            },
            {
              label: "Material cost",
              values: pnlAggregated.materialCost,
            },
            {
              label: "Material margin",
              values: pnlAggregated.materialMargin,
            },
            {
              label: "Conversion cost",
              values: pnlAggregated.conversionCost,
            },
            {
              label: "Gross margin",
              values: pnlAggregated.grossMargin,
            },
            { label: "SG&A cost", values: pnlAggregated.sgaCost },
            { label: "EBITDA", values: pnlAggregated.ebitda },
            {
              label: "Depreciation",
              values: pnlAggregated.depreciation,
            },
            { label: "EBIT", values: pnlAggregated.ebit },
            { label: "Interest", values: pnlAggregated.interest },
            { label: "PBT", values: pnlAggregated.pbt },
            { label: "Tax", values: pnlAggregated.tax },
            { label: "PAT", values: pnlAggregated.pat },
          ].map(({ label, values }) => (
            <tr key={label} className="border-b border-slate-100">
              <td className="p-2 text-slate-700">{label}</td>
              {values.map((value, index) => (
                <td key={index} className="p-2 text-right font-mono">
                  {formatCrores(value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
