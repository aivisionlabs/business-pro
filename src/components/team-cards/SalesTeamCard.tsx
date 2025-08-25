import React from "react";
import { Sku } from "@/lib/types";
import { LabeledInput } from "../common";
import { TeamCard } from "./TeamCard";

interface SalesTeamCardProps {
  sku: Sku;
  updateSku: (updater: (s: Sku) => Sku) => void;
  triggerAutoSave: () => void;
  progress: number;
  filledFields: number;
  totalFields: number;
}

export function SalesTeamCard({
  sku,
  updateSku,
  triggerAutoSave,
  progress,
  filledFields,
  totalFields,
}: SalesTeamCardProps) {
  return (
    <TeamCard
      title="Sales"
      team="Sales"
      progress={progress}
      filledFields={filledFields}
      totalFields={totalFields}
      isCollapsible={true}
      defaultCollapsed={true}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LabeledInput
          label="SKU Name"
          value={sku.name}
          onChange={(v) => updateSku((s) => ({ ...s, name: String(v) }))}
          onAutoSave={triggerAutoSave}
        />
        <LabeledInput
          label="Volume (pcs, Y1)"
          type="number"
          step={1}
          value={sku.sales.baseAnnualVolumePieces}
          onChange={(v) =>
            updateSku((s) => ({
              ...s,
              sales: { ...s.sales, baseAnnualVolumePieces: Number(v) },
            }))
          }
          onAutoSave={triggerAutoSave}
        />
        <LabeledInput
          label="Conversion Recovery (Rs/pc)"
          type="number"
          step={0.01}
          value={sku.sales.conversionRecoveryRsPerPiece || 0}
          onChange={(v) =>
            updateSku((s) => ({
              ...s,
              sales: {
                ...s.sales,
                conversionRecoveryRsPerPiece: Number(v),
              },
            }))
          }
          onAutoSave={triggerAutoSave}
        />
        <LabeledInput
          label="Weight (grams)"
          type="number"
          step={0.01}
          value={sku.sales.productWeightGrams}
          onChange={(v) =>
            updateSku((s) => ({
              ...s,
              sales: { ...s.sales, productWeightGrams: Number(v) },
            }))
          }
          onAutoSave={triggerAutoSave}
        />
      </div>
    </TeamCard>
  );
}
