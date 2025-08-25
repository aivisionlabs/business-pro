import React from "react";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";

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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (onAutoSave) {
      onAutoSave();
    }
  };

  return (
    <TextField select fullWidth size="small" label={label} value={value} onChange={handleChange}>
      {options.map((o) => (
        <MenuItem key={o} value={o}>
          {o}
        </MenuItem>
      ))}
    </TextField>
  );
}
