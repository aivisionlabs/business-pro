import { PriceYear, CalcOutput, BusinessCase, SkuCalcOutput, PnlYear } from "@/lib/types";
import { CalculationEngine } from "./engines";
import { CALCULATION_CONFIG } from "./config";

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
    if (!sku.sales || !sku.costing || !sku.npd || !sku.ops || !sku.plantMaster) {
      console.error(`SKU ${index} missing required properties:`, sku);
      throw new Error(`SKU ${index} missing required properties`);
    }
  });

  // Compute per-SKU breakdowns
  const bySku: SkuCalcOutput[] = bcase.skus.map((sku) => {
    const prices: PriceYear[] = CalculationEngine.buildPriceByYear(
      sku.sales,
      sku.costing,
      sku.npd,
      sku.ops,
      sku.altConversion
    );

    // Build P&L for this SKU using CalculationEngine
    const volumes = CalculationEngine.calculateVolumes(
      sku.sales.productWeightGrams,
      sku.sales.baseAnnualVolumePieces,
      bcase.finance.annualVolumeGrowthPct || 0,
    );

    const pnl: PnlYear[] = [];
    const openingDebt = CalculationEngine.buildOpeningDebt(bcase.finance, sku);
    const interestRate = bcase.finance.costOfDebtPct || 0;

    for (const v of volumes) {
      const { year, volumePieces, weightKg } = v;

      const p = prices[year - 1];

      const revenueGross = CalculationEngine.buildRevenueGross(p, volumePieces);
      const revenueNet = CalculationEngine.buildRevenueNet(revenueGross);

      const valueAddCost = CalculationEngine.buildValueAddCost(sku, volumePieces);
      const packagingCost = CalculationEngine.buildPackagingCost(sku, weightKg);
      const freightOutCost = CalculationEngine.buildFreightOutCost(sku, weightKg);
      const conversionRecoveryCost = CalculationEngine.buildConversionRecoveryCost(sku, volumePieces);

      const materialCost = CalculationEngine.buildMaterialCost(p, weightKg, packagingCost, freightOutCost);
      const materialMargin = CalculationEngine.buildMaterialMargin(revenueNet, materialCost);

      const rAndMCost = CalculationEngine.buildRAndMCost(sku.plantMaster, weightKg);
      const otherMfgCost = CalculationEngine.buildOtherMfgCost(sku.plantMaster, weightKg);
      const plantSgaCost = CalculationEngine.buildPlantSgaCost(sku.plantMaster, weightKg);
      const corpSgaCost = CalculationEngine.buildCorpSgaCost(bcase.finance, sku.plantMaster, weightKg);
      const sgaCost = CalculationEngine.buildSgaCost(sku.plantMaster, weightKg);

      const conversionCost = CalculationEngine.buildConversionCost(sku.plantMaster, weightKg);

      const grossMargin = CalculationEngine.buildGrossMargin(materialMargin, conversionCost);
      const ebitda = CalculationEngine.buildEbitda(revenueNet, materialCost, conversionCost, sgaCost);

      const depMachine = CalculationEngine.buildMachineDepreciation(sku);
      const depMould = CalculationEngine.buildMouldDepreciation(sku);
      const depInfra = CalculationEngine.buildInfraDepreciation(sku);
      const depreciation = depMachine + depMould + depInfra;

      const ebit = CalculationEngine.buildEbit(ebitda, depreciation);

      const interestCapex = CalculationEngine.buildInterestCapex(openingDebt, interestRate);
      const pbt = CalculationEngine.buildPbt(ebit, interestCapex);
      const taxRate = Math.max(0, bcase.finance.corporateTaxRatePct || 0);
      const tax = CalculationEngine.buildTax(pbt, taxRate);
      const pat = CalculationEngine.buildPat(pbt, tax);

      pnl.push({
        year,
        revenueGross,
        revenueNet,
        materialCost,
        materialMargin,
        valueAddCost,
        packagingCost,
        freightOutCost,
        conversionRecoveryCost,
        rAndMCost,
        otherMfgCost,
        plantSgaCost,
        corpSgaCost,
        sgaCost,
        conversionCost,
        grossMargin,
        ebitda,
        depreciation,
        ebit,
        interestCapex,
        pbt,
        tax,
        pat,
      });
    }

    return { skuId: sku.id, name: sku.name, prices, pnl, volumes };
  });

  // Aggregate volumes (sum pieces and weight per year)
  const years = CALCULATION_CONFIG.YEARS;
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
      // Don't sum these - we'll recalculate them from aggregated values
      // acc.ebit += y.ebit;
      // acc.interestCapex += y.interestCapex;
      // acc.pbt += y.pbt;
      // acc.tax += y.tax;
      // acc.pat += y.pat;
    }

    // Recalculate gross margin and EBITDA based on aggregated values
    acc.grossMargin = acc.materialMargin - acc.conversionCost;
    acc.ebitda = acc.revenueNet - acc.materialCost - acc.conversionCost - acc.sgaCost;

    // Recalculate EBIT, interest, PBT, and tax using aggregated values
    acc.ebit = CalculationEngine.buildEbit(acc.ebitda, acc.depreciation);

    // Calculate interest using the same logic as P&L (Aggregated)
    const totalCapex = bcase.skus.reduce((total, sku) => {
      const skuCapex = (sku.ops?.costOfNewMachine || 0) + (sku.ops?.costOfNewInfra || 0);
      return total + skuCapex;
    }, 0);

    const workingCapitalDays = Math.max(60, ...bcase.skus.map(s => s.ops?.workingCapitalDays || 60));
    const workingCapitalInvestment = (acc.revenueNet || 0) * (workingCapitalDays / 365);
    const totalInvestment = totalCapex + workingCapitalInvestment;
    acc.interestCapex = totalInvestment * (bcase.finance.costOfDebtPct || 0);

    // Recalculate PBT and tax
    acc.pbt = CalculationEngine.buildPbt(acc.ebit, acc.interestCapex);
    acc.tax = CalculationEngine.buildTax(acc.pbt, bcase.finance.corporateTaxRatePct || 0);
    acc.pat = CalculationEngine.buildPat(acc.pbt, acc.tax);

    return acc;
  });

  // Calculate weighted average prices per kg across all SKUs
  const prices: PriceYear[] = CalculationEngine.buildWeightedAvgPricePerKg(bySku, volumes);

  const annualDepreciationByYear = Array.from({ length: years }, () => {
    return bcase.skus.reduce((sum, s) => {
      return sum + CalculationEngine.buildTotalDepreciation(s);
    }, 0);
  });



  // Calculate working capital days (use max across all SKUs, default to 60)
  const workingCapitalDays = Math.max(60, ...bcase.skus.map(s => s.ops?.workingCapitalDays || 60));

  // Build cashflows and returns using CalculationEngine
  const cashflow = [];
  const taxRate = bcase.finance.corporateTaxRatePct || 0;

  // Year 0 - Total Capex (negative cash flow)
  const totalCapex = bcase.skus.reduce((total, sku) => {
    const skuCapex = (sku.ops?.costOfNewMachine || 0) + (sku.ops?.costOfNewInfra || 0);
    return total + skuCapex;
  }, 0);

  cashflow.push({ year: 0, nwc: 0, changeInNwc: 0, fcf: -totalCapex, pv: 0, cumulativeFcf: 0 });

  let prevNwc = 0;
  for (const y of pnl) {
    const nwc = CalculationEngine.buildWorkingCapital(workingCapitalDays, y.revenueNet);
    const changeInNwc = CalculationEngine.buildChangeInWorkingCapital(nwc, prevNwc);
    prevNwc = nwc;

    const fcf = CalculationEngine.buildFreeCashFlow(y.ebitda, y.interestCapex, y.tax, changeInNwc);

    cashflow.push({
      year: y.year,
      nwc,
      changeInNwc,
      fcf,
      pv: 0,
      cumulativeFcf: 0,
    });
  }

  const wacc = CalculationEngine.buildWacc(bcase.finance, taxRate);

  // PV, NPV, cumulative
  const npv = CalculationEngine.buildNpv(cashflow, wacc);
  // Year 0 present value is the same as the cash flow (no discounting)
  cashflow[0].pv = cashflow[0].fcf;
  cashflow[0].cumulativeFcf = cashflow[0].fcf;
  for (let i = 1; i < cashflow.length; i += 1) {
    const t = cashflow[i].year;
    const pv = CalculationEngine.buildPresentValue(cashflow[i].fcf, wacc, t);
    cashflow[i].pv = pv;
    cashflow[i].cumulativeFcf = 0;
  }

  // Update cumulative cash flow
  const updatedCashflow = CalculationEngine.buildCumulativeCashFlow(cashflow);
  Object.assign(cashflow, updatedCashflow);

  // IRR and Payback
  const irrSeries = cashflow.map((c) => c.fcf);
  const irrValue = CalculationEngine.irr(irrSeries);

  const paybackYears = CalculationEngine.buildPaybackYears(cashflow);

  // RoCE and net block
  const roceByYear = CalculationEngine.buildRoceByYear(pnl, annualDepreciationByYear, cashflow, bcase);

  const returns = { wacc, npv, irr: irrValue, paybackYears, roceByYear };

  // Calculate weighted average price per kg table
  const weightedAvgPricePerKg = CalculationEngine.buildWeightedAvgPricePerKgTable(bySku, pnl, volumes);

  return { volumes, prices, pnl, weightedAvgPricePerKg, cashflow, returns, bySku };
}
