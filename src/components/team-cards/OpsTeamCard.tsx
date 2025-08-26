import React from "react";
import { Sku } from "@/lib/types";
import { LabeledInput } from "../common";
import { TeamCard } from "./TeamCard";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import Typography from "@mui/material/Typography";

interface OpsTeamCardProps {
  sku: Sku;
  updateSku: (updater: (s: Sku) => Sku) => void;
  triggerAutoSave: () => void;
}

export function OpsTeamCard({
  sku,
  updateSku,
  triggerAutoSave,
}: OpsTeamCardProps) {
  const handleBooleanChange = (field: keyof Sku["ops"], value: boolean) => {
    updateSku((s) => ({
      ...s,
      ops: { ...s.ops, [field]: value },
    }));
    triggerAutoSave();
  };

  const handleNumberChange = (field: keyof Sku["ops"], value: number) => {
    updateSku((s) => ({
      ...s,
      ops: { ...s.ops, [field]: value },
    }));
    triggerAutoSave();
  };

  return (
    <TeamCard title="Operations" isCollapsible={true} defaultCollapsed={false}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Boolean options with Yes/No format */}
        <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {/* New Machine Required */}
          <FormControl component="fieldset">
            <FormLabel component="legend">
              <Typography variant="subtitle2" fontWeight={600}>
                New Machine Required?
              </Typography>
            </FormLabel>
            <RadioGroup
              row
              value={sku.ops.newMachineRequired ? "yes" : "no"}
              onChange={(e) =>
                handleBooleanChange(
                  "newMachineRequired",
                  e.target.value === "yes"
                )
              }
            >
              <FormControlLabel value="yes" control={<Radio />} label="Yes" />
              <FormControlLabel value="no" control={<Radio />} label="No" />
            </RadioGroup>
          </FormControl>

          {/* New Mould Required */}
          <FormControl component="fieldset">
            <FormLabel component="legend">
              <Typography variant="subtitle2" fontWeight={600}>
                New Mould Required?
              </Typography>
            </FormLabel>
            <RadioGroup
              row
              value={sku.ops.newMouldRequired ? "yes" : "no"}
              onChange={(e) =>
                handleBooleanChange(
                  "newMouldRequired",
                  e.target.value === "yes"
                )
              }
            >
              <FormControlLabel value="yes" control={<Radio />} label="Yes" />
              <FormControlLabel value="no" control={<Radio />} label="No" />
            </RadioGroup>
          </FormControl>

          {/* New Infrastructure Required */}
          <FormControl component="fieldset">
            <FormLabel component="legend">
              <Typography variant="subtitle2" fontWeight={600}>
                New Infrastructure Required?
              </Typography>
            </FormLabel>
            <RadioGroup
              row
              value={sku.ops.newInfraRequired ? "yes" : "no"}
              onChange={(e) =>
                handleBooleanChange(
                  "newInfraRequired",
                  e.target.value === "yes"
                )
              }
            >
              <FormControlLabel value="yes" control={<Radio />} label="Yes" />
              <FormControlLabel value="no" control={<Radio />} label="No" />
            </RadioGroup>
          </FormControl>
        </Box>

        {/* Machine Cost Fields - Conditional based on New Machine Required */}
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          }}
        >
          {sku.ops.newMachineRequired ? (
            <LabeledInput
              label="Cost of New Machine (Rs)"
              type="number"
              step={1000}
              value={sku.ops.costOfNewMachine}
              onChange={(v) =>
                handleNumberChange("costOfNewMachine", Number(v))
              }
              onAutoSave={triggerAutoSave}
            />
          ) : (
            <LabeledInput
              label="Cost of Old Machine (Rs)"
              type="number"
              step={1000}
              value={sku.ops.costOfOldMachine}
              onChange={(v) =>
                handleNumberChange("costOfOldMachine", Number(v))
              }
              onAutoSave={triggerAutoSave}
            />
          )}

          <LabeledInput
            label="Life of Machine (Years)"
            type="number"
            step={1}
            value={sku.ops.lifeOfNewMachineYears}
            onChange={(v) =>
              handleNumberChange("lifeOfNewMachineYears", Number(v))
            }
            onAutoSave={triggerAutoSave}
          />
        </Box>

        {/* Mould Cost Fields - Conditional based on New Mould Required */}
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          }}
        >
          {sku.ops.newMouldRequired ? (
            <LabeledInput
              label="Cost of New Mould (Rs)"
              type="number"
              step={1000}
              value={sku.ops.costOfNewMould}
              onChange={(v) => handleNumberChange("costOfNewMould", Number(v))}
              onAutoSave={triggerAutoSave}
            />
          ) : (
            <LabeledInput
              label="Cost of Old Mould (Rs)"
              type="number"
              step={1000}
              value={sku.ops.costOfOldMould}
              onChange={(v) => handleNumberChange("costOfOldMould", Number(v))}
              onAutoSave={triggerAutoSave}
            />
          )}

          <LabeledInput
            label="Life of Mould (Years)"
            type="number"
            step={1}
            value={sku.ops.lifeOfNewMouldYears}
            onChange={(v) =>
              handleNumberChange("lifeOfNewMouldYears", Number(v))
            }
            onAutoSave={triggerAutoSave}
          />
        </Box>

        {/* Infrastructure Cost Fields - Conditional based on New Infrastructure Required */}
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          }}
        >
          {sku.ops.newInfraRequired ? (
            <LabeledInput
              label="Cost of New Infrastructure (Rs)"
              type="number"
              step={1000}
              value={sku.ops.costOfNewInfra}
              onChange={(v) => handleNumberChange("costOfNewInfra", Number(v))}
              onAutoSave={triggerAutoSave}
            />
          ) : (
            <LabeledInput
              label="Cost of Old Infrastructure (Rs)"
              type="number"
              step={1000}
              value={sku.ops.costOfOldInfra}
              onChange={(v) => handleNumberChange("costOfOldInfra", Number(v))}
              onAutoSave={triggerAutoSave}
            />
          )}

          <LabeledInput
            label="Life of Infrastructure (Years)"
            type="number"
            step={1}
            value={sku.ops.lifeOfNewInfraYears}
            onChange={(v) =>
              handleNumberChange("lifeOfNewInfraYears", Number(v))
            }
            onAutoSave={triggerAutoSave}
          />
        </Box>

        {/* Other Operations Fields */}
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          }}
        >
          <LabeledInput
            label="OEE (Overall Equipment Effectiveness)"
            type="number"
            step={0.01}
            value={sku.ops.oee}
            onChange={(v) => handleNumberChange("oee", Number(v))}
            onAutoSave={triggerAutoSave}
          />

          <LabeledInput
            label="Operating Hours Per Day"
            type="number"
            step={1}
            value={sku.ops.operatingHoursPerDay || 24}
            onChange={(v) =>
              handleNumberChange("operatingHoursPerDay", Number(v))
            }
            onAutoSave={triggerAutoSave}
          />

          <LabeledInput
            label="Working Days Per Year"
            type="number"
            step={1}
            value={sku.ops.workingDaysPerYear || 365}
            onChange={(v) =>
              handleNumberChange("workingDaysPerYear", Number(v))
            }
            onAutoSave={triggerAutoSave}
          />

          <LabeledInput
            label="Working Capital Days"
            type="number"
            step={1}
            value={sku.ops.workingCapitalDays || 0}
            onChange={(v) =>
              handleNumberChange("workingCapitalDays", Number(v))
            }
            onAutoSave={triggerAutoSave}
          />
        </Box>
      </Box>
    </TeamCard>
  );
}
