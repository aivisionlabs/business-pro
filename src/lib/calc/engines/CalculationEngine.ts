import {
  BusinessCase as Scenario,
  CalcOutput,
  Sku,
  PriceYear,
  YearVolumes,
  PriceComponentsPerKg,
  SkuCalcOutput,
  WeightedAvgPricePerKgYear,
  PnlYear
} from "@/lib/types";
import { compoundInflationSeries, toKg, safeDiv } from "../utils";
import { CALCULATION_CONFIG } from "../config";

/**
 * Unified CalculationEngine - Handles ALL calculations in one place
 * This eliminates the confusing file structure and provides a single source of truth
 */
export class CalculationEngine {

  // ============================================================================
  // VOLUME & CAPACITY CALCULATIONS
  // ============================================================================

  /**
   * Calculate production capacity for a SKU
   */
  static calculateCapacity(npd: any, ops: any) {
    const operatingHoursPerDay = ops.operatingHoursPerDay ?? 24;
    const workingDaysPerYear = ops.workingDaysPerYear ?? 365;
    const unitsPerHour = npd.cavities * (60 / npd.cycleTimeSeconds) * ops.oee;
    const unitsPerDay = unitsPerHour * operatingHoursPerDay;
    const annualCapacityPieces = unitsPerDay * workingDaysPerYear;
    return { unitsPerHour, unitsPerDay, annualCapacityPieces };
  }

  /**
   * Calculate volumes for a SKU across years
   */
  static calculateVolumes(
    productWeightGrams: number,
    baseAnnualVolumePieces: number,
    annualVolumeGrowthPct: number = 0,
  ): YearVolumes[] {
    const productWeightKg = toKg(productWeightGrams);
    const years = CALCULATION_CONFIG.YEARS;
    const results: YearVolumes[] = [];

    for (let year = 1; year <= years; year += 1) {
      let volumePieces: number;
      if (year === 1) {
        volumePieces = baseAnnualVolumePieces;
      } else {
        // For year 2 onwards: previous year volume * (1 + growth rate)
        const previousYearVolume = results[year - 2].volumePieces;
        volumePieces = previousYearVolume * (1 + annualVolumeGrowthPct);
      }

      const weightKg = volumePieces * productWeightKg;

      results.push({ year, volumePieces, weightKg });
    }
    return results;
  }

  // ============================================================================
  // PRICE CALCULATIONS
  // ============================================================================

  /**
   * Calculate raw material and masterbatch costs per kg
   */
  static calculateRmMbPerKg(costing: any): { rmY1: number; mbY1: number } {
    const resinNet = Math.max(
      0,
      costing.resinRsPerKg * (1 - (costing.resinDiscountPct || 0))
    ) + (costing.freightInwardsRsPerKg || 0);
    const rmY1 = resinNet * (1 + (costing.wastagePct || 0));
    const mbBase = costing.useMbPriceOverride === false ? resinNet : costing.mbRsPerKg;
    const mbY1 = mbBase * (costing.mbRatioPct || 0) * (1 + (costing.wastagePct || 0));
    return { rmY1, mbY1 };
  }

  /**
   * Convert per-piece values to per-kg
   */
  static perPieceToPerKg(valuePerPiece: number, productWeightKg: number): number {
    return productWeightKg > 0 ? valuePerPiece / productWeightKg : 0;
  }

