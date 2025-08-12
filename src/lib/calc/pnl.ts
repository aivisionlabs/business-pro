import { CashflowYear, PnlYear, PriceYear, Scenario } from "@/lib/types";
import { computeVolumes } from "./capacity";
import { safeDiv, irr as computeIrr } from "./utils";

export function buildPnl(
  scenario: Scenario,
  price: PriceYear[]
): { pnl: PnlYear[]; volumes: { year: number; volumePieces: number; weightKg: number }[] } {
  const { sales, ops, plantMaster, finance } = scenario;
  const volumes = computeVolumes(
    sales.productWeightGrams,
    sales.baseAnnualVolumePieces,
    sales.yoyGrowthPct
  );

  const powerRate = plantMaster.powerRatePerUnit;
  const manpowerRatePerShift = plantMaster.manpowerRatePerShift;
  const operatingHoursPerDay = ops.operatingHoursPerDay ?? 24;
  const workingDaysPerYear = ops.workingDaysPerYear ?? 365;
  const shiftsPerDay = ops.shiftsPerDay ?? 3;

  const pnl: PnlYear[] = [];

  const openingDebt = (finance.debtPct || 0) * (scenario.capex.machineCost + scenario.capex.mouldCost);
  const interestRate = finance.costOfDebtPct || 0;

  for (const v of volumes) {
    const { year, volumePieces, weightKg } = v;
    const p = price[year - 1];

    const revenueGross = p.pricePerPiece * volumePieces;
    const discountExpense = sales.discountRsPerPiece * volumePieces;
    const customerFreightExpense = sales.freightOutSalesRsPerPiece * volumePieces;
    const revenueNet = revenueGross - discountExpense - customerFreightExpense;

    const materialCostPerKg = p.perKg.rmPerKg + p.perKg.mbPerKg;
    const materialCost = materialCostPerKg * weightKg;
    const materialMargin = revenueNet - materialCost;

    const powerCostTotal =
      ops.powerUnitsPerHour * operatingHoursPerDay * workingDaysPerYear * powerRate;
    const powerCost = safeDiv(powerCostTotal, weightKg) * weightKg; // equals total or 0

    const manpowerCostTotal =
      ops.manpowerCount * shiftsPerDay * workingDaysPerYear * manpowerRatePerShift;
    const manpowerCost = safeDiv(manpowerCostTotal, weightKg) * weightKg;

    const valueAddCost = scenario.costing.valueAddRsPerPiece * volumePieces;
    const packagingCost = scenario.costing.packagingRsPerPiece * volumePieces;
    const freightOutCost = scenario.costing.freightOutRsPerPiece * volumePieces;
    const mouldAmortCost = scenario.sales.mouldAmortizationRsPerPiece * volumePieces;
    const conversionRecoveryCost = (scenario.sales.conversionRecoveryRsPerPiece || 0) * volumePieces;

    const rAndMCost = plantMaster.rAndMPerKg * weightKg;
    const otherMfgCost = plantMaster.otherMfgPerKg * weightKg;
    const plantSgaCost = plantMaster.plantSgaPerKg * weightKg;
    const corpSgaCost = (finance.includeCorpSGA ? plantMaster.corpSgaPerKg : 0) * weightKg;

    const conversionCost =
      powerCost +
      manpowerCost +
      valueAddCost +
      packagingCost +
      freightOutCost +
      mouldAmortCost +
      conversionRecoveryCost +
      rAndMCost +
      otherMfgCost;

    const grossMargin = materialMargin - conversionCost;
    const ebitda = grossMargin - plantSgaCost - corpSgaCost;

    const depMachine = safeDiv(scenario.capex.machineCost, scenario.capex.usefulLifeMachineYears);
    const depMould = safeDiv(scenario.capex.mouldCost, scenario.capex.usefulLifeMouldYears);
    const depreciation = depMachine + depMould;
    const ebit = ebitda - depreciation;

    const interestCapex = openingDebt * interestRate; // MVP: interest-only
    const pbt = ebit - interestCapex;
    const taxRate = Math.max(0, finance.corporateTaxRatePct || 0);
    const tax = Math.max(0, pbt) * taxRate;
    const pat = pbt - tax;

    pnl.push({
      year,
      revenueGross,
      discountExpense,
      customerFreightExpense,
      revenueNet,
      materialCost,
      materialMargin,
      powerCost,
      manpowerCost,
      valueAddCost,
      packagingCost,
      freightOutCost,
      mouldAmortCost,
      conversionRecoveryCost,
      rAndMCost,
      otherMfgCost,
      plantSgaCost,
      corpSgaCost,
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

export function buildCashflowsAndReturns(
  scenario: Scenario,
  pnl: PnlYear[]
): { cashflow: CashflowYear[]; returns: { wacc: number; npv: number; irr: number | null; paybackYears: number | null; roceByYear: { year: number; roce: number; netBlock: number }[] } } {
  const taxRate = scenario.finance.corporateTaxRatePct || 0;
  const capex0 = scenario.capex.machineCost + scenario.capex.mouldCost;
  const nwcDays = scenario.capex.workingCapitalDays || 0;

  const cashflow: CashflowYear[] = [];

  // Year 0
  cashflow.push({ year: 0, nwc: 0, changeInNwc: 0, fcf: -capex0, pv: 0, cumulativeFcf: -capex0 });

  let prevNwc = 0;
  for (const y of pnl) {
    const nwc = (nwcDays / 365) * y.revenueNet;
    const changeInNwc = nwc - prevNwc;
    prevNwc = nwc;
    const fcf = y.ebit * (1 - taxRate) + y.depreciation - changeInNwc;
    cashflow.push({
      year: y.year,
      nwc,
      changeInNwc,
      fcf,
      pv: 0,
      cumulativeFcf: 0,
    });
  }

  const equityPct = 1 - (scenario.finance.debtPct || 0);
  const wacc =
    (scenario.finance.debtPct || 0) * (scenario.finance.costOfDebtPct || 0) * (1 - taxRate) +
    equityPct * (scenario.finance.costOfEquityPct || 0);

  // PV, NPV, cumulative
  let npv = cashflow[0].fcf; // t=0 PV is itself
  cashflow[0].pv = cashflow[0].fcf;
  cashflow[0].cumulativeFcf = cashflow[0].fcf;
  for (let i = 1; i < cashflow.length; i += 1) {
    const t = cashflow[i].year;
    const pv = cashflow[i].fcf / Math.pow(1 + wacc, t);
    cashflow[i].pv = pv;
    npv += pv;
    cashflow[i].cumulativeFcf = cashflow[i - 1].cumulativeFcf + cashflow[i].fcf;
  }

  // IRR and Payback
  const irrSeries = cashflow.map((c) => c.fcf);
  const irrValue = computeIrr(irrSeries);

  let paybackYears: number | null = null;
  for (let i = 1; i < cashflow.length; i += 1) {
    if (cashflow[i - 1].cumulativeFcf < 0 && cashflow[i].cumulativeFcf >= 0) {
      const absPrev = -cashflow[i - 1].cumulativeFcf;
      const withinYear = absPrev / (cashflow[i].fcf || 1);
      paybackYears = cashflow[i - 1].year + withinYear;
      break;
    }
  }

  // RoCE and net block
  const depPerYear =
    (scenario.capex.machineCost / (scenario.capex.usefulLifeMachineYears || 1)) +
    (scenario.capex.mouldCost / (scenario.capex.usefulLifeMouldYears || 1));
  const roceByYear = pnl.map((y) => {
    const accumulatedDep = depPerYear * y.year;
    const netBlock = Math.max(0, capex0 - accumulatedDep);
    const roce = (y.ebit || 0) / Math.max(1e-9, netBlock + (cashflow.find((c) => c.year === y.year)?.nwc || 0));
    return { year: y.year, roce, netBlock };
  });

  return {
    cashflow,
    returns: { wacc, npv, irr: irrValue, paybackYears, roceByYear },
  };
}


