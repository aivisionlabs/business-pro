import React from "react";

interface LabeledSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onAutoSave?: () => void;
  options: string[];
}

export function LabeledSelect({
  label,
  value,
  onChange,
  onAutoSave,
  options,
}: LabeledSelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);

    // Trigger autosave if provided
    if (onAutoSave) {
      onAutoSave();
    }
  };

  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-slate-700">{label}</span>
      <select
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white"
        value={value}
        onChange={handleChange}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
