/**
 * Essential utility functions for calculations
 * Only contains pure, reusable functions
 */

export function toKg(grams: number): number {
  return grams / 1000;
}

export function compoundInflationSeries(rates: number[]): number[] {
  // expects length 5 series, where index 0 is Y1 rate (usually 0)
  const out: number[] = [];
  let acc = 1;
  for (let i = 0; i < rates.length; i += 1) {
    acc *= 1 + (rates[i] || 0);
    out.push(acc);
  }
  return out;
}

export function safeDiv(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return numerator / denominator;
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