  /**
   * Build price by year for a SKU
   */
  static buildPriceByYear(
    sales: any,
    costing: any,
    npd: any,
    ops: any,
    alt?: any
  ): PriceYear[] {
    const productWeightKg = toKg(sales.productWeightGrams);
    const { rmY1, mbY1 } = this.calculateRmMbPerKg(costing);

    // Determine conversion recovery per piece
    let conversionRsPerPiece = sales.conversionRecoveryRsPerPiece ?? 0;
    if ((conversionRsPerPiece || 0) <= 0 && alt?.machineRatePerDayRs) {
      const { unitsPerDay } = this.calculateCapacity(npd, ops);
      conversionRsPerPiece = alt.machineRatePerDayRs / (unitsPerDay || 1);
    }

    const valueAddPerKgY1 = this.perPieceToPerKg(costing.valueAddRsPerPiece, productWeightKg);
    const packagingPerKgY1 = (costing.packagingRsPerKg ?? 0) ||
      this.perPieceToPerKg(costing.packagingRsPerPiece || 0, productWeightKg);
    const freightOutPerKgY1 = (costing.freightOutRsPerKg ?? 0) ||
      this.perPieceToPerKg(costing.freightOutRsPerPiece || 0, productWeightKg);
    const conversionPerKgY1 = this.perPieceToPerKg(conversionRsPerPiece, productWeightKg);

    const rmInflFactors = compoundInflationSeries(costing.rmInflationPct);
    const convInflFactors = compoundInflationSeries(costing.conversionInflationPct);

    const years = CALCULATION_CONFIG.YEARS;
    const out: PriceYear[] = [];

    const materialPerKgY1 = rmY1 + mbY1;
    const materialPerPieceY1 = materialPerKgY1 * productWeightKg;
    const perPieceItemsY1 = costing.valueAddRsPerPiece +
      packagingPerKgY1 * productWeightKg +
      freightOutPerKgY1 * productWeightKg +
      conversionRsPerPiece;
    const pricePerPieceY1 = materialPerPieceY1 + perPieceItemsY1;

    for (let year = 1; year <= years; year += 1) {
      const idx = year - 1;
      const rmOnlyPerKg = rmY1 * (rmInflFactors[idx] || 1);
      const mbOnlyPerKg = mbY1 * (rmInflFactors[idx] || 1);

      const valueAddPerKg = valueAddPerKgY1 * (convInflFactors[idx] || 1);
      const packagingPerKg = packagingPerKgY1 * (convInflFactors[idx] || 1);
      const freightOutPerKg = freightOutPerKgY1 * (convInflFactors[idx] || 1);
      const conversionPerKg = conversionPerKgY1 * (convInflFactors[idx] || 1);

      const totalPerKg = rmOnlyPerKg + mbOnlyPerKg + valueAddPerKg +
        packagingPerKg + freightOutPerKg + conversionPerKg;

      const factor = convInflFactors[idx] || 1;
      const pricePerPiece = pricePerPieceY1 * factor;

      const perKg: PriceComponentsPerKg = {
        rmPerKg: rmOnlyPerKg,
        mbPerKg: mbOnlyPerKg,
        valueAddPerKg,
        packagingPerKg,
        freightOutPerKg,
        conversionPerKg,
        totalPerKg,
      };
      out.push({ year, perKg, pricePerPiece });
    }

    return out;
  }

  // ============================================================================
  // CORE P&L CALCULATIONS (from pnl.ts)
  // ============================================================================

  /**
   * Calculate gross revenue
   */
  static buildRevenueGross(price: PriceYear, volumePieces: number): number {
    return price.pricePerPiece * volumePieces;
  }

  /**
   * Calculate net revenue
   */
  static buildRevenueNet(revenueGross: number): number {
    return revenueGross; // Currently same as gross, extensible for discounts
  }

  /**
   * Calculate power cost
   */
  static buildPowerCost(
    ops: any,
    operatingHoursPerDay: number,
    workingDaysPerYear: number,
    powerRate: number,
    weightKg: number
  ): number {
    const powerCostTotal = ops.powerUnitsPerHour * operatingHoursPerDay * workingDaysPerYear * powerRate;
    return safeDiv(powerCostTotal, weightKg) * weightKg;
  }

  /**
   * Calculate manpower cost
   */
  static buildManpowerCost(
    ops: any,
    shiftsPerDay: number,
    workingDaysPerYear: number,
    manpowerRatePerShift: number,
    weightKg: number
  ): number {
    const manpowerCostTotal = ops.manpowerCount * shiftsPerDay * workingDaysPerYear * manpowerRatePerShift;
    return safeDiv(manpowerCostTotal, weightKg) * weightKg;
  }

  /**
   * Calculate value-add cost
   */
  static buildValueAddCost(sku: Sku, volumePieces: number): number {
    return sku.costing.valueAddRsPerPiece * volumePieces;
  }

  /**
   * Calculate packaging cost
   */
  static buildPackagingCost(sku: Sku, weightKg: number): number {
    return (sku.costing.packagingRsPerKg || 0) * weightKg;
  }

  /**
   * Calculate freight out cost
   */
  static buildFreightOutCost(sku: Sku, weightKg: number): number {
    return (sku.costing.freightOutRsPerKg || 0) * weightKg;
  }

  /**
   * Calculate conversion recovery cost
   */
  static buildConversionRecoveryCost(sku: Sku, volumePieces: number): number {
    return (sku.sales.conversionRecoveryRsPerPiece || 0) * volumePieces;
  }

  /**
   * Calculate material cost
   */
  static buildMaterialCost(
    price: PriceYear,
    weightKg: number,
    packagingCost: number,
    freightOutCost: number
  ): number {
    return (price.perKg.rmPerKg + price.perKg.mbPerKg) * weightKg + packagingCost + freightOutCost;
  }

  /**
   * Calculate material margin
   */
  static buildMaterialMargin(revenueNet: number, materialCost: number): number {
    return revenueNet - materialCost;
  }

  /**
   * Calculate R&D cost
   */
  static buildRAndMCost(plantMaster: any, weightKg: number): number {
    return plantMaster.rAndMPerKg * weightKg;
  }

  /**
   * Calculate other manufacturing cost
   */
  static buildOtherMfgCost(plantMaster: any, weightKg: number): number {
    return plantMaster.otherMfgPerKg * weightKg;
  }

