import { PriceYear, Scenario, CalcOutput } from "@/lib/types";
import { buildPriceByYear } from "./price";
import { buildPnl, buildCashflowsAndReturns } from "./pnl";

export function calculateScenario(scenario: Scenario): CalcOutput {
  const prices: PriceYear[] = buildPriceByYear(
    scenario.sales,
    scenario.costing,
    scenario.npd,
    scenario.ops,
    scenario.altConversion
  );

  const { pnl, volumes } = buildPnl(scenario, prices);
  const { cashflow, returns } = buildCashflowsAndReturns(scenario, pnl);
  return { volumes, prices, pnl, cashflow, returns };
}


