import React from "react";
import { Sku } from "@/lib/types";
import { LabeledInput } from "../common";
import { TeamCard } from "./TeamCard";
import Box from "@mui/material/Box";

interface PricingTeamCardProps {
  sku: Sku;
  updateSku: (updater: (s: Sku) => Sku) => void;
  triggerAutoSave: () => void;
}

export function PricingTeamCard({
  sku,
  updateSku,
  triggerAutoSave,
}: PricingTeamCardProps) {
  return (
    <TeamCard title="Pricing" isCollapsible={true} defaultCollapsed={false}>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        }}
      >
        <LabeledInput
          label="Resin (Rs/kg)"
          type="number"
          step={0.01}
          value={sku.costing.resinRsPerKg}
          onChange={(v) =>
            updateSku((s) => ({
              ...s,
              costing: { ...s.costing, resinRsPerKg: Number(v) },
            }))
          }
          onAutoSave={triggerAutoSave}
        />
        <LabeledInput
          label="Freight Out (Rs/kg)"
          type="number"
          step={0.01}
          value={sku.costing.freightOutRsPerKg}
          onChange={(v) =>
            updateSku((s) => ({
              ...s,
              costing: { ...s.costing, freightOutRsPerKg: Number(v) },
            }))
          }
          onAutoSave={triggerAutoSave}
        />
        <LabeledInput
          label="Masterbatch (Rs/kg)"
          type="number"
          step={0.01}
          value={sku.costing.mbRsPerKg}
          onChange={(v) =>
            updateSku((s) => ({
              ...s,
              costing: { ...s.costing, mbRsPerKg: Number(v) },
            }))
          }
          onAutoSave={triggerAutoSave}
        />
        <LabeledInput
          label="Packaging (Rs/kg)"
          type="number"
          step={0.01}
          value={sku.costing.packagingRsPerKg}
          onChange={(v) =>
            updateSku((s) => ({
              ...s,
              costing: { ...s.costing, packagingRsPerKg: Number(v) },
            }))
          }
          onAutoSave={triggerAutoSave}
        />
      </Box>
    </TeamCard>
  );
}