  /**
   * Calculate plant SG&A cost
   */
  static buildPlantSgaCost(plantMaster: any, weightKg: number): number {
    return plantMaster.plantSgaPerKg * weightKg;
  }

  /**
   * Calculate corporate SG&A cost
   */
  static buildCorpSgaCost(finance: any, plantMaster: any, weightKg: number): number {
    return (finance.includeCorpSGA ? plantMaster.corpSgaPerKg : 0) * weightKg;
  }

  /**
   * Calculate total SG&A cost
   */
  static buildSgaCost(plantMaster: any, weightKg: number): number {
    return plantMaster.sellingGeneralAndAdministrativeExpensesPerKg * weightKg;
  }

  /**
   * Calculate conversion cost
   */
  static buildConversionCost(plantMaster: any, weightKg: number): number {
    const conversionPerKg = plantMaster.conversionPerKg ?? 25.80;
    return conversionPerKg * weightKg;
  }

  /**
   * Calculate gross margin
   */
  static buildGrossMargin(materialMargin: number, conversionCost: number): number {
    return materialMargin - conversionCost;
  }

  /**
   * Calculate EBITDA
   */
  static buildEbitda(
    revenueNet: number,
    materialCost: number,
    conversionCost: number,
    sgaCost: number
  ): number {
    return revenueNet - materialCost - conversionCost - sgaCost;
  }

  // ============================================================================
  // DEPRECIATION CALCULATIONS
  // ============================================================================

  /**
   * Calculate machine depreciation
   */
  static buildMachineDepreciation(sku: Sku): number {
    const machineInvestment = (sku.ops.costOfNewMachine || 0) + (sku.ops.costOfOldMachine || 0);
    const machineLife = sku.ops.lifeOfNewMachineYears || 15;
    return safeDiv(machineInvestment, machineLife);
  }

  /**
   * Calculate mould depreciation
   */
  static buildMouldDepreciation(sku: Sku): number {
    const mouldInvestment = (sku.ops.costOfNewMould || 0) + (sku.ops.costOfOldMould || 0);
    const mouldLife = sku.ops.lifeOfNewMouldYears || 15;
    return safeDiv(mouldInvestment, mouldLife);
  }

  /**
   * Calculate infrastructure depreciation
   */
  static buildInfraDepreciation(sku: Sku): number {
    const infraInvestment = (sku.ops.costOfNewInfra || 0) + (sku.ops.costOfOldInfra || 0);
    const infraLife = sku.ops.lifeOfNewInfraYears || 30;

    return safeDiv(infraInvestment, infraLife);
  }

  /**
   * Calculate total depreciation (matches original calculateTotalDepreciation)
   */
  static buildTotalDepreciation(sku: Sku): number {
    const machineDep = this.buildMachineDepreciation(sku);
    const mouldDep = this.buildMouldDepreciation(sku);
    const infraDep = this.buildInfraDepreciation(sku);
    const totalDep = machineDep + mouldDep + infraDep;

    return totalDep;
  }

  // ============================================================================
  // FINANCIAL CALCULATIONS
  // ============================================================================

  /**
   * Calculate EBIT
   */
  static buildEbit(ebitda: number, depreciation: number): number {
    return ebitda - depreciation;
  }

  /**
   * Calculate opening debt
   */
  static buildOpeningDebt(finance: any, sku: Sku): number {
    return (finance.debtPct || 0) * (sku.ops.costOfNewMachine || 0);
  }

  /**
   * Calculate interest on capex
   */
  static buildInterestCapex(openingDebt: number, interestRate: number): number {
    return openingDebt * interestRate;
  }

  /**
   * Calculate PBT
   */
  static buildPbt(ebit: number, interestCapex: number): number {
    return ebit - interestCapex;
  }

  /**
   * Calculate tax
   */
  static buildTax(pbt: number, taxRate: number): number {
    return Math.max(0, pbt) * taxRate;
  }

  /**
   * Calculate PAT
   */
  static buildPat(pbt: number, tax: number): number {
    return pbt - tax;
  }

  // ============================================================================
  // CASHFLOW & RETURNS CALCULATIONS
  // ============================================================================

  /**
   * Calculate working capital
   */
  static buildWorkingCapital(workingCapitalDays: number, revenueNet: number): number {
    return (workingCapitalDays / 365) * revenueNet;
  }

  /**
   * Calculate change in working capital
   */
  static buildChangeInWorkingCapital(currentNwc: number, previousNwc: number): number {
    return currentNwc - previousNwc;
  }

  /**
   * Calculate free cash flow
   * FCF = EBITDA - Interest - Tax - Working Capital investment
   */
  static buildFreeCashFlow(
    ebitda: number,
    interest: number,
    tax: number,
    changeInNwc: number
  ): number {

    const fcf = ebitda - interest - tax - changeInNwc;


    return fcf;
  }

