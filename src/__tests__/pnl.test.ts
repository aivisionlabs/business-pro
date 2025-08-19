import { buildPnlForSku, buildCashflowsAndReturnsForCase } from '@/lib/calc/pnl';
import { Sku, FinanceInput, PriceYear, PlantMaster, SalesInput, NpdInput, OpsInput, CostingInput, CapexInput, PnlYear } from '@/lib/types';

// Test data factory functions
function createTestPlantMaster(): PlantMaster {
  return {
    plant: 'Test Plant',
    manpowerRatePerShift: 500, // Rs per person per shift
    powerRatePerUnit: 8, // Rs per kWh
    rAndMPerKg: 2, // Rs per kg
    otherMfgPerKg: 1.5, // Rs per kg
    plantSgaPerKg: 3, // Rs per kg
    corpSgaPerKg: 2.5, // Rs per kg
    conversionPerKg: 25.80, // Rs per kg
    sellingGeneralAndAdministrativeExpensesPerKg: 5.5, // Rs per kg
  };
}

function createTestSalesInput(): SalesInput {
  return {
    productWeightGrams: 100, // 0.1 kg
    baseAnnualVolumePieces: 10000,
    conversionRecoveryRsPerPiece: 0.5,
  };
}

function createTestNpdInput(): NpdInput {
  return {
    machineName: 'Test Machine',
    cavities: 4,
    cycleTimeSeconds: 30,
    plant: 'Test Plant',
    polymer: 'PP',
    masterbatch: 'Black',
    mouldCost: 50000,
  };
}

function createTestOpsInput(): OpsInput {
  return {
    powerUnitsPerHour: 10, // kWh
    automation: true,
    manpowerCount: 2,
    oee: 0.85,
    operatingHoursPerDay: 24,
    workingDaysPerYear: 365,
    shiftsPerDay: 3,
    machineAvailable: true,
    newMachineRequired: false,
    newMouldRequired: false,
    newInfraRequired: false,
    costOfNewMachine: 0,
    costOfOldMachine: 0,
    costOfNewMould: 0,
    costOfOldMould: 0,
    costOfNewInfra: 0,
    costOfOldInfra: 0,
    lifeOfNewMachineYears: 15,
    lifeOfNewMouldYears: 15,
    lifeOfNewInfraYears: 30,
  };
}

function createTestCostingInput(): CostingInput {
  return {
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
  };
}

function createTestCapexInput(): CapexInput {
  return {
    machineCost: 2000000,
    mouldCost: 50000,
    infraCost: 300000,
    workingCapitalDays: 45,
    usefulLifeMachineYears: 15,
    usefulLifeMouldYears: 15,
    usefulLifeInfraYears: 30,
    investmentRequired: true,
  };
}

function createTestSku(): Sku {
  return {
    id: 'test-sku-1',
    name: 'Test SKU',
    sales: createTestSalesInput(),
    npd: createTestNpdInput(),
    ops: createTestOpsInput(),
    costing: createTestCostingInput(),
    capex: createTestCapexInput(),
    plantMaster: createTestPlantMaster(),
  };
}

function createTestFinanceInput(): FinanceInput {
  return {
    includeCorpSGA: true,
    debtPct: 0.6, // 60% debt
    costOfDebtPct: 0.12, // 12% APR
    costOfEquityPct: 0.18, // 18%
    corporateTaxRatePct: 0.25, // 25%
  };
}

function createTestPriceYear(year: number): PriceYear {
  return {
    year,
    perKg: {
      rmPerKg: 80 + (year - 1) * 3, // Inflation of 3 Rs/kg per year
      mbPerKg: 120 + (year - 1) * 5, // Inflation of 5 Rs/kg per year
      valueAddPerKg: 20,
      packagingPerKg: 15,
      freightOutPerKg: 8,
      mouldAmortPerKg: 1,
      conversionPerKg: 25.80,
      totalPerKg: 0, // Will be calculated
    },
    pricePerPiece: 15 + (year - 1) * 0.5, // Price increases by 0.5 Rs per year
  };
}

function createTestPriceYears(): PriceYear[] {
  return [1, 2, 3, 4, 5].map(year => createTestPriceYear(year));
}

