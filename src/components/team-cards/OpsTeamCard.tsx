import React from "react";
import { Sku } from "@/lib/types";
import { LabeledInput } from "../common";
import { TeamCard } from "./TeamCard";
import { CalculationEngine } from "@/lib/calc/engines";

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-300 hover:border-slate-400 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
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
            <span className="text-sm text-slate-700">
              New Machine Required?
            </span>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-300 hover:border-slate-400 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
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
            <span className="text-sm text-slate-700">New Mould Required?</span>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-300 hover:border-slate-400 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
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
            <span className="text-sm text-slate-700">New Infra Required?</span>
          </label>
        </div>

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
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <div className="text-sm text-blue-700 mb-2">
            Total Depreciation per SKU (per year)
          </div>
          <div className="text-2xl font-bold text-blue-900">
            ₹
            {CalculationEngine.buildTotalDepreciation(sku).toLocaleString(
              "en-IN",
              {
                maximumFractionDigits: 2,
              }
            )}
          </div>
        </div>
      </div>
    </TeamCard>
  );
}
