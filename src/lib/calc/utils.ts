/**
 * Essential utility functions for calculations
 * Only contains pure, reusable functions
 */

export function toKg(grams: number): number {
  return grams / 1000;
}

export function compoundInflationSeries(rates: number[]): number[] {
  // expects length 5 series, where index 0 is Y1 rate (usually 0)
  // extends to 10 years by repeating the last rate for years 6-10
  const out: number[] = [];
  let acc = 1;

  // Process the provided rates
  for (let i = 0; i < rates.length; i += 1) {
    acc *= 1 + (rates[i] || 0);
    out.push(acc);
  }

  // Extend to 10 years by repeating the last rate
  const lastRate = rates[rates.length - 1] || 0;
  for (let i = rates.length; i < 10; i += 1) {
    acc *= 1 + lastRate;
    out.push(acc);
  }

  return out;
}

export function safeDiv(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return numerator / denominator;
}

/**
 * Format payback period in years with appropriate precision
 * @param years - Payback period in years
 * @returns Formatted string (e.g., "3.2y" or "—" if null)
 */
export function formatPaybackPeriod(years: number | null): string {
  if (years === null || years === undefined) return "—";
  return `${years.toFixed(1)}y`;
}

export function irr(cashflows: number[], guess = 0.1): number | null {
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

/**
 * Production capacity calculation functions
 */

/**
 * Calculate daily production capacity for a SKU
 * @param cavities - Number of cavities in the mould
 * @param cycleTimeSeconds - Cycle time in seconds
 * @param oee - Overall Equipment Effectiveness (0-1)
 * @returns Daily production capacity in pieces
 */
export function calculateDailyProductionCapacity(
  cavities: number,
  cycleTimeSeconds: number,
  oee: number
): number {
  // Handle edge case: division by zero
  if (cycleTimeSeconds <= 0) {
    return 0;
  }

  // Daily Capacity (in pieces) = (Cavity * 3600 * 24 * OEE) / Cycle Time (in seconds)
  // 3600 seconds per hour * 24 hours per day = 86400 seconds per day
  const dailyCapacity = (cavities * 86400 * oee) / cycleTimeSeconds;
  return dailyCapacity;
}

/**
 * Calculate utilization days for a SKU
 * @param annualVolumePieces - Annual volume in pieces
 * @param dailyCapacity - Daily production capacity in pieces
 * @returns Utilization days required
 */
export function calculateUtilizationDays(
  annualVolumePieces: number,
  dailyCapacity: number
): number {
  // Utilization Days = Total volume (in pieces) / Daily Capacity (in pieces)
  const utilizationDays = annualVolumePieces / dailyCapacity;
  return utilizationDays;
}

/**
 * Calculate production metrics for a complete SKU
 * @param sku - The SKU object containing all required data
 * @returns Object with dailyCapacity and utilizationDays
 */
export function calculateProductionMetrics(sku: {
  npd: { cavities: number; cycleTimeSeconds: number };
  ops: { oee: number };
  sales: { baseAnnualVolumePieces: number };
}) {
  const dailyCapacity = calculateDailyProductionCapacity(
    sku.npd.cavities,
    sku.npd.cycleTimeSeconds,
    sku.ops.oee
  );

  const utilizationDays = calculateUtilizationDays(
    sku.sales.baseAnnualVolumePieces,
    dailyCapacity
  );

  return {
    dailyCapacity,
    utilizationDays,
  };
}



