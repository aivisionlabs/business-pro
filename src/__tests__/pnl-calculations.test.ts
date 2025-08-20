import {
  calculateRevenueNet,
  calculateMaterialCost,
  calculateMaterialMargin,
  calculateConversionCost,
  calculateGrossMargin,
  calculateSgaCost,
  calculateEbitda,
  calculateDepreciation,
  calculateEbit,
  calculateInterest,
  calculatePbt,
  calculateTax,
  calculatePat,
  calculateRevenueNetPerKg,
  calculateMaterialCostPerKg,
  calculateMaterialMarginPerKg,
  calculateConversionCostPerKg,
  calculateGrossMarginPerKg,
  calculateSgaCostPerKg,
  calculateEbitdaPerKg,
  calculateDepreciationPerKg,
  calculateEbitPerKg,
  calculateInterestPerKg,
  calculateTaxPerKg,
  calculatePbtPerKg,
  calculatePatPerKg,
  calculateTotalDepreciation,
  waPerKg,
  waRevenuePerKg,
} from '@/lib/calc/pnl-calculations';
import { BusinessCase, Sku, CalcOutput, PnlYear, WeightedAvgPricePerKgYear, YearVolumes } from '@/lib/types';

// Test data factory functions
function createTestPnlYear(year: number): PnlYear {
  return {
    year,
    revenueGross: 1000000,
    revenueNet: 950000,
    materialCost: 400000,
    materialMargin: 550000,
    powerCost: 50000,
    manpowerCost: 80000,
    valueAddCost: 20000,
    packagingCost: 30000,
    freightOutCost: 25000,
    conversionRecoveryCost: 15000,
    rAndMCost: 10000,
    otherMfgCost: 15000,
    plantSgaCost: 40000,
    corpSgaCost: 35000,
    sgaCost: 75000,
    conversionCost: 200000,
    grossMargin: 750000,
    ebitda: 675000,
    depreciation: 50000,
    ebit: 625000,
    interestCapex: 25000,
    pbt: 600000,
    tax: 150000,
    pat: 450000,
  };
}

function createTestWeightedAvgPricePerKgYear(year: number): WeightedAvgPricePerKgYear {
  return {
    year,
    revenueNetPerKg: 95,
    materialCostPerKg: 40,
    materialMarginPerKg: 55,
    conversionCostPerKg: 20,
    grossMarginPerKg: 75,
    sgaCostPerKg: 7.5,
    ebitdaPerKg: 67.5,
    depreciationPerKg: 5,
    ebitPerKg: 62.5,
    pbtPerKg: 60,
    patPerKg: 45,
  };
}

function createTestYearVolumes(year: number): YearVolumes {
  return {
    year,
    volumePieces: 10000,
    weightKg: 1000,
  };
}

function createTestSku(): Sku {
  return {
    id: 'test-sku-1',
    name: 'Test SKU',
    sales: {
      productWeightGrams: 100,
      baseAnnualVolumePieces: 10000,
      conversionRecoveryRsPerPiece: 0.5,
    },
    npd: {
      machineName: 'Test Machine',
      cavities: 4,
      cycleTimeSeconds: 30,
      plant: 'Test Plant',
      polymer: 'PP',
      masterbatch: 'Black',
    },
    ops: {
      powerUnitsPerHour: 10,
      automation: true,
      manpowerCount: 2,
      oee: 0.85,
      operatingHoursPerDay: 24,
      workingDaysPerYear: 365,
      shiftsPerDay: 3,
      machineAvailable: true,
      newMachineRequired: true,
      newMouldRequired: true,
      newInfraRequired: true,
      costOfNewMachine: 2000000,
      costOfOldMachine: 0,
      costOfNewMould: 500000,
      costOfOldMould: 0,
      costOfNewInfra: 300000,
      costOfOldInfra: 0,
      lifeOfNewMachineYears: 15,
      lifeOfNewMouldYears: 15,
      lifeOfNewInfraYears: 30,
    },
    costing: {
      resinRsPerKg: 80,
      freightInwardsRsPerKg: 5,
      resinDiscountPct: 0.05,
      mbRsPerKg: 120,
      valueAddRsPerPiece: 2.0,
      packagingRsPerKg: 15,
      freightOutRsPerKg: 8,
      wastagePct: 0.02,
      mbRatioPct: 0.1,
      conversionInflationPct: [0, 0.03, 0.06, 0.09, 0.12],
      rmInflationPct: [0, 0.04, 0.08, 0.12, 0.16],
      useMbPriceOverride: false,
    },
    capex: {
      machineCost: 2000000,
      infraCost: 300000,
      workingCapitalDays: 45,
      usefulLifeMachineYears: 15,
      usefulLifeMouldYears: 15,
      usefulLifeInfraYears: 30,
      investmentRequired: true,
    },
    plantMaster: {
      plant: 'Test Plant',
      manpowerRatePerShift: 500,
      powerRatePerUnit: 8,
      rAndMPerKg: 2,
      otherMfgPerKg: 1.5,
      plantSgaPerKg: 3,
      corpSgaPerKg: 2.5,
      conversionPerKg: 25.80,
      sellingGeneralAndAdministrativeExpensesPerKg: 5.5,
    },
  };
}

