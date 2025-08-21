import React from "react";
import { Sku, PlantMaster } from "@/lib/types";
import { LabeledInput, LabeledSelect } from "./common";
import { CalculationEngine } from "@/lib/calc/engines";

interface SkuEditorProps {
  sku: Sku;
  plantOptions: PlantMaster[];
  onUpdate: (updater: (s: Sku) => Sku) => void;
  onAutoSave: () => void;
}

export default function SkuEditor({
  sku,
  plantOptions,
  onUpdate,
  onAutoSave,
}: SkuEditorProps) {
  return (
    <div className="space-y-6">
      {/* Sales Team */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LabeledInput
          label="SKU Name"
          value={sku.name}
          onChange={(v) => onUpdate((s) => ({ ...s, name: String(v) }))}
          onAutoSave={onAutoSave}
        />
        <LabeledInput
          label="Machine Name"
          value={sku.npd.machineName}
          onChange={(v) =>
            onUpdate((s) => ({
              ...s,
              npd: { ...s.npd, machineName: String(v) },
            }))
          }
          onAutoSave={onAutoSave}
        />
        <LabeledInput
          label="Volume (pcs, Y1)"
          type="number"
          step={1}
          value={sku.sales.baseAnnualVolumePieces}
          onChange={(v) =>
            onUpdate((s) => ({
              ...s,
              sales: { ...s.sales, baseAnnualVolumePieces: Number(v) },
            }))
          }
          onAutoSave={onAutoSave}
        />
        <LabeledInput
          label="Conversion Recovery (Rs/pc)"
          type="number"
          step={0.01}
          value={sku.sales.conversionRecoveryRsPerPiece || 0}
          onChange={(v) =>
            onUpdate((s) => ({
              ...s,
              sales: {
                ...s.sales,
                conversionRecoveryRsPerPiece: Number(v),
              },
            }))
          }
          onAutoSave={onAutoSave}
        />
        <LabeledInput
          label="Resin (Rs/kg)"
          type="number"
          step={0.01}
          value={sku.costing.resinRsPerKg}
          onChange={(v) =>
            onUpdate((s) => ({
              ...s,
              costing: { ...s.costing, resinRsPerKg: Number(v) },
            }))
          }
          onAutoSave={onAutoSave}
        />
      </div>

      {/* NPD Team */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LabeledInput
          label="Cavities"
          type="number"
          step={1}
          value={sku.npd.cavities}
          onChange={(v) =>
            onUpdate((s) => ({
              ...s,
              npd: { ...s.npd, cavities: Number(v) },
            }))
          }
          onAutoSave={onAutoSave}
        />
        <LabeledInput
          label="Cycle Time (sec)"
          type="number"
          step={0.01}
          value={sku.npd.cycleTimeSeconds}
          onChange={(v) =>
            onUpdate((s) => ({
              ...s,
              npd: { ...s.npd, cycleTimeSeconds: Number(v) },
            }))
          }
          onAutoSave={onAutoSave}
        />
        <LabeledInput
          label="Weight (grams)"
          type="number"
          step={0.01}
          value={sku.sales.productWeightGrams}
          onChange={(v) =>
            onUpdate((s) => ({
              ...s,
              sales: { ...s.sales, productWeightGrams: Number(v) },
            }))
          }
          onAutoSave={onAutoSave}
        />
        <LabeledSelect
          label="Plant"
          value={sku.plantMaster.plant}
          onChange={(val) => {
            const pm =
              plantOptions.find((p) => p.plant === val) || plantOptions[0];
            onUpdate((s) => ({ ...s, plantMaster: pm }));
          }}
          options={plantOptions.map((p) => p.plant)}
          onAutoSave={onAutoSave}
        />
      </div>

      {/* Ops Team */}
      <div className="space-y-6">
        {/* Boolean options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-300 hover:border-slate-400 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              checked={sku.ops.newMachineRequired || false}
              onChange={(e) => {
                onUpdate((s) => ({
                  ...s,
                  ops: {
                    ...s.ops,
                    newMachineRequired: e.target.checked,
                  },
                }));
                onAutoSave();
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
                onUpdate((s) => ({
                  ...s,
                  ops: {
                    ...s.ops,
                    newMouldRequired: e.target.checked,
                  },
                }));
                onAutoSave();
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
                onUpdate((s) => ({
                  ...s,
                  ops: {
                    ...s.ops,
                    newInfraRequired: e.target.checked,
                  },
                }));
                onAutoSave();
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
                onUpdate((s) => ({
                  ...s,
                  ops: { ...s.ops, costOfNewMachine: Number(v) },
                }))
              }
              onAutoSave={onAutoSave}
            />
          ) : (
            <LabeledInput
              label="Cost of Old Machine (Rs)"
              type="number"
              step={1}
              value={sku.ops.costOfOldMachine || 0}
              onChange={(v) =>
                onUpdate((s) => ({
                  ...s,
                  ops: { ...s.ops, costOfOldMachine: Number(v) },
                }))
              }
              onAutoSave={onAutoSave}
            />
          )}
          <LabeledInput
            label="Life of Machine (years)"
            type="number"
            step={1}
            value={sku.ops.lifeOfNewMachineYears || 15}
            onChange={(v) =>
              onUpdate((s) => ({
                ...s,
                ops: { ...s.ops, lifeOfNewMachineYears: Number(v) },
              }))
            }
            onAutoSave={onAutoSave}
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
                onUpdate((s) => ({
                  ...s,
                  ops: { ...s.ops, costOfNewMould: Number(v) },
                }))
              }
              onAutoSave={onAutoSave}
            />
          ) : (
            <LabeledInput
              label="Cost of Old Mould (Rs)"
              type="number"
              step={1}
              value={sku.ops.costOfOldMould || 0}
              onChange={(v) =>
                onUpdate((s) => ({
                  ...s,
                  ops: { ...s.ops, costOfOldMould: Number(v) },
                }))
              }
              onAutoSave={onAutoSave}
            />
          )}
          <LabeledInput
            label="Life of Mould (years)"
            type="number"
            step={1}
            value={sku.ops.lifeOfNewMouldYears || 15}
            onChange={(v) =>
              onUpdate((s) => ({
                ...s,
                ops: { ...s.ops, lifeOfNewMouldYears: Number(v) },
              }))
            }
            onAutoSave={onAutoSave}
          />
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
                onUpdate((s) => ({
                  ...s,
                  ops: { ...s.ops, costOfNewInfra: Number(v) },
                }))
              }
              onAutoSave={onAutoSave}
            />
          ) : (
            <LabeledInput
              label="Cost of Old Infra (Rs)"
              type="number"
              step={1}
              value={sku.ops.costOfOldInfra || 0}
              onChange={(v) =>
                onUpdate((s) => ({
                  ...s,
                  ops: { ...s.ops, costOfOldInfra: Number(v) },
                }))
              }
              onAutoSave={onAutoSave}
            />
          )}
          <LabeledInput
            label="Life of Infra (years)"
            type="number"
            step={1}
            value={sku.ops.lifeOfNewInfraYears || 30}
            onChange={(v) =>
              onUpdate((s) => ({
                ...s,
                ops: { ...s.ops, lifeOfNewInfraYears: Number(v) },
              }))
            }
            onAutoSave={onAutoSave}
          />
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

      {/* Pricing Team */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LabeledInput
          label="Freight (Rs/kg)"
          type="number"
          step={0.01}
          value={sku.costing.freightOutRsPerKg}
          onChange={(v) =>
            onUpdate((s) => ({
              ...s,
              costing: { ...s.costing, freightOutRsPerKg: Number(v) },
            }))
          }
          onAutoSave={onAutoSave}
        />
        <LabeledInput
          label="MB Price (Rs/kg)"
          type="number"
          step={0.01}
          value={sku.costing.mbRsPerKg}
          onChange={(v) =>
            onUpdate((s) => ({
              ...s,
              costing: { ...s.costing, mbRsPerKg: Number(v) },
            }))
          }
          onAutoSave={onAutoSave}
        />
        <LabeledInput
          label="Packaging (Rs/kg)"
          type="number"
          step={0.01}
          value={sku.costing.packagingRsPerKg}
          onChange={(v) =>
            onUpdate((s) => ({
              ...s,
              costing: { ...s.costing, packagingRsPerKg: Number(v) },
            }))
          }
          onAutoSave={onAutoSave}
        />
        <LabeledInput
          label="RM Price (Rs/kg)"
          type="number"
          step={0.01}
          value={sku.costing.resinRsPerKg}
          onChange={(v) =>
            onUpdate((s) => ({
              ...s,
              costing: { ...s.costing, resinRsPerKg: Number(v) },
            }))
          }
          onAutoSave={onAutoSave}
        />
      </div>
    </div>
  );
}
