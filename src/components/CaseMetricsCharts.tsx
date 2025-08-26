"use client";

import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CalcOutput } from "@/lib/types";

interface CaseMetricsChartsProps {
  calcOutput: CalcOutput;
}

const COLORS = {
  revenue: "#10b981",
  grossMargin: "#3b82f6",
  ebitda: "#8b5cf6",
  pat: "#f59e0b",
  volume: "#06b6d4",
  weight: "#84cc16",
  materialCost: "#ef4444",
  conversionCost: "#f97316",
  sgaCost: "#ec4899",
  cashFlow: "#6366f1",
  cumulativeCashFlow: "#14b8a6",
};

const formatCurrency = (value: number) => {
  // Safety check to ensure value is a valid number
  if (value === undefined || value === null || isNaN(value)) {
    value = 0;
  }

  if (Math.abs(value) >= 1e6) {
    return `₹${(value / 1e6).toFixed(1)}M`;
  } else if (Math.abs(value) >= 1e3) {
    return `₹${(value / 1e3).toFixed(1)}K`;
  }
  return `₹${value.toFixed(0)}`;
};

const formatNumber = (value: number) => {
  // Safety check to ensure value is a valid number
  if (value === undefined || value === null || isNaN(value)) {
    value = 0;
  }

  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`;
  } else if (value >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`;
  }
  return value.toFixed(0);
};

export default function CaseMetricsCharts({
  calcOutput,
}: CaseMetricsChartsProps) {
  // Prepare data for charts
  const chartData = calcOutput.pnl.map((year, index) => ({
    year: `Year ${year.year}`,
    revenue: year.revenueNet ?? 0,
    grossMargin: year.grossMargin ?? 0,
    ebitda: year.ebitda ?? 0,
    pat: year.pat ?? 0,
    volume: calcOutput.volumes[index]?.volumePieces || 0,
    weight: calcOutput.volumes[index]?.weightKg || 0,
    materialCost: year.materialCost ?? 0,
    conversionCost: year.conversionCost ?? 0,
    sgaCost: year.sgaCost ?? 0,
    cashFlow: calcOutput.cashflow[index]?.fcf || 0,
    cumulativeCashFlow: calcOutput.cashflow[index]?.cumulativeFcf || 0,
  }));

  const costBreakdownData = calcOutput.pnl.map((year) => ({
    year: `Year ${year.year}`,
    materialCost: year.materialCost ?? 0,
    conversionCost: year.conversionCost ?? 0,
    sgaCost: year.sgaCost ?? 0,
    otherCosts:
      (year.valueAddCost ?? 0) +
      (year.packagingCost ?? 0) +
      (year.freightOutCost ?? 0) +
      (year.rAndMCost ?? 0) +
      (year.otherMfgCost ?? 0),
  }));

  const returnsData = [
    { name: "NPV", value: calcOutput.returns.npv ?? 0, color: "#10b981" },
    {
      name: "IRR",
      value: calcOutput.returns.irr ? calcOutput.returns.irr * 100 : 0,
      color: "#3b82f6",
    },
    {
      name: "Payback (Years)",
      value: calcOutput.returns.paybackYears || 0,
      color: "#f59e0b",
    },
    {
      name: "WACC",
      value: (calcOutput.returns.wacc ?? 0) * 100,
      color: "#8b5cf6",
    },
  ];

  const roceData = calcOutput.returns.roceByYear.map((year) => ({
    year: `Year ${year.year}`,
    roce: (year.roce ?? 0) * 100,
  }));

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Case Performance Metrics
      </h2>

      {/* Revenue and Profitability Trends */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Revenue & Profitability Trends
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={formatCurrency} />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), ""]}
              labelFormatter={(label) => label}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke={COLORS.revenue}
              strokeWidth={3}
              name="Revenue"
            />
            <Line
              type="monotone"
              dataKey="grossMargin"
              stroke={COLORS.grossMargin}
              strokeWidth={3}
              name="Gross Margin"
            />
            <Line
              type="monotone"
              dataKey="ebitda"
              stroke={COLORS.ebitda}
              strokeWidth={3}
              name="EBITDA"
            />
            <Line
              type="monotone"
              dataKey="pat"
              stroke={COLORS.pat}
              strokeWidth={3}
              name="PAT"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Volume and Production */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Production Volume & Weight
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis yAxisId="left" tickFormatter={formatNumber} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={formatNumber}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                name === "Volume (Pieces)"
                  ? formatNumber(value)
                  : `${value.toFixed(1)} kg`,
                name,
              ]}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="volume"
              fill={COLORS.volume}
              name="Volume (Pieces)"
            />
            <Bar
              yAxisId="right"
              dataKey="weight"
              fill={COLORS.weight}
              name="Weight (kg)"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Cost Breakdown by Year
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={costBreakdownData} stackOffset="expand">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name,
              ]}
            />
            <Legend />
            <Bar
              dataKey="materialCost"
              stackId="a"
              fill={COLORS.materialCost}
              name="Material Cost"
            />
            <Bar
              dataKey="conversionCost"
              stackId="a"
              fill={COLORS.conversionCost}
              name="Conversion Cost"
            />
            <Bar
              dataKey="sgaCost"
              stackId="a"
              fill={COLORS.sgaCost}
              name="SGA Cost"
            />
            <Bar
              dataKey="otherCosts"
              stackId="a"
              fill="#94a3b8"
              name="Other Costs"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cash Flow */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Cash Flow & Cumulative Cash Flow
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={formatCurrency} />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), ""]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="cashFlow"
              stroke={COLORS.cashFlow}
              strokeWidth={3}
              name="Free Cash Flow"
            />
            <Line
              type="monotone"
              dataKey="cumulativeCashFlow"
              stroke={COLORS.cumulativeCashFlow}
              strokeWidth={3}
              name="Cumulative FCF"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Financial Returns Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Key Financial Metrics
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={returnsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis
                tickFormatter={(value) =>
                  returnsData.find((d) => d.name === "IRR" || d.name === "WACC")
                    ? `${value.toFixed(1)}%`
                    : returnsData.find((d) => d.name === "Payback (Years)")
                    ? `${value.toFixed(1)}`
                    : formatCurrency(value)
                }
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  returnsData.find((d) => d.name === "IRR" || d.name === "WACC")
                    ? `${value.toFixed(2)}%`
                    : returnsData.find((d) => d.name === "Payback (Years)")
                    ? `${value.toFixed(1)} years`
                    : formatCurrency(value),
                  name,
                ]}
              />
              <Bar dataKey="value" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            ROCE by Year
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={roceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value) => `${value.toFixed(1)}%`} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)}%`, "ROCE"]}
              />
              <Bar dataKey="roce" fill="#06b6d4" name="ROCE %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Summary Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(calcOutput.returns.npv ?? 0)}
            </div>
            <div className="text-sm text-gray-600">Net Present Value</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {calcOutput.returns.irr
                ? `${(calcOutput.returns.irr * 100).toFixed(1)}%`
                : "N/A"}
            </div>
            <div className="text-sm text-gray-600">Internal Rate of Return</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {calcOutput.returns.paybackYears
                ? `${calcOutput.returns.paybackYears.toFixed(1)} years`
                : "N/A"}
            </div>
            <div className="text-sm text-gray-600">Payback Period</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(calcOutput.pnl[4]?.pat ?? 0)}
            </div>
            <div className="text-sm text-gray-600">Year 5 PAT</div>
          </div>
        </div>
      </div>
    </div>
  );
}
