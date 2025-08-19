import { PriceYear, CalcOutput, BusinessCase, SkuCalcOutput, PnlYear } from "@/lib/types";
import { buildPriceByYear, buildWeightedAvgPricePerKg, buildWeightedAvgPricePerKgTable } from "./price";
import { buildPnlForSku, buildCashflowsAndReturnsForCase } from "./pnl";

export function calculateScenario(bcase: BusinessCase): CalcOutput {
  // Validate input structure
  if (!bcase || !bcase.skus || !Array.isArray(bcase.skus)) {
    console.error('Invalid BusinessCase structure:', bcase);
    throw new Error('Invalid BusinessCase: missing or invalid skus array');
  }

  if (bcase.skus.length === 0) {
    throw new Error('BusinessCase must contain at least one SKU');
  }

  // Validate each SKU has required structure
  bcase.skus.forEach((sku, index) => {
    if (!sku.sales || !sku.costing || !sku.npd || !sku.ops || !sku.capex || !sku.plantMaster) {
      console.error(`SKU ${index} missing required properties:`, sku);
      throw new Error(`SKU ${index} missing required properties`);
    }
  });

  // Compute per-SKU breakdowns
  const bySku: SkuCalcOutput[] = bcase.skus.map((sku) => {
    const prices: PriceYear[] = buildPriceByYear(
      sku.sales,
      sku.costing,
      sku.npd,
      sku.ops,
      sku.altConversion
    );
    const { pnl, volumes } = buildPnlForSku(sku, bcase.finance, prices);
    return { skuId: sku.id, name: sku.name, prices, pnl, volumes };
  });

  // Aggregate volumes (sum pieces and weight per year)
  const years = 5;
  const volumes = Array.from({ length: years }, (_, i) => {
    const year = i + 1;
    const vpcs = bySku.reduce((sum, s) => sum + (s.volumes[i]?.volumePieces || 0), 0);
    const wkg = bySku.reduce((sum, s) => sum + (s.volumes[i]?.weightKg || 0), 0);
    return { year, volumePieces: vpcs, weightKg: wkg };
  });

  // Aggregate P&L by summing across SKUs per line
  const pnl: PnlYear[] = Array.from({ length: years }, (_, i) => {
    const year = i + 1;
    const acc: PnlYear = {
      year,
      revenueGross: 0,
      revenueNet: 0,
      materialCost: 0,
      materialMargin: 0,
      powerCost: 0,
      manpowerCost: 0,
      valueAddCost: 0,
      packagingCost: 0,
      freightOutCost: 0,
      conversionRecoveryCost: 0,
      rAndMCost: 0,
      otherMfgCost: 0,
      plantSgaCost: 0,
      corpSgaCost: 0,
      sgaCost: 0,
      conversionCost: 0,
      grossMargin: 0,
      ebitda: 0,
      depreciation: 0,
      ebit: 0,
      interestCapex: 0,
      pbt: 0,
      tax: 0,
      pat: 0,
    };
    for (const s of bySku) {
      const y = s.pnl[i];
      if (!y) continue;
      acc.revenueGross += y.revenueGross;
      acc.revenueNet += y.revenueNet;
      acc.materialCost += y.materialCost;
      acc.materialMargin += y.materialMargin;
      acc.powerCost += y.powerCost;
      acc.manpowerCost += y.manpowerCost;
      acc.valueAddCost += y.valueAddCost;
      acc.packagingCost += y.packagingCost;
      acc.freightOutCost += y.freightOutCost;
      acc.conversionRecoveryCost += y.conversionRecoveryCost;
      acc.rAndMCost += y.rAndMCost;
      acc.otherMfgCost += y.otherMfgCost;
      acc.plantSgaCost += y.plantSgaCost;
      acc.corpSgaCost += y.corpSgaCost;
      acc.sgaCost += y.sgaCost;
      acc.conversionCost += y.conversionCost;
      acc.ebitda += y.ebitda;
      acc.depreciation += y.depreciation;
      acc.ebit += y.ebit;
      acc.interestCapex += y.interestCapex;
      acc.pbt += y.pbt;
      acc.tax += y.tax;
      acc.pat += y.pat;
    }

    // Recalculate gross margin and EBITDA based on aggregated values (following pnl.ts formulas)
    acc.grossMargin = acc.materialMargin - acc.conversionCost;
    acc.ebitda = acc.revenueNet - acc.materialCost - acc.conversionCost - acc.sgaCost;

    return acc;
  });

  // Calculate weighted average prices per kg across all SKUs
  const prices: PriceYear[] = buildWeightedAvgPricePerKg(bySku, volumes);

  // Aggregate capex and depreciation schedule
  const capex0 = bcase.skus.reduce((sum, s) => sum + (s.capex.machineCost || 0) + (s.npd.mouldCost || 0) + (s.capex.infraCost || 0), 0);
  const annualDepreciationByYear = Array.from({ length: years }, () => {
    return bcase.skus.reduce((sum, s) => {
      // Depreciation calculation using only the 6 required fields
      const machineInvestment = s.capex.machineCost || 0;
      const mouldInvestment = s.npd.mouldCost || 0;
      const infraInvestment = s.capex.infraCost || 0;

      const machineLife = s.capex.usefulLifeMachineYears || 15; // Default 15 years
      const mouldLife = s.capex.usefulLifeMouldYears || 15; // Default 15 years
      const infraLife = s.capex.usefulLifeInfraYears || 30; // Default 30 years

      // Depreciation = Investment / Life in years
      const depMachine = machineInvestment / Math.max(1, machineLife);
      const depMould = mouldInvestment / Math.max(1, mouldLife);
      const depInfra = infraInvestment / Math.max(1, infraLife);

      return sum + depMachine + depMould + depInfra;
    }, 0);
  });
  const workingCapitalDays = Math.max(
    0,
    ...bcase.skus.map((s) => s.capex.workingCapitalDays || 0)
  );

  const { cashflow, returns } = buildCashflowsAndReturnsForCase(bcase.finance, pnl, {
    capex0,
    workingCapitalDays,
    annualDepreciationByYear,
  });

  // Calculate weighted average price per kg table
  const weightedAvgPricePerKg = buildWeightedAvgPricePerKgTable(bySku, pnl, volumes);

  return { volumes, prices, pnl, weightedAvgPricePerKg, cashflow, returns, bySku };
}


