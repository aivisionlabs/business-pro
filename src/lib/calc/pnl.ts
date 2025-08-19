import { CashflowYear, FinanceInput, PnlYear, PriceYear, Sku } from "@/lib/types";
import { computeVolumes } from "./capacity";
import { safeDiv, irr as computeIrr } from "./utils";

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

  const openingDebt = (finance.debtPct || 0) * (sku.capex.machineCost + sku.capex.mouldCost);
  const interestRate = finance.costOfDebtPct || 0;

  for (const v of volumes) {
    const { year, volumePieces, weightKg } = v;
    const p = price[year - 1];

    const revenueGross = p.pricePerPiece * volumePieces;

    const revenueNet = revenueGross;

    // const materialCostPerKg = p.perKg.rmPerKg + p.perKg.mbPerKg; // Unused variable

    const powerCostTotal =
      ops.powerUnitsPerHour * operatingHoursPerDay * workingDaysPerYear * powerRate;
    const powerCost = safeDiv(powerCostTotal, weightKg) * weightKg; // equals total or 0

    const manpowerCostTotal =
      ops.manpowerCount * shiftsPerDay * workingDaysPerYear * manpowerRatePerShift;
    const manpowerCost = safeDiv(manpowerCostTotal, weightKg) * weightKg;

    const valueAddCost = sku.costing.valueAddRsPerPiece * volumePieces;
    const packagingCost = (sku.costing.packagingRsPerKg || 0) * weightKg; // now Rs/kg
    const freightOutCost = (sku.costing.freightOutRsPerKg || 0) * weightKg; // now Rs/kg
    const conversionRecoveryCost = (sku.sales.conversionRecoveryRsPerPiece || 0) * volumePieces;

    // Update material cost to include RM cost + MB cost + packaging cost + freight cost
    const materialCost = (p.perKg.rmPerKg + p.perKg.mbPerKg) * weightKg + packagingCost + freightOutCost;
    const materialMargin = revenueNet - materialCost;

    const rAndMCost = plantMaster.rAndMPerKg * weightKg;
    const otherMfgCost = plantMaster.otherMfgPerKg * weightKg;
    const plantSgaCost = plantMaster.plantSgaPerKg * weightKg;
    const corpSgaCost = (finance.includeCorpSGA ? plantMaster.corpSgaPerKg : 0) * weightKg;
    const sgaCost = plantMaster.sellingGeneralAndAdministrativeExpensesPerKg * weightKg;

    // Use fallback value if conversionPerKg is not available
    const conversionPerKg = plantMaster.conversionPerKg ?? 25.80; // Default fallback value

    const conversionCost =

      conversionPerKg * weightKg;

    const grossMargin = materialMargin - conversionCost;
    const ebitda = revenueNet - materialCost - conversionCost - sgaCost;

    // Depreciation calculation using only the 6 required fields
    const machineInvestment = sku.capex.machineCost || 0;
    const mouldInvestment = sku.npd.mouldCost || 0;
    const infraInvestment = sku.capex.infraCost || 0;

    const machineLife = sku.capex.usefulLifeMachineYears || 15; // Default 15 years
    const mouldLife = sku.capex.usefulLifeMouldYears || 15; // Default 15 years
    const infraLife = sku.capex.usefulLifeInfraYears || 30; // Default 30 years

    // Depreciation = Investment / Life in years
    const depMachine = safeDiv(machineInvestment, machineLife);
    const depMould = safeDiv(mouldInvestment, mouldLife);
    const depInfra = safeDiv(infraInvestment, infraLife);

    const depreciation = depMachine + depMould + depInfra;
    const ebit = ebitda - depreciation;

    const interestCapex = openingDebt * interestRate; // MVP: interest-only
    const pbt = ebit - interestCapex;
    const taxRate = Math.max(0, finance.corporateTaxRatePct || 0);
    const tax = Math.max(0, pbt) * taxRate;
    const pat = pbt - tax;

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

  const equityPct = 1 - (finance.debtPct || 0);
  const wacc =
    (finance.debtPct || 0) * (finance.costOfDebtPct || 0) * (1 - taxRate) +
    equityPct * (finance.costOfEquityPct || 0);

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
  // Use actual aggregated depreciation schedule if provided
  const roceByYear = pnl.map((y, idx) => {
    const accumulatedDep = options.annualDepreciationByYear
      .slice(0, idx + 1)
      .reduce((a, b) => a + b, 0);
    const netBlock = Math.max(0, capex0 - accumulatedDep);
    const roce = (y.ebit || 0) / Math.max(1e-9, netBlock + (cashflow.find((c) => c.year === y.year)?.nwc || 0));
    return { year: y.year, roce, netBlock };
  });

  return {
    cashflow,
    returns: { wacc, npv, irr: irrValue, paybackYears, roceByYear },
  };
}


