import {
  AltConversionInput,
  CostingInput,
  NpdInput,
  OpsInput,
  PriceComponentsPerKg,
  PriceYear,
  SalesInput,
  SkuCalcOutput,
  PnlYear,
  WeightedAvgPricePerKgYear,
} from "@/lib/types";
import { compoundInflationSeries, toKg } from "./utils";
import { computeCapacity } from "./capacity";

function computeRmMbPerKg(costing: CostingInput): { rmY1: number; mbY1: number } {
  const resinNet = Math.max(
    0,
    costing.resinRsPerKg * (1 - (costing.resinDiscountPct || 0))
  ) + (costing.freightInwardsRsPerKg || 0);
  const rmY1 = resinNet * (1 + (costing.wastagePct || 0));
  const mbBase = costing.useMbPriceOverride === false ? resinNet : costing.mbRsPerKg;
  const mbY1 = mbBase * (costing.mbRatioPct || 0) * (1 + (costing.wastagePct || 0));
  return { rmY1, mbY1 };
}

function perPieceToPerKg(valuePerPiece: number, productWeightKg: number): number {
  return productWeightKg > 0 ? valuePerPiece / productWeightKg : 0;
}

export function buildPriceByYear(
  sales: SalesInput,
  costing: CostingInput,
  npd: NpdInput,
  ops: OpsInput,
  alt?: AltConversionInput
): PriceYear[] {
  const productWeightKg = toKg(sales.productWeightGrams);
  const { rmY1, mbY1 } = computeRmMbPerKg(costing);

  // Determine conversion recovery per piece (explicit or from machine rate)
  let conversionRsPerPiece = sales.conversionRecoveryRsPerPiece ?? 0;
  if ((conversionRsPerPiece || 0) <= 0 && alt?.machineRatePerDayRs) {
    const { unitsPerDay } = computeCapacity(npd, ops);
    conversionRsPerPiece = alt.machineRatePerDayRs / (unitsPerDay || 1);
  }

  const valueAddPerKgY1 = perPieceToPerKg(costing.valueAddRsPerPiece, productWeightKg);
  // Prefer Rs/kg; fallback to per-piece if needed
  const packagingPerKgY1 =
    (costing.packagingRsPerKg ?? 0) || perPieceToPerKg(costing.packagingRsPerPiece || 0, productWeightKg);
  const freightOutPerKgY1 =
    (costing.freightOutRsPerKg ?? 0) || perPieceToPerKg(costing.freightOutRsPerPiece || 0, productWeightKg);
  const conversionPerKgY1 = perPieceToPerKg(conversionRsPerPiece, productWeightKg);

  const rmInflFactors = compoundInflationSeries(costing.rmInflationPct);
  const convInflFactors = compoundInflationSeries(costing.conversionInflationPct);

  const years = 5;
  const out: PriceYear[] = [];

  const materialPerKgY1 = rmY1 + mbY1;
  // const perPieceItemsPerKgY1 =
  //   valueAddPerKgY1 +
  //   packagingPerKgY1 +
  //   freightOutPerKgY1 +
  //   mouldAmortPerKgY1 +
  //   conversionPerKgY1;
  // const pricePerKgY1 = materialPerKgY1 + perPieceItemsPerKgY1;
  const materialPerPieceY1 = materialPerKgY1 * productWeightKg;
  const perPieceItemsY1 =
    costing.valueAddRsPerPiece +
    // Convert Rs/kg inputs back to per piece using weight
    packagingPerKgY1 * productWeightKg +
    freightOutPerKgY1 * productWeightKg +
    conversionRsPerPiece;
  const pricePerPieceY1 = materialPerPieceY1 + perPieceItemsY1;


  for (let year = 1; year <= years; year += 1) {
    const idx = year - 1;
    // split into rmOnly and mbOnly so we can display components
    const rmOnlyPerKg = rmY1 * (rmInflFactors[idx] || 1);
    const mbOnlyPerKg = mbY1 * (rmInflFactors[idx] || 1);

    const valueAddPerKg = valueAddPerKgY1 * (convInflFactors[idx] || 1);
    const packagingPerKg = packagingPerKgY1 * (convInflFactors[idx] || 1);
    const freightOutPerKg = freightOutPerKgY1 * (convInflFactors[idx] || 1);
    const conversionPerKg = conversionPerKgY1 * (convInflFactors[idx] || 1);

    const totalPerKg =
      rmOnlyPerKg +
      mbOnlyPerKg +
      valueAddPerKg +
      packagingPerKg +
      freightOutPerKg +
      conversionPerKg;

    const factor = convInflFactors[idx] || 1;
    const pricePerPiece = pricePerPieceY1 * factor;


    const perKg: PriceComponentsPerKg = {
      rmPerKg: rmOnlyPerKg,
      mbPerKg: mbOnlyPerKg,
      valueAddPerKg,
      packagingPerKg,
      freightOutPerKg,
      conversionPerKg,
      totalPerKg,
    };
    out.push({ year, perKg, pricePerPiece });
  }

  return out;
}

