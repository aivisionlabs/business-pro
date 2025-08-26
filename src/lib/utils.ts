export function formatCrores(n: number, precision: number = 2): string {
  const crores = n / 10000000; // Convert to crores
  return `₹${crores.toFixed(precision)}`;
}

export function formatPerKg(n: number, precision: number = 2): string {
  // For per-kg values, show in rupees per kg with appropriate precision
  return `₹${n.toFixed(precision)}`;
}

export function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
