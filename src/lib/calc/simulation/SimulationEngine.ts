import { calculateScenario } from "@/lib/calc";
import { BusinessCase, CalcOutput, ObjectiveConfig, OutcomeMetric, PerturbationSpec, SensitivityResponse, SensitivityRunItem, ScenarioDefinition, ScenarioResponse, ScenarioRunResult } from "@/lib/types";

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function setByPath<T extends Record<string, unknown>>(
  obj: T,
  path: string,
  updater: (current: unknown) => unknown
): void {
  try {
    const parts = path.split(".");
    let target: Record<string, unknown> = obj as unknown as Record<string, unknown>;

    // Navigate to the parent object
    for (let i = 0; i < parts.length - 1; i += 1) {
      const key = parts[i];
      if (!(key in target)) {
        console.warn(`Path ${path} - key ${key} not found, creating empty object`);
        target[key] = {};
      }
      target = (target[key] as Record<string, unknown>);
    }

    const last = parts[parts.length - 1];
    const currentValue = target[last];

    // Only update if the current value is a number
    if (typeof currentValue === "number") {
      target[last] = updater(currentValue);
    } else {
      console.warn(`Path ${path} - current value is not a number:`, currentValue);
    }
  } catch (error) {
    console.error(`Error setting path ${path}:`, error);
    throw new Error(`Failed to set path ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function createEmptyMetrics(): Record<OutcomeMetric, number | null> {
  return { NPV: null, IRR: null, PNL_Y1: null, PNL_TOTAL: null };
}

function extractMetrics(calc: CalcOutput, objective: ObjectiveConfig): Record<OutcomeMetric, number | null> {
  const out = createEmptyMetrics();

  for (const m of objective.metrics) {
    if (m === "NPV") {
      out[m] = calc.returns.npv;
    }
    else if (m === "IRR") {
      out[m] = calc.returns.irr;
    }
    else if (m === "PNL_Y1") {
      out[m] = calc.pnl[0]?.pat ?? null;
    }
    else if (m === "PNL_TOTAL") {
      out[m] = calc.pnl.reduce((s, y) => s + (y.pat || 0), 0);
    }
  }

  return out;
}

export class SimulationEngine {
  static runBaseline(bcase: BusinessCase, objective: ObjectiveConfig) {
    const calc = calculateScenario(bcase);
    return extractMetrics(calc, objective);
  }

  static runSensitivity(
    bcase: BusinessCase,
    specs: PerturbationSpec[],
    objective: ObjectiveConfig,
    baselineOverride?: Record<OutcomeMetric, number | null>
  ): SensitivityResponse {
    try {
      console.log("Starting sensitivity analysis with specs:", specs.map(s => ({ variableId: s.variableId, deltas: s.deltas })));

      const baseline = baselineOverride ?? this.runBaseline(bcase, objective);
      const results: SensitivityRunItem[] = [];

      for (const spec of specs) {
        try {
          console.log(`Processing spec for variable: ${spec.variableId}`);
          const percent = spec.percent !== false;

          for (const delta of spec.deltas) {
            try {
              const modified = deepClone(bcase);
              setByPath(modified as unknown as Record<string, unknown>, spec.variableId, (current: unknown) => {
                if (typeof current === "number") {
                  return percent ? current * (1 + delta) : current + delta;
                }
                return current;
              });

              const calc = calculateScenario(modified);
              const metrics = extractMetrics(calc, objective);
              results.push({ variableId: spec.variableId, delta, metrics });
            } catch (deltaError) {
              console.error(`Error processing delta ${delta} for variable ${spec.variableId}:`, deltaError);
              // Continue with other deltas
            }
          }
        } catch (specError) {
          console.error(`Error processing spec for variable ${spec.variableId}:`, specError);
          // Continue with other specs
        }
      }

      console.log(`Sensitivity analysis completed. Processed ${results.length} results.`);
      return { baseline, results };
    } catch (error) {
      console.error("Error in runSensitivity:", error);
      throw error;
    }
  }

  static runScenarios(
    bcase: BusinessCase,
    scenarios: ScenarioDefinition[],
    objective: ObjectiveConfig
  ): ScenarioResponse {
    const baseline = this.runBaseline(bcase, objective);
    const results: ScenarioRunResult[] = [];

    for (const s of scenarios) {
      const modified = deepClone(bcase);
      for (const [path, value] of Object.entries(s.overrides)) {
        setByPath(modified as unknown as Record<string, unknown>, path, () => value);
      }
      const calc = calculateScenario(modified);
      const metrics = extractMetrics(calc, objective);
      results.push({ scenarioId: s.id, name: s.name, metrics });
    }

    return { baseline, results };
  }
}


