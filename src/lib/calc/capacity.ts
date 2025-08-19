import { NpdInput, OpsInput, YearVolumes } from "@/lib/types";
import { toKg } from "./utils";

export function computeCapacity(npd: NpdInput, ops: OpsInput) {
  const operatingHoursPerDay = ops.operatingHoursPerDay ?? 24;
  const workingDaysPerYear = ops.workingDaysPerYear ?? 365;
  const unitsPerHour = npd.cavities * (60 / npd.cycleTimeSeconds) * ops.oee;
  const unitsPerDay = unitsPerHour * operatingHoursPerDay;
  const annualCapacityPieces = unitsPerDay * workingDaysPerYear;
  return { unitsPerHour, unitsPerDay, annualCapacityPieces };
}

export function computeVolumes(
  productWeightGrams: number,
  baseAnnualVolumePieces: number,
): YearVolumes[] {
  const productWeightKg = toKg(productWeightGrams);
  const years = 5;
  const results: YearVolumes[] = [];
  for (let year = 1; year <= years; year += 1) {
    const volumePieces = baseAnnualVolumePieces;
    const weightKg = volumePieces * productWeightKg;
    results.push({ year, volumePieces, weightKg });
  }
  return results;
}


