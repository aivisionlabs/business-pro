import { calculateScenario } from '@/lib/calc';
import { CalculationEngine } from '@/lib/calc/engines';
import { applyScenario, clone } from '@/lib/calc/scenario';
import { BusinessCase, PlantMaster, Sku } from '@/lib/types';

// Test data factory functions
function createTestPlantMaster(): PlantMaster {
  return {
    plant: 'test-plant',
    manpowerRatePerShift: 1000,
    powerRatePerUnit: 8,
    rAndMPerKg: 2,
    otherMfgPerKg: 1.5,
    plantSgaPerKg: 4,
    corpSgaPerKg: 3.5,
    conversionPerKg: 20,
    sellingGeneralAndAdministrativeExpensesPerKg: 7.5,
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
      cavities: 4,
      cycleTimeSeconds: 30,
      machineName: 'test-machine',
      plant: 'test-plant',
      polymer: 'test-polymer',
      masterbatch: 'test-masterbatch',
    },
    ops: {
      operatingHoursPerDay: 24,
      workingDaysPerYear: 365,
      oee: 0.85,
      newInfraRequired: false,
      newMachineRequired: false,
      newMouldRequired: false,
      costOfNewMachine: 2000000,
      costOfOldMachine: 0,
      costOfNewMould: 500000,
      costOfOldMould: 0,
      costOfNewInfra: 300000,
      costOfOldInfra: 0,
      lifeOfNewMachineYears: 15,
      lifeOfNewMouldYears: 15,
      lifeOfNewInfraYears: 30,
      workingCapitalDays: 60,
    },
    costing: {
      resinRsPerKg: 80,
      resinDiscountPct: 0.05,
      freightInwardsRsPerKg: 5,
      wastagePct: 0.02,
      useMbPriceOverride: false,
      mbRsPerKg: 120,
      valueAddRsPerPiece: 2,
      packagingRsPerKg: 3,
      freightOutRsPerKg: 2.5,
      mbRatioPct: 0.02,
      conversionInflationPct: Array(10).fill(0.03),
      rmInflationPct: Array(10).fill(0.02),
    },
    plantMaster: createTestPlantMaster(),
  };
}