export function buildWeightedAvgPricePerKg(
  bySku: SkuCalcOutput[],
  volumes: { year: number; volumePieces: number; weightKg: number }[]
): PriceYear[] {
  const years = 5;
  const out: PriceYear[] = [];

  for (let year = 1; year <= years; year += 1) {
    const idx = year - 1;
    const yearVolumes = volumes[idx];
    const totalWeightKg = yearVolumes?.weightKg || 0;

    if (totalWeightKg <= 0) {
      // Fallback to first SKU if no weight
      const firstSku = bySku[0];
      if (firstSku?.prices[idx]) {
        out.push(firstSku.prices[idx]);
      }
      continue;
    }

    // Calculate weighted averages for each price component
    let rmPerKg = 0;
    let mbPerKg = 0;
    let valueAddPerKg = 0;
    let packagingPerKg = 0;
    let freightOutPerKg = 0;
    let conversionPerKg = 0;

    for (const sku of bySku) {
      const skuPrice = sku.prices[idx];
      const skuVolume = sku.volumes[idx];

      if (!skuPrice || !skuVolume) continue;

      const weight = skuVolume.weightKg;
      const weightRatio = weight / totalWeightKg;

      rmPerKg += skuPrice.perKg.rmPerKg * weightRatio;
      mbPerKg += skuPrice.perKg.mbPerKg * weightRatio;
      valueAddPerKg += skuPrice.perKg.valueAddPerKg * weightRatio;
      packagingPerKg += skuPrice.perKg.packagingPerKg * weightRatio;
      freightOutPerKg += skuPrice.perKg.freightOutPerKg * weightRatio;
      conversionPerKg += skuPrice.perKg.conversionPerKg * weightRatio;
    }

    const totalPerKg = rmPerKg + mbPerKg + valueAddPerKg + packagingPerKg +
      freightOutPerKg + conversionPerKg;

    // Calculate weighted average price per piece
    let pricePerPiece = 0;
    for (const sku of bySku) {
      const skuPrice = sku.prices[idx];
      const skuVolume = sku.volumes[idx];

      if (!skuPrice || !skuVolume) continue;

      const weight = skuVolume.weightKg;
      const weightRatio = weight / totalWeightKg;
      pricePerPiece += skuPrice.pricePerPiece * weightRatio;
    }

    const perKg: PriceComponentsPerKg = {
      rmPerKg,
      mbPerKg,
      valueAddPerKg,
      packagingPerKg,
      freightOutPerKg,
      conversionPerKg,
      totalPerKg,
    };

    out.push({ year, perKg, pricePerPiece });
  }

  return out;
}

export function buildWeightedAvgPricePerKgTable(
  bySku: SkuCalcOutput[],
  pnl: PnlYear[],
  volumes: { year: number; volumePieces: number; weightKg: number }[]
): WeightedAvgPricePerKgYear[] {
  const years = 5;
  const out: WeightedAvgPricePerKgYear[] = [];

  for (let year = 1; year <= years; year += 1) {
    const idx = year - 1;
    const yearPnl = pnl[idx];
    const yearVolumes = volumes[idx];
    const totalWeightKg = yearVolumes?.weightKg || 0;

    if (!yearPnl || totalWeightKg <= 0) {
      // Create empty entry if no data
      out.push({
        year,
        revenueNetPerKg: 0,
        materialCostPerKg: 0,
        materialMarginPerKg: 0,
        conversionCostPerKg: 0,
        grossMarginPerKg: 0,
        sgaCostPerKg: 0,
        ebitdaPerKg: 0,
        depreciationPerKg: 0,
        ebitPerKg: 0,
        pbtPerKg: 0,
        patPerKg: 0,
      });
      continue;
    }

    // Convert P&L values to per-kg by dividing by total weight
    const revenueNetPerKg = yearPnl.revenueNet / totalWeightKg;
    const materialCostPerKg = yearPnl.materialCost / totalWeightKg;
    const materialMarginPerKg = yearPnl.materialMargin / totalWeightKg;
    const conversionCostPerKg = yearPnl.conversionCost / totalWeightKg;
    const grossMarginPerKg = yearPnl.grossMargin / totalWeightKg;
    const sgaCostPerKg = yearPnl.sgaCost / totalWeightKg;
    const ebitdaPerKg = yearPnl.ebitda / totalWeightKg;
    const depreciationPerKg = yearPnl.depreciation / totalWeightKg;
    const ebitPerKg = yearPnl.ebit / totalWeightKg;
    const pbtPerKg = yearPnl.pbt / totalWeightKg;
    const patPerKg = yearPnl.pat / totalWeightKg;

    out.push({
      year,
      revenueNetPerKg,
      materialCostPerKg,
      materialMarginPerKg,
      conversionCostPerKg,
      grossMarginPerKg,
      sgaCostPerKg,
      ebitdaPerKg,
      depreciationPerKg,
      ebitPerKg,
      pbtPerKg,
      patPerKg,
    });
  }

  return out;
}


