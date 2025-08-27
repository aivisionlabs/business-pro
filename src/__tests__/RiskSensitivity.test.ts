import { BusinessCase, Sku, PlantMaster, CalcOutput } from '@/lib/types';
import { calculateScenario } from '@/lib/calc';
import { CalculationEngine } from '@/lib/calc/engines';
import { applyDelta, getVariableValue, clone, VARIABLES, SensVar } from '@/lib/calc/sensitivity';

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

describe('Risk Sensitivity Analysis Calculations', () => {
  let mockCalculateScenario: jest.MockedFunction<typeof calculateScenario>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCalculateScenario = calculateScenario as jest.MockedFunction<typeof calculateScenario>;
  });

  describe('getVariableValue function', () => {
    it('should extract volume values correctly', () => {
      const businessCase = createTestBusinessCase();
      const volumeValues = getVariableValue(businessCase, 'volume');

      expect(volumeValues).toEqual([10000]);
    });

    it('should extract conversion recovery values correctly', () => {
      const businessCase = createTestBusinessCase();
      const convRecValues = getVariableValue(businessCase, 'conversionRecovery');

      expect(convRecValues).toEqual([0.5]);
    });

    it('should extract resin price values correctly', () => {
      const businessCase = createTestBusinessCase();
      const resinValues = getVariableValue(businessCase, 'resinPrice');

      expect(resinValues).toEqual([{
        resin: 80,
        mb: 120,
      }]);
    });

    it('should extract conversion cost values correctly', () => {
      const businessCase = createTestBusinessCase();
      const convCostValues = getVariableValue(businessCase, 'conversionCost');

      expect(convCostValues).toEqual([20]);
    });

    it('should extract OEE values correctly', () => {
      const businessCase = createTestBusinessCase();
      const oeeValues = getVariableValue(businessCase, 'oee');

      expect(oeeValues).toEqual([0.85]);
    });

    it('should extract machine cost values correctly', () => {
      const businessCase = createTestBusinessCase();
      const machineCostValues = getVariableValue(businessCase, 'machineCost');

      expect(machineCostValues).toEqual([2000000]);
    });

    it('should extract mould cost values correctly', () => {
      const businessCase = createTestBusinessCase();
      const mouldCostValues = getVariableValue(businessCase, 'mouldCost');

      expect(mouldCostValues).toEqual([500000]);
    });

    it('should extract SGA values correctly', () => {
      const businessCase = createTestBusinessCase();
      const sgaValues = getVariableValue(businessCase, 'sga');

      expect(sgaValues).toEqual([7.5]);
    });

    it('should return unknown for invalid variable ID', () => {
      const businessCase = createTestBusinessCase();
      const result = getVariableValue(businessCase, 'invalidVariable');

      expect(result).toBe('unknown');
    });

    it('should handle multiple SKUs correctly', () => {
      const businessCase = createTestBusinessCase();
      const secondSku = createTestSku();
      secondSku.id = 'test-sku-2';
      secondSku.sales.baseAnnualVolumePieces = 15000;
      businessCase.skus.push(secondSku);

      const volumeValues = getVariableValue(businessCase, 'volume');

      expect(volumeValues).toEqual([10000, 15000]);
    });
  });

  describe('applyDelta function', () => {
    it('should apply volume delta correctly', () => {
      const businessCase = createTestBusinessCase();
      const baseVolume = businessCase.skus[0].sales.baseAnnualVolumePieces;
      const variable: SensVar = { id: 'volume', label: 'Volume' };

      const modifiedCase = applyDelta(businessCase, variable, 0.2);

      expect(modifiedCase.skus[0].sales.baseAnnualVolumePieces).toBe(
        Math.round(baseVolume * 1.2)
      );
    });

    it('should apply negative volume delta correctly', () => {
      const businessCase = createTestBusinessCase();
      const baseVolume = businessCase.skus[0].sales.baseAnnualVolumePieces;
      const variable: SensVar = { id: 'volume', label: 'Volume' };

      const modifiedCase = applyDelta(businessCase, variable, -0.15);

      expect(modifiedCase.skus[0].sales.baseAnnualVolumePieces).toBe(
        Math.round(baseVolume * 0.85)
      );
    });

    it('should not allow negative volumes', () => {
      const businessCase = createTestBusinessCase();
      const variable: SensVar = { id: 'volume', label: 'Volume' };

      const modifiedCase = applyDelta(businessCase, variable, -1.5);

      expect(modifiedCase.skus[0].sales.baseAnnualVolumePieces).toBe(0);
    });

    it('should apply conversion recovery delta correctly', () => {
      const businessCase = createTestBusinessCase();
      const baseConvRec = businessCase.skus[0].sales.conversionRecoveryRsPerPiece;
      const variable: SensVar = { id: 'conversionRecovery', label: 'Conversion Recovery' };

      const modifiedCase = applyDelta(businessCase, variable, 0.25);

      expect(modifiedCase.skus[0].sales.conversionRecoveryRsPerPiece).toBe(
        baseConvRec! * 1.25
      );
    });

    it('should apply resin price delta correctly', () => {
      const businessCase = createTestBusinessCase();
      const baseResinPrice = businessCase.skus[0].costing.resinRsPerKg;
      const baseMbPrice = businessCase.skus[0].costing.mbRsPerKg;
      const variable: SensVar = { id: 'resinPrice', label: 'Resin price' };

      const modifiedCase = applyDelta(businessCase, variable, 0.1);

      expect(modifiedCase.skus[0].costing.resinRsPerKg).toBe(
        baseResinPrice * 1.1
      );
      expect(modifiedCase.skus[0].costing.mbRsPerKg).toBe(
        baseMbPrice * 1.1
      );
    });

    it('should apply conversion cost delta correctly', () => {
      const businessCase = createTestBusinessCase();
      const baseConvCost = businessCase.skus[0].plantMaster.conversionPerKg;
      const variable: SensVar = { id: 'conversionCost', label: 'Conversion cost' };

      const modifiedCase = applyDelta(businessCase, variable, -0.2);

      expect(modifiedCase.skus[0].plantMaster.conversionPerKg).toBe(
        baseConvCost * 0.8
      );
    });

    it('should apply OEE delta correctly', () => {
      const businessCase = createTestBusinessCase();
      const baseOee = businessCase.skus[0].ops.oee;
      const variable: SensVar = { id: 'oee', label: 'Operating Efficiency' };

      const modifiedCase = applyDelta(businessCase, variable, 0.1);

      expect(modifiedCase.skus[0].ops.oee).toBe(
        Math.min(1, baseOee * 1.1)
      );
    });

    it('should cap OEE at 1.0', () => {
      const businessCase = createTestBusinessCase();
      businessCase.skus[0].ops.oee = 0.95;
      const variable: SensVar = { id: 'oee', label: 'Operating Efficiency' };

      const modifiedCase = applyDelta(businessCase, variable, 0.1);

      expect(modifiedCase.skus[0].ops.oee).toBe(1.0);
    });

    it('should apply machine cost delta correctly', () => {
      const businessCase = createTestBusinessCase();
      const baseMachineCost = businessCase.skus[0].ops.costOfNewMachine;
      const variable: SensVar = { id: 'machineCost', label: 'Machine Cost' };

      const modifiedCase = applyDelta(businessCase, variable, 0.15);

      expect(modifiedCase.skus[0].ops.costOfNewMachine).toBe(
        baseMachineCost * 1.15
      );
    });

    it('should apply mould cost delta correctly', () => {
      const businessCase = createTestBusinessCase();
      const baseMouldCost = businessCase.skus[0].ops.costOfNewMould;
      const variable: SensVar = { id: 'mouldCost', label: 'Mould Cost' };

      const modifiedCase = applyDelta(businessCase, variable, -0.1);

      expect(modifiedCase.skus[0].ops.costOfNewMould).toBe(
        baseMouldCost * 0.9
      );
    });

    it('should apply SGA delta correctly', () => {
      const businessCase = createTestBusinessCase();
      const baseSga = businessCase.skus[0].plantMaster.sellingGeneralAndAdministrativeExpensesPerKg;
      const variable: SensVar = { id: 'sga', label: 'S, G&A' };

      const modifiedCase = applyDelta(businessCase, variable, 0.2);

      expect(modifiedCase.skus[0].plantMaster.sellingGeneralAndAdministrativeExpensesPerKg).toBe(
        baseSga * 1.2
      );
    });

    it('should handle multiple SKUs correctly', () => {
      const businessCase = createTestBusinessCase();
      const secondSku = createTestSku();
      secondSku.id = 'test-sku-2';
      secondSku.sales.baseAnnualVolumePieces = 15000;
      businessCase.skus.push(secondSku);

      const variable: SensVar = { id: 'volume', label: 'Volume' };
      const modifiedCase = applyDelta(businessCase, variable, 0.1);

      expect(modifiedCase.skus[0].sales.baseAnnualVolumePieces).toBe(
        Math.round(10000 * 1.1)
      );
      expect(modifiedCase.skus[1].sales.baseAnnualVolumePieces).toBe(
        Math.round(15000 * 1.1)
      );
    });

    it('should not modify original case', () => {
      const businessCase = createTestBusinessCase();
      const originalVolume = businessCase.skus[0].sales.baseAnnualVolumePieces;
      const originalConvCost = businessCase.skus[0].plantMaster.conversionPerKg;

      const variable: SensVar = { id: 'volume', label: 'Volume' };
      applyDelta(businessCase, variable, 0.2);

      expect(businessCase.skus[0].sales.baseAnnualVolumePieces).toBe(originalVolume);
      expect(businessCase.skus[0].plantMaster.conversionPerKg).toBe(originalConvCost);
    });

    it('should handle undefined conversion recovery gracefully', () => {
      const businessCase = createTestBusinessCase();
      businessCase.skus[0].sales.conversionRecoveryRsPerPiece = undefined;
      const variable: SensVar = { id: 'conversionRecovery', label: 'Conversion Recovery' };

      const modifiedCase = applyDelta(businessCase, variable, 0.2);

      expect(modifiedCase.skus[0].sales.conversionRecoveryRsPerPiece).toBeUndefined();
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

  describe('VARIABLES constant', () => {
    it('should contain all expected sensitivity variables', () => {
      const expectedVariables = [
        'volume',
        'conversionRecovery',
        'resinPrice',
        'conversionCost',
        'oee',
        'machineCost',
        'mouldCost',
        'sga',
      ];

      const variableIds = VARIABLES.map(v => v.id);
      expect(variableIds).toEqual(expectedVariables);
    });

    it('should have proper labels for all variables', () => {
      VARIABLES.forEach(variable => {
        expect(variable.id).toBeDefined();
        expect(variable.label).toBeDefined();
        expect(typeof variable.id).toBe('string');
        expect(typeof variable.label).toBe('string');
      });
    });
  });
});
