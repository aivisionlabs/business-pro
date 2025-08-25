import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import FreeCashFlow from "../components/FreeCashFlow";

// Mock the formatCrores utility
jest.mock("../lib/utils", () => ({
  formatCrores: (value: number) => `₹${value.toLocaleString()}`,
}));

describe("FreeCashFlow", () => {
  const mockCashflow = [
    {
      year: 0,
      nwc: 0,
      changeInNwc: 0,
      fcf: -1000000,
      pv: -1000000,
      cumulativeFcf: -1000000,
    },
    {
      year: 1,
      nwc: 117123,
      changeInNwc: 117123,
      fcf: 500000,
      pv: 446429,
      cumulativeFcf: -500000,
    },
    {
      year: 2,
      nwc: 234246,
      changeInNwc: 117123,
      fcf: 500000,
      pv: 398597,
      cumulativeFcf: 0,
    },
  ];

  const mockPnl = [
    {
      year: 1,
      ebitda: 275000,
      depreciation: 66667,
      ebit: 208333,
      interestCapex: 12000,
      pbt: 196333,
      tax: 49083,
    },
    {
      year: 2,
      ebitda: 275000,
      depreciation: 66667,
      ebit: 208333,
      interestCapex: 12000,
      pbt: 196333,
      tax: 49083,
    },
  ];

  it("renders expanded by default", () => {
    render(<FreeCashFlow cashflow={mockCashflow} pnl={mockPnl} />);

    expect(screen.getByText("Close")).toBeInTheDocument();
    expect(screen.getByText("EBITDA")).toBeInTheDocument();
  });

  it("collapses when clicked", () => {
    render(<FreeCashFlow cashflow={mockCashflow} pnl={mockPnl} />);

    const button = screen.getByText("Close");
    fireEvent.click(button);

    expect(screen.getByText("View Cashflow analysis")).toBeInTheDocument();
    expect(screen.queryByText("EBITDA")).not.toBeInTheDocument();
  });

  it("displays correct FCF formula", () => {
    render(<FreeCashFlow cashflow={mockCashflow} pnl={mockPnl} />);

    expect(
      screen.getByText(/FCF = EBITDA - Interest - Tax - Δ Working Capital/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Where Δ Working Capital = Current Year NWC - Previous Year NWC/
      )
    ).toBeInTheDocument();
  });

  it("shows working capital impact explanation", () => {
    render(<FreeCashFlow cashflow={mockCashflow} pnl={mockPnl} />);

    expect(screen.getByText("Free Cash Flow Formula")).toBeInTheDocument();
    expect(
      screen.getByText(
        /All values \(EBITDA, Interest, Tax\) are calculated from aggregated P&L across all SKUs/
      )
    ).toBeInTheDocument();
  });
});
