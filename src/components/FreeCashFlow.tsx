import { formatCrores } from "@/lib/utils";
import { ChevronRight, ChevronUp } from "lucide-react";
import { useState } from "react";

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
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpanded = () => setIsExpanded(!isExpanded);
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
    <div>
      <button
        onClick={toggleExpanded}
        className="flex items-center justify-between w-full text-left text-base font-semibold text-slate-900 mb-3 hover:bg-slate-50 p-2 rounded-lg transition-colors"
      >
        {isExpanded ? (
          <>
            Close <ChevronUp className="h-5 w-5 text-slate-500" />
          </>
        ) : (
          <>
            View Cashflow analysis{" "}
            <ChevronRight className="h-5 w-5 text-slate-500" />
          </>
        )}
      </button>
      {isExpanded && (
        <div className="space-y-4">
          {/* Summary Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-slate-800">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-2">Year</th>
                  <th className="text-right p-2">EBITDA</th>
                  <th className="text-right p-2">Interest</th>
                  <th className="text-right p-2">Tax</th>
                  <th className="text-right p-2">Δ Working Capital</th>
                  <th className="text-right p-2">Free Cash Flow</th>
                  <th className="text-right p-2">Cumulative FCF</th>
                </tr>
              </thead>
              <tbody>
                {cashflow.map((yearData) => {
                  const breakdown = getFcfBreakdown(yearData.year);
                  if (!breakdown) return null;

                  return (
                    <tr
                      key={yearData.year}
                      className="border-b border-slate-100"
                    >
                      <td className="p-2 text-slate-700 font-medium">
                        {yearData.year === 0 ? "Initial" : `Y${yearData.year}`}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatCrores(breakdown.ebitda)}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatCrores(breakdown.interest)}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatCrores(breakdown.tax)}
                      </td>
                      <td className="p-2 text-right font-mono">
                        <span
                          className={
                            breakdown.changeInNwc > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }
                        >
                          {formatCrores(breakdown.changeInNwc)}
                        </span>
                      </td>
                      <td className="p-2 text-right font-mono font-semibold">
                        <span
                          className={
                            breakdown.fcf >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {formatCrores(breakdown.fcf)}
                        </span>
                      </td>
                      <td className="p-2 text-right font-mono">
                        <span
                          className={
                            yearData.cumulativeFcf >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {formatCrores(yearData.cumulativeFcf)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Formula Explanation */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-2">
              Free Cash Flow Formula
            </h4>
            <div className="text-sm text-slate-700 space-y-1">
              <p>
                <strong>
                  FCF = EBITDA - Interest - Tax - Δ Working Capital
                </strong>
              </p>
              <p className="text-xs text-slate-600">
                Where Δ Working Capital = Current Year NWC - Previous Year NWC
              </p>
              <p className="text-xs text-slate-600">
                Note: All values (EBITDA, Interest, Tax) are calculated from
                aggregated P&L across all SKUs
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
