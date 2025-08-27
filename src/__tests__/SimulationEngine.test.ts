import { SimulationEngine } from '@/lib/calc/simulation/SimulationEngine';
import { BusinessCase, Sku, PlantMaster, CalcOutput, PerturbationSpec, ObjectiveConfig, OutcomeMetric } from '@/lib/types';
import { calculateScenario } from '@/lib/calc';

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

function createTestObjectiveConfig(): ObjectiveConfig {
  return {
    metrics: ['NPV', 'IRR', 'PNL_Y1', 'PNL_TOTAL'],
  };
}

function createTestPerturbationSpecs(): PerturbationSpec[] {
  return [
    {
      variableId: 'skus.0.sales.baseAnnualVolumePieces',
      deltas: [-0.2, -0.1, 0, 0.1, 0.2],
      percent: true,
    },
    {
      variableId: 'skus.0.costing.resinRsPerKg',
      deltas: [-0.15, -0.1, 0, 0.1, 0.15],
      percent: true,
    },
    {
      variableId: 'skus.0.plantMaster.conversionPerKg',
      deltas: [-0.1, 0, 0.1],
      percent: true,
    },
  ];
}

// Mock the calculateScenario function
jest.mock('@/lib/calc', () => ({
  calculateScenario: jest.fn(),
}));

