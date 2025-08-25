export function formatCrores(n: number): string {
  const crores = n / 10000000; // Convert to crores
  return `₹${crores.toFixed(6).replace(/\.?0+$/, "")}`;
}

export function formatPerKg(n: number): string {
  // For per-kg values, show in rupees per kg with appropriate precision
  return `₹${n.toFixed(6).replace(/\.?0+$/, "")}`;
}

export function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