function createTestScenario(): BusinessCase {
  return {
    id: 'test-scenario-1',
    name: 'Test Scenario',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    finance: {
      includeCorpSGA: true,
      debtPct: 0.6,
      costOfDebtPct: 0.12,
      costOfEquityPct: 0.18,
      corporateTaxRatePct: 0.25,
    },
    skus: [createTestSku()],
  };
}

function createTestCalcOutput(): CalcOutput {
  return {
    volumes: [createTestYearVolumes(1), createTestYearVolumes(2)],
    prices: [],
    pnl: [createTestPnlYear(1), createTestPnlYear(2)],
    weightedAvgPricePerKg: [createTestWeightedAvgPricePerKgYear(1), createTestWeightedAvgPricePerKgYear(2)],
    cashflow: [],
    returns: {
      wacc: 0.15,
      npv: 1000000,
      irr: 0.25,
      paybackYears: 3,
      roceByYear: [],
    },
    bySku: [
      {
        skuId: 'test-sku-1',
        name: 'Test SKU',
        volumes: [createTestYearVolumes(1), createTestYearVolumes(2)],
        prices: [
          {
            year: 1,
            perKg: {
              rmPerKg: 40,
              mbPerKg: 12,
              valueAddPerKg: 20,
              packagingPerKg: 15,
              freightOutPerKg: 8,
              conversionPerKg: 25.8,
              totalPerKg: 120.8,
            },
            pricePerPiece: 12.08,
          },
          {
            year: 2,
            perKg: {
              rmPerKg: 41.6,
              mbPerKg: 12.48,
              valueAddPerKg: 20.6,
              packagingPerKg: 15.45,
              freightOutPerKg: 8.24,
              conversionPerKg: 26.57,
              totalPerKg: 124.34,
            },
            pricePerPiece: 12.43,
          },
        ],
        pnl: [createTestPnlYear(1), createTestPnlYear(2)],
      },
    ],
  };
}

