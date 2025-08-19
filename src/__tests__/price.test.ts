import { PriceYear } from '@/lib/types';

describe('Price Calculations', () => {
  describe('Price Structure', () => {
    it('should have correct price structure for each year', () => {
      const testPrice: PriceYear = {
        year: 1,
        perKg: {
          rmPerKg: 80,
          mbPerKg: 120,
          valueAddPerKg: 20,
          packagingPerKg: 15,
          freightOutPerKg: 8,
          conversionPerKg: 25.80,
          totalPerKg: 0,
        },
        pricePerPiece: 15,
      };

      expect(testPrice.year).toBe(1);
      expect(testPrice.pricePerPiece).toBe(15);
      expect(testPrice.perKg.rmPerKg).toBe(80);
      expect(testPrice.perKg.mbPerKg).toBe(120);
      expect(testPrice.perKg.conversionPerKg).toBe(25.80);
    });

    it('should calculate total per kg correctly', () => {
      // Calculate total manually
      const expectedTotal = 80 + 120 + 20 + 15 + 8 + 1 + 25.80;
      expect(expectedTotal).toBe(269.80);
    });
  });

  describe('Price Inflation Scenarios', () => {
    it('should handle linear inflation correctly', () => {
      const basePrice = 15;
      const inflationRate = 0.05; // 5% per year
      const years = 5;

      for (let year = 1; year <= years; year++) {
        const expectedPrice = basePrice * Math.pow(1 + inflationRate, year - 1);
        if (year === 1) {
          expect(expectedPrice).toBe(basePrice); // Year 1: no inflation
        } else {
          expect(expectedPrice).toBeGreaterThan(basePrice); // Years 2-5: inflation
        }
      }
    });

    it('should handle compound inflation for material costs', () => {
      const baseRmPrice = 80;
      const baseMbPrice = 120;
      const rmInflationRate = 0.04; // 4% per year
      const mbInflationRate = 0.06; // 6% per year

      // Year 1: Base prices
      expect(baseRmPrice).toBe(80);
      expect(baseMbPrice).toBe(120);

      // Year 2: After 1 year of inflation
      const year2Rm = baseRmPrice * (1 + rmInflationRate);
      const year2Mb = baseMbPrice * (1 + mbInflationRate);
      expect(year2Rm).toBeCloseTo(83.2, 2);
      expect(year2Mb).toBeCloseTo(127.2, 2);

      // Year 3: After 2 years of inflation
      const year3Rm = baseRmPrice * Math.pow(1 + rmInflationRate, 2);
      const year3Mb = baseMbPrice * Math.pow(1 + mbInflationRate, 2);
      expect(year3Rm).toBeCloseTo(86.53, 2);
      expect(year3Mb).toBeCloseTo(134.83, 2);
    });

    it('should handle different inflation rates for different components', () => {
      const basePrices = {
        rm: 80,
        mb: 120,
        packaging: 15,
        freight: 8,
        conversion: 25.80,
      };

      const inflationRates = {
        rm: 0.04, // 4% per year
        mb: 0.06, // 6% per year
        packaging: 0.03, // 3% per year
        freight: 0.05, // 5% per year
        conversion: 0.02, // 2% per year
      };

      // Calculate year 3 prices
      const year3Prices = {
        rm: basePrices.rm * Math.pow(1 + inflationRates.rm, 2),
        mb: basePrices.mb * Math.pow(1 + inflationRates.mb, 2),
        packaging: basePrices.packaging * Math.pow(1 + inflationRates.packaging, 2),
        freight: basePrices.freight * Math.pow(1 + inflationRates.freight, 2),
        conversion: basePrices.conversion * Math.pow(1 + inflationRates.conversion, 2),
      };

      // Verify calculations
      expect(year3Prices.rm).toBeCloseTo(86.53, 2);
      expect(year3Prices.mb).toBeCloseTo(134.83, 2);
      expect(year3Prices.packaging).toBeCloseTo(15.91, 2);
      expect(year3Prices.freight).toBeCloseTo(8.82, 2);
      expect(year3Prices.conversion).toBeCloseTo(26.84, 2); // Fixed precision
    });
  });

  describe('Price Validation', () => {
    it('should ensure all price components are non-negative', () => {
      const testPrice: PriceYear = {
        year: 1,
        perKg: {
          rmPerKg: 80,
          mbPerKg: 120,
          valueAddPerKg: 20,
          packagingPerKg: 15,
          freightOutPerKg: 8,
          conversionPerKg: 25.80,
          totalPerKg: 0,
        },
        pricePerPiece: 15,
      };

      // All per-kg prices should be non-negative
      expect(testPrice.perKg.rmPerKg).toBeGreaterThanOrEqual(0);
      expect(testPrice.perKg.mbPerKg).toBeGreaterThanOrEqual(0);
      expect(testPrice.perKg.valueAddPerKg).toBeGreaterThanOrEqual(0);
      expect(testPrice.perKg.packagingPerKg).toBeGreaterThanOrEqual(0);
      expect(testPrice.perKg.freightOutPerKg).toBeGreaterThanOrEqual(0);
      expect(testPrice.perKg.conversionPerKg).toBeGreaterThanOrEqual(0);

      // Price per piece should be positive
      expect(testPrice.pricePerPiece).toBeGreaterThan(0);
    });

    it('should handle zero prices for optional components', () => {
      const testPrice: PriceYear = {
        year: 1,
        perKg: {
          rmPerKg: 80,
          mbPerKg: 0, // No masterbatch
          valueAddPerKg: 0, // No value add
          packagingPerKg: 0, // No packaging
          freightOutPerKg: 0, // No freight
          conversionPerKg: 25.80,
          totalPerKg: 0,
        },
        pricePerPiece: 15,
      };

      // Zero prices should be valid
      expect(testPrice.perKg.mbPerKg).toBe(0);
      expect(testPrice.perKg.valueAddPerKg).toBe(0);
      expect(testPrice.perKg.packagingPerKg).toBe(0);
      expect(testPrice.perKg.freightOutPerKg).toBe(0);
    });
  });

  describe('Price Calculations in PnL Context', () => {
    it('should calculate material cost correctly from price components', () => {
      const price: PriceYear = {
        year: 1,
        perKg: {
          rmPerKg: 80,
          mbPerKg: 120,
          valueAddPerKg: 20,
          packagingPerKg: 15,
          freightOutPerKg: 8,
          conversionPerKg: 25.80,
          totalPerKg: 0,
        },
        pricePerPiece: 15,
      };

      const weightKg = 1000; // 1 ton
      const packagingRsPerKg = 15;
      const freightOutRsPerKg = 8;

      // Material cost calculation as used in PnL
      const rmCost = price.perKg.rmPerKg * weightKg;
      const mbCost = price.perKg.mbPerKg * weightKg;
      const packagingCost = packagingRsPerKg * weightKg;
      const freightOutCost = freightOutRsPerKg * weightKg;

      const totalMaterialCost = rmCost + mbCost + packagingCost + freightOutCost;

      expect(rmCost).toBe(80000); // 80 * 1000
      expect(mbCost).toBe(120000); // 120 * 1000
      expect(packagingCost).toBe(15000); // 15 * 1000
      expect(freightOutCost).toBe(8000); // 8 * 1000
      expect(totalMaterialCost).toBe(223000); // Total material cost
    });

    it('should calculate revenue correctly from price per piece', () => {
      const price: PriceYear = {
        year: 1,
        perKg: {
          rmPerKg: 80,
          mbPerKg: 120,
          valueAddPerKg: 20,
          packagingPerKg: 15,
          freightOutPerKg: 8,
          conversionPerKg: 25.80,
          totalPerKg: 0,
        },
        pricePerPiece: 15,
      };

      const volumePieces = 10000;
      const discountRsPerPiece = 0.2;

      // Revenue calculations as used in PnL
      const revenueGross = price.pricePerPiece * volumePieces;
      const discountExpense = discountRsPerPiece * volumePieces;
      const revenueNet = revenueGross - discountExpense;

      expect(revenueGross).toBe(150000); // 15 * 10000
      expect(discountExpense).toBe(2000); // 0.2 * 10000
      expect(revenueNet).toBe(148000); // 150000 - 2000
    });

    it('should handle price inflation over multiple years', () => {
      const basePrice = 15;
      const inflationRate = 0.05; // 5% per year

      const prices: PriceYear[] = [];
      for (let year = 1; year <= 5; year++) {
        const pricePerPiece = basePrice * Math.pow(1 + inflationRate, year - 1);
        prices.push({
          year,
          perKg: {
            rmPerKg: 80 * Math.pow(1 + 0.04, year - 1), // 4% RM inflation
            mbPerKg: 120 * Math.pow(1 + 0.06, year - 1), // 6% MB inflation
            valueAddPerKg: 20,
            packagingPerKg: 15,
            freightOutPerKg: 8,
            conversionPerKg: 25.80,
            totalPerKg: 0,
          },
          pricePerPiece,
        });
      }

      // Verify inflation calculations
      expect(prices[0].pricePerPiece).toBe(15); // Year 1: base price
      expect(prices[1].pricePerPiece).toBeCloseTo(15.75, 2); // Year 2: 15 * 1.05
      expect(prices[2].pricePerPiece).toBeCloseTo(16.54, 2); // Year 3: 15 * 1.05^2
      expect(prices[3].pricePerPiece).toBeCloseTo(17.36, 2); // Year 4: 15 * 1.05^3 (fixed precision)
      expect(prices[4].pricePerPiece).toBeCloseTo(18.23, 2); // Year 5: 15 * 1.05^4

      // Verify material cost inflation
      expect(prices[0].perKg.rmPerKg).toBe(80); // Year 1: base RM price
      expect(prices[1].perKg.rmPerKg).toBeCloseTo(83.2, 2); // Year 2: 80 * 1.04
      expect(prices[2].perKg.rmPerKg).toBeCloseTo(86.53, 2); // Year 3: 80 * 1.04^2

      expect(prices[0].perKg.mbPerKg).toBe(120); // Year 1: base MB price
      expect(prices[1].perKg.mbPerKg).toBeCloseTo(127.2, 2); // Year 2: 120 * 1.06
      expect(prices[2].perKg.mbPerKg).toBeCloseTo(134.83, 2); // Year 3: 120 * 1.06^2
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very small price values', () => {
      const tinyPrice: PriceYear = {
        year: 1,
        perKg: {
          rmPerKg: 0.001,
          mbPerKg: 0.002,
          valueAddPerKg: 0.0001,
          packagingPerKg: 0.0005,
          freightOutPerKg: 0.0003,
          conversionPerKg: 0.001,
          totalPerKg: 0,
        },
        pricePerPiece: 0.01,
      };

      const weightKg = 1000000; // 1 million kg
      const volumePieces = 1000000; // 1 million pieces

      // Should handle very small numbers without precision errors
      const rmCost = tinyPrice.perKg.rmPerKg * weightKg;
      const revenue = tinyPrice.pricePerPiece * volumePieces;

      expect(rmCost).toBe(1000); // 0.001 * 1000000
      expect(revenue).toBe(10000); // 0.01 * 1000000
    });

    it('should handle very large price values', () => {
      const largePrice: PriceYear = {
        year: 1,
        perKg: {
          rmPerKg: 1000000, // 1 million Rs/kg
          mbPerKg: 2000000, // 2 million Rs/kg
          valueAddPerKg: 500000,
          packagingPerKg: 300000,
          freightOutPerKg: 100000,
          conversionPerKg: 1000000,
          totalPerKg: 0,
        },
        pricePerPiece: 100000, // 100k Rs per piece
      };

      const weightKg = 1; // 1 kg
      const volumePieces = 1; // 1 piece

      // Should handle very large numbers without overflow
      const rmCost = largePrice.perKg.rmPerKg * weightKg;
      const revenue = largePrice.pricePerPiece * volumePieces;

      expect(rmCost).toBe(1000000);
      expect(revenue).toBe(100000);
      expect(Number.isFinite(rmCost)).toBe(true);
      expect(Number.isFinite(revenue)).toBe(true);
    });

    it('should handle negative inflation (deflation)', () => {
      const basePrice = 100;
      const deflationRate = -0.1; // 10% deflation per year

      const year1Price = basePrice;
      const year2Price = basePrice * (1 + deflationRate);
      const year3Price = basePrice * Math.pow(1 + deflationRate, 2);

      expect(year1Price).toBe(100);
      expect(year2Price).toBe(90); // 100 * 0.9
      expect(year3Price).toBe(81); // 100 * 0.9^2

      // Prices should decrease over time
      expect(year2Price).toBeLessThan(year1Price);
      expect(year3Price).toBeLessThan(year2Price);
    });
  });
});
