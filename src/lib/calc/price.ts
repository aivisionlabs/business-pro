import {
  AltConversionInput,
  CostingInput,
  NpdInput,
  OpsInput,
  PriceComponentsPerKg,
  PriceYear,
  SalesInput,
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
  const packagingPerKgY1 = perPieceToPerKg(costing.packagingRsPerPiece, productWeightKg);
  const freightOutPerKgY1 = perPieceToPerKg(costing.freightOutRsPerPiece, productWeightKg);
  const mouldAmortPerKgY1 = perPieceToPerKg(sales.mouldAmortizationRsPerPiece, productWeightKg);
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
    costing.packagingRsPerPiece +
    costing.freightOutRsPerPiece +
    sales.mouldAmortizationRsPerPiece +
    conversionRsPerPiece;
  const pricePerPieceY1 = materialPerPieceY1 + perPieceItemsY1;
  const materialMarginPerPieceY1 = pricePerPieceY1 - materialPerPieceY1;

  for (let year = 1; year <= years; year += 1) {
    const idx = year - 1;
    // split into rmOnly and mbOnly so we can display components
    const rmOnlyPerKg = rmY1 * (rmInflFactors[idx] || 1);
    const mbOnlyPerKg = mbY1 * (rmInflFactors[idx] || 1);

    const valueAddPerKg = valueAddPerKgY1 * (convInflFactors[idx] || 1);
    const packagingPerKg = packagingPerKgY1 * (convInflFactors[idx] || 1);
    const freightOutPerKg = freightOutPerKgY1 * (convInflFactors[idx] || 1);
    const mouldAmortPerKg = mouldAmortPerKgY1 * (convInflFactors[idx] || 1);
    const conversionPerKg = conversionPerKgY1 * (convInflFactors[idx] || 1);

    const totalPerKg =
      rmOnlyPerKg +
      mbOnlyPerKg +
      valueAddPerKg +
      packagingPerKg +
      freightOutPerKg +
      mouldAmortPerKg +
      conversionPerKg;

    let pricePerPiece: number;
    if (sales.inflationPassThrough) {
      const materialPerPiece = (rmOnlyPerKg + mbOnlyPerKg) * productWeightKg;
      pricePerPiece = materialPerPiece + materialMarginPerPieceY1;
    } else {
      const factor = convInflFactors[idx] || 1;
      pricePerPiece = pricePerPieceY1 * factor;
    }

    const perKg: PriceComponentsPerKg = {
      rmPerKg: rmOnlyPerKg,
      mbPerKg: mbOnlyPerKg,
      valueAddPerKg,
      packagingPerKg,
      freightOutPerKg,
      mouldAmortPerKg,
      conversionPerKg,
      totalPerKg,
    };
    out.push({ year, perKg, pricePerPiece });
  }

  return out;
}


