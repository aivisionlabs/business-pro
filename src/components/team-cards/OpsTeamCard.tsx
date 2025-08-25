import React from "react";
import { Sku } from "@/lib/types";
import { LabeledInput } from "../common";
import { TeamCard } from "./TeamCard";
import { CalculationEngine } from "@/lib/calc/engines";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";

interface OpsTeamCardProps {
  sku: Sku;
  updateSku: (updater: (s: Sku) => Sku) => void;
  triggerAutoSave: () => void;
  progress: number;
  filledFields: number;
  totalFields: number;
}

export function OpsTeamCard({
  sku,
  updateSku,
  triggerAutoSave,
  progress,
  filledFields,
  totalFields,
}: OpsTeamCardProps) {
  return (
    <TeamCard
      title="Operations"
      team="Ops"
      progress={progress}
      filledFields={filledFields}
      totalFields={totalFields}
      isCollapsible={true}
    >
      <div className="space-y-6">
        {/* Boolean options */}
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={sku.ops.newMachineRequired || false}
                onChange={(e) => {
                  updateSku((s) => ({
                    ...s,
                    ops: {
                      ...s.ops,
                      newMachineRequired: e.target.checked,
                    },
                  }));
                  triggerAutoSave();
                }}
              />
            }
            label="New Machine Required?"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={sku.ops.newMouldRequired || false}
                onChange={(e) => {
                  updateSku((s) => ({
                    ...s,
                    ops: {
                      ...s.ops,
                      newMouldRequired: e.target.checked,
                    },
                  }));
                  triggerAutoSave();
                }}
              />
            }
            label="New Mould Required?"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={sku.ops.newInfraRequired || false}
                onChange={(e) => {
                  updateSku((s) => ({
                    ...s,
                    ops: {
                      ...s.ops,
                      newInfraRequired: e.target.checked,
                    },
                  }));
                  triggerAutoSave();
                }}
              />
            }
            label="New Infra Required?"
          />
        </Box>

        {/* Machine costs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sku.ops.newMachineRequired ? (
            <LabeledInput
              label="Cost of New Machine (Rs)"
              type="number"
              step={1}
              value={sku.ops.costOfNewMachine || 0}
              onChange={(v) =>
                updateSku((s) => ({
                  ...s,
                  ops: { ...s.ops, costOfNewMachine: Number(v) },
                }))
              }
              onAutoSave={triggerAutoSave}
            />
          ) : (
            <LabeledInput
              label="Cost of Old Machine (Rs)"
              type="number"
              step={1}
              value={sku.ops.costOfOldMachine || 0}
              onChange={(v) =>
                updateSku((s) => ({
                  ...s,
                  ops: { ...s.ops, costOfOldMachine: Number(v) },
                }))
              }
              onAutoSave={triggerAutoSave}
            />
          )}
          <LabeledInput
            label="Machine Name"
            value={sku.npd.machineName}
            onChange={(v) =>
              updateSku((s) => ({
                ...s,
                npd: { ...s.npd, machineName: String(v) },
              }))
            }
            onAutoSave={triggerAutoSave}
          />
        </div>

        {/* Mould costs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sku.ops.newMouldRequired ? (
            <LabeledInput
              label="Cost of New Mould (Rs)"
              type="number"
              step={1}
              value={sku.ops.costOfNewMould || 0}
              onChange={(v) =>
                updateSku((s) => ({
                  ...s,
                  ops: { ...s.ops, costOfNewMould: Number(v) },
                }))
              }
              onAutoSave={triggerAutoSave}
            />
          ) : (
            <LabeledInput
              label="Cost of Old Mould (Rs)"
              type="number"
              step={1}
              value={sku.ops.costOfOldMould || 0}
              onChange={(v) =>
                updateSku((s) => ({
                  ...s,
                  ops: { ...s.ops, costOfOldMould: Number(v) },
                }))
              }
              onAutoSave={triggerAutoSave}
            />
          )}
        </div>

        {/* Infra costs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sku.ops.newInfraRequired ? (
            <LabeledInput
              label="Cost of New Infra (Rs)"
              type="number"
              step={1}
              value={sku.ops.costOfNewInfra || 0}
              onChange={(v) =>
                updateSku((s) => ({
                  ...s,
                  ops: { ...s.ops, costOfNewInfra: Number(v) },
                }))
              }
              onAutoSave={triggerAutoSave}
            />
          ) : (
            <LabeledInput
              label="Cost of Old Infra (Rs)"
              type="number"
              step={1}
              value={sku.ops.costOfOldInfra || 0}
              onChange={(v) =>
                updateSku((s) => ({
                  ...s,
                  ops: { ...s.ops, costOfOldInfra: Number(v) },
                }))
              }
              onAutoSave={triggerAutoSave}
            />
          )}
        </div>

        {/* Total Depreciation Display */}
        <Alert
          severity="info"
          sx={{ "& .MuiAlert-message": { width: "100%" } }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <span>Total Depreciation per SKU (per year)</span>
            <strong>
              ₹
              {CalculationEngine.buildTotalDepreciation(sku).toLocaleString(
                "en-IN",
                {
                  maximumFractionDigits: 2,
                }
              )}
            </strong>
          </Box>
        </Alert>
      </div>
    </TeamCard>
  );
}
