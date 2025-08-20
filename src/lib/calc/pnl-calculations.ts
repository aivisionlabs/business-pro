import { BusinessCase as Scenario, Sku, CalcOutput, FinanceInput, PnlYear, PriceYear, CashflowYear, OpsInput, PlantMaster } from "@/lib/types";
import { safeDiv, irr as computeIrr } from "./utils";

// ============================================================================
// CORE P&L CALCULATION FUNCTIONS (moved from pnl.ts)
// ============================================================================

// Revenue calculations
export function buildRevenueGross(price: PriceYear, volumePieces: number): number {
  return price.pricePerPiece * volumePieces;
}

export function buildRevenueNet(revenueGross: number): number {
  return revenueGross; // Currently same as gross, but can be extended for discounts
}

// Cost calculations
export function buildPowerCost(
  ops: OpsInput,
  operatingHoursPerDay: number,
  workingDaysPerYear: number,
  powerRate: number,
  weightKg: number
): number {
  const powerCostTotal = ops.powerUnitsPerHour * operatingHoursPerDay * workingDaysPerYear * powerRate;
  return safeDiv(powerCostTotal, weightKg) * weightKg;
}

export function buildManpowerCost(
  ops: OpsInput,
  shiftsPerDay: number,
  workingDaysPerYear: number,
  manpowerRatePerShift: number,
  weightKg: number
): number {
  const manpowerCostTotal = ops.manpowerCount * shiftsPerDay * workingDaysPerYear * manpowerRatePerShift;
  return safeDiv(manpowerCostTotal, weightKg) * weightKg;
}

export function buildValueAddCost(sku: Sku, volumePieces: number): number {
  return sku.costing.valueAddRsPerPiece * volumePieces;
}

export function buildPackagingCost(sku: Sku, weightKg: number): number {
  return (sku.costing.packagingRsPerKg || 0) * weightKg;
}

export function buildFreightOutCost(sku: Sku, weightKg: number): number {
  return (sku.costing.freightOutRsPerKg || 0) * weightKg;
}

export function buildConversionRecoveryCost(sku: Sku, volumePieces: number): number {
  return (sku.sales.conversionRecoveryRsPerPiece || 0) * volumePieces;
}

export function buildMaterialCost(
  price: PriceYear,
  weightKg: number,
  packagingCost: number,
  freightOutCost: number
): number {
  return (price.perKg.rmPerKg + price.perKg.mbPerKg) * weightKg + packagingCost + freightOutCost;
}

export function buildMaterialMargin(revenueNet: number, materialCost: number): number {
  return revenueNet - materialCost;
}

export function buildRAndMCost(plantMaster: PlantMaster, weightKg: number): number {
  return plantMaster.rAndMPerKg * weightKg;
}

export function buildOtherMfgCost(plantMaster: PlantMaster, weightKg: number): number {
  return plantMaster.otherMfgPerKg * weightKg;
}

export function buildPlantSgaCost(plantMaster: PlantMaster, weightKg: number): number {
  return plantMaster.plantSgaPerKg * weightKg;
}

export function buildCorpSgaCost(
  finance: FinanceInput,
  plantMaster: PlantMaster,
  weightKg: number
): number {
  return (finance.includeCorpSGA ? plantMaster.corpSgaPerKg : 0) * weightKg;
}

export function buildSgaCost(plantMaster: PlantMaster, weightKg: number): number {
  return plantMaster.sellingGeneralAndAdministrativeExpensesPerKg * weightKg;
}

export function buildConversionCost(plantMaster: PlantMaster, weightKg: number): number {
  const conversionPerKg = plantMaster.conversionPerKg ?? 25.80; // Default fallback value
  return conversionPerKg * weightKg;
}

export function buildGrossMargin(materialMargin: number, conversionCost: number): number {
  return materialMargin - conversionCost;
}

export function buildEbitda(
  revenueNet: number,
  materialCost: number,
  conversionCost: number,
  sgaCost: number
): number {
  return revenueNet - materialCost - conversionCost - sgaCost;
}

