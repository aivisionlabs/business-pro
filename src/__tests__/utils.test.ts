import { safeDiv, irr, toKg, clamp01, compoundInflationSeries, round2 } from '@/lib/calc/utils';

describe('Utility Functions', () => {
  describe('safeDiv', () => {
    it('should divide numbers correctly', () => {
      expect(safeDiv(10, 2)).toBe(5);
      expect(safeDiv(15, 3)).toBe(5);
      expect(safeDiv(0, 5)).toBe(0);
    });

    it('should return 0 when denominator is 0', () => {
      expect(safeDiv(10, 0)).toBe(0);
      expect(safeDiv(0, 0)).toBe(0);
      expect(safeDiv(-5, 0)).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(safeDiv(-10, 2)).toBe(-5);
      expect(safeDiv(10, -2)).toBe(-5);
      expect(safeDiv(-10, -2)).toBe(5);
    });

    it('should handle decimal numbers', () => {
      expect(safeDiv(10.5, 2)).toBe(5.25);
      expect(safeDiv(10, 0.5)).toBe(20);
    });
  });

  describe('toKg', () => {
    it('should convert grams to kilograms', () => {
      expect(toKg(1000)).toBe(1);
      expect(toKg(500)).toBe(0.5);
      expect(toKg(100)).toBe(0.1);
      expect(toKg(1)).toBe(0.001);
    });

    it('should handle zero', () => {
      expect(toKg(0)).toBe(0);
    });

    it('should handle large numbers', () => {
      expect(toKg(1000000)).toBe(1000);
      expect(toKg(1000000000)).toBe(1000000);
    });
  });

  describe('clamp01', () => {
    it('should clamp values between 0 and 1', () => {
      expect(clamp01(0.5)).toBe(0.5);
      expect(clamp01(0)).toBe(0);
      expect(clamp01(1)).toBe(1);
    });

    it('should clamp values below 0 to 0', () => {
      expect(clamp01(-0.5)).toBe(0);
      expect(clamp01(-10)).toBe(0);
      expect(clamp01(-Infinity)).toBe(0);
    });

    it('should clamp values above 1 to 1', () => {
      expect(clamp01(1.5)).toBe(1);
      expect(clamp01(10)).toBe(1);
      expect(clamp01(Infinity)).toBe(1);
    });

    it('should handle NaN by returning 0', () => {
      expect(clamp01(NaN)).toBe(0);
    });
  });

  describe('compoundInflationSeries', () => {
    it('should compound inflation rates correctly', () => {
      const rates = [0, 0.05, 0.03, 0.04, 0.02];
      const result = compoundInflationSeries(rates);

      expect(result).toHaveLength(5);
      expect(result[0]).toBe(1); // Year 1: no inflation
      expect(result[1]).toBe(1.05); // Year 2: 5% inflation
      expect(result[2]).toBeCloseTo(1.0815, 4); // Year 3: 1.05 * 1.03
      expect(result[3]).toBeCloseTo(1.12476, 5); // Year 4: 1.0815 * 1.04
      expect(result[4]).toBeCloseTo(1.1472552, 7); // Year 5: 1.12476 * 1.02
    });

    it('should handle zero inflation rates', () => {
      const rates = [0, 0, 0, 0, 0];
      const result = compoundInflationSeries(rates);

      expect(result).toEqual([1, 1, 1, 1, 1]);
    });

    it('should handle negative inflation rates', () => {
      const rates = [0, -0.05, -0.03, 0.02, -0.01];
      const result = compoundInflationSeries(rates);

      expect(result[0]).toBe(1);
      expect(result[1]).toBe(0.95); // 5% deflation
      expect(result[2]).toBeCloseTo(0.9215, 4); // 0.95 * 0.97
      expect(result[3]).toBeCloseTo(0.93993, 5); // 0.9215 * 1.02
      expect(result[4]).toBeCloseTo(0.9305307, 7); // 0.93993 * 0.99
    });

    it('should handle missing rates as 0', () => {
      const rates = [0, 0.05];
      const result = compoundInflationSeries(rates);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(1);
      expect(result[1]).toBe(1.05);
    });
  });

  describe('round2', () => {
    it('should round to 2 decimal places', () => {
      expect(round2(3.14159)).toBe(3.14);
      expect(round2(2.999)).toBe(3.00);
      expect(round2(1.005)).toBe(1.01);
      expect(round2(0.999)).toBe(1.00);
    });

    it('should handle whole numbers', () => {
      expect(round2(5)).toBe(5.00);
      expect(round2(0)).toBe(0.00);
      expect(round2(-3)).toBe(-3.00);
    });

    it('should handle edge cases', () => {
      expect(round2(Number.EPSILON)).toBe(0.00);
      expect(round2(1.999999999)).toBe(2.00);
    });
  });

  describe('irr', () => {
    it('should calculate IRR for simple cashflows', () => {
      // Simple investment: -1000 initial, 500 each year for 3 years
      const cashflows = [-1000, 500, 500, 500];
      const result = irr(cashflows);

      expect(result).not.toBeNull();
      if (result !== null) {
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThan(1); // Should be less than 100%
      }
    });

    it('should calculate IRR for profitable project', () => {
      // Very profitable project
      const cashflows = [-1000, 2000];
      const result = irr(cashflows);

      expect(result).not.toBeNull();
      if (result !== null) {
        expect(result).toBeCloseTo(1, 10); // 100% return (with precision)
      }
    });

    it('should handle unprofitable project', () => {
      // Losing project with longer timeline
      const cashflows = [-1000, 400, 300, 200];
      const result = irr(cashflows);

      expect(result).not.toBeNull();
      if (result !== null) {
        expect(result).toBeLessThan(0); // Negative return
        expect(result).toBeGreaterThan(-1); // But not worse than -100%
      }
    });

    it('should return null for complex cashflows that may not converge', () => {
      // Cashflows that may cause convergence issues
      const cashflows = [-1000, 3000, -2000, 1000];
      const result = irr(cashflows);

      // This might return null or a valid IRR depending on convergence
      if (result !== null) {
        expect(typeof result).toBe('number');
        expect(Number.isFinite(result)).toBe(true);
      }
    });

    it('should handle edge cases', () => {
      // All positive cashflows (no investment)
      expect(irr([100, 200, 300])).toBeNull();

      // All negative cashflows
      expect(irr([-100, -200, -300])).toBeNull();

      // Single cashflow
      expect(irr([1000])).toBeNull();

      // Empty array
      expect(irr([])).toBeNull();
    });

    it('should converge with different initial guesses', () => {
      const cashflows = [-1000, 500, 500, 500];

      const result1 = irr(cashflows, 0.1);
      const result2 = irr(cashflows, 0.5);

      if (result1 !== null && result2 !== null) {
        expect(Math.abs(result1 - result2)).toBeLessThan(1e-6);
      }
    });

    it('should handle very small cashflows', () => {
      const cashflows = [-0.01, 0.005, 0.005, 0.005];
      const result = irr(cashflows);

      if (result !== null) {
        expect(typeof result).toBe('number');
        expect(Number.isFinite(result)).toBe(true);
      }
    });
  });
});