  /**
 * Calculate WACC
 */
  static buildWacc(finance: any, taxRate: number): number {
    // If WACC is explicitly provided, use it
    if (finance?.waccPct !== undefined && finance.waccPct !== null) {
      return finance.waccPct;
    }

    // Default WACC to 14% if finance inputs are missing
    if (!finance || (!finance.debtPct && !finance.costOfDebtPct && !finance.costOfEquityPct)) {
      return 0.14; // 14% default WACC
    }

    const equityPct = 1 - (finance.debtPct || 0);
    const wacc = (finance.debtPct || 0) * (finance.costOfDebtPct || 0) * (1 - taxRate) +
      equityPct * (finance.costOfEquityPct || 0);

    return wacc;
  }

  /**
   * Calculate present value
   */
  static buildPresentValue(fcf: number, wacc: number, year: number): number {
    const pv = fcf / Math.pow(1 + wacc, year);
    return pv;
  }

  /**
   * Calculate NPV
   */
  static buildNpv(cashflows: any[], wacc: number): number {
    let npv = cashflows[0].fcf;

    for (let i = 1; i < cashflows.length; i += 1) {
      const t = cashflows[i].year;
      const fcf = cashflows[i].fcf;
      const pv = this.buildPresentValue(fcf, wacc, t);
      npv += pv;
    }

    return npv;
  }

  /**
   * Calculate cumulative cash flow
   */
  static buildCumulativeCashFlow(cashflows: any[]): any[] {
    const result = [...cashflows];
    result[0].cumulativeFcf = result[0].fcf;
    for (let i = 1; i < result.length; i += 1) {
      result[i].cumulativeFcf = result[i - 1].cumulativeFcf + result[i].fcf;
    }
    return result;
  }

  /**
   * Calculate payback years
   */
  static buildPaybackYears(cashflows: any[]): number | null {
    for (let i = 1; i < cashflows.length; i += 1) {
      if (cashflows[i - 1].cumulativeFcf < 0 && cashflows[i].cumulativeFcf >= 0) {
        const absPrev = -cashflows[i - 1].cumulativeFcf;
        const withinYear = absPrev / (cashflows[i].fcf || 1);
        return cashflows[i - 1].year + withinYear;
      }
    }
    return null;
  }

  /**
   * Calculate RoCE by year with NetBlock support
   */
  static buildRoceByYear(
    pnl: PnlYear[],
    annualDepreciationByYear: number[],
    cashflows: any[],
    scenario?: Scenario // Optional scenario for NetBlock calculation
  ): { year: number; roce: number; netBlock: number }[] {
    return pnl.map((y) => {
      const ebit = y.ebit || 0;
      const nwc = cashflows.find((c) => c.year === y.year)?.nwc || 0;

      let netBlock = 0;
      if (scenario) {
        // Calculate NetBlock if scenario is provided
        netBlock = this.buildNetBlock(scenario, y.year);
      }

      // Calculate RoCE = EBIT / (NetBlock + NWC)
      const capitalEmployed = netBlock + nwc;
      const roce = capitalEmployed > 0 ? ebit / capitalEmployed : 0;

      return { year: y.year, roce, netBlock };
    });
  }

  // ============================================================================
  // ROCE CALCULATIONS
  // ============================================================================

  /**
   * Calculate accumulated depreciation for a specific year
   * Accumulated Depreciation = Total Depreciation for all of previous years and current year
   */
  static buildAccumulatedDepreciation(
    scenario: Scenario,
    targetYear: number
  ): number {
    let accumulatedDep = 0;

    for (let year = 1; year <= targetYear; year += 1) {
      const yearDep = this.calculateTotalDepreciation(scenario);
      accumulatedDep += yearDep;
    }

    return accumulatedDep;
  }

  /**
   * Calculate Net Block for a specific year
   * Net Block = (Cost of new machine + cost of New mould + cost of new infra) – Accumulated Depreciation
   */
  static buildNetBlock(
    scenario: Scenario,
    targetYear: number
  ): number {
    const totalCapex = scenario.skus.reduce((total: number, sku: Sku) => {
      const skuCapex = (sku.ops?.costOfNewMachine || 0) +
        (sku.ops?.costOfNewMould || 0) +
        (sku.ops?.costOfNewInfra || 0);
      return total + skuCapex;
    }, 0);

    const accumulatedDep = this.buildAccumulatedDepreciation(scenario, targetYear);

    return Math.max(0, totalCapex - accumulatedDep);
  }

  /**
   * Calculate Net Working Capital for a specific year
   */
  static buildNetWorkingCapital(
    scenario: Scenario,
    revenueNet: number
  ): number {
    const workingCapitalDaysArray = scenario.skus.map(
      (s: Sku) => (s.ops?.workingCapitalDays ?? 60)
    );

    // If all SKUs have 0 working capital days, return 0
    if (workingCapitalDaysArray.every(days => days === 0)) {
      return 0;
    }

    const workingCapitalDays = Math.max(...workingCapitalDaysArray);
    return (revenueNet * workingCapitalDays) / 365;
  }

