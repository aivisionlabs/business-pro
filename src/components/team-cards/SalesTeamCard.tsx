import React from "react";
import { Sku } from "@/lib/types";
import { LabeledInput } from "../common";
import { TeamCard } from "./TeamCard";
import Box from "@mui/material/Box";

interface SalesTeamCardProps {
  sku: Sku;
  updateSku: (updater: (s: Sku) => Sku) => void;
  triggerAutoSave: () => void;
}

export function SalesTeamCard({
  sku,
  updateSku,
  triggerAutoSave,
}: SalesTeamCardProps) {
  return (
    <TeamCard title="Sales" isCollapsible={true} defaultCollapsed={false}>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        }}
      >
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
      </Box>
    </TeamCard>
  );
}
