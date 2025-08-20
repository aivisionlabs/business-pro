export function formatCrores(n: number): string {
  const crores = n / 10000000; // Convert to crores
  return `₹${crores.toFixed(2).replace(/\.?0+$/, "")} Cr`;
}

export function formatPerKg(n: number): string {
  // For per-kg values, show in rupees per kg with appropriate precision
  if (n >= 1000) {
    return `₹${(n / 1000).toFixed(2).replace(/\.?0+$/, "")}K/kg`;
  } else if (n >= 1) {
    return `₹${n.toFixed(2).replace(/\.?0+$/, "")}/kg`;
  } else {
    return `₹${(n * 1000).toFixed(0)}/g`;
  }
}

export function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
