import React from "react";
import { BusinessCase, FinanceInput } from "@/lib/types";
import { LabeledInput } from "../common";
import { TeamCard } from "./TeamCard";
import Box from "@mui/material/Box";

interface FinanceTeamCardProps {
  scenario: BusinessCase;
  updateFinanceDetails: (updater: (s: FinanceInput) => FinanceInput) => void;
  triggerAutoSave: () => void;
}

export function FinanceTeamCard({
  scenario,
  updateFinanceDetails,
  triggerAutoSave,
}: FinanceTeamCardProps) {
  return (
    <TeamCard title="Finance" isCollapsible={true} defaultCollapsed={false}>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        }}
      >
        <LabeledInput
          label="Tax Rate (%)"
          type="number"
          step={0.01}
          value={(scenario.finance.corporateTaxRatePct || 0.25) * 100}
          onChange={(v) =>
            updateFinanceDetails((f) => ({
              ...f,
              corporateTaxRatePct: Number(v) / 100,
            }))
          }
          onAutoSave={triggerAutoSave}
        />
        <LabeledInput
          label="Debt Percentage (%)"
          type="number"
          step={0.01}
          value={(scenario.finance.debtPct || 1) * 100}
          onChange={(v) =>
            updateFinanceDetails((f) => ({
              ...f,
              debtPct: Number(v) / 100,
            }))
          }
          onAutoSave={triggerAutoSave}
        />
        <LabeledInput
          label="Cost of Debt (%)"
          type="number"
          step={0.01}
          value={(scenario.finance.costOfDebtPct || 0.087) * 100}
          onChange={(v) =>
            updateFinanceDetails((f) => ({
              ...f,
              costOfDebtPct: Number(v) / 100,
            }))
          }
          onAutoSave={triggerAutoSave}
        />
        <LabeledInput
          label="Cost of Equity (%)"
          type="number"
          step={0.01}
          value={(scenario.finance.costOfEquityPct || 0.18) * 100}
          onChange={(v) =>
            updateFinanceDetails((f) => ({
              ...f,
              costOfEquityPct: Number(v) / 100,
            }))
          }
          onAutoSave={triggerAutoSave}
        />
        <LabeledInput
          label="Annual Volume Growth (%)"
          type="number"
          step={0.01}
          value={(scenario.finance.annualVolumeGrowthPct || 0) * 100}
          onChange={(v) =>
            updateFinanceDetails((f) => ({
              ...f,
              annualVolumeGrowthPct: Number(v) / 100,
            }))
          }
          onAutoSave={triggerAutoSave}
        />
      </Box>
    </TeamCard>
  );
}
