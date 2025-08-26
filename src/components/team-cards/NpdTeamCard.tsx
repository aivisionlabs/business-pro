import React, { useEffect, useMemo } from "react";
import { Sku, PlantMaster } from "@/lib/types";
import { LabeledInput, LabeledSelect } from "../common";
import { TeamCard } from "./TeamCard";
import Box from "@mui/material/Box";

interface NpdTeamCardProps {
  sku: Sku;
  plantOptions: PlantMaster[];
  updateSku: (updater: (s: Sku) => Sku) => void;
  triggerAutoSave: () => void;
}

export function NpdTeamCard({
  sku,
  plantOptions,
  updateSku,
  triggerAutoSave,
}: NpdTeamCardProps) {
  // Validate plantOptions and ensure they're properly formatted
  const validPlantOptions = useMemo(() => {
    return (
      plantOptions?.filter(
        (p) => p && p.plant && typeof p.plant === "string"
      ) || []
    );
  }, [plantOptions]);

  // Ensure we have a valid plant value that exists in the options
  const currentPlant = useMemo(() => {
    const skuPlant = sku.plantMaster?.plant;
    const defaultPlant = validPlantOptions[0]?.plant;

    // If the SKU's plant is valid and exists in options, use it
    if (skuPlant && validPlantOptions.some((p) => p.plant === skuPlant)) {
      return skuPlant;
    }

    // Otherwise, use the first available plant
    return defaultPlant || "";
  }, [sku.plantMaster?.plant, validPlantOptions]);

  // Handle plant selection - update the entire plantMaster object
  const handlePlantChange = (plantName: string) => {
    console.log("Plant change requested:", plantName);
    const selectedPlant = validPlantOptions.find((p) => p.plant === plantName);
    console.log("Selected plant:", selectedPlant);
    if (selectedPlant) {
      updateSku((s) => ({
        ...s,
        plantMaster: selectedPlant,
      }));
      triggerAutoSave();
    } else {
      console.error(
        "Plant not found:",
        plantName,
        "Available:",
        validPlantOptions.map((p) => p.plant)
      );
    }
  };

  // Auto-fix plantMaster if it's invalid
  useEffect(() => {
    if (
      validPlantOptions.length > 0 &&
      (!sku.plantMaster ||
        !sku.plantMaster.plant ||
        !validPlantOptions.some((p) => p.plant === sku.plantMaster.plant))
    ) {
      console.log("Auto-fixing invalid plantMaster");
      const defaultPlant = validPlantOptions[0];
      updateSku((s) => ({
        ...s,
        plantMaster: defaultPlant,
      }));
    }
  }, [validPlantOptions, sku.plantMaster, updateSku]);

  // Debug logging
  console.log("NpdTeamCard - plantOptions:", plantOptions);
  console.log("NpdTeamCard - validPlantOptions:", validPlantOptions);
  console.log("NpdTeamCard - currentPlant:", currentPlant);
  console.log("NpdTeamCard - sku.plantMaster:", sku.plantMaster);
  console.log(
    "NpdTeamCard - plant options array:",
    validPlantOptions.map((p) => p.plant)
  );
  console.log(
    "NpdTeamCard - currentPlant in options:",
    validPlantOptions.some((p) => p.plant === currentPlant)
  );

  // Don't render if we don't have valid plant options
  if (validPlantOptions.length === 0) {
    return (
      <TeamCard title="NPD" isCollapsible={true} defaultCollapsed={false}>
        <Box sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
          No plant options available. Please check plant configuration.
          <br />
          <small>
            Debug: plantOptions length = {plantOptions?.length || 0}
          </small>
        </Box>
      </TeamCard>
    );
  }

  // Don't render if currentPlant is not in the options
  if (!validPlantOptions.some((p) => p.plant === currentPlant)) {
    return (
      <TeamCard title="NPD" isCollapsible={true} defaultCollapsed={false}>
        <Box sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
          Invalid plant selection. Current plant &quot;{currentPlant}&quot; not
          found in available options.
          <br />
          <small>
            Available: {validPlantOptions.map((p) => p.plant).join(", ")}
          </small>
        </Box>
      </TeamCard>
    );
  }

  return (
    <TeamCard title="NPD" isCollapsible={true} defaultCollapsed={false}>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        }}
      >
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
        <LabeledInput
          label="Cavities"
          type="number"
          step={1}
          value={sku.npd.cavities}
          onChange={(v) =>
            updateSku((s) => ({
              ...s,
              npd: { ...s.npd, cavities: Number(v) },
            }))
          }
          onAutoSave={triggerAutoSave}
        />
        <LabeledInput
          label="Cycle Time (seconds)"
          type="number"
          step={0.1}
          value={sku.npd.cycleTimeSeconds}
          onChange={(v) =>
            updateSku((s) => ({
              ...s,
              npd: { ...s.npd, cycleTimeSeconds: Number(v) },
            }))
          }
          onAutoSave={triggerAutoSave}
        />
        <LabeledSelect
          label="Plant"
          value={currentPlant}
          onChange={handlePlantChange}
          options={validPlantOptions.map((p) => p.plant)}
          onAutoSave={triggerAutoSave}
        />
      </Box>
    </TeamCard>
  );
}