  /**
   * Calculate RoCE for a specific year
   * Return on Capital Employed (RoCE) = EBIT / (Net Block + Net Working Capital)
   */
  static buildRoce(
    scenario: Scenario,
    ebit: number,
    targetYear: number,
    revenueNet: number
  ): number {
    const netBlock = this.buildNetBlock(scenario, targetYear);
    const netWorkingCapital = this.buildNetWorkingCapital(scenario, revenueNet);
    const capitalEmployed = netBlock + netWorkingCapital;

    if (capitalEmployed <= 0) {
      return 0;
    }

    return ebit / capitalEmployed;
  }

  /**
   * Calculate RoCE for all years
   */
  static buildRoceForAllYears(
    scenario: Scenario,
    calc: CalcOutput
  ): { year: number; roce: number; netBlock: number; netWorkingCapital: number; capitalEmployed: number }[] {
    const years = CALCULATION_CONFIG.YEARS;
    const results = [];

    for (let year = 1; year <= years; year += 1) {
      const yearIndex = year - 1;
      const yearPnl = calc.pnl[yearIndex];

      if (!yearPnl) continue;

      const ebit = yearPnl.ebit || 0;
      const revenueNet = yearPnl.revenueNet || 0;
      const netBlock = this.buildNetBlock(scenario, year);
      const netWorkingCapital = this.buildNetWorkingCapital(scenario, revenueNet);
      const capitalEmployed = netBlock + netWorkingCapital;
      const roce = this.buildRoce(scenario, ebit, year, revenueNet);

      results.push({
        year,
        roce,
        netBlock,
        netWorkingCapital,
        capitalEmployed
      });
    }

    return results;
  }

  // ============================================================================
  // AGGREGATED P&L CALCULATIONS (for charts and displays)
  // ============================================================================

  /**
   * Calculate aggregated P&L metrics for all years
   */
  static calculateAggregatedPnl(
    calc: CalcOutput,
    scenario: Scenario
  ): {
    revenueNet: number[];
    materialCost: number[];
    materialMargin: number[];
    conversionCost: number[];
    grossMargin: number[];
    sgaCost: number[];
    ebitda: number[];
    depreciation: number[];
    ebit: number[];
    interest: number[];
    pbt: number[];
    tax: number[];
    pat: number[];
  } {
    const years = [1, 2, 3, 4, 5];

    return {
      revenueNet: years.map((year) => calc.pnl[year - 1]?.revenueNet || 0),
      materialCost: years.map((year) => calc.pnl[year - 1]?.materialCost || 0),
      materialMargin: years.map((year) => calc.pnl[year - 1]?.materialMargin || 0),
      conversionCost: years.map((year) => calc.pnl[year - 1]?.conversionCost || 0),
      grossMargin: years.map((year) => calc.pnl[year - 1]?.grossMargin || 0),
      sgaCost: years.map((year) => calc.pnl[year - 1]?.sgaCost || 0),
      ebitda: years.map((year) => calc.pnl[year - 1]?.ebitda || 0),
      depreciation: years.map(() => this.calculateTotalDepreciation(scenario)),
      ebit: years.map((year) => this.calculateEbit(calc, year, scenario)),
      interest: years.map((year) => this.calculateInterest(scenario, calc, year)),
      pbt: years.map((year) => this.calculatePbt(calc, year, scenario)),
      tax: years.map((year) => this.calculateTax(calc, year, scenario)),
      pat: years.map((year) => this.calculatePat(calc, year, scenario)),
    };
  }

  /**
   * Calculate total depreciation across all SKUs
   */
  private static calculateTotalDepreciation(scenario: Scenario): number {
    return scenario.skus.reduce((total: number, sku: Sku) => {
      return total + this.buildTotalDepreciation(sku);
    }, 0);
  }

  /**
   * Calculate EBITDA for a specific year (matches original)
   */
  private static calculateEbitda(calc: CalcOutput, year: number): number {
    return calc.pnl[year - 1]?.ebitda || 0;
  }

  /**
   * Calculate EBIT for a specific year (matches original)
   */
  private static calculateEbit(calc: CalcOutput, year: number, scenario: Scenario): number {
    const ebitda = this.calculateEbitda(calc, year);
    const depreciation = this.calculateTotalDepreciation(scenario);
    return ebitda - depreciation;
  }