describe('SimulationEngine', () => {
  let mockCalculateScenario: jest.MockedFunction<typeof calculateScenario>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCalculateScenario = calculateScenario as jest.MockedFunction<typeof calculateScenario>;
  });

  describe('runBaseline', () => {
    it('should run baseline calculation and extract metrics', () => {
      const businessCase = createTestBusinessCase();
      const objective = createTestObjectiveConfig();

      const mockCalcOutput: CalcOutput = {
        pnl: [
          {
            year: 1,
            revenueGross: 1000000,
            revenueNet: 950000,
            materialCost: 400000,
            materialMargin: 550000,
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
            grossMargin: 350000,
            ebitda: 675000,
            depreciation: 50000,
            ebit: 625000,
            interestCapex: 25000,
            pbt: 600000,
            tax: 150000,
            pat: 450000,
          },
          {
            year: 2,
            revenueGross: 1050000,
            revenueNet: 997500,
            materialCost: 420000,
            materialMargin: 577500,
            valueAddCost: 21000,
            packagingCost: 31500,
            freightOutCost: 26250,
            conversionRecoveryCost: 15750,
            rAndMCost: 10500,
            otherMfgCost: 15750,
            plantSgaCost: 42000,
            corpSgaCost: 36750,
            sgaCost: 78750,
            conversionCost: 210000,
            grossMargin: 367500,
            ebitda: 708750,
            depreciation: 50000,
            ebit: 658750,
            interestCapex: 25000,
            pbt: 633750,
            tax: 158437.5,
            pat: 475312.5,
          },
        ],
        returns: {
          wacc: 0.15,
          npv: 2500000,
          irr: 0.18,
          paybackYears: 3.5,
          roceByYear: [
            { year: 1, roce: 0.15, netBlock: 3000000 },
            { year: 2, roce: 0.16, netBlock: 2800000 },
          ],
        },
        prices: [],
        volumes: [],
        bySku: [],
        weightedAvgPricePerKg: [],
        cashflow: [],
      };

      mockCalculateScenario.mockReturnValue(mockCalcOutput);

      const result = SimulationEngine.runBaseline(businessCase, objective);

      expect(result).toEqual({
        NPV: 2500000,
        IRR: 0.18,
        PNL_Y1: 450000,
        PNL_TOTAL: 925312.5,
      });

      expect(mockCalculateScenario).toHaveBeenCalledWith(businessCase);
    });

    it('should handle missing P&L data gracefully', () => {
      const businessCase = createTestBusinessCase();
      const objective = createTestObjectiveConfig();

      const mockCalcOutput: CalcOutput = {
        pnl: [],
        returns: {
          wacc: 0.15,
          npv: 0,
          irr: 0,
          paybackYears: 0,
          roceByYear: [],
        },
        prices: [],
        volumes: [],
        bySku: [],
        weightedAvgPricePerKg: [],
        cashflow: [],
      };

      mockCalculateScenario.mockReturnValue(mockCalcOutput);

      const result = SimulationEngine.runBaseline(businessCase, objective);

      expect(result).toEqual({
        NPV: 0,
        IRR: 0,
        PNL_Y1: null,
        PNL_TOTAL: 0,
      });
    });

    it('should handle partial objective metrics', () => {
      const businessCase = createTestBusinessCase();
      const objective: ObjectiveConfig = {
        metrics: ['NPV', 'IRR'],
      };

      const mockCalcOutput: CalcOutput = {
        pnl: [],
        returns: {
          wacc: 0.15,
          npv: 1000000,
          irr: 0.15,
          paybackYears: 4.0,
          roceByYear: [],
        },
        prices: [],
        volumes: [],
        bySku: [],
        weightedAvgPricePerKg: [],
        cashflow: [],
      };

      mockCalculateScenario.mockReturnValue(mockCalcOutput);

      const result = SimulationEngine.runBaseline(businessCase, objective);

      expect(result).toEqual({
        NPV: 1000000,
        IRR: 0.15,
        PNL_Y1: null,
        PNL_TOTAL: null,
      });
    });
  });

  describe('runSensitivity', () => {
    it('should run sensitivity analysis with perturbation specs', () => {
      const businessCase = createTestBusinessCase();
      const specs = createTestPerturbationSpecs();
      const objective = createTestObjectiveConfig();

      const baselineMetrics = {
        NPV: 2500000,
        IRR: 0.18,
        PNL_Y1: 450000,
        PNL_TOTAL: 925312.5,
      };

      // Mock different calculation outputs for different perturbations
      mockCalculateScenario
        .mockReturnValueOnce({
          pnl: [{ year: 1, pat: 450000 } as any],
          returns: { wacc: 0.15, npv: 2000000, irr: 0.15, paybackYears: 4.0, roceByYear: [] },
          prices: [], volumes: [], bySku: [], weightedAvgPricePerKg: [], cashflow: [],
        })
        .mockReturnValueOnce({
          pnl: [{ year: 1, pat: 500000 } as any],
          returns: { wacc: 0.15, npv: 3000000, irr: 0.20, paybackYears: 3.0, roceByYear: [] },
          prices: [], volumes: [], bySku: [], weightedAvgPricePerKg: [], cashflow: [],
        })
        .mockReturnValueOnce({
          pnl: [{ year: 1, pat: 400000 } as any],
          returns: { wacc: 0.15, npv: 1800000, irr: 0.12, paybackYears: 4.5, roceByYear: [] },
          prices: [], volumes: [], bySku: [], weightedAvgPricePerKg: [], cashflow: [],
        });

      const result = SimulationEngine.runSensitivity(businessCase, specs, objective, baselineMetrics);

      expect(result.baseline).toEqual(baselineMetrics);
      expect(result.results).toHaveLength(13); // 5 + 5 + 3 deltas

      // Check that we have results for each variable
      const volumeResults = result.results.filter(r => r.variableId === 'skus.0.sales.baseAnnualVolumePieces');
      const resinResults = result.results.filter(r => r.variableId === 'skus.0.costing.resinRsPerKg');
      const convCostResults = result.results.filter(r => r.variableId === 'skus.0.plantMaster.conversionPerKg');

      expect(volumeResults).toHaveLength(5);
      expect(resinResults).toHaveLength(5);
      expect(convCostResults).toHaveLength(3);
    });

    it('should handle percentage-based deltas correctly', () => {
      const businessCase = createTestBusinessCase();
      const specs: PerturbationSpec[] = [
        {
          variableId: 'skus.0.sales.baseAnnualVolumePieces',
          deltas: [0.1, 0.2],
          percent: true,
        },
      ];
      const objective = createTestObjectiveConfig();

      const baselineMetrics = {
        NPV: 2500000,
        IRR: 0.18,
        PNL_Y1: 450000,
        PNL_TOTAL: 925312.5,
      };

      mockCalculateScenario.mockReturnValue({
        pnl: [{ year: 1, pat: 450000 } as any],
        returns: { wacc: 0.15, npv: 2500000, irr: 0.18, paybackYears: 3.5, roceByYear: [] },
        prices: [], volumes: [], bySku: [], weightedAvgPricePerKg: [], cashflow: [],
      });

      const result = SimulationEngine.runSensitivity(businessCase, specs, objective, baselineMetrics);

      expect(result.results).toHaveLength(2);
      expect(result.results[0].delta).toBe(0.1);
      expect(result.results[1].delta).toBe(0.2);

      // Check that the business case was modified correctly
      const firstRun = result.results[0];
      expect(firstRun.metrics.NPV).toBe(2500000);
    });

    it('should handle absolute deltas correctly', () => {
      const businessCase = createTestBusinessCase();
      const specs: PerturbationSpec[] = [
        {
          variableId: 'skus.0.costing.resinRsPerKg',
          deltas: [5, 10],
          percent: false,
        },
      ];
      const objective = createTestObjectiveConfig();

      const baselineMetrics = {
        NPV: 2500000,
        IRR: 0.18,
        PNL_Y1: 450000,
        PNL_TOTAL: 925312.5,
      };

      mockCalculateScenario.mockReturnValue({
        pnl: [{ year: 1, pat: 450000 } as any],
        returns: { wacc: 0.15, npv: 2500000, irr: 0.18, paybackYears: 3.5, roceByYear: [] },
        prices: [], volumes: [], bySku: [], weightedAvgPricePerKg: [], cashflow: [],
      });

      const result = SimulationEngine.runSensitivity(businessCase, specs, objective, baselineMetrics);

      expect(result.results).toHaveLength(2);
      expect(result.results[0].delta).toBe(5);
      expect(result.results[1].delta).toBe(10);
    });

    it('should handle errors gracefully and continue processing', () => {
      const businessCase = createTestBusinessCase();
      const specs: PerturbationSpec[] = [
        {
          variableId: 'skus.0.sales.baseAnnualVolumePieces',
          deltas: [0.1, 0.2],
          percent: true,
        },
        {
          variableId: 'invalid.path',
          deltas: [0.1],
          percent: true,
        },
      ];
      const objective = createTestObjectiveConfig();

      const baselineMetrics = {
        NPV: 2500000,
        IRR: 0.18,
        PNL_Y1: 450000,
        PNL_TOTAL: 925312.5,
      };

      mockCalculateScenario.mockReturnValue({
        pnl: [{ year: 1, pat: 450000 } as any],
        returns: { wacc: 0.15, npv: 2500000, irr: 0.18, paybackYears: 3.5, roceByYear: [] },
        prices: [], volumes: [], bySku: [], weightedAvgPricePerKg: [], cashflow: [],
      });

      const result = SimulationEngine.runSensitivity(businessCase, specs, objective, baselineMetrics);

      // Should still process the valid spec and the invalid one (which creates an empty object)
      expect(result.results).toHaveLength(3);
      expect(result.results[0].variableId).toBe('skus.0.sales.baseAnnualVolumePieces');
      expect(result.results[2].variableId).toBe('invalid.path');
    });

    it('should use provided baseline override when specified', () => {
      const businessCase = createTestBusinessCase();
      const specs = createTestPerturbationSpecs();
      const objective = createTestObjectiveConfig();

      const customBaseline = {
        NPV: 3000000,
        IRR: 0.20,
        PNL_Y1: 500000,
        PNL_TOTAL: 1000000,
      };

      mockCalculateScenario.mockReturnValue({
        pnl: [{ year: 1, pat: 450000 } as any],
        returns: { wacc: 0.15, npv: 2500000, irr: 0.18, paybackYears: 3.5, roceByYear: [] },
        prices: [], volumes: [], bySku: [], weightedAvgPricePerKg: [], cashflow: [],
      });

      const result = SimulationEngine.runSensitivity(businessCase, specs, objective, customBaseline);

      expect(result.baseline).toEqual(customBaseline);
      expect(result.baseline).not.toEqual({
        NPV: 2500000,
        IRR: 0.18,
        PNL_Y1: 450000,
        PNL_TOTAL: 925312.5,
      });
    });
  });

  describe('runScenarios', () => {
    it('should run scenario analysis with scenario definitions', () => {
      const businessCase = createTestBusinessCase();
      const objective = createTestObjectiveConfig();

      const scenarios = [
        {
          id: 'high-volume',
          name: 'High Volume Scenario',
          overrides: {
            'skus.0.sales.baseAnnualVolumePieces': 15000,
            'skus.0.costing.resinRsPerKg': 72,
          } as Record<string, number>,
        },
        {
          id: 'low-cost',
          name: 'Low Cost Scenario',
          overrides: {
            'skus.0.plantMaster.conversionPerKg': 18,
            'skus.0.costing.resinRsPerKg': 70,
          } as Record<string, number>,
        },
      ];

      const mockCalcOutput: CalcOutput = {
        pnl: [
          {
            year: 1,
            revenueGross: 1300000,
            revenueNet: 1235000,
            materialCost: 520000,
            materialMargin: 715000,
            valueAddCost: 26000,
            packagingCost: 39000,
            freightOutCost: 32500,
            conversionRecoveryCost: 19500,
            rAndMCost: 13000,
            otherMfgCost: 19500,
            plantSgaCost: 52000,
            corpSgaCost: 45500,
            sgaCost: 97500,
            conversionCost: 260000,
            grossMargin: 455000,
            ebitda: 877500,
            depreciation: 50000,
            ebit: 827500,
            interestCapex: 25000,
            pbt: 802500,
            tax: 200625,
            pat: 601875,
          },
        ],
        returns: {
          wacc: 0.15,
          npv: 3200000,
          irr: 0.22,
          paybackYears: 2.8,
          roceByYear: [{ year: 1, roce: 0.22, netBlock: 3000000 }],
        },
        prices: [],
        volumes: [],
        bySku: [],
        weightedAvgPricePerKg: [],
        cashflow: [],
      };

      mockCalculateScenario.mockReturnValue(mockCalcOutput);

      const result = SimulationEngine.runScenarios(businessCase, scenarios, objective);

      expect(result.baseline).toBeDefined();
      expect(result.results).toHaveLength(2);
      expect(result.results[0].scenarioId).toBe('high-volume');
      expect(result.results[0].name).toBe('High Volume Scenario');
      expect(result.results[1].scenarioId).toBe('low-cost');
      expect(result.results[1].name).toBe('Low Cost Scenario');
    });

    it('should handle scenario with no overrides', () => {
      const businessCase = createTestBusinessCase();
      const objective = createTestObjectiveConfig();

      const scenarios = [
        {
          id: 'baseline',
          name: 'Baseline Scenario',
          overrides: {} as Record<string, number>,
        },
      ];

      const mockCalcOutput: CalcOutput = {
        pnl: [
          {
            year: 1,
            revenueGross: 1000000,
            revenueNet: 950000,
            materialCost: 400000,
            materialMargin: 550000,
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
            grossMargin: 350000,
            ebitda: 675000,
            depreciation: 50000,
            ebit: 625000,
            interestCapex: 25000,
            pbt: 600000,
            tax: 150000,
            pat: 450000,
          },
        ],
        returns: {
          wacc: 0.15,
          npv: 2500000,
          irr: 0.18,
          paybackYears: 3.5,
          roceByYear: [{ year: 1, roce: 0.18, netBlock: 3000000 }],
        },
        prices: [],
        volumes: [],
        bySku: [],
        weightedAvgPricePerKg: [],
        cashflow: [],
      };

      mockCalculateScenario.mockReturnValue(mockCalcOutput);

      const result = SimulationEngine.runScenarios(businessCase, scenarios, objective);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].scenarioId).toBe('baseline');
      expect(result.results[0].name).toBe('Baseline Scenario');
    });
  });
});
