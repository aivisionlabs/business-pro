import { computeCapacity, computeVolumes } from '@/lib/calc/capacity';
import { NpdInput, OpsInput } from '@/lib/types';

describe('Capacity Calculations', () => {
  describe('computeCapacity', () => {
    let testNpd: NpdInput;
    let testOps: OpsInput;

    beforeEach(() => {
      testNpd = {
        machineName: 'Test Machine',
        cavities: 4,
        cycleTimeSeconds: 30,
        plant: 'Test Plant',
        polymer: 'PP',
        masterbatch: 'Black',
        mouldCost: 50000,
      };

      testOps = {
        powerUnitsPerHour: 10,
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
    });

    it('should calculate capacity correctly with standard inputs', () => {
      const result = computeCapacity(testNpd, testOps);

      // Units per hour = cavities * (60/cycleTime) * OEE
      const expectedUnitsPerHour = 4 * (60 / 30) * 0.85; // 4 * 2 * 0.85 = 6.8
      expect(result.unitsPerHour).toBeCloseTo(expectedUnitsPerHour, 2);

      // Units per day = units per hour * operating hours
      const expectedUnitsPerDay = expectedUnitsPerHour * 24;
      expect(result.unitsPerDay).toBeCloseTo(expectedUnitsPerDay, 2);

      // Annual capacity = units per day * working days
      const expectedAnnualCapacity = expectedUnitsPerDay * 365;
      expect(result.annualCapacityPieces).toBeCloseTo(expectedAnnualCapacity, 2);
    });

    it('should use default operating parameters when not specified', () => {
      const minimalOps = { ...testOps };
      delete minimalOps.operatingHoursPerDay;
      delete minimalOps.workingDaysPerYear;

      const result = computeCapacity(testNpd, minimalOps);

      // Should use defaults: 24 hours/day, 365 days/year
      const expectedUnitsPerHour = 4 * (60 / 30) * 0.85;
      const expectedUnitsPerDay = expectedUnitsPerHour * 24;
      const expectedAnnualCapacity = expectedUnitsPerDay * 365;

      expect(result.unitsPerDay).toBeCloseTo(expectedUnitsPerDay, 2);
      expect(result.annualCapacityPieces).toBeCloseTo(expectedAnnualCapacity, 2);
    });

    it('should handle different cavity configurations', () => {
      const singleCavityNpd = { ...testNpd, cavities: 1 };
      const multiCavityNpd = { ...testNpd, cavities: 8 };

      const singleResult = computeCapacity(singleCavityNpd, testOps);
      const multiResult = computeCapacity(multiCavityNpd, testOps);

      // Multi-cavity should be 8x single-cavity
      expect(multiResult.unitsPerHour).toBeCloseTo(singleResult.unitsPerHour * 8, 2);
      expect(multiResult.annualCapacityPieces).toBeCloseTo(singleResult.annualCapacityPieces * 8, 2);
    });

    it('should handle different cycle times', () => {
      const fastCycleNpd = { ...testNpd, cycleTimeSeconds: 15 };
      const slowCycleNpd = { ...testNpd, cycleTimeSeconds: 60 };

      const fastResult = computeCapacity(fastCycleNpd, testOps);
      const slowResult = computeCapacity(slowCycleNpd, testOps);

      // Fast cycle should be 4x slow cycle (60/15 = 4)
      expect(fastResult.unitsPerHour).toBeCloseTo(slowResult.unitsPerHour * 4, 2);
    });

    it('should handle different OEE values', () => {
      const highOeeOps = { ...testOps, oee: 0.95 };
      const lowOeeOps = { ...testOps, oee: 0.70 };

      const highResult = computeCapacity(testNpd, highOeeOps);
      const lowResult = computeCapacity(testNpd, lowOeeOps);

      // High OEE should be higher than low OEE
      expect(highResult.unitsPerHour).toBeGreaterThan(lowResult.unitsPerHour);
      expect(highResult.annualCapacityPieces).toBeGreaterThan(lowResult.annualCapacityPieces);

      // Ratio should match OEE ratio
      const oeeRatio = 0.95 / 0.70;
      expect(highResult.unitsPerHour / lowResult.unitsPerHour).toBeCloseTo(oeeRatio, 2);
    });

    it('should handle different operating schedules', () => {
      const partTimeOps = { ...testOps, operatingHoursPerDay: 8, workingDaysPerYear: 250 };
      const fullTimeOps = { ...testOps, operatingHoursPerDay: 24, workingDaysPerYear: 365 };

      const partTimeResult = computeCapacity(testNpd, partTimeOps);
      const fullTimeResult = computeCapacity(testNpd, fullTimeOps);

      // Full time should be higher
      expect(fullTimeResult.annualCapacityPieces).toBeGreaterThan(partTimeResult.annualCapacityPieces);

      // Calculate expected ratio
      const hoursRatio = 24 / 8;
      const daysRatio = 365 / 250;
      const expectedRatio = hoursRatio * daysRatio;

      expect(fullTimeResult.annualCapacityPieces / partTimeResult.annualCapacityPieces).toBeCloseTo(expectedRatio, 2);
    });

    it('should handle edge cases', () => {
      // Zero cavities
      const zeroCavityNpd = { ...testNpd, cavities: 0 };
      const zeroResult = computeCapacity(zeroCavityNpd, testOps);
      expect(zeroResult.unitsPerHour).toBe(0);
      expect(zeroResult.annualCapacityPieces).toBe(0);

      // Zero cycle time (should handle gracefully)
      const zeroCycleNpd = { ...testNpd, cycleTimeSeconds: 0 };
      const zeroCycleResult = computeCapacity(zeroCycleNpd, testOps);
      expect(Number.isFinite(zeroCycleResult.unitsPerHour)).toBe(false); // Division by zero = Infinity

      // Zero OEE
      const zeroOeeOps = { ...testOps, oee: 0 };
      const zeroOeeResult = computeCapacity(testNpd, zeroOeeOps);
      expect(zeroOeeResult.unitsPerHour).toBe(0);
      expect(zeroOeeResult.annualCapacityPieces).toBe(0);
    });
  });

  describe('computeVolumes', () => {
    it('should calculate volumes correctly with growth rates', () => {
      const productWeightGrams = 100; // 0.1 kg
      const baseAnnualVolumePieces = 10000;

      const result = computeVolumes(productWeightGrams, baseAnnualVolumePieces);

      expect(result).toHaveLength(5);

      // Year 1: base volume
      expect(result[0].year).toBe(1);
      expect(result[0].volumePieces).toBe(10000);
      expect(result[0].weightKg).toBe(1000); // 10000 * 0.1kg (100g = 0.1kg)

      // Year 2: 10% growth
      expect(result[1].year).toBe(2);
      expect(result[1].volumePieces).toBe(11000);
      expect(result[1].weightKg).toBe(1100);

      // Year 3: 15% growth from Y2
      expect(result[2].year).toBe(3);
      expect(result[2].volumePieces).toBeCloseTo(12650, 0); // 11000 * 1.15 (fixed precision)
      expect(result[2].weightKg).toBe(1265);

      // Year 4: 20% growth from Y3
      expect(result[3].year).toBe(4);
      expect(result[3].volumePieces).toBeCloseTo(15180, 0); // 12650 * 1.20 (fixed precision)
      expect(result[3].weightKg).toBe(1518);

      // Year 5: 25% growth from Y4
      expect(result[4].year).toBe(5);
      expect(result[4].volumePieces).toBeCloseTo(18975, 0); // 15180 * 1.25 (fixed precision)
      expect(result[4].weightKg).toBeCloseTo(1897.5, 1); // Fixed precision
    });

    it('should handle zero growth rates', () => {
      const productWeightGrams = 200; // 0.2 kg
      const baseAnnualVolumePieces = 5000;

      const result = computeVolumes(productWeightGrams, baseAnnualVolumePieces);

      expect(result).toHaveLength(5);

      // All years should have same volume
      result.forEach(yearData => {
        expect(yearData.volumePieces).toBe(5000);
        expect(yearData.weightKg).toBe(1000); // 5000 * 0.2kg (200g = 0.2kg)
      });
    });

    it('should handle negative growth rates', () => {
      const productWeightGrams = 150; // 0.15 kg
      const baseAnnualVolumePieces = 8000;

      const result = computeVolumes(productWeightGrams, baseAnnualVolumePieces);

      expect(result).toHaveLength(5);

      // Year 1: base volume
      expect(result[0].volumePieces).toBe(8000);
      expect(result[0].weightKg).toBe(1200); // 8000 * 0.15kg (150g = 0.15kg)

      // Year 2: 10% decline
      expect(result[1].volumePieces).toBe(7200); // 8000 * 0.9
      expect(result[1].weightKg).toBe(1080);

      // Year 3: 15% decline from Y2
      expect(result[2].volumePieces).toBe(6120); // 7200 * 0.85
      expect(result[2].weightKg).toBe(918);
    });

    it('should handle different product weights', () => {
      const baseAnnualVolumePieces = 10000;

      // Light product
      const lightResult = computeVolumes(10, baseAnnualVolumePieces);
      expect(lightResult[0].weightKg).toBe(100); // 10000 * 0.01kg (10g = 0.01kg)

      // Heavy product
      const heavyResult = computeVolumes(1000, baseAnnualVolumePieces);
      expect(heavyResult[0].weightKg).toBe(10000); // 10000 * 1kg (1000g = 1kg)

      // Very heavy product
      const veryHeavyResult = computeVolumes(10000, baseAnnualVolumePieces);
      expect(veryHeavyResult[0].weightKg).toBe(100000); // 10000 * 10kg (10000g = 10kg)
    });

    it('should handle edge cases', () => {
      // Zero base volume
      const zeroVolumeResult = computeVolumes(100, 0);
      expect(zeroVolumeResult[0].volumePieces).toBe(0);
      expect(zeroVolumeResult[0].weightKg).toBe(0);

      // Zero product weight
      const zeroWeightResult = computeVolumes(0, 10000);
      expect(zeroWeightResult[0].weightKg).toBe(0);

      // Very small product weight
      const tinyWeightResult = computeVolumes(0.001, 10000);
      expect(tinyWeightResult[0].weightKg).toBe(0.01); // 10000 * 0.000001kg
    });

    it('should handle missing growth rates', () => {
      const productWeightGrams = 100;
      const baseAnnualVolumePieces = 10000;

      const result = computeVolumes(productWeightGrams, baseAnnualVolumePieces);

      expect(result).toHaveLength(5);

      // Years with missing growth rates should use 0 (no growth)
      expect(result[0].volumePieces).toBe(10000);
      expect(result[1].volumePieces).toBe(11000);
      expect(result[2].volumePieces).toBe(11000); // No growth from Y2
      expect(result[3].volumePieces).toBe(11000); // No growth from Y3
      expect(result[4].volumePieces).toBe(11000); // No growth from Y4
    });

    it('should maintain precision for large numbers', () => {
      const productWeightGrams = 100;
      const baseAnnualVolumePieces = 1000000; // 1 million pieces

      const result = computeVolumes(productWeightGrams, baseAnnualVolumePieces);

      expect(result[0].volumePieces).toBe(1000000);
      expect(result[0].weightKg).toBe(100000); // 1 million * 0.1kg

      // Year 5 should have compounded growth
      const expectedYear5Volume = 1000000 * Math.pow(1.05, 4);
      expect(result[4].volumePieces).toBeCloseTo(expectedYear5Volume, 0);
    });
  });
});
