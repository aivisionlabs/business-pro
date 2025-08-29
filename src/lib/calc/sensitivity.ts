import { BusinessCase } from '@/lib/types';

export type SensVar = {
  id: string;
  label: string;
};

export const VARIABLES: SensVar[] = [
  { id: "volume", label: "Volume" },
  { id: "conversionRecovery", label: "Conversion Recovery" },
  { id: "resinPrice", label: "Resin price" },
  { id: "conversionCost", label: "Conversion cost" },
  { id: "oee", label: "Operating Efficiency" },
  { id: "machineCost", label: "Machine Cost" },
  { id: "mouldCost", label: "Mould Cost" },
  { id: "sga", label: "S, G&A" },
];

export function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function getVariableValue(s: BusinessCase, varId: string): any {
  switch (varId) {
    case "volume":
      return s.skus.map((sku) => sku.sales.baseAnnualVolumePieces);
    case "conversionRecovery":
      return s.skus.map((sku) => sku.sales.conversionRecoveryRsPerPiece);
    case "resinPrice":
      return s.skus.map((sku) => ({
        resin: sku.costing.resinRsPerKg,
        mb: sku.costing.mbRsPerKg,
      }));
    case "conversionCost":
      return s.skus.map((sku) => sku.plantMaster.conversionPerKg);
    case "oee":
      return s.skus.map((sku) => sku.ops.oee);
    case "machineCost":
      return s.skus.map((sku) => sku.ops.costOfNewMachine);
    case "mouldCost":
      return s.skus.map((sku) => sku.ops.costOfNewMould);
    case "sga":
      return s.skus.map(
        (sku) => sku.plantMaster.sellingGeneralAndAdministrativeExpensesPerKg
      );
    default:
      return "unknown";
  }
}

export function applyDelta(
  s: BusinessCase,
  v: SensVar,
  deltaPct: number
): BusinessCase {
  const b = clone(s);

  // Apply delta to all SKUs
  b.skus.forEach((sku, index) => {
    switch (v.id) {
      case "volume":
        const oldVolume = sku.sales.baseAnnualVolumePieces;
        sku.sales.baseAnnualVolumePieces = Math.max(
          0,
          Math.round(sku.sales.baseAnnualVolumePieces * (1 + deltaPct))
        );
        break;
      case "conversionRecovery":
        if (sku.sales.conversionRecoveryRsPerPiece !== undefined) {
          const oldConv = sku.sales.conversionRecoveryRsPerPiece;
          sku.sales.conversionRecoveryRsPerPiece = Math.max(
            0,
            sku.sales.conversionRecoveryRsPerPiece * (1 + deltaPct)
          );
        }
        break;
      case "resinPrice":
        const oldResin = sku.costing.resinRsPerKg;
        const oldMb = sku.costing.mbRsPerKg;
        sku.costing.resinRsPerKg = Math.max(
          0,
          sku.costing.resinRsPerKg * (1 + deltaPct)
        );
        sku.costing.mbRsPerKg = Math.max(
          0,
          sku.costing.mbRsPerKg * (1 + deltaPct)
        );
        break;
      case "conversionCost":
        const oldConvCost = sku.plantMaster.conversionPerKg;
        sku.plantMaster.conversionPerKg = Math.max(
          0,
          sku.plantMaster.conversionPerKg * (1 + deltaPct)
        );
        break;
      case "oee":
        const oldOee = sku.ops.oee;
        sku.ops.oee = Math.min(1, sku.ops.oee * (1 + deltaPct));
        break;
      case "machineCost":
        const oldMachineCost = sku.ops.costOfNewMachine;
        sku.ops.costOfNewMachine = Math.max(
          0,
          sku.ops.costOfNewMachine * (1 + deltaPct)
        );
        break;
      case "mouldCost":
        const oldMouldCost = sku.ops.costOfNewMould;
        sku.ops.costOfNewMould = Math.max(
          0,
          sku.ops.costOfNewMould * (1 + deltaPct)
        );
        break;
      case "sga":
        const oldSga = sku.plantMaster.sellingGeneralAndAdministrativeExpensesPerKg;
        sku.plantMaster.sellingGeneralAndAdministrativeExpensesPerKg = Math.max(
          0,
          sku.plantMaster.sellingGeneralAndAdministrativeExpensesPerKg * (1 + deltaPct)
        );
        break;
    }
  });

  return b;
}