  /**
   * Calculate interest for a specific year (matches original)
   */
  private static calculateInterest(scenario: Scenario, calc: CalcOutput, year: number): number {
    const totalCapex = scenario.skus.reduce((total: number, sku: Sku) => {
      const skuCapex = (sku.ops?.costOfNewMachine || 0) + (sku.ops?.costOfNewInfra || 0);
      return total + skuCapex;
    }, 0);

    const workingCapitalDaysArray = scenario.skus.map(
      (s: Sku) => (s.ops?.workingCapitalDays ?? 60)
    );
    const workingCapitalDays = Math.max(...workingCapitalDaysArray);
    const workingCapitalInvestment = (calc.pnl[year - 1]?.revenueNet || 0) * (workingCapitalDays / 365);
    const totalInvestment = totalCapex + workingCapitalInvestment;
    return totalInvestment * scenario.finance.costOfDebtPct;
  }

  /**
   * Calculate PBT for a specific year
   */
  private static calculatePbt(calc: CalcOutput, year: number, scenario: Scenario): number {
    const ebit = this.calculateEbit(calc, year, scenario);
    const interest = this.calculateInterest(scenario, calc, year);
    return ebit - interest;
  }

  /**
   * Calculate tax for a specific year (matches original)
   */
  private static calculateTax(calc: CalcOutput, year: number, scenario: Scenario): number {
    const ebit = this.calculateEbit(calc, year, scenario);
    const interest = this.calculateInterest(scenario, calc, year);
    const pbt = ebit - interest;
    // Tax = Tax Rate × PBT
    return pbt * scenario.finance.corporateTaxRatePct;
  }

  /**
   * Calculate PAT for a specific year (matches original)
   */
  private static calculatePat(calc: CalcOutput, year: number, scenario: Scenario): number {
    const pbt = this.calculatePbt(calc, year, scenario);
    // Don't recalculate tax here - it's already calculated in calculateTax
    const tax = this.calculateTax(calc, year, scenario);
    return pbt - tax;
  }

  // ============================================================================
  // PER-KG CALCULATIONS (for PnlPerKg component)
  // ============================================================================

  /**
   * Calculate all per-kg metrics for a specific year
   */
  static calculatePerKgForYear(
    calc: CalcOutput,
    yearIndex: number,
    pnlAggregated: {
      depreciation: number[];
      ebit: number[];
      interest: number[];
      tax: number[];
      pat: number[];
    }
  ): {
    revenueNetPerKg: number;
    materialCostPerKg: number;
    materialMarginPerKg: number;
    conversionCostPerKg: number;
    grossMarginPerKg: number;
    sgaCostPerKg: number;
    ebitdaPerKg: number;
    depreciationPerKg: number;
    ebitPerKg: number;
    interestPerKg: number;
    taxPerKg: number;
    pbtPerKg: number;
    patPerKg: number;
  } {
    const weightedAvgPrice = calc.weightedAvgPricePerKg[yearIndex];
    const totalWeight = calc.volumes[yearIndex]?.weightKg || 0;

    return {
      revenueNetPerKg: weightedAvgPrice?.revenueNetPerKg || 0,
      materialCostPerKg: weightedAvgPrice?.materialCostPerKg || 0,
      materialMarginPerKg: weightedAvgPrice?.materialMarginPerKg || 0,
      conversionCostPerKg: weightedAvgPrice?.conversionCostPerKg || 0,
      grossMarginPerKg: (weightedAvgPrice?.revenueNetPerKg || 0) - (weightedAvgPrice?.materialCostPerKg || 0) - (weightedAvgPrice?.conversionCostPerKg || 0),
      sgaCostPerKg: weightedAvgPrice?.sgaCostPerKg || 0,
      ebitdaPerKg: weightedAvgPrice?.ebitdaPerKg || 0,
      depreciationPerKg: totalWeight > 0 ? pnlAggregated.depreciation[yearIndex] / totalWeight : 0,
      ebitPerKg: totalWeight > 0 ? pnlAggregated.ebit[yearIndex] / totalWeight : 0,
      interestPerKg: totalWeight > 0 ? pnlAggregated.interest[yearIndex] / totalWeight : 0,
      taxPerKg: totalWeight > 0 ? pnlAggregated.tax[yearIndex] / totalWeight : 0,
      pbtPerKg: totalWeight > 0 ?
        (pnlAggregated.ebit[yearIndex] - pnlAggregated.interest[yearIndex]) / totalWeight : 0,
      patPerKg: totalWeight > 0 ? pnlAggregated.pat[yearIndex] / totalWeight : 0,
    };
  }

  // ============================================================================
  // MERGED P&L TABLE CALCULATIONS
  // ============================================================================

