import React from "react";

interface LabeledInputProps {
  label: string;
  value: string | number;
  onChange: (v: string | number) => void;
  onAutoSave?: () => void;
  type?: string;
  step?: number;
  placeholder?: string;
}

export function LabeledInput({
  label,
  value,
  onChange,
  onAutoSave,
  type = "text",
  step,
  placeholder,
}: LabeledInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue =
      type === "number" ? Number(e.target.value) : e.target.value;
    onChange(newValue);

    // Trigger autosave if provided
    if (onAutoSave) {
      onAutoSave();
    }
  };

  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-slate-700">{label}</span>
      <input
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
        value={typeof value === "number" ? String(value) : value}
        onChange={handleChange}
        type={type}
        step={step}
        placeholder={placeholder}
      />
    </label>
  );
}
