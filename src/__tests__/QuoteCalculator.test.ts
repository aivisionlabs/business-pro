import { QuoteCalculator } from '@/lib/calc/engines/QuoteCalculator';
import { BusinessCase, Sku } from '@/lib/types';

// Test data factory functions
function createTestSku(): Sku {
  return {
    id: 'test-sku-1',
    name: 'Test SKU',
    sales: {
      productWeightGrams: 100, // 0.1 kg
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
      newMachineRequired: false,
      newMouldRequired: false,
      newInfraRequired: false,
      costOfNewMachine: 2000000,
      costOfOldMachine: 0,
      costOfNewMould: 500000,
      costOfOldMould: 0,
      costOfNewInfra: 300000,
      costOfOldInfra: 0,
      lifeOfNewMachineYears: 15,
      lifeOfNewMouldYears: 15,
      lifeOfNewInfraYears: 30,
      workingCapitalDays: 45,
    },
    costing: {
      resinRsPerKg: 80,
      resinDiscountPct: 0.05,
      freightInwardsRsPerKg: 5,
      wastagePct: 0.02,
      useMbPriceOverride: false,
      mbRsPerKg: 0,
      mbRatioPct: 0.15,
      valueAddRsPerPiece: 2,
      packagingRsPerKg: 15,
      freightOutRsPerKg: 8,
      rmInflationPct: [0, 0, 0, 0, 0],
      conversionInflationPct: [0, 0, 0, 0, 0],
    },
    plantMaster: {
      powerRatePerUnit: 8,
      manpowerRatePerShift: 2000,
      rAndMPerKg: 1,
      otherMfgPerKg: 1.5,
      plantSgaPerKg: 4,
      corpSgaPerKg: 3.5,
      sellingGeneralAndAdministrativeExpensesPerKg: 7.5,
      conversionPerKg: 25.8,
      plant: 'test-plant',
    },
  };
}

function createTestBusinessCase(): BusinessCase {
  return {
    id: 'test-business-case-1',
    name: 'Test Business Case',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    skus: [createTestSku()],
    finance: {
      debtPct: 0.4,
      costOfDebtPct: 0.08,
      costOfEquityPct: 0.12,
      corporateTaxRatePct: 0.25,
      includeCorpSGA: true,
      annualVolumeGrowthPct: 0.05,
    },
  };
}

// Mock calculation output for testing
const mockYear1Price = {
  perKg: {
    rmPerKg: 85.6, // 80 * (1 - 0.05) + 5 + 2% wastage
    mbRsPerKg: 1.75, // 85.6 * 0.15 * (1 + 0.02)
    packagingPerKg: 15,
    freightOutPerKg: 8,
    conversionPerKg: 20, // valueAddRsPerPiece / weight
  },
  pricePerPiece: 13.335, // 85.6 + 1.75 + 15 + 8 + 20 = 129.35 * 0.1kg
};