// Depreciation calculations
export function buildMachineDepreciation(sku: Sku): number {
  const machineInvestment = sku.capex.machineCost || 0;
  const machineLife = sku.capex.usefulLifeMachineYears || 15;
  return safeDiv(machineInvestment, machineLife);
}

export function buildMouldDepreciation(sku: Sku): number {
  const mouldInvestment = 0; // Currently hardcoded to 0
  const mouldLife = sku.capex.usefulLifeMouldYears || 15;
  return safeDiv(mouldInvestment, mouldLife);
}

export function buildInfraDepreciation(sku: Sku): number {
  const infraInvestment = sku.capex.infraCost || 0;
  const infraLife = sku.capex.usefulLifeInfraYears || 30;
  return safeDiv(infraInvestment, infraLife);
}

export function buildTotalDepreciation(sku: Sku): number {
  return buildMachineDepreciation(sku) + buildMouldDepreciation(sku) + buildInfraDepreciation(sku);
}

export function buildEbit(ebitda: number, depreciation: number): number {
  return ebitda - depreciation;
}

// Interest and tax calculations
export function buildOpeningDebt(finance: FinanceInput, sku: Sku): number {
  return (finance.debtPct || 0) * sku.capex.machineCost;
}

export function buildInterestCapex(openingDebt: number, interestRate: number): number {
  return openingDebt * interestRate;
}

export function buildPbt(ebit: number, interestCapex: number): number {
  return ebit - interestCapex;
}

export function buildTax(pbt: number, taxRate: number): number {
  return Math.max(0, pbt) * taxRate;
}

export function buildPat(pbt: number, tax: number): number {
  return pbt - tax;
}

// Cashflow and returns calculations
export function buildWorkingCapital(
  workingCapitalDays: number,
  revenueNet: number
): number {
  return (workingCapitalDays / 365) * revenueNet;
}

export function buildChangeInWorkingCapital(
  currentNwc: number,
  previousNwc: number
): number {
  return currentNwc - previousNwc;
}

export function buildFreeCashFlow(
  ebit: number,
  taxRate: number,
  depreciation: number,
  changeInNwc: number
): number {
  return ebit * (1 - taxRate) + depreciation - changeInNwc;
}

export function buildWacc(finance: FinanceInput, taxRate: number): number {
  const equityPct = 1 - (finance.debtPct || 0);
  return (
    (finance.debtPct || 0) * (finance.costOfDebtPct || 0) * (1 - taxRate) +
    equityPct * (finance.costOfEquityPct || 0)
  );
}

export function buildPresentValue(fcf: number, wacc: number, year: number): number {
  return fcf / Math.pow(1 + wacc, year);
}

export function buildNpv(cashflows: CashflowYear[], wacc: number): number {
  let npv = cashflows[0].fcf; // t=0 PV is itself
  for (let i = 1; i < cashflows.length; i += 1) {
    const t = cashflows[i].year;
    const pv = buildPresentValue(cashflows[i].fcf, wacc, t);
    npv += pv;
  }
  return npv;
}

export function buildCumulativeCashFlow(cashflows: CashflowYear[]): CashflowYear[] {
  const result = [...cashflows];
  result[0].cumulativeFcf = result[0].fcf;
  for (let i = 1; i < result.length; i += 1) {
    result[i].cumulativeFcf = result[i - 1].cumulativeFcf + result[i].fcf;
  }
  return result;
}

export function buildPaybackYears(cashflows: CashflowYear[]): number | null {
  for (let i = 1; i < cashflows.length; i += 1) {
    if (cashflows[i - 1].cumulativeFcf < 0 && cashflows[i].cumulativeFcf >= 0) {
      const absPrev = -cashflows[i - 1].cumulativeFcf;
      const withinYear = absPrev / (cashflows[i].fcf || 1);
      return cashflows[i - 1].year + withinYear;
    }
  }
  return null;
}