function createTestBusinessCase(): BusinessCase {
  return {
    id: 'test-case-1',
    name: 'Test Business Case',
    skus: [createTestSku()],
    finance: {
      includeCorpSGA: true,
      debtPct: 0.7,
      costOfDebtPct: 0.12,
      costOfEquityPct: 0.18,
      corporateTaxRatePct: 0.25,
      annualVolumeGrowthPct: 0.05,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Mock the calculateScenario function
jest.mock('@/lib/calc', () => ({
  calculateScenario: jest.fn(),
}));

jest.mock('@/lib/calc/engines', () => ({
  CalculationEngine: {
    buildRoce: jest.fn(),
  },
}));

describe('Scenario Analysis Calculations', () => {
  let mockCalculateScenario: jest.MockedFunction<typeof calculateScenario>;
  let mockBuildRoce: jest.MockedFunction<typeof CalculationEngine.buildRoce>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCalculateScenario = calculateScenario as jest.MockedFunction<typeof calculateScenario>;
    mockBuildRoce = CalculationEngine.buildRoce as jest.MockedFunction<typeof CalculationEngine.buildRoce>;
  });

  describe('applyScenario function', () => {
    it('should apply volume percentage changes correctly', () => {
      const baseCase = createTestBusinessCase();
      const baseVolume = baseCase.skus[0].sales.baseAnnualVolumePieces;

      const modifiedCase = applyScenario(baseCase, { volumePct: 20 });

      expect(modifiedCase.skus[0].sales.baseAnnualVolumePieces).toBe(
        Math.round(baseVolume * 1.2)
      );
    });

    it('should apply negative volume percentage changes correctly', () => {
      const baseCase = createTestBusinessCase();
      const baseVolume = baseCase.skus[0].sales.baseAnnualVolumePieces;

      const modifiedCase = applyScenario(baseCase, { volumePct: -15 });

      expect(modifiedCase.skus[0].sales.baseAnnualVolumePieces).toBe(
        Math.round(baseVolume * 0.85)
      );
    });

    it('should not allow negative volumes', () => {
      const baseCase = createTestBusinessCase();

      const modifiedCase = applyScenario(baseCase, { volumePct: -150 });

      expect(modifiedCase.skus[0].sales.baseAnnualVolumePieces).toBe(0);
    });

    it('should apply conversion recovery percentage changes correctly', () => {
      const baseCase = createTestBusinessCase();
      const baseConvRec = baseCase.skus[0].sales.conversionRecoveryRsPerPiece;

      const modifiedCase = applyScenario(baseCase, { conversionRecoveryPct: 25 });

      expect(modifiedCase.skus[0].sales.conversionRecoveryRsPerPiece).toBe(
        baseConvRec! * 1.25
      );
    });

    it('should apply conversion cost percentage changes correctly', () => {
      const baseCase = createTestBusinessCase();
      const baseConvCost = baseCase.skus[0].plantMaster.conversionPerKg;

      const modifiedCase = applyScenario(baseCase, { conversionCostPct: -10 });

      expect(modifiedCase.skus[0].plantMaster.conversionPerKg).toBe(
        baseConvCost * 0.9
      );
    });

    it('should apply working capital days percentage changes correctly', () => {
      const baseCase = createTestBusinessCase();
      const baseWcDays = baseCase.skus[0].ops.workingCapitalDays;

      const modifiedCase = applyScenario(baseCase, { wcDaysPct: 50 });

      expect(modifiedCase.skus[0].ops.workingCapitalDays).toBe(
        Math.round(baseWcDays! * 1.5)
      );
    });

    it('should use default 60 days when working capital days is undefined', () => {
      const baseCase = createTestBusinessCase();
      baseCase.skus[0].ops.workingCapitalDays = undefined;

      const modifiedCase = applyScenario(baseCase, { wcDaysPct: 25 });

      expect(modifiedCase.skus[0].ops.workingCapitalDays).toBe(
        Math.round(60 * 1.25)
      );
    });

    it('should use default 60 days when working capital days is 0', () => {
      const baseCase = createTestBusinessCase();
      baseCase.skus[0].ops.workingCapitalDays = 0;

      const modifiedCase = applyScenario(baseCase, { wcDaysPct: 25 });

      expect(modifiedCase.skus[0].ops.workingCapitalDays).toBe(
        Math.round(60 * 1.25)
      );
    });

    it('should apply multiple changes simultaneously', () => {
      const baseCase = createTestBusinessCase();
      const baseVolume = baseCase.skus[0].sales.baseAnnualVolumePieces;
      const baseConvCost = baseCase.skus[0].plantMaster.conversionPerKg;
      const baseWcDays = baseCase.skus[0].ops.workingCapitalDays;

      const modifiedCase = applyScenario(baseCase, {
        volumePct: 30,
        conversionCostPct: -20,
        wcDaysPct: 40,
      });

      expect(modifiedCase.skus[0].sales.baseAnnualVolumePieces).toBe(
        Math.round(baseVolume * 1.3)
      );
      expect(modifiedCase.skus[0].plantMaster.conversionPerKg).toBe(
        baseConvCost * 0.8
      );
      expect(modifiedCase.skus[0].ops.workingCapitalDays).toBe(
        Math.round(baseWcDays! * 1.4)
      );
    });

    it('should not modify original case', () => {
      const baseCase = createTestBusinessCase();
      const originalVolume = baseCase.skus[0].sales.baseAnnualVolumePieces;
      const originalConvCost = baseCase.skus[0].plantMaster.conversionPerKg;

      applyScenario(baseCase, { volumePct: 20, conversionCostPct: -10 });

      expect(baseCase.skus[0].sales.baseAnnualVolumePieces).toBe(originalVolume);
      expect(baseCase.skus[0].plantMaster.conversionPerKg).toBe(originalConvCost);
    });
  });

  describe('clone function', () => {
    it('should create a deep copy of an object', () => {
      const original = { a: 1, b: { c: 2, d: [3, 4] } };
      const cloned = clone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
      expect(cloned.b.d).not.toBe(original.b.d);
    });

    it('should handle primitive values', () => {
      expect(clone(42)).toBe(42);
      expect(clone('test')).toBe('test');
      expect(clone(true)).toBe(true);
      expect(clone(null)).toBe(null);
    });

    it('should handle arrays', () => {
      const original = [1, 2, { a: 3 }];
      const cloned = clone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned[2]).not.toBe(original[2]);
    });
  });
});