describe('QuoteCalculator', () => {
  let businessCase: BusinessCase;
  let sku: Sku;

  beforeEach(() => {
    businessCase = createTestBusinessCase();
    sku = createTestSku();
  });

  describe('Quote Generation', () => {
    it('should generate quote with correct structure', () => {
      const input = {
        businessCase,
        quoteName: 'Test Quote',
        gstRate: 0.18,
      };

      const quote = QuoteCalculator.generateQuote(input);

      expect(quote).toBeDefined();
      expect(quote.id).toMatch(/^quote_\d+_/);
      expect(quote.quoteName).toBe('Test Quote');
      expect(quote.gstRate).toBe(0.18);
      expect(quote.skuItems).toHaveLength(1);
      expect(quote.aggregatedTotals).toBeDefined();
    });

    it('should calculate quote components correctly', () => {
      const input = {
        businessCase,
        quoteName: 'Test Quote',
        gstRate: 0.18,
      };

      const quote = QuoteCalculator.generateQuote(input);
      const skuItem = quote.skuItems[0];

      // Check that components are properly structured
      expect(skuItem.components.resin).toBeDefined();
      expect(skuItem.components.mb).toBeDefined();
      expect(skuItem.components.wastage).toBeDefined();
      expect(skuItem.components.packaging).toBeDefined();
      expect(skuItem.components.freight).toBeDefined();
      expect(skuItem.components.mouldAmortisation).toBeDefined();
      expect(skuItem.components.conversionCharge).toBeDefined();
      expect(skuItem.components.discount).toBeDefined();

      // Check that wastage, mould amortisation, and discount are initially 0
      expect(skuItem.components.wastage.rsPerPiece).toBe(0);
      expect(skuItem.components.wastage.rsPerKg).toBe(0);
      expect(skuItem.components.mouldAmortisation.rsPerPiece).toBe(0);
      expect(skuItem.components.mouldAmortisation.rsPerKg).toBe(0);
      expect(skuItem.components.discount.rsPerPiece).toBe(0);
      expect(skuItem.components.discount.rsPerKg).toBe(0);
    });

    it('should calculate totals correctly', () => {
      const input = {
        businessCase,
        quoteName: 'Test Quote',
        gstRate: 0.18,
      };

      const quote = QuoteCalculator.generateQuote(input);
      const skuItem = quote.skuItems[0];

      // Check that totals are calculated
      expect(skuItem.totalExclGst).toBeDefined();
      expect(skuItem.gst).toBeDefined();
      expect(skuItem.totalInclGst).toBeDefined();

      // Check that GST is calculated correctly (18% of total excluding GST)
      const expectedGstRsPerPiece = skuItem.totalExclGst.rsPerPiece * 0.18;
      const expectedGstRsPerKg = skuItem.totalExclGst.rsPerKg * 0.18;

      expect(skuItem.gst.rsPerPiece).toBeCloseTo(expectedGstRsPerPiece, 2);
      expect(skuItem.gst.rsPerKg).toBeCloseTo(expectedGstRsPerKg, 2);

      // Check that total including GST is correct
      const expectedTotalInclGstRsPerPiece = skuItem.totalExclGst.rsPerPiece + skuItem.gst.rsPerPiece;
      const expectedTotalInclGstRsPerKg = skuItem.totalExclGst.rsPerKg + skuItem.gst.rsPerKg;

      expect(skuItem.totalInclGst.rsPerPiece).toBeCloseTo(expectedTotalInclGstRsPerPiece, 2);
      expect(skuItem.totalInclGst.rsPerKg).toBeCloseTo(expectedTotalInclGstRsPerKg, 2);
    });

    it('should calculate aggregated totals correctly', () => {
      const input = {
        businessCase,
        quoteName: 'Test Quote',
        gstRate: 0.18,
      };

      const quote = QuoteCalculator.generateQuote(input);

      // Check aggregated totals
      expect(quote.aggregatedTotals.totalExclGst).toBeDefined();
      expect(quote.aggregatedTotals.gst).toBeDefined();
      expect(quote.aggregatedTotals.totalInclGst).toBeDefined();

      // Check that aggregated GST is calculated correctly
      const expectedAggregatedGstRsPerPiece = quote.aggregatedTotals.totalExclGst.rsPerPiece * 0.18;
      const expectedAggregatedGstRsPerKg = quote.aggregatedTotals.totalExclGst.rsPerKg * 0.18;

      expect(quote.aggregatedTotals.gst.rsPerPiece).toBeCloseTo(expectedAggregatedGstRsPerPiece, 2);
      expect(quote.aggregatedTotals.gst.rsPerKg).toBeCloseTo(expectedAggregatedGstRsPerKg, 2);

      // Check that aggregated total including GST is correct
      const expectedAggregatedTotalInclGstRsPerPiece = quote.aggregatedTotals.totalExclGst.rsPerPiece + quote.aggregatedTotals.gst.rsPerPiece;
      const expectedAggregatedTotalInclGstRsPerKg = quote.aggregatedTotals.totalExclGst.rsPerKg + quote.aggregatedTotals.gst.rsPerKg;

      expect(quote.aggregatedTotals.totalInclGst.rsPerPiece).toBeCloseTo(expectedAggregatedTotalInclGstRsPerPiece, 2);
      expect(quote.aggregatedTotals.totalInclGst.rsPerKg).toBeCloseTo(expectedAggregatedTotalInclGstRsPerKg, 2);
    });

    it('should handle multiple SKUs correctly', () => {
      // Create a business case with multiple SKUs
      const multiSkuBusinessCase = {
        ...businessCase,
        skus: [
          { ...createTestSku(), id: 'sku-1', name: 'SKU 1' },
          { ...createTestSku(), id: 'sku-2', name: 'SKU 2' },
        ],
      };

      const input = {
        businessCase: multiSkuBusinessCase,
        quoteName: 'Multi-SKU Quote',
        gstRate: 0.18,
      };

      const quote = QuoteCalculator.generateQuote(input);

      expect(quote.skuItems).toHaveLength(2);
      expect(quote.skuItems[0].skuId).toBe('sku-1');
      expect(quote.skuItems[1].skuId).toBe('sku-2');

      // Check that aggregated totals consider all SKUs
      expect(quote.aggregatedTotals.totalExclGst.rsPerPiece).toBeGreaterThan(0);
    });

    it('should handle custom quantities correctly', () => {
      const input = {
        businessCase,
        quoteName: 'Test Quote',
        gstRate: 0.18,
        defaultQuantities: { 'test-sku-1': 5 },
      };

      const quote = QuoteCalculator.generateQuote(input);
      const skuItem = quote.skuItems[0];

      expect(skuItem.quantity).toBe(5);

      // Check that aggregated totals consider quantity
      const expectedTotalRsPerPiece = skuItem.totalExclGst.rsPerPiece * 5;
      expect(quote.aggregatedTotals.totalExclGst.rsPerPiece).toBeCloseTo(expectedTotalRsPerPiece, 2);
    });
  });

  describe('Quote Validation', () => {
    it('should validate valid quote', () => {
      const input = {
        businessCase,
        quoteName: 'Test Quote',
        gstRate: 0.18,
      };

      const quote = QuoteCalculator.generateQuote(input);
      const validation = QuoteCalculator.validateQuote(quote);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect negative values', () => {
      const input = {
        businessCase,
        quoteName: 'Test Quote',
        gstRate: 0.18,
      };

      const quote = QuoteCalculator.generateQuote(input);

      // Introduce negative values
      quote.skuItems[0].components.resin.rsPerPiece = -10;
      quote.skuItems[0].components.resin.rsPerKg = -100;

      const validation = QuoteCalculator.validateQuote(quote);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('SKU Test SKU: resin per piece cannot be negative');
      expect(validation.errors).toContain('SKU Test SKU: resin per kg cannot be negative');
    });

    it('should detect invalid quantities', () => {
      const input = {
        businessCase,
        quoteName: 'Test Quote',
        gstRate: 0.18,
      };

      const quote = QuoteCalculator.generateQuote(input);

      // Set invalid quantity
      quote.skuItems[0].quantity = 0;

      const validation = QuoteCalculator.validateQuote(quote);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('SKU Test SKU: quantity must be greater than 0');
    });

    it('should detect invalid GST rate', () => {
      const input = {
        businessCase,
        quoteName: 'Test Quote',
        gstRate: 1.5, // Invalid GST rate > 1
      };

      const quote = QuoteCalculator.generateQuote(input);
      const validation = QuoteCalculator.validateQuote(quote);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('GST rate must be between 0 and 1');
    });
  });

  describe('Quote Updates', () => {
    it('should update quote totals correctly', () => {
      const input = {
        businessCase,
        quoteName: 'Test Quote',
        gstRate: 0.18,
      };

      const quote = QuoteCalculator.generateQuote(input);
      const originalTotal = quote.aggregatedTotals.totalExclGst.rsPerPiece;

      // Modify a component
      quote.skuItems[0].components.resin.rsPerPiece = 100;
      quote.skuItems[0].components.resin.rsPerKg = 1000;

      const updatedQuote = QuoteCalculator.updateQuoteTotals(quote);

      // Check that totals were recalculated
      expect(updatedQuote.aggregatedTotals.totalExclGst.rsPerPiece).not.toBe(originalTotal);

      // Check that updatedAt is a valid ISO string and different from original
      expect(updatedQuote.updatedAt).toBeDefined();
      expect(typeof updatedQuote.updatedAt).toBe('string');
      expect(new Date(updatedQuote.updatedAt).getTime()).toBeGreaterThan(0);

      // The updatedAt should be different from the original quote's updatedAt
      // Since we're creating a new quote, the timestamps should be different
      expect(updatedQuote.updatedAt).not.toBe(quote.updatedAt);
    });
  });
});
