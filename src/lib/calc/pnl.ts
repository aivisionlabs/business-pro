import { CashflowYear, FinanceInput, PnlYear, PriceYear, Sku } from "@/lib/types";
import { computeVolumes } from "./capacity";
import { irr as computeIrr } from "./utils";
import {
  buildRevenueGross,
  buildRevenueNet,
  buildPowerCost,
  buildManpowerCost,
  buildValueAddCost,
  buildPackagingCost,
  buildFreightOutCost,
  buildConversionRecoveryCost,
  buildMaterialCost,
  buildMaterialMargin,
  buildRAndMCost,
  buildOtherMfgCost,
  buildPlantSgaCost,
  buildCorpSgaCost,
  buildSgaCost,
  buildConversionCost,
  buildGrossMargin,
  buildEbitda,
  buildMachineDepreciation,
  buildMouldDepreciation,
  buildInfraDepreciation,
  buildEbit,
  buildOpeningDebt,
  buildInterestCapex,
  buildPbt,
  buildTax,
  buildPat,
  buildWorkingCapital,
  buildChangeInWorkingCapital,
  buildFreeCashFlow,
  buildWacc,
  buildPresentValue,
  buildNpv,
  buildCumulativeCashFlow,
  buildPaybackYears,
  buildRoceByYear
} from "./pnl-calculations";

export function buildPnlForSku(
  sku: Sku,
  finance: FinanceInput,
  price: PriceYear[]
): { pnl: PnlYear[]; volumes: { year: number; volumePieces: number; weightKg: number }[] } {
  const { sales, ops, plantMaster } = sku;
  const volumes = computeVolumes(
    sales.productWeightGrams,
    sales.baseAnnualVolumePieces,
  );

  const powerRate = plantMaster.powerRatePerUnit;
  const manpowerRatePerShift = plantMaster.manpowerRatePerShift;
  const operatingHoursPerDay = ops.operatingHoursPerDay ?? 24;
  const workingDaysPerYear = ops.workingDaysPerYear ?? 365;
  const shiftsPerDay = ops.shiftsPerDay ?? 3;

  const pnl: PnlYear[] = [];

  const openingDebt = buildOpeningDebt(finance, sku);
  const interestRate = finance.costOfDebtPct || 0;

  for (const v of volumes) {
    const { year, volumePieces, weightKg } = v;
    const p = price[year - 1];

    const revenueGross = buildRevenueGross(p, volumePieces);
    const revenueNet = buildRevenueNet(revenueGross);

    const powerCost = buildPowerCost(
      ops,
      operatingHoursPerDay,
      workingDaysPerYear,
      powerRate,
      weightKg
    );

    const manpowerCost = buildManpowerCost(
      ops,
      shiftsPerDay,
      workingDaysPerYear,
      manpowerRatePerShift,
      weightKg
    );

    const valueAddCost = buildValueAddCost(sku, volumePieces);
    const packagingCost = buildPackagingCost(sku, weightKg);
    const freightOutCost = buildFreightOutCost(sku, weightKg);
    const conversionRecoveryCost = buildConversionRecoveryCost(sku, volumePieces);

    const materialCost = buildMaterialCost(p, weightKg, packagingCost, freightOutCost);
    const materialMargin = buildMaterialMargin(revenueNet, materialCost);

    const rAndMCost = buildRAndMCost(plantMaster, weightKg);
    const otherMfgCost = buildOtherMfgCost(plantMaster, weightKg);
    const plantSgaCost = buildPlantSgaCost(plantMaster, weightKg);
    const corpSgaCost = buildCorpSgaCost(finance, plantMaster, weightKg);
    const sgaCost = buildSgaCost(plantMaster, weightKg);

    const conversionCost = buildConversionCost(plantMaster, weightKg);

    const grossMargin = buildGrossMargin(materialMargin, conversionCost);
    const ebitda = buildEbitda(revenueNet, materialCost, conversionCost, sgaCost);

    const depMachine = buildMachineDepreciation(sku);
    const depMould = buildMouldDepreciation(sku);
    const depInfra = buildInfraDepreciation(sku);
    const depreciation = depMachine + depMould + depInfra;

    const ebit = buildEbit(ebitda, depreciation);

    const interestCapex = buildInterestCapex(openingDebt, interestRate);
    const pbt = buildPbt(ebit, interestCapex);
    const taxRate = Math.max(0, finance.corporateTaxRatePct || 0);
    const tax = buildTax(pbt, taxRate);
    const pat = buildPat(pbt, tax);

    pnl.push({
      year,
      revenueGross,
      revenueNet,
      materialCost,
      materialMargin,
      powerCost,
      manpowerCost,
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

  return { pnl, volumes };
}

export function buildCashflowsAndReturnsForCase(
  finance: FinanceInput,
  pnl: PnlYear[],
  options: { capex0: number; workingCapitalDays: number; annualDepreciationByYear: number[] }
): { cashflow: CashflowYear[]; returns: { wacc: number; npv: number; irr: number | null; paybackYears: number | null; roceByYear: { year: number; roce: number; netBlock: number }[] } } {
  const taxRate = finance.corporateTaxRatePct || 0;
  const capex0 = options.capex0;
  const nwcDays = options.workingCapitalDays || 0;

  const cashflow: CashflowYear[] = [];

  // Year 0
  cashflow.push({ year: 0, nwc: 0, changeInNwc: 0, fcf: -capex0, pv: 0, cumulativeFcf: -capex0 });

  let prevNwc = 0;
  for (const y of pnl) {
    const nwc = buildWorkingCapital(nwcDays, y.revenueNet);
    const changeInNwc = buildChangeInWorkingCapital(nwc, prevNwc);
    prevNwc = nwc;
    const fcf = buildFreeCashFlow(y.ebit, taxRate, y.depreciation, changeInNwc);
    cashflow.push({
      year: y.year,
      nwc,
      changeInNwc,
      fcf,
      pv: 0,
      cumulativeFcf: 0,
    });
  }

  const wacc = buildWacc(finance, taxRate);

  // PV, NPV, cumulative
  const npv = buildNpv(cashflow, wacc);
  cashflow[0].pv = cashflow[0].fcf;
  cashflow[0].cumulativeFcf = cashflow[0].fcf;
  for (let i = 1; i < cashflow.length; i += 1) {
    const t = cashflow[i].year;
    const pv = buildPresentValue(cashflow[i].fcf, wacc, t);
    cashflow[i].pv = pv;
    cashflow[i].cumulativeFcf = 0; // Will be calculated by buildCumulativeCashFlow
  }

  // Update cumulative cash flow
  const updatedCashflow = buildCumulativeCashFlow(cashflow);
  Object.assign(cashflow, updatedCashflow);

  // IRR and Payback
  const irrSeries = cashflow.map((c) => c.fcf);
  const irrValue = computeIrr(irrSeries);

  const paybackYears = buildPaybackYears(cashflow);

  // RoCE and net block
  const roceByYear = buildRoceByYear(pnl, capex0, options.annualDepreciationByYear, cashflow);

  return {
    cashflow,
    returns: { wacc, npv, irr: irrValue, paybackYears, roceByYear },
  };
}


