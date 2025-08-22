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

  const mockFinance = {
    corporateTaxRatePct: 0.25,
  };

  it("renders collapsed by default", () => {
    render(
      <FreeCashFlow
        cashflow={mockCashflow}
        pnl={mockPnl}
        finance={mockFinance}
      />
    );

    expect(screen.getByText("Free Cash Flow Analysis")).toBeInTheDocument();
    expect(screen.queryByText("EBIT")).not.toBeInTheDocument();
  });

  it("expands when clicked", () => {
    render(
      <FreeCashFlow
        cashflow={mockCashflow}
        pnl={mockPnl}
        finance={mockFinance}
      />
    );

    const button = screen.getByText("Free Cash Flow Analysis");
    fireEvent.click(button);

    expect(screen.getByText("EBIT")).toBeInTheDocument();
    expect(screen.getByText("Depreciation")).toBeInTheDocument();
    expect(screen.getByText("Δ Working Capital")).toBeInTheDocument();
  });

  it("displays correct FCF formula", () => {
    render(
      <FreeCashFlow
        cashflow={mockCashflow}
        pnl={mockPnl}
        finance={mockFinance}
      />
    );

    const button = screen.getByText("Free Cash Flow Analysis");
    fireEvent.click(button);

    expect(
      screen.getByText(
        /FCF = EBIT × \(1 - Tax Rate\) \+ Depreciation - Δ Working Capital/
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Tax Rate: 25\.0%/)).toBeInTheDocument();
  });

  it("shows working capital impact explanation", () => {
    render(
      <FreeCashFlow
        cashflow={mockCashflow}
        pnl={mockPnl}
        finance={mockFinance}
      />
    );

    const button = screen.getByText("Free Cash Flow Analysis");
    fireEvent.click(button);

    expect(screen.getByText("Working Capital Impact")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Working capital changes represent the cash tied up in operations/
      )
    ).toBeInTheDocument();
  });
});