export function buildRoceByYear(
  pnl: PnlYear[],
  capex0: number,
  annualDepreciationByYear: number[],
  cashflows: CashflowYear[]
): { year: number; roce: number; netBlock: number }[] {
  return pnl.map((y, idx) => {
    const accumulatedDep = annualDepreciationByYear
      .slice(0, idx + 1)
      .reduce((a, b) => a + b, 0);
    const netBlock = Math.max(0, capex0 - accumulatedDep);
    const roce = (y.ebit || 0) / Math.max(1e-9, netBlock + (cashflows.find((c) => c.year === y.year)?.nwc || 0));
    return { year: y.year, roce, netBlock };
  });
}

// ============================================================================
// EXISTING P&L CALCULATION FUNCTIONS (keep as-is)
// ============================================================================

// Pure calculation functions - Atomic and Testable
export function calculateRevenueNet(
  calc: CalcOutput,
  year: number
): number {
  return calc.pnl[year - 1]?.revenueNet || 0;
}

export function calculateMaterialCost(
  calc: CalcOutput,
  year: number
): number {
  return calc.pnl[year - 1]?.materialCost || 0;
}

export function calculateMaterialMargin(
  calc: CalcOutput,
  year: number
): number {
  const revenueNet = calculateRevenueNet(calc, year);
  const materialCost = calculateMaterialCost(calc, year);
  return revenueNet - materialCost;
}

export function calculateConversionCost(
  calc: CalcOutput,
  year: number
): number {
  return calc.pnl[year - 1]?.conversionCost || 0;
}

export function calculateGrossMargin(
  calc: CalcOutput,
  year: number
): number {
  const revenueNet = calculateRevenueNet(calc, year);
  const materialCost = calculateMaterialCost(calc, year);
  const conversionCost = calculateConversionCost(calc, year);
  return revenueNet - materialCost - conversionCost;
}

export function calculateSgaCost(
  calc: CalcOutput,
  year: number
): number {
  return calc.pnl[year - 1]?.sgaCost || 0;
}

export function calculateEbitda(
  calc: CalcOutput,
  year: number
): number {
  return calc.pnl[year - 1]?.ebitda || 0;
}

export function calculateDepreciation(scenario: Scenario): number {
  return scenario.skus.reduce((total: number, sku: Sku) => {
    const machineDepreciation =
      (sku.ops?.costOfNewMachine || 0) + (sku.ops?.costOfOldMachine || 0);
    const mouldDepreciation =
      (sku.ops?.costOfNewMould || 0) + (sku.ops?.costOfOldMould || 0);
    const infraDepreciation =
      (sku.ops?.costOfNewInfra || 0) + (sku.ops?.costOfOldInfra || 0);

    const machineDepreciationPerYear =
      machineDepreciation / (sku.ops?.lifeOfNewMachineYears || 15);
    const mouldDepreciationPerYear =
      mouldDepreciation / (sku.ops?.lifeOfNewMouldYears || 15);
    const infraDepreciationPerYear =
      infraDepreciation / (sku.ops?.lifeOfNewInfraYears || 30);

    return (
      total +
      (machineDepreciationPerYear +
        mouldDepreciationPerYear +
        infraDepreciationPerYear)
    );
  }, 0);
}

export function calculateEbit(
  calc: CalcOutput,
  year: number,
  scenario: Scenario
): number {
  const ebitda = calculateEbitda(calc, year);
  const depreciation = calculateDepreciation(scenario);
  return ebitda - depreciation;
}

export function calculateInterest(
  scenario: Scenario,
  calc: CalcOutput,
  year: number
): number {
  const totalCapex = scenario.skus.reduce((total: number, sku: Sku) => {
    const skuCapex =
      (sku.ops?.costOfNewMachine || 0) + (sku.ops?.costOfNewInfra || 0);
    return total + skuCapex;
  }, 0);

  const workingCapitalDaysArray = scenario.skus.map(
    (s: Sku) => s.capex?.workingCapitalDays || 60
  );
  const workingCapitalDays = Math.max(60, ...workingCapitalDaysArray);
  const workingCapitalInvestment =
    calculateRevenueNet(calc, year) * (workingCapitalDays / 365);
  const totalInvestment = totalCapex + workingCapitalInvestment;
  return totalInvestment * scenario.finance.costOfDebtPct;
}