  /**
   * Calculate all values needed for the merged P&L table
   * This consolidates all calculations in one place for consistency
   */
  static calculateMergedPnlTableData(
    calc: CalcOutput,
    pnlAggregated: {
      revenueNet: number[];
      materialCost: number[];
      materialMargin: number[];
      conversionCost: number[];
      grossMargin: number[];
      sgaCost: number[];
      ebitda: number[];
      depreciation: number[];
      ebit: number[];
      interest: number[];
      pbt: number[];
      tax: number[];
      pat: number[];
    }
  ): {
    volumes: number[];
    revenueNet: number[];
    materialMargin: number[];
    grossMargin: number[];
    ebitda: number[];
    pat: number[];
    rocePercentage: number[];
  } {
    const years = CALCULATION_CONFIG.YEARS;
    const result = {
      volumes: [] as number[],
      revenueNet: [] as number[],
      materialMargin: [] as number[],
      grossMargin: [] as number[],
      ebitda: [] as number[],
      pat: [] as number[],
      rocePercentage: [] as number[],
    };

    for (let year = 1; year <= years; year += 1) {
      const yearIndex = year - 1;

      // Volume in MT (convert from kg to metric tons)
      const volumeKg = calc.volumes[yearIndex]?.weightKg || 0;
      result.volumes.push(volumeKg / 1000);

      // Revenue Net (in crores)
      result.revenueNet.push(pnlAggregated.revenueNet[yearIndex] || 0);

      // Material Margin (in crores)
      result.materialMargin.push(pnlAggregated.materialMargin[yearIndex] || 0);

      // Gross Margin (in crores)
      result.grossMargin.push(pnlAggregated.grossMargin[yearIndex] || 0);

      // EBITDA (in crores)
      result.ebitda.push(pnlAggregated.ebitda[yearIndex] || 0);

      // PAT (in crores)
      result.pat.push(pnlAggregated.pat[yearIndex] || 0);

      // RoCE percentage
      const roceData = calc.returns.roceByYear.find(
        (item) => item.year === year
      );
      result.rocePercentage.push(roceData?.roce ? roceData.roce * 100 : 0);
    }

    return result;
  }


  // ============================================================================
  // WEIGHTED AVERAGE CALCULATIONS
  // ============================================================================

  /**
   * Build weighted average price per kg across all SKUs
   */
  static buildWeightedAvgPricePerKg(
    bySku: SkuCalcOutput[],
    volumes: { year: number; volumePieces: number; weightKg: number }[]
  ): PriceYear[] {
    const years = CALCULATION_CONFIG.YEARS;
    const out: PriceYear[] = [];

    for (let year = 1; year <= years; year += 1) {
      const idx = year - 1;
      const yearVolumes = volumes[idx];
      const totalWeightKg = yearVolumes?.weightKg || 0;

      if (totalWeightKg <= 0) {
        // Fallback to first SKU if no weight
        const firstSku = bySku[0];
        if (firstSku?.prices[idx]) {
          out.push(firstSku.prices[idx]);
        }
        continue;
      }

      // Calculate weighted averages for each price component
      let rmPerKg = 0;
      let mbPerKg = 0;
      let valueAddPerKg = 0;
      let packagingPerKg = 0;
      let freightOutPerKg = 0;
      let conversionPerKg = 0;

      for (const sku of bySku) {
        const skuPrice = sku.prices[idx];
        const skuVolume = sku.volumes[idx];

        if (!skuPrice || !skuVolume) continue;

        const weight = skuVolume.weightKg;
        const weightRatio = weight / totalWeightKg;

        rmPerKg += skuPrice.perKg.rmPerKg * weightRatio;
        mbPerKg += skuPrice.perKg.mbPerKg * weightRatio;
        valueAddPerKg += skuPrice.perKg.valueAddPerKg * weightRatio;
        packagingPerKg += skuPrice.perKg.packagingPerKg * weightRatio;
        freightOutPerKg += skuPrice.perKg.freightOutPerKg * weightRatio;
        conversionPerKg += skuPrice.perKg.conversionPerKg * weightRatio;
      }

      const totalPerKg = rmPerKg + mbPerKg + valueAddPerKg + packagingPerKg +
        freightOutPerKg + conversionPerKg;

      // Calculate weighted average price per piece
      let pricePerPiece = 0;
      for (const sku of bySku) {
        const skuPrice = sku.prices[idx];
        const skuVolume = sku.volumes[idx];

        if (!skuPrice || !skuVolume) continue;

        const weight = skuVolume.weightKg;
        const weightRatio = weight / totalWeightKg;
        pricePerPiece += skuPrice.pricePerPiece * weightRatio;
      }

      const perKg: PriceComponentsPerKg = {
        rmPerKg,
        mbPerKg,
        valueAddPerKg,
        packagingPerKg,
        freightOutPerKg,
        conversionPerKg,
        totalPerKg,
      };

      out.push({ year, perKg, pricePerPiece });
    }

    return out;
  }

