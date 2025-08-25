import React from "react";
import { Sku, PlantMaster } from "@/lib/types";
import { LabeledInput, LabeledSelect } from "../common";
import { TeamCard } from "./TeamCard";

interface NpdTeamCardProps {
  sku: Sku;
  plantOptions: PlantMaster[];
  updateSku: (updater: (s: Sku) => Sku) => void;
  triggerAutoSave: () => void;
  progress: number;
  filledFields: number;
  totalFields: number;
}

export function NpdTeamCard({
  sku,
  plantOptions,
  updateSku,
  triggerAutoSave,
  progress,
  filledFields,
  totalFields,
}: NpdTeamCardProps) {
  return (
    <TeamCard
      title="New Product Development"
      team="NPD"
      progress={progress}
      filledFields={filledFields}
      totalFields={totalFields}
      isCollapsible={true}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LabeledInput
          label="Cavities"
          type="number"
          step={1}
          value={sku.npd.cavities}
          onChange={(v) =>
            updateSku((s) => ({
              ...s,
              npd: { ...s.npd, cavities: Number(v) },
            }))
          }
          onAutoSave={triggerAutoSave}
        />
        <LabeledInput
          label="Cycle Time (sec)"
          type="number"
          step={0.01}
          value={sku.npd.cycleTimeSeconds}
          onChange={(v) =>
            updateSku((s) => ({
              ...s,
              npd: { ...s.npd, cycleTimeSeconds: Number(v) },
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
        <LabeledSelect
          label="Plant"
          value={sku.plantMaster.plant}
          onChange={(val) => {
            const pm =
              plantOptions.find((p) => p.plant === val) || plantOptions[0];
            updateSku((s) => ({ ...s, plantMaster: pm }));
          }}
          options={plantOptions.map((p) => p.plant)}
          onAutoSave={triggerAutoSave}
        />
      </div>
    </TeamCard>
  );
}
