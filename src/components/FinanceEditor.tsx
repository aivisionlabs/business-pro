import React from "react";
import { BusinessCase } from "@/lib/types";
import { LabeledInput } from "./common/LabeledInput";

interface FinanceEditorProps {
  scenario: BusinessCase;
  onUpdate: (updater: (s: BusinessCase) => BusinessCase) => void;
  onAutoSave: () => void;
}

export default function FinanceEditor({
  scenario,
  onUpdate,
  onAutoSave,
}: FinanceEditorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <LabeledInput
        label="Tax Rate (%)"
        type="number"
        step={0.1}
        value={scenario.finance.corporateTaxRatePct * 100}
        onChange={(v) => {
          const newTaxRate = Number(v) / 100;
          onUpdate((s) => ({
            ...s,
            finance: {
              ...s.finance,
              corporateTaxRatePct: newTaxRate,
            },
          }));
        }}
        onAutoSave={onAutoSave}
      />
      <LabeledInput
        label="Debt Percentage (%)"
        type="number"
        step={0.1}
        value={scenario.finance.debtPct * 100}
        onChange={(v) => {
          const newDebtPct = Number(v) / 100;
          console.log(`Debt Percentage input changed:`, {
            inputValue: v,
            calculatedDebtPct: newDebtPct,
            oldDebtPct: scenario.finance.debtPct,
          });
          onUpdate((s) => ({
            ...s,
            finance: {
              ...s.finance,
              debtPct: newDebtPct,
            },
          }));
        }}
        onAutoSave={onAutoSave}
      />
      <LabeledInput
        label="Cost of Debt (%)"
        type="number"
        step={0.1}
        value={scenario.finance.costOfDebtPct * 100}
        onChange={(v) => {
          const newCostOfDebt = Number(v) / 100;
          console.log(`Cost of Debt input changed:`, {
            inputValue: v,
            calculatedCostOfDebt: newCostOfDebt,
            oldCostOfDebt: scenario.finance.costOfDebtPct,
          });
          onUpdate((s) => ({
            ...s,
            finance: {
              ...s.finance,
              costOfDebtPct: newCostOfDebt,
            },
          }));
        }}
        onAutoSave={onAutoSave}
      />
      <LabeledInput
        label="Cost of Equity (%)"
        type="number"
        step={0.1}
        value={scenario.finance.costOfEquityPct * 100}
        onChange={(v) => {
          const newCostOfEquity = Number(v) / 100;
          onUpdate((s) => ({
            ...s,
            finance: {
              ...s.finance,
              costOfEquityPct: newCostOfEquity,
            },
          }));
        }}
        onAutoSave={onAutoSave}
      />
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="includeCorpSGA"
          checked={scenario.finance.includeCorpSGA}
          onChange={(e) => {
            onUpdate((s) => ({
              ...s,
              finance: {
                ...s.finance,
                includeCorpSGA: e.target.checked,
              },
            }));
            onAutoSave();
          }}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="includeCorpSGA" className="text-sm text-slate-700">
          Include Corporate SGA
        </label>
      </div>
    </div>
  );
}