export function calculatePbt(
  calc: CalcOutput,
  year: number,
  scenario: Scenario
): number {
  const ebit = calculateEbit(calc, year, scenario);
  const interest = calculateInterest(scenario, calc, year);
  return ebit - interest;
}

export function calculateTax(
  calc: CalcOutput,
  year: number,
  scenario: Scenario
): number {
  const ebitda = calculateEbitda(calc, year);
  const revenueNet = calculateRevenueNet(calc, year);

  // Calculate total depreciation across all SKUs for this year
  const depreciation = calculateDepreciation(scenario);
  const ebit = ebitda - depreciation;

  // Calculate interest
  const totalCapex = scenario.skus.reduce((total, sku) => {
    return (
      total + (sku.ops?.costOfNewMachine || 0) + (sku.ops?.costOfNewInfra || 0)
    );
  }, 0);
  const workingCapitalDays = Math.max(
    60,
    ...scenario.skus.map((s) => s.capex?.workingCapitalDays || 60)
  );
  const workingCapitalInvestment = revenueNet * (workingCapitalDays / 365);
  const totalInvestment = totalCapex + workingCapitalInvestment;
  const interest = totalInvestment * scenario.finance.costOfDebtPct;

  const pbt = ebit - interest;
  // Tax = Tax Rate × PBT
  return pbt * scenario.finance.corporateTaxRatePct;
}

export function calculatePat(
  calc: CalcOutput,
  year: number,
  scenario: Scenario
): number {
  const pbt = calculatePbt(calc, year, scenario);
  const tax = pbt * scenario.finance.corporateTaxRatePct;
  return pbt - tax;
}

// Pure functions for P&L per kg calculations - Atomic and Testable
export function calculateRevenueNetPerKg(
  calc: CalcOutput,
  yearIndex: number
): number {
  return calc.weightedAvgPricePerKg[yearIndex]?.revenueNetPerKg || 0;
}

export function calculateMaterialCostPerKg(
  calc: CalcOutput,
  yearIndex: number
): number {
  return calc.weightedAvgPricePerKg[yearIndex]?.materialCostPerKg || 0;
}

export function calculateMaterialMarginPerKg(
  calc: CalcOutput,
  yearIndex: number
): number {
  return calc.weightedAvgPricePerKg[yearIndex]?.materialMarginPerKg || 0;
}

export function calculateConversionCostPerKg(
  calc: CalcOutput,
  yearIndex: number
): number {
  return calc.weightedAvgPricePerKg[yearIndex]?.conversionCostPerKg || 0;
}

export function calculateGrossMarginPerKg(
  calc: CalcOutput,
  yearIndex: number
): number {
  const revenueNet = calculateRevenueNetPerKg(calc, yearIndex);
  const materialCost = calculateMaterialCostPerKg(calc, yearIndex);
  const conversionCost = calculateConversionCostPerKg(calc, yearIndex);
  return revenueNet - materialCost - conversionCost;
}

export function calculateSgaCostPerKg(
  calc: CalcOutput,
  yearIndex: number
): number {
  return calc.weightedAvgPricePerKg[yearIndex]?.sgaCostPerKg || 0;
}

export function calculateEbitdaPerKg(
  calc: CalcOutput,
  yearIndex: number
): number {
  return calc.weightedAvgPricePerKg[yearIndex]?.ebitdaPerKg || 0;
}

export function calculateDepreciationPerKg(
  calc: CalcOutput,
  yearIndex: number,
  pnlAggregated: { depreciation: number[] }
): number {
  const totalWeight = calc.volumes[yearIndex]?.weightKg || 0;
  return totalWeight > 0
    ? pnlAggregated.depreciation[yearIndex] / totalWeight
    : 0;
}

export function calculateEbitPerKg(
  calc: CalcOutput,
  yearIndex: number,
  pnlAggregated: { ebit: number[] }
): number {
  const totalWeight = calc.volumes[yearIndex]?.weightKg || 0;
  return totalWeight > 0 ? pnlAggregated.ebit[yearIndex] / totalWeight : 0;
}

