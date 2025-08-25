import React from "react";
import TextField from "@mui/material/TextField";

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
    if (onAutoSave) {
      onAutoSave();
    }
  };

  return (
    <TextField
      fullWidth
      label={label}
      value={typeof value === "number" ? String(value) : value}
      onChange={handleChange}
      type={type}
      slotProps={{ htmlInput: { step } }}
      placeholder={placeholder}
      size="small"
    />
  );
}
