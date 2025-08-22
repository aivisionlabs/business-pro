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
  const parts = path.split(".");
  let target: Record<string, unknown> = obj as unknown as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!(key in target)) target[key] = {};
    target = (target[key] as Record<string, unknown>);
  }
  const last = parts[parts.length - 1];
  target[last] = updater(target[last]);
}

function createEmptyMetrics(): Record<OutcomeMetric, number | null> {
  return { NPV: null, IRR: null, PNL_Y1: null, PNL_Y5: null, PNL_TOTAL: null };
}

function extractMetrics(calc: CalcOutput, objective: ObjectiveConfig): Record<OutcomeMetric, number | null> {
  const out = createEmptyMetrics();
  for (const m of objective.metrics) {
    if (m === "NPV") out[m] = calc.returns.npv;
    else if (m === "IRR") out[m] = calc.returns.irr;
    else if (m === "PNL_Y1") out[m] = calc.pnl[0]?.pat ?? 0;
    else if (m === "PNL_Y5") out[m] = calc.pnl[4]?.pat ?? 0;
    else if (m === "PNL_TOTAL") out[m] = calc.pnl.reduce((s, y) => s + (y.pat || 0), 0);
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
    const baseline = baselineOverride ?? this.runBaseline(bcase, objective);
    const results: SensitivityRunItem[] = [];

    for (const spec of specs) {
      const percent = spec.percent !== false;
      for (const delta of spec.deltas) {
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
      }
    }

    return { baseline, results };
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