  /**
   * Build weighted average price per kg table with P&L data
   */
  static buildWeightedAvgPricePerKgTable(
    bySku: SkuCalcOutput[],
    _pnl: PnlYear[],
    _volumes: { year: number; volumePieces: number; weightKg: number }[]
  ): WeightedAvgPricePerKgYear[] {
    // Suppress unused param warnings while keeping signature compatible with callers
    void _pnl; void _volumes;
    const years = CALCULATION_CONFIG.YEARS;
    const out: WeightedAvgPricePerKgYear[] = [];

    // Establish baseline (Y1) weight shares across SKUs to make per-kg mix-invariant
    const baselineWeights = bySku.map((s) => s.volumes?.[0]?.weightKg || 0);
    const totalBaselineWeight = baselineWeights.reduce((sum, w) => sum + w, 0);

    for (let year = 1; year <= years; year += 1) {
      const idx = year - 1;

      // If no baseline weight (edge case), fall back to current year's total to avoid division by zero
      const fallbackTotalWeight = bySku.reduce((sum, s) => sum + (s.volumes?.[idx]?.weightKg || 0), 0);
      const denom = totalBaselineWeight > 0 ? totalBaselineWeight : fallbackTotalWeight;

      if (denom <= 0) {
        out.push({
          year,
          revenueNetPerKg: 0,
          materialCostPerKg: 0,
          materialMarginPerKg: 0,
          conversionCostPerKg: 0,
          grossMarginPerKg: 0,
          sgaCostPerKg: 0,
          ebitdaPerKg: 0,
          depreciationPerKg: 0,
          ebitPerKg: 0,
          interestPerKg: 0,
          pbtPerKg: 0,
          patPerKg: 0,
        });
        continue;
      }

      let revenueNetPerKg = 0;
      let materialCostPerKg = 0;
      let materialMarginPerKg = 0;
      let conversionCostPerKg = 0;
      let grossMarginPerKg = 0;
      let sgaCostPerKg = 0;
      let ebitdaPerKg = 0;
      let depreciationPerKg = 0;
      let ebitPerKg = 0;
      let interestPerKg = 0;
      let pbtPerKg = 0;
      let patPerKg = 0;

      for (let j = 0; j < bySku.length; j += 1) {
        const sku = bySku[j];
        const y = sku.pnl?.[idx];
        const wkg = sku.volumes?.[idx]?.weightKg || 0;
        const baseW = (totalBaselineWeight > 0 ? baselineWeights[j] : (sku.volumes?.[idx]?.weightKg || 0));
        const share = baseW / denom;

        if (!y || wkg <= 0 || share <= 0) continue;

        const rNetKg = y.revenueNet / wkg;
        const matCostKg = y.materialCost / wkg;
        const matMarginKg = y.materialMargin / wkg;
        const convCostKg = y.conversionCost / wkg;
        const grossMarginKg = y.grossMargin / wkg;
        const sgaKg = y.sgaCost / wkg;
        const ebitdaKg = y.ebitda / wkg;
        const depKg = y.depreciation / wkg;
        const ebitKg = y.ebit / wkg;
        const interestKg = y.interestCapex / wkg;
        const pbtKg = y.pbt / wkg;
        const patKg = y.pat / wkg;

        revenueNetPerKg += rNetKg * share;
        materialCostPerKg += matCostKg * share;
        materialMarginPerKg += matMarginKg * share;
        conversionCostPerKg += convCostKg * share;
        grossMarginPerKg += grossMarginKg * share;
        sgaCostPerKg += sgaKg * share;
        ebitdaPerKg += ebitdaKg * share;
        depreciationPerKg += depKg * share;
        ebitPerKg += ebitKg * share;
        interestPerKg += interestKg * share;
        pbtPerKg += pbtKg * share;
        patPerKg += patKg * share;
      }

      out.push({
        year,
        revenueNetPerKg,
        materialCostPerKg,
        materialMarginPerKg,
        conversionCostPerKg,
        grossMarginPerKg,
        sgaCostPerKg,
        ebitdaPerKg,
        depreciationPerKg,
        ebitPerKg,
        interestPerKg,
        pbtPerKg,
        patPerKg,
      });
    }

    return out;
  }

  /**
   * IRR calculation function
   */
  static irr(cashflows: number[], guess = 0.1): number | null {
    // Newton-Raphson IRR; returns null if not converged
    const maxIter = 100;
    const tol = 1e-7;
    let rate = guess;
    for (let iter = 0; iter < maxIter; iter += 1) {
      let npv = 0;
      let dNpv = 0; // derivative
      for (let t = 0; t < cashflows.length; t += 1) {
        const cf = cashflows[t];
        const denom = (1 + rate) ** t;
        npv += cf / denom;
        if (t > 0) {
          dNpv += (-t * cf) / ((1 + rate) ** (t + 1));
        }
      }
      if (Math.abs(dNpv) < 1e-12) return null;
      const newRate = rate - npv / dNpv;
      if (!Number.isFinite(newRate)) return null;
      if (Math.abs(newRate - rate) < tol) return newRate;
      rate = newRate;
    }
    return null;
  }
}