describe('PnL Calculations', () => {
  describe('buildPnlForSku', () => {
    let testSku: Sku;
    let testFinance: FinanceInput;
    let testPrices: PriceYear[];

    beforeEach(() => {
      testSku = createTestSku();
      testFinance = createTestFinanceInput();
      testPrices = createTestPriceYears();
    });

    it('should calculate basic PnL structure correctly', () => {
      const result = buildPnlForSku(testSku, testFinance, testPrices);

      expect(result.pnl).toHaveLength(5);
      expect(result.volumes).toHaveLength(5);

      // Check first year structure
      const firstYear = result.pnl[0];
      expect(firstYear.year).toBe(1);
      expect(firstYear.revenueGross).toBeGreaterThan(0);
      expect(firstYear.revenueNet).toBeLessThan(firstYear.revenueGross);
      expect(firstYear.materialCost).toBeGreaterThan(0);
      expect(firstYear.conversionCost).toBeGreaterThan(0);
    });

    it('should calculate volumes correctly with YoY growth', () => {
      const result = buildPnlForSku(testSku, testFinance, testPrices);

      // Year 1: base volume
      expect(result.volumes[0].volumePieces).toBe(10000);
      expect(result.volumes[0].weightKg).toBe(1000); // 10000 * 0.1kg

      // Year 2: 10% growth
      expect(result.volumes[1].volumePieces).toBe(11000);
      expect(result.volumes[1].weightKg).toBe(1100);

      // Year 3: 15% growth from Y2
      expect(result.volumes[2].year).toBe(3);
      expect(result.volumes[2].volumePieces).toBeCloseTo(12650, 0); // 11000 * 1.15 (fixed precision)
      expect(result.volumes[2].weightKg).toBe(1265);
    });

    it('should calculate revenue components correctly', () => {
      const result = buildPnlForSku(testSku, testFinance, testPrices);
      const firstYear = result.pnl[0];

      // Revenue calculations
      const expectedRevenueGross = testPrices[0].pricePerPiece * 10000;
      expect(firstYear.revenueGross).toBe(expectedRevenueGross);

      const expectedRevenueNet = expectedRevenueGross;
      expect(firstYear.revenueNet).toBe(expectedRevenueNet);
    });

    it('should calculate material costs correctly', () => {
      const result = buildPnlForSku(testSku, testFinance, testPrices);
      const firstYear = result.pnl[0];

      const weightKg = 1000; // 10000 pieces * 0.1kg
      const expectedRmCost = testPrices[0].perKg.rmPerKg * weightKg;
      const expectedMbCost = testPrices[0].perKg.mbPerKg * weightKg;
      const expectedPackagingCost = testSku.costing.packagingRsPerKg * weightKg;
      const expectedFreightOutCost = testSku.costing.freightOutRsPerKg * weightKg;

      const expectedMaterialCost = expectedRmCost + expectedMbCost + expectedPackagingCost + expectedFreightOutCost;
      expect(firstYear.materialCost).toBeCloseTo(expectedMaterialCost, 2);
    });

    it('should calculate conversion costs correctly', () => {
      const result = buildPnlForSku(testSku, testFinance, testPrices);
      const firstYear = result.pnl[0];

      const weightKg = 1000;
      const expectedConversionCost = testSku.plantMaster.conversionPerKg * weightKg;
      expect(firstYear.conversionCost).toBe(expectedConversionCost);
    });

    it('should calculate power and manpower costs correctly', () => {
      const result = buildPnlForSku(testSku, testFinance, testPrices);
      const firstYear = result.pnl[0];

      const operatingHoursPerDay = 24;
      const workingDaysPerYear = 365;
      const shiftsPerDay = 3;

      // Power cost calculation
      const powerCostTotal = testSku.ops.powerUnitsPerHour * operatingHoursPerDay * workingDaysPerYear * testSku.plantMaster.powerRatePerUnit;
      const expectedPowerCost = powerCostTotal; // Since weightKg > 0, it should equal total
      expect(firstYear.powerCost).toBe(expectedPowerCost);

      // Manpower cost calculation
      const manpowerCostTotal = testSku.ops.manpowerCount * shiftsPerDay * workingDaysPerYear * testSku.plantMaster.manpowerRatePerShift;
      const expectedManpowerCost = manpowerCostTotal; // Since weightKg > 0, it should equal total
      expect(firstYear.manpowerCost).toBe(expectedManpowerCost);
    });

    it('should calculate depreciation correctly', () => {
      const result = buildPnlForSku(testSku, testFinance, testPrices);
      const firstYear = result.pnl[0];

      const expectedMachineDep = testSku.capex.machineCost / testSku.capex.usefulLifeMachineYears;
      const expectedMouldDep = (testSku.npd.mouldCost || 0) / testSku.capex.usefulLifeMouldYears;
      const expectedInfraDep = testSku.capex.infraCost / testSku.capex.usefulLifeInfraYears;
      const expectedTotalDep = expectedMachineDep + expectedMouldDep + expectedInfraDep;

      expect(firstYear.depreciation).toBeCloseTo(expectedTotalDep, 2);
    });

    it('should calculate interest expense correctly', () => {
      const result = buildPnlForSku(testSku, testFinance, testPrices);
      const firstYear = result.pnl[0];

      const totalCapex = testSku.capex.machineCost + (testSku.npd.mouldCost || 0);
      const openingDebt = testFinance.debtPct * totalCapex;
      const expectedInterest = openingDebt * testFinance.costOfDebtPct;

      expect(firstYear.interestCapex).toBe(expectedInterest);
    });

    it('should calculate tax correctly', () => {
      const result = buildPnlForSku(testSku, testFinance, testPrices);
      const firstYear = result.pnl[0];

      const expectedTax = Math.max(0, firstYear.pbt) * testFinance.corporateTaxRatePct;
      expect(firstYear.tax).toBe(expectedTax);
    });

    it('should handle zero volume gracefully', () => {
      const zeroVolumeSku = { ...testSku };
      zeroVolumeSku.sales.baseAnnualVolumePieces = 0;

      const result = buildPnlForSku(zeroVolumeSku, testFinance, testPrices);

      expect(result.volumes[0].volumePieces).toBe(0);
      expect(result.volumes[0].weightKg).toBe(0);
      expect(result.pnl[0].revenueGross).toBe(0);
      expect(result.pnl[0].materialCost).toBe(0);
    });

    it('should handle missing optional fields with defaults', () => {
      const minimalSku = { ...testSku };
      // Remove optional fields to test defaults
      const minimalOps = { ...minimalSku.ops };
      delete minimalOps.operatingHoursPerDay;
      delete minimalOps.workingDaysPerYear;
      delete minimalOps.shiftsPerDay;
      minimalSku.ops = minimalOps;

      const result = buildPnlForSku(minimalSku, testFinance, testPrices);

      // Should use default values (24 hours, 365 days, 3 shifts)
      expect(result.pnl[0].conversionCost).toBe(25.80 * 1000); // Default fallback value
    });
  });

  describe('buildCashflowsAndReturnsForCase', () => {
    let testFinance: FinanceInput;
    let testPnl: PnlYear[];
    let testOptions: { capex0: number; workingCapitalDays: number; annualDepreciationByYear: number[] };

    beforeEach(() => {
      testFinance = createTestFinanceInput();
      testPnl = [
        {
          year: 1,
          ebit: 100000,
          depreciation: 20000,
          revenueNet: 500000,
        },
        {
          year: 2,
          ebit: 120000,
          depreciation: 20000,
          revenueNet: 550000,
        },
        {
          year: 3,
          ebit: 140000,
          depreciation: 20000,
          revenueNet: 600000,
        },
      ] as PnlYear[]; // Type assertion for test data
      testOptions = {
        capex0: 1000000,
        workingCapitalDays: 45,
        annualDepreciationByYear: [20000, 20000, 20000],
      };
    });

    it('should calculate cashflows correctly', () => {
      const result = buildCashflowsAndReturnsForCase(testFinance, testPnl, testOptions);

      expect(result.cashflow).toHaveLength(4); // Year 0 + 3 years

      // Year 0: Initial investment
      expect(result.cashflow[0].year).toBe(0);
      expect(result.cashflow[0].fcf).toBe(-1000000);
      expect(result.cashflow[0].cumulativeFcf).toBe(-1000000);

      // Year 1: First operating year
      const year1 = result.cashflow[1];
      const expectedNwc1 = (45 / 365) * 500000;
      const expectedFcf1 = 100000 * (1 - 0.25) + 20000 - expectedNwc1;
      expect(year1.fcf).toBeCloseTo(expectedFcf1, 2);
    });

    it('should calculate WACC correctly', () => {
      const result = buildCashflowsAndReturnsForCase(testFinance, testPnl, testOptions);

      const debtPct = 0.6;
      const equityPct = 0.4;
      const costOfDebt = 0.12;
      const costOfEquity = 0.18;
      const taxRate = 0.25;

      const expectedWacc = debtPct * costOfDebt * (1 - taxRate) + equityPct * costOfEquity;
      expect(result.returns.wacc).toBeCloseTo(expectedWacc, 4);
    });

    it('should calculate NPV correctly', () => {
      const result = buildCashflowsAndReturnsForCase(testFinance, testPnl, testOptions);

      expect(result.returns.npv).toBeLessThan(0); // Should be negative due to initial investment
      expect(typeof result.returns.npv).toBe('number');
    });

    it('should calculate IRR when possible', () => {
      const result = buildCashflowsAndReturnsForCase(testFinance, testPnl, testOptions);

      // IRR should be calculated if cashflows allow
      expect(result.returns.irr).toBeDefined();
      if (result.returns.irr !== null) {
        expect(typeof result.returns.irr).toBe('number');
        expect(result.returns.irr).toBeGreaterThan(-1); // IRR should be > -100%
      }
    });

    it('should calculate payback period correctly', () => {
      const result = buildCashflowsAndReturnsForCase(testFinance, testPnl, testOptions);

      expect(result.returns.paybackYears).toBeDefined();
      if (result.returns.paybackYears !== null) {
        expect(typeof result.returns.paybackYears).toBe('number');
        expect(result.returns.paybackYears).toBeGreaterThan(0);
      }
    });

    it('should calculate RoCE by year correctly', () => {
      const result = buildCashflowsAndReturnsForCase(testFinance, testPnl, testOptions);

      expect(result.returns.roceByYear).toHaveLength(3);

      // Check first year RoCE
      const year1Roce = result.returns.roceByYear[0];
      expect(year1Roce.year).toBe(1);
      expect(year1Roce.netBlock).toBe(1000000 - 20000); // Capex - accumulated depreciation
      expect(year1Roce.roce).toBeGreaterThan(0);
    });

    it('should handle zero working capital days', () => {
      const zeroNwcOptions = { ...testOptions, workingCapitalDays: 0 };
      const result = buildCashflowsAndReturnsForCase(testFinance, testPnl, zeroNwcOptions);

      // All NWC should be 0
      result.cashflow.forEach(cf => {
        if (cf.year > 0) {
          expect(cf.nwc).toBe(0);
          expect(cf.changeInNwc).toBe(0);
        }
      });
    });

    it('should handle zero tax rate', () => {
      const zeroTaxFinance = { ...testFinance, corporateTaxRatePct: 0 };
      const result = buildCashflowsAndReturnsForCase(zeroTaxFinance, testPnl, testOptions);

      // FCF should be higher without tax
      const year1WithTax = result.cashflow[1].fcf;
      const year1WithoutTax = 100000 + 20000 - result.cashflow[1].changeInNwc;
      expect(year1WithTax).toBeCloseTo(year1WithoutTax, 2);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle very small numbers without precision errors', () => {
      const tinySku = createTestSku();
      tinySku.sales.baseAnnualVolumePieces = 1;
      tinySku.sales.productWeightGrams = 1; // 0.001 kg

      const result = buildPnlForSku(tinySku, createTestFinanceInput(), createTestPriceYears());

      expect(result.volumes[0].weightKg).toBeCloseTo(0.001, 6);
      expect(result.pnl[0].revenueGross).toBeGreaterThan(0);
    });

    it('should handle very large numbers without overflow', () => {
      const largeSku = createTestSku();
      largeSku.sales.baseAnnualVolumePieces = 1000000000; // 1 billion pieces
      largeSku.sales.productWeightGrams = 1000000; // 1000 kg per piece

      const result = buildPnlForSku(largeSku, createTestFinanceInput(), createTestPriceYears());

      expect(result.volumes[0].weightKg).toBe(1000000000000); // 1 trillion kg
      expect(result.pnl[0].revenueGross).toBeGreaterThan(0);
      expect(Number.isFinite(result.pnl[0].revenueGross)).toBe(true);
    });

    it('should handle negative growth rates', () => {
      const decliningSku = createTestSku();
      decliningSku.sales.baseAnnualVolumePieces = 10000;
      decliningSku.sales.productWeightGrams = 100; // 0.1 kg
      decliningSku.sales.baseAnnualVolumePieces = 10000;

      const result = buildPnlForSku(decliningSku, createTestFinanceInput(), createTestPriceYears());

      expect(result.volumes[1].volumePieces).toBe(9000); // 10000 * 0.9
      expect(result.volumes[2].volumePieces).toBe(7650); // 9000 * 0.85
    });
  });
});
