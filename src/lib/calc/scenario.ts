import { BusinessCase } from '@/lib/types';

export function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function applyScenario(
  s: BusinessCase,
  opts: Partial<{
    volumePct: number;
    conversionRecoveryPct: number;
    conversionCostPct: number;
    wcDaysPct: number;
  }>
): BusinessCase {
  const b = clone(s);
  const vol = opts.volumePct ?? 0;
  const convRec = opts.conversionRecoveryPct ?? 0;
  const convCost = opts.conversionCostPct ?? 0;
  const wcDays = opts.wcDaysPct ?? 0;

  b.skus.forEach((sku) => {
    if (vol !== 0) {
      sku.sales.baseAnnualVolumePieces = Math.max(
        0,
        Math.round(sku.sales.baseAnnualVolumePieces * (1 + vol / 100))
      );
    }

    if (convRec !== 0 && sku.sales.conversionRecoveryRsPerPiece !== undefined) {
      sku.sales.conversionRecoveryRsPerPiece = Math.max(
        0,
        sku.sales.conversionRecoveryRsPerPiece * (1 + convRec / 100)
      );
    }

    if (convCost !== 0) {
      sku.plantMaster.conversionPerKg = Math.max(
        0,
        sku.plantMaster.conversionPerKg * (1 + convCost / 100)
      );
    }

    // Working capital days: apply delta relative to baseline (use 60 if undefined or 0)
    if (wcDays !== 0) {
      const current = sku.ops?.workingCapitalDays;
      const baselineDays =
        current === undefined || current === null || current === 0
          ? 60
          : current;
      if (!sku.ops) sku.ops = {} as any;
      sku.ops.workingCapitalDays = Math.max(
        0,
        Math.round(baselineDays * (1 + wcDays / 100))
      );
    }
  });

  return b;
}