export function calculateInterestPerKg(
  calc: CalcOutput,
  yearIndex: number,
  pnlAggregated: { interest: number[] }
): number {
  const totalWeight = calc.volumes[yearIndex]?.weightKg || 0;
  return totalWeight > 0 ? pnlAggregated.interest[yearIndex] / totalWeight : 0;
}

export function calculateTaxPerKg(
  calc: CalcOutput,
  yearIndex: number,
  pnlAggregated: { tax: number[] }
): number {
  const totalWeight = calc.volumes[yearIndex]?.weightKg || 0;
  return totalWeight > 0 ? pnlAggregated.tax[yearIndex] / totalWeight : 0;
}

export function calculatePbtPerKg(
  calc: CalcOutput,
  yearIndex: number,
  pnlAggregated: { pbt: number[] }
): number {
  const totalWeight = calc.volumes[yearIndex]?.weightKg || 0;
  return totalWeight > 0 ? pnlAggregated.pbt[yearIndex] / totalWeight : 0;
}

export function calculatePatPerKg(
  calc: CalcOutput,
  yearIndex: number,
  pnlAggregated: { pat: number[] }
): number {
  const totalWeight = calc.volumes[yearIndex]?.weightKg || 0;
  return totalWeight > 0 ? pnlAggregated.pat[yearIndex] / totalWeight : 0;
}

// Calculate total depreciation per SKU
export function calculateTotalDepreciation(sku: Sku): number {
  const machineDepreciation =
    (sku.ops.costOfNewMachine || 0) + (sku.ops.costOfOldMachine || 0);
  const mouldDepreciation =
    (sku.ops.costOfNewMould || 0) + (sku.ops.costOfOldMould || 0);
  const infraDepreciation =
    (sku.ops.costOfNewInfra || 0) + (sku.ops.costOfOldInfra || 0);

  const machineDepreciationPerYear =
    machineDepreciation / (sku.ops.lifeOfNewMachineYears || 15);
  const mouldDepreciationPerYear =
    mouldDepreciation / (sku.ops.lifeOfNewMouldYears || 15);
  const infraDepreciationPerYear =
    infraDepreciation / (sku.ops.lifeOfNewInfraYears || 30);

  return (
    machineDepreciationPerYear +
    mouldDepreciationPerYear +
    infraDepreciationPerYear
  );
}

// Weighted-average per-kg helper across SKUs using Y1..Y5 volumes as weights
export function waPerKg(
  calc: CalcOutput,
  yearIndex: number,
  key: string
) {
  const bySku = calc.bySku || [];
  let num = 0;
  let den = 0;
  for (const s of bySku) {
    const vkg = s.volumes[yearIndex]?.weightKg || 0;
    const val = s.prices[yearIndex]?.perKg[
      key as keyof (typeof s.prices)[number]["perKg"]
    ] as number | undefined;
    if (vkg > 0 && typeof val === "number") {
      num += val * vkg;
      den += vkg;
    }
  }
  return den > 0 ? num / den : 0;
}

// Weighted-average revenue per kg helper across SKUs
export function waRevenuePerKg(calc: CalcOutput, yearIndex: number) {
  const bySku = calc.bySku || [];
  let num = 0;
  let den = 0;
  for (const s of bySku) {
    const vkg = s.volumes[yearIndex]?.weightKg || 0;
    if (vkg > 0) {
      // Sum of cost components: rmPerKg + mbPerKg + packagingPerKg + freightOutPerKg + conversionPerKg
      const rmPerKg = s.prices[yearIndex]?.perKg.rmPerKg || 0;
      const mbPerKg = s.prices[yearIndex]?.perKg.mbPerKg || 0;
      const packagingPerKg = s.prices[yearIndex]?.perKg.packagingPerKg || 0;
      const freightOutPerKg = s.prices[yearIndex]?.perKg.freightOutPerKg || 0;
      const conversionPerKg = s.prices[yearIndex]?.perKg.conversionPerKg || 0;

      const revenuePerKg =
        rmPerKg +
        mbPerKg +
        packagingPerKg +
        freightOutPerKg +
        conversionPerKg;

      num += revenuePerKg * vkg;
      den += vkg;
    }
  }
  return den > 0 ? num / den : 0;
}