describe('pnl-calculations', () => {
  describe('Basic P&L calculations', () => {
    let calc: CalcOutput;
    let scenario: BusinessCase;

    beforeEach(() => {
      calc = createTestCalcOutput();
      scenario = createTestScenario();
    });

    describe('calculateRevenueNet', () => {
      it('should return revenue net for valid year', () => {
        const result = calculateRevenueNet(calc, 1);
        expect(result).toBe(950000);
      });

      it('should return 0 for invalid year', () => {
        const result = calculateRevenueNet(calc, 10);
        expect(result).toBe(0);
      });

      it('should return 0 for year 0', () => {
        const result = calculateRevenueNet(calc, 0);
        expect(result).toBe(0);
      });
    });

    describe('calculateMaterialCost', () => {
      it('should return material cost for valid year', () => {
        const result = calculateMaterialCost(calc, 1);
        expect(result).toBe(400000);
      });

      it('should return 0 for invalid year', () => {
        const result = calculateMaterialCost(calc, 10);
        expect(result).toBe(0);
      });
    });

    describe('calculateMaterialMargin', () => {
      it('should calculate material margin correctly', () => {
        const result = calculateMaterialMargin(calc, 1);
        expect(result).toBe(550000); // 950000 - 400000
      });

      it('should return 0 when both values are 0', () => {
        const emptyCalc = { ...calc, pnl: [{ ...calc.pnl[0], revenueNet: 0, materialCost: 0 }] };
        const result = calculateMaterialMargin(emptyCalc, 1);
        expect(result).toBe(0);
      });
    });

    describe('calculateConversionCost', () => {
      it('should return conversion cost for valid year', () => {
        const result = calculateConversionCost(calc, 1);
        expect(result).toBe(200000);
      });

      it('should return 0 for invalid year', () => {
        const result = calculateConversionCost(calc, 10);
        expect(result).toBe(0);
      });
    });

    describe('calculateGrossMargin', () => {
      it('should calculate gross margin correctly', () => {
        const result = calculateGrossMargin(calc, 1);
        // The function calculates: revenueNet - materialCost - conversionCost
        // 950000 - 400000 - 200000 = 350000
        expect(result).toBe(350000);
      });

      it('should handle zero values correctly', () => {
        const emptyCalc = { ...calc, pnl: [{ ...calc.pnl[0], revenueNet: 0, materialCost: 0, conversionCost: 0 }] };
        const result = calculateGrossMargin(emptyCalc, 1);
        expect(result).toBe(0);
      });
    });

    describe('calculateSgaCost', () => {
      it('should return SGA cost for valid year', () => {
        const result = calculateSgaCost(calc, 1);
        expect(result).toBe(75000);
      });

      it('should return 0 for invalid year', () => {
        const result = calculateSgaCost(calc, 10);
        expect(result).toBe(0);
      });
    });

    describe('calculateEbitda', () => {
      it('should return EBITDA for valid year', () => {
        const result = calculateEbitda(calc, 1);
        expect(result).toBe(675000);
      });

      it('should return 0 for invalid year', () => {
        const result = calculateEbitda(calc, 10);
        expect(result).toBe(0);
      });
    });
  });

  describe('Depreciation calculations', () => {
    let scenario: BusinessCase;

    beforeEach(() => {
      scenario = createTestScenario();
    });

    describe('calculateDepreciation', () => {
      it('should calculate total depreciation across all SKUs', () => {
        const result = calculateDepreciation(scenario);

        // Expected calculation:
        // Machine: 2000000 / 15 = 133,333.33
        // Mould: 500000 / 15 = 33,333.33
        // Infra: 300000 / 30 = 10,000
        // Total: 133,333.33 + 33,333.33 + 10,000 = 176,666.67
        expect(result).toBeCloseTo(176666.67, 0);
      });

      it('should handle SKUs with zero costs', () => {
        const zeroCostSku = createTestSku();
        zeroCostSku.ops.costOfNewMachine = 0;
        zeroCostSku.ops.costOfNewMould = 0;
        zeroCostSku.ops.costOfNewInfra = 0;

        const zeroCostScenario = { ...scenario, skus: [zeroCostSku] };
        const result = calculateDepreciation(zeroCostScenario);
        expect(result).toBe(0);
      });

      it('should handle missing life years with defaults', () => {
        const defaultLifeSku = createTestSku();
        delete defaultLifeSku.ops.lifeOfNewMachineYears;
        delete defaultLifeSku.ops.lifeOfNewMouldYears;
        delete defaultLifeSku.ops.lifeOfNewInfraYears;

        const defaultLifeScenario = { ...scenario, skus: [defaultLifeSku] };
        const result = calculateDepreciation(defaultLifeScenario);

        // Should use defaults: 15, 15, 30 years
        expect(result).toBeCloseTo(176666.67, 0);
      });
    });

    describe('calculateTotalDepreciation', () => {
      it('should calculate total depreciation for a single SKU', () => {
        const sku = createTestSku();
        const result = calculateTotalDepreciation(sku);

        // Same calculation as above but for single SKU
        expect(result).toBeCloseTo(176666.67, 0);
      });

      it('should handle zero costs', () => {
        const zeroCostSku = createTestSku();
        zeroCostSku.ops.costOfNewMachine = 0;
        zeroCostSku.ops.costOfOldMachine = 0;
        zeroCostSku.ops.costOfNewMould = 0;
        zeroCostSku.ops.costOfOldMould = 0;
        zeroCostSku.ops.costOfNewInfra = 0;
        zeroCostSku.ops.costOfOldInfra = 0;

        const result = calculateTotalDepreciation(zeroCostSku);
        expect(result).toBe(0);
      });
    });
  });

  describe('EBIT and Interest calculations', () => {
    let calc: CalcOutput;
    let scenario: BusinessCase;

    beforeEach(() => {
      calc = createTestCalcOutput();
      scenario = createTestScenario();
    });

    describe('calculateEbit', () => {
      it('should calculate EBIT correctly', () => {
        const result = calculateEbit(calc, 1, scenario);

        // EBITDA: 675000, Depreciation: ~176667
        // EBIT = EBITDA - Depreciation
        expect(result).toBeCloseTo(498333.33, 0);
      });

      it('should handle zero depreciation', () => {
        const zeroDepScenario = createTestScenario();
        zeroDepScenario.skus[0].ops.costOfNewMachine = 0;
        zeroDepScenario.skus[0].ops.costOfNewMould = 0;
        zeroDepScenario.skus[0].ops.costOfNewInfra = 0;

        const result = calculateEbit(calc, 1, zeroDepScenario);
        expect(result).toBe(675000); // Should equal EBITDA
      });
    });

    describe('calculateInterest', () => {
      it('should calculate interest correctly', () => {
        const result = calculateInterest(scenario, calc, 1);

        // Total Capex: 2000000 + 300000 = 2300000
        // Working Capital: 950000 * (45/365) = 117,123.29
        // Total Investment: 2300000 + 117,123.29 = 2,417,123.29
        // Interest: 2,417,123.29 * 0.12 = 290,054.79
        // But the function uses max(60, 45) = 60 days minimum
        const expectedWorkingCapital = 950000 * (60 / 365);
        const expectedTotalInvestment = 2300000 + expectedWorkingCapital;
        const expectedInterest = expectedTotalInvestment * 0.12;

        expect(result).toBeCloseTo(expectedInterest, 0);
      });

      it('should use minimum working capital days of 60', () => {
        const lowWorkingCapitalSku = createTestSku();
        lowWorkingCapitalSku.capex.workingCapitalDays = 30; // Below minimum

        const lowWorkingCapitalScenario = { ...scenario, skus: [lowWorkingCapitalSku] };
        const result = calculateInterest(lowWorkingCapitalScenario, calc, 1);

        // Should use 60 days minimum
        const expectedWorkingCapital = 950000 * (60 / 365);
        const expectedTotalInvestment = 2300000 + expectedWorkingCapital;
        const expectedInterest = expectedTotalInvestment * 0.12;

        expect(result).toBeCloseTo(expectedInterest, 0);
      });

      it('should handle zero capex', () => {
        const zeroCapexSku = createTestSku();
        zeroCapexSku.ops.costOfNewMachine = 0;
        zeroCapexSku.ops.costOfNewInfra = 0;

        const zeroCapexScenario = { ...scenario, skus: [zeroCapexSku] };
        const result = calculateInterest(zeroCapexScenario, calc, 1);

        // Only working capital interest, using 60 days minimum
        const workingCapitalInvestment = 950000 * (60 / 365);
        const expectedInterest = workingCapitalInvestment * 0.12;

        expect(result).toBeCloseTo(expectedInterest, 0);
      });
    });
  });

  describe('PBT, Tax, and PAT calculations', () => {
    let calc: CalcOutput;
    let scenario: BusinessCase;

    beforeEach(() => {
      calc = createTestCalcOutput();
      scenario = createTestScenario();
    });

    describe('calculatePbt', () => {
      it('should calculate PBT correctly', () => {
        const result = calculatePbt(calc, 1, scenario);

        // EBIT: ~498333, Interest: ~294740 (using 60 days working capital)
        // PBT = EBIT - Interest
        const ebit = calculateEbit(calc, 1, scenario);
        const interest = calculateInterest(scenario, calc, 1);
        const expectedPbt = ebit - interest;

        expect(result).toBeCloseTo(expectedPbt, 0);
      });
    });

    describe('calculateTax', () => {
      it('should calculate tax correctly', () => {
        const result = calculateTax(calc, 1, scenario);

        // The function recalculates PBT internally, so we need to match that logic
        const ebitda = calculateEbitda(calc, 1);
        const depreciation = calculateDepreciation(scenario);
        const ebit = ebitda - depreciation;
        const interest = calculateInterest(scenario, calc, 1);
        const pbt = ebit - interest;
        const expectedTax = pbt * scenario.finance.corporateTaxRatePct;

        expect(result).toBeCloseTo(expectedTax, 0);
      });

      it('should handle zero PBT', () => {
        const zeroEbitdaCalc = { ...calc, pnl: [{ ...calc.pnl[0], ebitda: 0 }] };
        const result = calculateTax(zeroEbitdaCalc, 1, scenario);

        // When EBITDA is 0, PBT will be negative due to depreciation and interest
        // Tax will be negative * tax rate
        expect(result).toBeLessThan(0);
      });
    });

    describe('calculatePat', () => {
      it('should calculate PAT correctly', () => {
        const result = calculatePat(calc, 1, scenario);

        // PAT = PBT - Tax
        const pbt = calculatePbt(calc, 1, scenario);
        const tax = calculateTax(calc, 1, scenario);
        const expectedPat = pbt - tax;

        expect(result).toBeCloseTo(expectedPat, 0);
      });

      it('should handle zero tax', () => {
        const zeroTaxScenario = { ...scenario, finance: { ...scenario.finance, corporateTaxRatePct: 0 } };
        const result = calculatePat(calc, 1, zeroTaxScenario);

        // PAT should equal PBT when tax rate is 0
        const pbt = calculatePbt(calc, 1, zeroTaxScenario);
        expect(result).toBeCloseTo(pbt, 0);
      });
    });
  });

  describe('Per-kg P&L calculations', () => {
    let calc: CalcOutput;

    beforeEach(() => {
      calc = createTestCalcOutput();
    });

    describe('calculateRevenueNetPerKg', () => {
      it('should return revenue net per kg for valid year index', () => {
        const result = calculateRevenueNetPerKg(calc, 0);
        expect(result).toBe(95);
      });

      it('should return 0 for invalid year index', () => {
        const result = calculateRevenueNetPerKg(calc, 10);
        expect(result).toBe(0);
      });
    });

    describe('calculateMaterialCostPerKg', () => {
      it('should return material cost per kg for valid year index', () => {
        const result = calculateMaterialCostPerKg(calc, 0);
        expect(result).toBe(40);
      });
    });

    describe('calculateMaterialMarginPerKg', () => {
      it('should return material margin per kg for valid year index', () => {
        const result = calculateMaterialMarginPerKg(calc, 0);
        expect(result).toBe(55);
      });
    });

    describe('calculateConversionCostPerKg', () => {
      it('should return conversion cost per kg for valid year index', () => {
        const result = calculateConversionCostPerKg(calc, 0);
        expect(result).toBe(20);
      });
    });

    describe('calculateGrossMarginPerKg', () => {
      it('should calculate gross margin per kg correctly', () => {
        const result = calculateGrossMarginPerKg(calc, 0);
        // The function calculates: revenueNetPerKg - materialCostPerKg - conversionCostPerKg
        // 95 - 40 - 20 = 35
        expect(result).toBe(35);
      });
    });

    describe('calculateSgaCostPerKg', () => {
      it('should return SGA cost per kg for valid year index', () => {
        const result = calculateSgaCostPerKg(calc, 0);
        expect(result).toBe(7.5);
      });
    });

    describe('calculateEbitdaPerKg', () => {
      it('should return EBITDA per kg for valid year index', () => {
        const result = calculateEbitdaPerKg(calc, 0);
        expect(result).toBe(67.5);
      });
    });
  });

  describe('Per-kg calculations with aggregated P&L', () => {
    let calc: CalcOutput;
    let scenario: BusinessCase;

    beforeEach(() => {
      calc = createTestCalcOutput();
      scenario = createTestScenario();
    });

    describe('calculateDepreciationPerKg', () => {
      it('should calculate depreciation per kg correctly', () => {
        const pnlAggregated = { depreciation: [176666.67, 176666.67] };
        const result = calculateDepreciationPerKg(calc, 0, pnlAggregated);

        // 176666.67 / 1000 = 176.67
        expect(result).toBeCloseTo(176.67, 2);
      });

      it('should return 0 when total weight is 0', () => {
        const zeroWeightCalc = { ...calc, volumes: [{ ...calc.volumes[0], weightKg: 0 }] };
        const pnlAggregated = { depreciation: [176666.67] };
        const result = calculateDepreciationPerKg(zeroWeightCalc, 0, pnlAggregated);
        expect(result).toBe(0);
      });
    });

    describe('calculateEbitPerKg', () => {
      it('should calculate EBIT per kg correctly', () => {
        const pnlAggregated = { ebit: [498333.33, 498333.33] };
        const result = calculateEbitPerKg(calc, 0, pnlAggregated);

        // 498333.33 / 1000 = 498.33
        expect(result).toBeCloseTo(498.33, 2);
      });
    });

    describe('calculateInterestPerKg', () => {
      it('should calculate interest per kg correctly', () => {
        const pnlAggregated = { interest: [290054.79, 290054.79] };
        const result = calculateInterestPerKg(calc, 0, pnlAggregated);

        // 290054.79 / 1000 = 290.05
        expect(result).toBeCloseTo(290.05, 2);
      });
    });

    describe('calculateTaxPerKg', () => {
      it('should calculate tax per kg correctly', () => {
        const pnlAggregated = { tax: [52069.58, 52069.58] };
        const result = calculateTaxPerKg(calc, 0, pnlAggregated);

        // 52069.58 / 1000 = 52.07
        expect(result).toBeCloseTo(52.07, 2);
      });
    });

    describe('calculatePbtPerKg', () => {
      it('should calculate PBT per kg correctly', () => {
        const pnlAggregated = { pbt: [208278.33, 208278.33] };
        const result = calculatePbtPerKg(calc, 0, pnlAggregated);

        // 208278.33 / 1000 = 208.28
        expect(result).toBeCloseTo(208.28, 2);
      });
    });

    describe('calculatePatPerKg', () => {
      it('should calculate PAT per kg correctly', () => {
        const pnlAggregated = { pat: [156208.75, 156208.75] };
        const result = calculatePatPerKg(calc, 0, pnlAggregated);

        // 156208.75 / 1000 = 156.21
        expect(result).toBeCloseTo(156.21, 2);
      });
    });
  });

  describe('Weighted average calculations', () => {
    let calc: CalcOutput;

    beforeEach(() => {
      calc = createTestCalcOutput();
    });

    describe('waPerKg', () => {
      it('should calculate weighted average per kg correctly', () => {
        const result = waPerKg(calc, 0, 'rmPerKg');

        // Single SKU with weight 1000 and rmPerKg 40
        // Result should be 40
        expect(result).toBe(40);
      });

      it('should handle multiple SKUs with different weights', () => {
        const multiSkuCalc = {
          ...calc,
          bySku: [
            {
              ...calc.bySku![0],
              volumes: [{ ...calc.volumes[0], weightKg: 600 }],
              prices: [{ ...calc.bySku![0].prices[0], perKg: { ...calc.bySku![0].prices[0].perKg, rmPerKg: 30 } }],
            },
            {
              ...calc.bySku![0],
              skuId: 'test-sku-2',
              volumes: [{ ...calc.volumes[0], weightKg: 400 }],
              prices: [{ ...calc.bySku![0].prices[0], perKg: { ...calc.bySku![0].prices[0].perKg, rmPerKg: 50 } }],
            },
          ],
        };

        const result = waPerKg(multiSkuCalc, 0, 'rmPerKg');

        // Weighted average: (30 * 600 + 50 * 400) / (600 + 400) = 38
        expect(result).toBe(38);
      });

      it('should return 0 when no valid data', () => {
        const emptyCalc = { ...calc, bySku: [] };
        const result = waPerKg(emptyCalc, 0, 'rmPerKg');
        expect(result).toBe(0);
      });

      it('should handle zero weights', () => {
        const zeroWeightCalc = {
          ...calc,
          bySku: [{ ...calc.bySku![0], volumes: [{ ...calc.volumes[0], weightKg: 0 }] }],
        };
        const result = waPerKg(zeroWeightCalc, 0, 'rmPerKg');
        expect(result).toBe(0);
      });
    });

    describe('waRevenuePerKg', () => {
      it('should calculate weighted average revenue per kg correctly', () => {
        const result = waRevenuePerKg(calc, 0);

        // Single SKU with components: 40 + 12 + 20 + 15 + 8 + 25.8 = 120.8
        // But the function only sums: rmPerKg + mbPerKg + packagingPerKg + freightOutPerKg + conversionPerKg
        // 40 + 12 + 15 + 8 + 25.8 = 100.8 (excluding valueAddPerKg)
        expect(result).toBe(100.8);
      });

      it('should handle multiple SKUs with different weights', () => {
        const multiSkuCalc = {
          ...calc,
          bySku: [
            {
              ...calc.bySku![0],
              volumes: [{ ...calc.volumes[0], weightKg: 600 }],
              prices: [{ ...calc.bySku![0].prices[0], perKg: { ...calc.bySku![0].prices[0].perKg, rmPerKg: 30 } }],
            },
            {
              ...calc.bySku![0],
              skuId: 'test-sku-2',
              volumes: [{ ...calc.volumes[0], weightKg: 400 }],
              prices: [{ ...calc.bySku![0].prices[0], perKg: { ...calc.bySku![0].prices[0].perKg, rmPerKg: 50 } }],
            },
          ],
        };

        const result = waRevenuePerKg(multiSkuCalc, 0);

        // First SKU: 30 + 12 + 15 + 8 + 25.8 = 90.8
        // Second SKU: 50 + 12 + 15 + 8 + 25.8 = 110.8
        // Weighted average: (90.8 * 600 + 110.8 * 400) / 1000 = 98.8
        expect(result).toBe(98.8);
      });

      it('should return 0 when no valid data', () => {
        const emptyCalc = { ...calc, bySku: [] };
        const result = waRevenuePerKg(emptyCalc, 0);
        expect(result).toBe(0);
      });

      it('should handle zero weights', () => {
        const zeroWeightCalc = {
          ...calc,
          bySku: [{ ...calc.bySku![0], volumes: [{ ...calc.volumes[0], weightKg: 0 }] }],
        };
        const result = waRevenuePerKg(zeroWeightCalc, 0);
        expect(result).toBe(0);
      });
    });
  });

  describe('Edge cases and error handling', () => {
    let calc: CalcOutput;
    let scenario: BusinessCase;

    beforeEach(() => {
      calc = createTestCalcOutput();
      scenario = createTestScenario();
    });

    it('should handle missing SKU operations data', () => {
      const incompleteSku = createTestSku();
      delete incompleteSku.ops.costOfNewMachine;
      delete incompleteSku.ops.costOfNewMould;
      delete incompleteSku.ops.costOfNewInfra;

      const incompleteScenario = { ...scenario, skus: [incompleteSku] };
      const result = calculateDepreciation(incompleteScenario);
      expect(result).toBe(0);
    });

    it('should handle missing finance data gracefully', () => {
      const incompleteScenario = { ...scenario, finance: { ...scenario.finance, costOfDebtPct: 0 } };
      const result = calculateInterest(incompleteScenario, calc, 1);
      expect(result).toBe(0);
    });

    it('should handle zero values in calculations', () => {
      const zeroCalc = {
        ...calc,
        pnl: [{ ...calc.pnl[0], revenueNet: 0, materialCost: 0, conversionCost: 0 }]
      };
      const result = calculateGrossMargin(zeroCalc, 1);
      expect(result).toBe(0);
    });

    it('should handle negative values in calculations', () => {
      const negativeCalc = {
        ...calc,
        pnl: [{ ...calc.pnl[0], revenueNet: -1000, materialCost: 500, conversionCost: 200 }]
      };
      const result = calculateGrossMargin(negativeCalc, 1);
      expect(result).toBe(-1700); // -1000 - 500 - 200
    });
  });
});
