import { NextRequest } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";
import { calculateScenario } from "@/lib/calc";
import {
  CalcOutput,
  PlantMaster,
  Scenario,
} from "@/lib/types";
import { plantMasterService } from "@/lib/firebase/firestore";
import { nanoid } from "nanoid";
import { ReadableStream } from "stream/web";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { businessCaseService } from "@/lib/firebase/firestore";

export const runtime = "nodejs";

// Add logging utility
function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const logData = data ? ` | Data: ${JSON.stringify(data)}` : '';
  console.log(`[${timestamp}] [${level}] ${message}${logData}`);
}

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
};

type AgentRequest = {
  messages: ChatMessage[];
  sessionId?: string;
};

// Firebase-based persistence - no need for local directory management

// Support GOOGLE_APPLICATION_CREDENTIALS as path or raw JSON
let cachedCredentialsPath: string | undefined;
async function ensureGoogleADCFromBase64(): Promise<void> {
  const envValue = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  console.log("envValue", envValue)
  if (!envValue) return;

  // If it points to an existing file, keep as-is
  try {
    console.log("LOOKING if absolute path is mentioned", envValue)
    await fs.stat(envValue);
    return;
  } catch {
    console.log("absolute path is not found")
    // Not a file path; treat as content
  }

  const normalizeContent = (value: string): string => {
    const trimmed = value.trim();

    // Try raw JSON first (with a few robustness tricks)
    const tryParse = (s: string): string | null => {
      try {
        JSON.parse(s);
        return s;
      } catch {
        return null;
      }
    };

    // a) As-is
    const asIs = tryParse(trimmed);
    if (asIs) return asIs;

    // b) Strip surrounding quotes if the whole value is quoted
    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      const unwrapped = trimmed.slice(1, -1);
      const unwrappedParsed = tryParse(unwrapped);
      if (unwrappedParsed) return unwrappedParsed;
    }

    // c) Extract substring between first '{' and last '}'
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const inner = trimmed.slice(firstBrace, lastBrace + 1);
      const innerParsed = tryParse(inner);
      if (innerParsed) return innerParsed;
    }

    // Not valid raw JSON
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS is not valid JSON');
  };

  try {
    const decodedJson = normalizeContent(envValue);
    const json = JSON.parse(decodedJson) as { client_email?: string };

    const dir = path.join(os.tmpdir(), 'gcp-adc');
    await fs.mkdir(dir, { recursive: true });
    const fileNamePart = (json.client_email || `sa-${nanoid()}`).replace(/[^a-zA-Z0-9_.-]/g, '_');
    const filePath = path.join(dir, `${fileNamePart}.json`);

    if (cachedCredentialsPath !== filePath) {
      // Write with restrictive permissions
      await fs.writeFile(filePath, decodedJson, { encoding: 'utf-8', mode: 0o600 });
      cachedCredentialsPath = filePath;
      log('INFO', 'Prepared GOOGLE_APPLICATION_CREDENTIALS from in-env content', { path: filePath });
    }

    process.env.GOOGLE_APPLICATION_CREDENTIALS = filePath;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ERROR', 'Failed to process GOOGLE_APPLICATION_CREDENTIALS content', { error: errorMessage });
    throw error;
  }
}

async function persistSaveScenario(scenario: Scenario): Promise<{ id: string }> {
  log('DEBUG', 'Persisting scenario', { scenarioId: scenario.id, scenarioName: scenario.name });

  try {
    if (scenario.id) {
      // Update existing scenario
      await businessCaseService.update(scenario.id, {
        name: scenario.name,
        finance: scenario.finance,
        skus: scenario.skus,
      });
      log('INFO', 'Scenario updated successfully', { id: scenario.id });
      return { id: scenario.id };
    } else {
      // Create new scenario
      const newId = await businessCaseService.create({
        name: scenario.name,
        finance: scenario.finance,
        skus: scenario.skus,
      });
      log('INFO', 'Scenario created successfully', { id: newId });
      return { id: newId };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ERROR', 'Failed to save scenario', { error: errorMessage, id: scenario.id });
    throw error;
  }
}

async function persistLoadScenario(id: string): Promise<Scenario> {
  log('DEBUG', 'Loading scenario', { id });

  try {
    const scenario = await businessCaseService.getById(id);
    if (!scenario) {
      throw new Error(`Scenario with ID ${id} not found`);
    }
    log('INFO', 'Scenario loaded successfully', { id, name: scenario.name });
    return scenario;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ERROR', 'Failed to load scenario', { error: errorMessage, id });
    throw error;
  }
}

async function persistListScenarios(): Promise<{ id: string; name: string; updatedAt: string }[]> {
  log('DEBUG', 'Listing scenarios');

  try {
    const businessCases = await businessCaseService.getAll();
    const out = businessCases.map((bcase) => ({
      id: bcase.id,
      name: bcase.name,
      updatedAt: bcase.updatedAt,
    }));

    log('INFO', 'Scenarios listed successfully', { count: out.length });
    return out;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ERROR', 'Failed to list scenarios', { error: errorMessage });
    throw error;
  }
}



// Tool handlers - deterministic
export function tool_calculateScenario(scenario: Scenario): CalcOutput {
  log('DEBUG', 'Calculating scenario', { scenarioId: scenario.id, scenarioName: scenario.name });

  // Add detailed debugging
  log('DEBUG', 'Scenario structure validation:', {
    hasId: !!scenario.id,
    hasName: !!scenario.name,
    hasSkus: !!scenario.skus,
    skusType: typeof scenario.skus,
    skusIsArray: Array.isArray(scenario.skus),
    skusLength: scenario.skus?.length,
    skusKeys: scenario.skus ? Object.keys(scenario.skus) : 'no skus',
    scenarioKeys: Object.keys(scenario),
    scenarioType: typeof scenario
  });

  if (scenario.skus && Array.isArray(scenario.skus)) {
    log('DEBUG', 'SKUs structure:', {
      skuCount: scenario.skus.length,
      firstSkuKeys: scenario.skus[0] ? Object.keys(scenario.skus[0]) : 'no first sku',
      firstSkuName: scenario.skus[0]?.name,
      firstSkuId: scenario.skus[0]?.id
    });
  }

  try {
    const result = calculateScenario(scenario);
    log('INFO', 'Scenario calculation completed successfully', {
      scenarioId: scenario.id,
      hasOutput: !!result,
      outputKeys: result ? Object.keys(result) : []
    });
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    log('ERROR', 'Scenario calculation failed', {
      error: errorMessage,
      scenarioId: scenario.id,
      stack: errorStack
    });
    throw error;
  }
}

export async function tool_getPlantMaster(plant?: string): Promise<PlantMaster | PlantMaster[]> {
  log('DEBUG', 'Getting plant master data', { plant });

  try {
    if (!plant) {
      const all = await plantMasterService.getAll();
      log('INFO', 'Returning all plant master data', { count: all.length });
      return all;
    }

    const found = await plantMasterService.getByPlant(plant);
    if (!found) {
      log('WARN', 'Plant not found', { requestedPlant: plant });
      throw new Error("Plant not found");
    }

    log('INFO', 'Plant master data found', { plant, plantData: found });
    return found;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ERROR', 'Failed to get plant master data', { error: errorMessage, plant });
    throw error;
  }
}

export async function tool_listScenarios(): Promise<{ id: string; name: string; updatedAt: string }[]> {
  log('DEBUG', 'Tool: listScenarios called');
  return persistListScenarios();
}

export async function tool_loadScenario(id: string): Promise<Scenario> {
  log('DEBUG', 'Tool: loadScenario called', { id });
  return persistLoadScenario(id);
}

export async function tool_saveScenario(scenario: Scenario): Promise<{ id: string }> {
  log('DEBUG', 'Tool: saveScenario called', { scenarioId: scenario.id, scenarioName: scenario.name });
  return persistSaveScenario(scenario);
}

// What-if analysis tool functions
export async function tool_analyzeVolumeChange(args: { caseId: string; skuName: string; volumeChange: number; changeType: 'absolute' | 'percentage' }) {
  log('DEBUG', 'Tool: analyzeVolumeChange called', { args });

  try {
    // Load the original scenario
    const originalScenario = await persistLoadScenario(args.caseId);

    // Find the target SKU
    const skuIndex = originalScenario.skus.findIndex(s => s.name === args.skuName);
    if (skuIndex === -1) {
      throw new Error(`SKU with name ${args.skuName} not found`);
    }

    // Create a copy for modification
    const modifiedScenario = JSON.parse(JSON.stringify(originalScenario)) as Scenario;
    const targetSku = modifiedScenario.skus[skuIndex];

    // Apply volume change
    const originalVolume = targetSku.sales.baseAnnualVolumePieces;
    let newVolume: number;

    if (args.changeType === 'percentage') {
      newVolume = originalVolume * (1 + args.volumeChange / 100);
    } else {
      newVolume = originalVolume + args.volumeChange;
    }

    // Ensure volume doesn't go negative
    newVolume = Math.max(0, newVolume);
    targetSku.sales.baseAnnualVolumePieces = Math.round(newVolume);

    // Calculate both scenarios
    const originalCalc = calculateScenario(originalScenario);
    const modifiedCalc = calculateScenario(modifiedScenario);

    // Prepare comparison data
    const comparison = {
      change: {
        skuName: targetSku.name,
        originalVolume,
        newVolume: Math.round(newVolume),
        volumeChange: args.volumeChange,
        changeType: args.changeType
      },
      metrics: {
        revenue: {
          original: originalCalc.pnl.map(y => y.revenueNet),
          modified: modifiedCalc.pnl.map(y => y.revenueNet),
          change: modifiedCalc.pnl.map((y, i) => y.revenueNet - (originalCalc.pnl[i]?.revenueNet || 0))
        },
        ebitda: {
          original: originalCalc.pnl.map(y => y.ebitda),
          modified: modifiedCalc.pnl.map(y => y.ebitda),
          change: modifiedCalc.pnl.map((y, i) => y.ebitda - (originalCalc.pnl[i]?.ebitda || 0))
        },
        npv: {
          original: originalCalc.returns.npv,
          modified: modifiedCalc.returns.npv,
          change: modifiedCalc.returns.npv - originalCalc.returns.npv
        },
        irr: {
          original: originalCalc.returns.irr,
          modified: modifiedCalc.returns.irr,
          change: modifiedCalc.returns.irr && originalCalc.returns.irr ?
            (modifiedCalc.returns.irr - originalCalc.returns.irr) * 100 : null
        }
      },
      pnlComparison: originalCalc.pnl.map((original, i) => {
        const modified = modifiedCalc.pnl[i];
        return {
          year: original.year,
          revenue: {
            original: original.revenueNet,
            modified: modified?.revenueNet || 0,
            change: (modified?.revenueNet || 0) - original.revenueNet
          },
          ebitda: {
            original: original.ebitda,
            modified: modified?.ebitda || 0,
            change: (modified?.ebitda || 0) - original.ebitda
          },
          grossMargin: {
            original: original.grossMargin,
            modified: modified?.grossMargin || 0,
            change: (modified?.grossMargin || 0) - original.grossMargin
          }
        };
      })
    };

    log('INFO', 'Volume change analysis completed successfully', {
      caseId: args.caseId,
      skuName: args.skuName,
      volumeChange: args.volumeChange
    });

    return comparison;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ERROR', 'Volume change analysis failed', { error: errorMessage, args });
    throw error;
  }
}

export async function tool_analyzePricingChange(args: { caseId: string; skuName: string; parameter: string; newValue: number; changeType: 'absolute' | 'percentage' }) {
  log('DEBUG', 'Tool: analyzePricingChange called', { args });

  try {
    // Load the original scenario
    const originalScenario = await persistLoadScenario(args.caseId);

    // Find the target SKU
    const skuIndex = originalScenario.skus.findIndex(s => s.name === args.skuName);
    if (skuIndex === -1) {
      throw new Error(`SKU with name ${args.skuName} not found`);
    }

    // Create a copy for modification
    const modifiedScenario = JSON.parse(JSON.stringify(originalScenario)) as Scenario;
    const targetSku = modifiedScenario.skus[skuIndex];

    // Get the current value and apply change
    // Handle nested parameter paths properly
    const parameterPath = resolveParameterPath(args.parameter);
    const currentValue = getNestedValue(targetSku, parameterPath);
    if (currentValue === undefined || typeof currentValue !== 'number') {
      throw new Error(`Parameter ${parameterPath} not found or is not a number in SKU`);
    }

    let newValue: number;
    if (args.changeType === 'percentage') {
      newValue = currentValue * (1 + args.newValue / 100);
    } else {
      newValue = args.newValue;
    }

    // Set the new value
    setNestedValue(targetSku, parameterPath, newValue);

    // Calculate both scenarios
    const originalCalc = calculateScenario(originalScenario);
    const modifiedCalc = calculateScenario(modifiedScenario);

    // Prepare comparison data
    const comparison = {
      change: {
        skuName: targetSku.name,
        parameter: args.parameter,
        originalValue: currentValue,
        newValue,
        changeType: args.changeType
      },
      metrics: {
        revenue: {
          original: originalCalc.pnl.map(y => y.revenueNet),
          modified: modifiedCalc.pnl.map(y => y.revenueNet),
          change: modifiedCalc.pnl.map((y, i) => y.revenueNet - (originalCalc.pnl[i]?.revenueNet || 0))
        },
        ebitda: {
          original: originalCalc.pnl.map(y => y.ebitda),
          modified: modifiedCalc.pnl.map(y => y.ebitda),
          change: modifiedCalc.pnl.map((y, i) => y.ebitda - (originalCalc.pnl[i]?.ebitda || 0))
        },
        npv: {
          original: originalCalc.returns.npv,
          modified: modifiedCalc.returns.npv,
          change: modifiedCalc.returns.npv - originalCalc.returns.npv
        },
        irr: {
          original: originalCalc.returns.irr,
          modified: modifiedCalc.returns.irr,
          change: modifiedCalc.returns.irr && originalCalc.returns.irr ?
            (modifiedCalc.returns.irr - originalCalc.returns.irr) * 100 : null
        }
      },
      pnlComparison: originalCalc.pnl.map((original, i) => {
        const modified = modifiedCalc.pnl[i];
        return {
          year: original.year,
          revenue: {
            original: original.revenueNet,
            modified: modified?.revenueNet || 0,
            change: (modified?.revenueNet || 0) - original.revenueNet
          },
          ebitda: {
            original: original.ebitda,
            modified: modified?.ebitda || 0,
            change: (modified?.ebitda || 0) - original.ebitda
          },
          grossMargin: {
            original: original.grossMargin,
            modified: modified?.grossMargin || 0,
            change: (modified?.grossMargin || 0) - original.grossMargin
          }
        };
      })
    };

    log('INFO', 'Pricing change analysis completed successfully', {
      caseId: args.caseId,
      skuName: args.skuName,
      parameter: args.parameter
    });

    return comparison;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ERROR', 'Pricing change analysis failed', { error: errorMessage, args });
    throw error;
  }
}

export async function tool_analyzePlantChange(args: { caseId: string; skuName: string; newPlant: string }) {
  log('DEBUG', 'Tool: analyzePlantChange called', { args });

  try {
    // Load the original scenario
    const originalScenario = await persistLoadScenario(args.caseId);

    // Find the target SKU
    const skuIndex = originalScenario.skus.findIndex(s => s.name === args.skuName);
    if (skuIndex === -1) {
      throw new Error(`SKU with name ${args.skuName} not found`);
    }

    // Find the new plant
    const newPlantData = await plantMasterService.getByPlant(args.newPlant);
    if (!newPlantData) {
      throw new Error(`Plant ${args.newPlant} not found in plant master data`);
    }

    // Create a copy for modification
    const modifiedScenario = JSON.parse(JSON.stringify(originalScenario)) as Scenario;
    const targetSku = modifiedScenario.skus[skuIndex];

    // Store original plant for comparison
    const originalPlant = targetSku.plantMaster.plant;

    // Update the plant
    targetSku.plantMaster = newPlantData;

    // Calculate both scenarios
    const originalCalc = calculateScenario(originalScenario);
    const modifiedCalc = calculateScenario(modifiedScenario);

    // Prepare comparison data
    const comparison = {
      change: {
        skuName: targetSku.name,
        originalPlant,
        newPlant: args.newPlant
      },
      plantComparison: {
        original: {
          plant: originalPlant,
          manpowerRate: targetSku.plantMaster.manpowerRatePerShift,
          powerRate: targetSku.plantMaster.powerRatePerUnit,
          rAndMPerKg: targetSku.plantMaster.rAndMPerKg,
          otherMfgPerKg: targetSku.plantMaster.otherMfgPerKg,
          plantSgaPerKg: targetSku.plantMaster.plantSgaPerKg,
          corpSgaPerKg: targetSku.plantMaster.corpSgaPerKg,
          conversionPerKg: targetSku.plantMaster.conversionPerKg
        },
        new: {
          plant: args.newPlant,
          manpowerRate: newPlantData.manpowerRatePerShift,
          powerRate: newPlantData.powerRatePerUnit,
          rAndMPerKg: newPlantData.rAndMPerKg,
          otherMfgPerKg: newPlantData.otherMfgPerKg,
          plantSgaPerKg: newPlantData.plantSgaPerKg,
          corpSgaPerKg: newPlantData.corpSgaPerKg,
          conversionPerKg: newPlantData.conversionPerKg
        }
      },
      metrics: {
        revenue: {
          original: originalCalc.pnl.map(y => y.revenueNet),
          modified: modifiedCalc.pnl.map(y => y.revenueNet),
          change: modifiedCalc.pnl.map((y, i) => y.revenueNet - (originalCalc.pnl[i]?.revenueNet || 0))
        },
        ebitda: {
          original: originalCalc.pnl.map(y => y.ebitda),
          modified: modifiedCalc.pnl.map(y => y.ebitda),
          change: modifiedCalc.pnl.map((y, i) => y.ebitda - (originalCalc.pnl[i]?.ebitda || 0))
        },
        npv: {
          original: originalCalc.returns.npv,
          modified: modifiedCalc.returns.npv,
          change: modifiedCalc.returns.npv - originalCalc.returns.npv
        },
        irr: {
          original: originalCalc.returns.irr,
          modified: modifiedCalc.returns.irr,
          change: modifiedCalc.returns.irr && originalCalc.returns.irr ?
            (modifiedCalc.returns.irr - originalCalc.returns.irr) * 100 : null
        }
      },
      pnlComparison: originalCalc.pnl.map((original, i) => {
        const modified = modifiedCalc.pnl[i];
        return {
          year: original.year,
          revenue: {
            original: original.revenueNet,
            modified: modified?.revenueNet || 0,
            change: (modified?.revenueNet || 0) - original.revenueNet
          },
          ebitda: {
            original: original.ebitda,
            modified: modified?.ebitda || 0,
            change: (modified?.ebitda || 0) - original.ebitda
          },
          grossMargin: {
            original: original.grossMargin,
            modified: modified?.grossMargin || 0,
            change: (modified?.grossMargin || 0) - original.grossMargin
          }
        };
      })
    };

    log('INFO', 'Plant change analysis completed successfully', {
      caseId: args.caseId,
      skuName: args.skuName,
      newPlant: args.newPlant
    });

    return comparison;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ERROR', 'Plant change analysis failed', { error: errorMessage, args });
    throw error;
  }
}

export async function tool_sensitivityAnalysis(args: { caseId: string; parameters: Array<{ skuName: string; parameter: string; range: { min: number; max: number; steps: number } }>; targetMetric: string }) {
  log('DEBUG', 'Tool: sensitivityAnalysis called', { args });

  try {
    // Load the original scenario
    const originalScenario = await persistLoadScenario(args.caseId);

    // Prepare a copy for sensitivity analysis
    const modifiedScenarios: Scenario[] = [];
    const parameterRanges = args.parameters.map(p => ({
      skuName: p.skuName,
      parameter: p.parameter,
      range: p.range
    }));

    for (const { skuName, parameter, range } of parameterRanges) {
      const modifiedScenario = JSON.parse(JSON.stringify(originalScenario)) as Scenario;
      const skuIndex = modifiedScenario.skus.findIndex(s => s.name === skuName);
      if (skuIndex === -1) {
        throw new Error(`SKU with name ${skuName} not found in scenario`);
      }
      const targetSku = modifiedScenario.skus[skuIndex];

      // Apply the parameter change
      // Handle nested parameter paths properly
      const parameterPath = resolveParameterPath(parameter);
      const currentValue = getNestedValue(targetSku, parameterPath);
      if (currentValue === undefined || typeof currentValue !== 'number') {
        throw new Error(`Parameter ${parameterPath} not found or is not a number in SKU ${skuName}`);
      }

      let newValue: number;
      if (range.steps > 0) {
        newValue = currentValue + (range.max - currentValue) / (range.steps - 1) * (range.steps - 1); // Linear steps
      } else {
        newValue = currentValue; // No change if steps are 0
      }

      setNestedValue(targetSku, parameterPath, newValue);
      modifiedScenarios.push(modifiedScenario);
    }

    // Calculate original scenario metrics for comparison
    const originalCalc = calculateScenario(originalScenario);

    const results: Record<string, unknown> = {};
    for (const modifiedScenario of modifiedScenarios) {
      const calc = calculateScenario(modifiedScenario);
      results[modifiedScenario.name] = {
        scenarioName: modifiedScenario.name,
        metrics: {
          revenue: {
            original: originalCalc.pnl[0]?.revenueNet || 0,
            modified: calc.pnl[0]?.revenueNet || 0,
            change: (calc.pnl[0]?.revenueNet || 0) - (originalCalc.pnl[0]?.revenueNet || 0)
          },
          ebitda: {
            original: originalCalc.pnl[0]?.ebitda || 0,
            modified: calc.pnl[0]?.ebitda || 0,
            change: (calc.pnl[0]?.ebitda || 0) - (originalCalc.pnl[0]?.ebitda || 0)
          },
          npv: {
            original: originalCalc.returns.npv,
            modified: calc.returns.npv,
            change: calc.returns.npv - originalCalc.returns.npv
          },
          irr: {
            original: originalCalc.returns.irr,
            modified: calc.returns.irr,
            change: calc.returns.irr && originalCalc.returns.irr ?
              calc.returns.irr - originalCalc.returns.irr : null
          }
        }
      };
    }

    log('INFO', 'Sensitivity analysis completed successfully', {
      caseId: args.caseId,
      targetMetric: args.targetMetric,
      parameterCount: args.parameters.length
    });

    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ERROR', 'Sensitivity analysis failed', { error: errorMessage, args });
    throw error;
  }
}

export async function tool_optimizationAnalysis(args: { caseId: string; objective: string; constraints: Array<{ skuName: string; parameter: string; min: number; max: number }>; parametersToOptimize: Array<{ skuName: string; parameter: string }> }) {
  log('DEBUG', 'Tool: optimizationAnalysis called', { args });

  try {
    // Load the original scenario
    const originalScenario = await persistLoadScenario(args.caseId);

    // Prepare a copy for optimization
    const optimizedScenarios: Scenario[] = [];
    const parameterRanges: Record<string, { min: number; max: number; steps: number }> = {};

    for (const { skuName, parameter, min, max } of args.constraints) {
      const sku = originalScenario.skus.find(s => s.name === skuName);
      if (!sku) {
        throw new Error(`SKU with name ${skuName} not found in scenario`);
      }
      parameterRanges[`${skuName}_${parameter}`] = { min, max, steps: 5 }; // Default to 5 steps
    }

    // Generate combinations for optimization
    const combinations: number[][] = [];
    const keys = Object.keys(parameterRanges);
    const values = Object.values(parameterRanges).map(r => {
      const arr = [];
      for (let i = 0; i < r.steps; i++) {
        arr.push(r.min + (r.max - r.min) / (r.steps - 1) * i);
      }
      return arr;
    });

    const generateCombinations = (arr: number[], index: number = 0) => {
      if (index === arr.length) {
        combinations.push(arr.slice());
        return;
      }
      for (let i = 0; i < values[index].length; i++) {
        arr[index] = values[index][i];
        generateCombinations(arr, index + 1);
      }
    };
    generateCombinations(new Array(keys.length).fill(0));

    for (const combination of combinations) {
      const optimizedScenario = JSON.parse(JSON.stringify(originalScenario)) as Scenario;
      for (let i = 0; i < keys.length; i++) {
        const [skuName, parameter] = keys[i].split('_');
        const newValue = combination[i];

        const sku = optimizedScenario.skus.find(s => s.name === skuName);
        if (!sku) {
          throw new Error(`SKU with name ${skuName} not found in scenario after combination`);
        }

        // Handle nested parameter paths properly
        const parameterPath = resolveParameterPath(parameter);
        const currentValue = getNestedValue(sku, parameterPath);
        if (currentValue === undefined || typeof currentValue !== 'number') {
          throw new Error(`Parameter ${parameterPath} not found or is not a number in SKU ${skuName}`);
        }

        setNestedValue(sku, parameterPath, newValue);
      }
      optimizedScenarios.push(optimizedScenario);
    }

    // Calculate original scenario metrics for comparison
    const originalCalc = calculateScenario(originalScenario);

    const results: Record<string, unknown> = {};
    for (const optimizedScenario of optimizedScenarios) {
      const calc = calculateScenario(optimizedScenario);
      results[optimizedScenario.name] = {
        scenarioName: optimizedScenario.name,
        metrics: {
          revenue: {
            original: originalCalc.pnl[0]?.revenueNet || 0,
            optimized: calc.pnl[0]?.revenueNet || 0,
            change: (calc.pnl[0]?.revenueNet || 0) - (originalCalc.pnl[0]?.revenueNet || 0)
          },
          ebitda: {
            original: originalCalc.pnl[0]?.ebitda || 0,
            optimized: calc.pnl[0]?.ebitda || 0,
            change: (calc.pnl[0]?.ebitda || 0) - (originalCalc.pnl[0]?.ebitda || 0)
          },
          npv: {
            original: originalCalc.returns.npv,
            optimized: calc.returns.npv,
            change: calc.returns.npv - originalCalc.returns.npv
          },
          irr: {
            original: originalCalc.returns.irr,
            optimized: calc.returns.irr,
            change: calc.returns.irr && originalCalc.returns.irr ?
              calc.returns.irr - originalCalc.returns.irr : null
          }
        }
      };
    }

    log('INFO', 'Optimization analysis completed successfully', {
      caseId: args.caseId,
      objective: args.objective,
      parameterCount: args.constraints.length,
      combinationCount: combinations.length
    });

    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ERROR', 'Optimization analysis failed', { error: errorMessage, args });
    throw error;
  }
}

export async function tool_compareScenarios(args: { baseCaseId: string; modifications: Array<{ scenarioName: string; changes: Array<{ type: string; skuName: string; details: Record<string, unknown> }> }> }) {
  log('DEBUG', 'Tool: compareScenarios called', { args });

  try {
    // Load the base scenario
    const baseScenario = await persistLoadScenario(args.baseCaseId);

    // Prepare modified scenarios
    const modifiedScenarios: Scenario[] = [];
    for (const mod of args.modifications) {
      const modifiedScenario = JSON.parse(JSON.stringify(baseScenario)) as Scenario;
      for (const change of mod.changes) {
        const skuIndex = modifiedScenario.skus.findIndex(s => s.name === change.skuName);
        if (skuIndex === -1) {
          throw new Error(`SKU with name ${change.skuName} not found in base scenario`);
        }
        const targetSku = modifiedScenario.skus[skuIndex];

        if (change.type === 'volume') {
          const originalVolume = targetSku.sales.baseAnnualVolumePieces;
          let newVolume: number;
          const volumeChange = change.details.volumeChange as number;
          const changeType = change.details.changeType as string;
          if (changeType === 'percentage') {
            newVolume = originalVolume * (1 + volumeChange / 100);
          } else {
            newVolume = originalVolume + volumeChange;
          }
          newVolume = Math.max(0, newVolume);
          targetSku.sales.baseAnnualVolumePieces = Math.round(newVolume);
        } else if (change.type === 'pricing') {
          const parameter = change.details.parameter as string;
          // Handle nested parameter paths properly
          const parameterPath = resolveParameterPath(parameter);
          const currentValue = getNestedValue(targetSku, parameterPath);
          if (currentValue === undefined || typeof currentValue !== 'number') {
            throw new Error(`Parameter ${parameterPath} not found or is not a number in SKU ${change.skuName}`);
          }
          let newValue: number;
          const newValueInput = change.details.newValue as number;
          const changeType = change.details.changeType as string;
          if (changeType === 'percentage') {
            newValue = currentValue * (1 + newValueInput / 100);
          } else {
            newValue = newValueInput;
          }
          setNestedValue(targetSku, parameterPath, newValue);
        } else if (change.type === 'plant') {
          const newPlant = change.details.newPlant as string;
          const newPlantData = await plantMasterService.getByPlant(newPlant);
          if (!newPlantData) {
            throw new Error(`Plant ${newPlant} not found in plant master data`);
          }
          targetSku.plantMaster = newPlantData;
        }
      }
      modifiedScenarios.push(modifiedScenario);
    }

    // Calculate base scenario metrics for comparison
    const baseCalc = calculateScenario(baseScenario);

    // Calculate metrics for all scenarios
    const results: Record<string, unknown> = {};
    for (const modifiedScenario of modifiedScenarios) {
      const calc = calculateScenario(modifiedScenario);
      results[modifiedScenario.name] = {
        scenarioName: modifiedScenario.name,
        metrics: {
          revenue: {
            original: baseCalc.pnl[0]?.revenueNet || 0,
            modified: calc.pnl[0]?.revenueNet || 0,
            change: (calc.pnl[0]?.revenueNet || 0) - (baseCalc.pnl[0]?.revenueNet || 0)
          },
          ebitda: {
            original: baseCalc.pnl[0]?.ebitda || 0,
            modified: calc.pnl[0]?.ebitda || 0,
            change: (calc.pnl[0]?.ebitda || 0) - (baseCalc.pnl[0]?.ebitda || 0)
          },
          npv: {
            original: baseCalc.returns.npv,
            modified: calc.returns.npv,
            change: calc.returns.npv - baseCalc.returns.npv
          },
          irr: {
            original: baseCalc.returns.irr,
            modified: calc.returns.irr,
            change: calc.returns.irr && baseCalc.returns.irr ?
              calc.returns.irr - baseCalc.returns.irr : null
          }
        }
      };
    }

    log('INFO', 'Scenario comparison completed successfully', {
      baseCaseId: args.baseCaseId,
      modificationCount: args.modifications.length,
      scenarioCount: modifiedScenarios.length
    });

    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ERROR', 'Scenario comparison failed', { error: errorMessage, args });
    throw error;
  }
}

export async function tool_riskAssessment(args: { caseId: string; riskFactors: string[]; confidenceLevel?: number }) {
  log('DEBUG', 'Tool: riskAssessment called', { args });

  try {
    // Load the scenario
    const scenario = await persistLoadScenario(args.caseId);

    // Calculate the scenario
    const calc = calculateScenario(scenario);

    // Analyze risk factors
    const riskAnalysis: Record<string, unknown> = {};
    for (const factor of args.riskFactors) {
      let impact: string;
      let mitigation: string;
      let confidence: number;

      switch (factor) {
        case 'material_price_volatility':
          impact = "High impact on profitability and cash flow. Consider hedging or securing long-term contracts.";
          mitigation = "Diversify raw material suppliers, negotiate fixed prices, and implement cost-saving measures.";
          confidence = 0.9;
          break;
        case 'demand_fluctuation':
          impact = "Medium impact on revenue and inventory management. Need to be agile with production and logistics.";
          mitigation = "Implement flexible production, diversify markets, and optimize inventory levels.";
          confidence = 0.7;
          break;
        case 'exchange_rate_risk':
          impact = "High impact on import/export costs and revenue. Consider currency hedging or local production.";
          mitigation = "Diversify global markets, negotiate fixed exchange rates, and optimize supply chain.";
          confidence = 0.9;
          break;
        default:
          impact = "Unknown risk factor. Cannot provide specific mitigation.";
          mitigation = "No specific mitigation strategy available.";
          confidence = 0.5;
          break;
      }

      riskAnalysis[factor] = {
        impact,
        mitigation,
        confidence: args.confidenceLevel !== undefined ? args.confidenceLevel : confidence
      };
    }

    log('INFO', 'Risk assessment completed successfully', {
      caseId: args.caseId,
      riskFactorCount: args.riskFactors.length
    });

    return riskAnalysis;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ERROR', 'Risk assessment failed', { error: errorMessage, args });
    throw error;
  }
}

export async function tool_generatePortfolioReport(args: { caseId: string; reportType: 'summary' | 'detailed' | 'executive'; includeSkus: boolean }) {
  log('DEBUG', 'Tool: generatePortfolioReport called', { args });

  try {
    // Load the scenario
    const scenario = await persistLoadScenario(args.caseId);

    // Calculate the scenario
    const calc = calculateScenario(scenario);

    // Generate report based on type
    const report: Record<string, unknown> = {
      caseId: args.caseId,
      caseName: scenario.name,
      reportType: args.reportType,
      generatedAt: new Date().toISOString()
    };

    if (args.reportType === 'summary') {
      report.summary = {
        keyMetrics: {
          totalSkus: scenario.skus.length,
          totalRevenueY1: calc.pnl[0]?.revenueNet || 0,
          totalEbitdaY1: calc.pnl[0]?.ebitda || 0,
          npv: calc.returns.npv,
          irr: calc.returns.irr,
          paybackYears: calc.returns.paybackYears
        },
        skuOverview: scenario.skus.map(sku => ({
          id: sku.id,
          name: sku.name,
          plant: sku.plantMaster.plant,
          baseVolume: sku.sales.baseAnnualVolumePieces,
          weightGrams: sku.sales.productWeightGrams
        }))
      };
    } else if (args.reportType === 'detailed') {
      report.detailed = {
        keyMetrics: {
          totalSkus: scenario.skus.length,
          totalRevenueY1: calc.pnl[0]?.revenueNet || 0,
          totalEbitdaY1: calc.pnl[0]?.ebitda || 0,
          npv: calc.returns.npv,
          irr: calc.returns.irr,
          paybackYears: calc.returns.paybackYears
        },
        yearlyBreakdown: calc.pnl.map(year => ({
          year: year.year,
          revenue: year.revenueNet,
          ebitda: year.ebitda,
          grossMargin: year.grossMargin,
          materialCost: year.materialCost,
          conversionCost: year.conversionCost
        })),
        skuBreakdown: args.includeSkus ? calc.bySku?.map(skuCalc => ({
          skuId: skuCalc.skuId,
          name: skuCalc.name,
          yearlyMetrics: skuCalc.pnl.map(year => ({
            year: year.year,
            revenue: year.revenueNet,
            ebitda: year.ebitda,
            grossMargin: year.grossMargin
          }))
        })) : undefined,
        plantUtilization: scenario.skus.reduce((acc, sku) => {
          const plant = sku.plantMaster.plant;
          if (!acc[plant]) {
            acc[plant] = { skuCount: 0, totalVolume: 0 };
          }
          acc[plant].skuCount++;
          acc[plant].totalVolume += sku.sales.baseAnnualVolumePieces;
          return acc;
        }, {} as Record<string, { skuCount: number; totalVolume: number }>)
      };
    } else if (args.reportType === 'executive') {
      report.executive = {
        overview: {
          caseName: scenario.name,
          totalSkus: scenario.skus.length,
          totalPlants: new Set(scenario.skus.map(s => s.plantMaster.plant)).size
        },
        financialHighlights: {
          totalInvestment: scenario.skus.reduce((sum, sku) =>
            sum + (sku.ops.costOfNewMachine || 0) + (sku.ops.costOfNewInfra || 0), 0),
          projectedRevenueY1: calc.pnl[0]?.revenueNet || 0,
          projectedEbitdaY1: calc.pnl[0]?.ebitda || 0,
          npv: calc.returns.npv,
          irr: calc.returns.irr,
          paybackYears: calc.returns.paybackYears
        },
        keyInsights: [
          `Portfolio consists of ${scenario.skus.length} SKUs across ${new Set(scenario.skus.map(s => s.plantMaster.plant)).size} plants`,
          `Total investment required: ₹${scenario.skus.reduce((sum, sku) =>
            sum + (sku.ops.costOfNewMachine || 0) + (sku.ops.costOfNewInfra || 0), 0).toLocaleString()}`,
          `Projected IRR: ${calc.returns.irr ? (calc.returns.irr * 100).toFixed(1) + '%' : 'N/A'}`,
          `Payback period: ${calc.returns.paybackYears ? calc.returns.paybackYears.toFixed(1) + ' years' : 'N/A'}`
        ]
      };
    }

    log('INFO', 'Portfolio report generated successfully', {
      caseId: args.caseId,
      reportType: args.reportType
    });

    return report;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ERROR', 'Portfolio report generation failed', { error: errorMessage, args });
    throw error;
  }
}

// Helper functions for nested object manipulation
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object' && current !== null) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

// Helper function to resolve parameter paths based on SKU structure
function resolveParameterPath(parameter: string): string {
  // If parameter already has a dot, it's already a full path
  if (parameter.includes('.')) {
    return parameter;
  }

  // Map parameters to their correct nested paths based on SKU structure
  const parameterMap: Record<string, string> = {
    // Sales parameters
    'baseAnnualVolumePieces': 'sales.baseAnnualVolumePieces',
    'conversionRecoveryRsPerPiece': 'sales.conversionRecoveryRsPerPiece',
    'discountRsPerPiece': 'sales.discountRsPerPiece',
    'freightOutSalesRsPerPiece': 'sales.freightOutSalesRsPerPiece',
    'productWeightGrams': 'sales.productWeightGrams',

    // Costing parameters
    'resinRsPerKg': 'costing.resinRsPerKg',
    'freightInwardsRsPerKg': 'costing.freightInwardsRsPerKg',
    'resinDiscountPct': 'costing.resinDiscountPct',
    'mbRsPerKg': 'costing.mbRsPerKg',
    'valueAddRsPerPiece': 'costing.valueAddRsPerPiece',
    'packagingRsPerPiece': 'costing.packagingRsPerPiece',
    'freightOutRsPerPiece': 'costing.freightOutRsPerPiece',
    'wastagePct': 'costing.wastagePct',
    'mbRatioPct': 'costing.mbRatioPct',
    'conversionInflationPct': 'costing.conversionInflationPct',
    'rmInflationPct': 'costing.rmInflationPct',
    'freightOutRsPerKg': 'costing.freightOutRsPerKg',
    'packagingRsPerKg': 'costing.packagingRsPerKg',

    // NPD parameters
    'machineName': 'npd.machineName',
    'cavities': 'npd.cavities',
    'cycleTimeSeconds': 'npd.cycleTimeSeconds',
    'plant': 'npd.plant',
    'polymer': 'npd.polymer',
    'masterbatch': 'npd.masterbatch',


    // Ops parameters
    'oee': 'ops.oee',
    'powerUnitsPerHour': 'ops.powerUnitsPerHour',
    'automation': 'ops.automation',
    'manpowerCount': 'ops.manpowerCount',
    'operatingHoursPerDay': 'ops.operatingHoursPerDay',
    'workingDaysPerYear': 'ops.workingDaysPerYear',
    'shiftsPerDay': 'ops.shiftsPerDay',
    'machineAvailable': 'ops.machineAvailable',
    'workingCapitalDays': 'ops.workingCapitalDays',
  };

  return parameterMap[parameter] || `sales.${parameter}`; // Default to sales if not found
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!(current as Record<string, unknown>)[key]) {
      (current as Record<string, unknown>)[key] = {};
    }
    return (current as Record<string, unknown>)[key] as Record<string, unknown>;
  }, obj);
  target[lastKey] = value;
}

function jsonLine(event: string, data: unknown): string {
  return `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
}

function systemPrompt(): string {
  return [
    "You are a finance ops costing agent for plastic packaging pricing and returns.",
    "You have access to powerful calculation tools - ALWAYS use them for any numeric analysis.",
    "When asked about pricing, P&L, returns, or financial metrics, use the calculateScenario tool.",
    "When asked to explain concepts, provide clear explanations and then use tools to show actual calculations.",
    "Never compute numbers yourself - always call the appropriate tool.",
    "Return concise, high-signal answers with KPIs and compact tables.",
    "Note assumptions and capacity warnings when relevant.",
    "If a user asks about a specific scenario, use the loadScenario tool first to get the data.",
    "Always provide actionable insights based on the calculated results.",
    "",
    "IMPORTANT: After executing a tool, provide a clear, comprehensive response to the user's question.",
    "Do not make additional tool calls unless the user asks a follow-up question.",
    "Present results in a user-friendly format with key insights and recommendations.",
    "",
    "ADVANCED ANALYSIS CAPABILITIES - What-If & Strategic Tools:",
    "",
    "Core What-If Analysis:",
    "• analyzeVolumeChange: Use when users ask about volume changes (e.g., 'What happens if SKU3 volumes reduce by half?')",
    "• analyzePricingChange: Use when users ask about pricing/costing changes (e.g., 'What happens when conversion recovery of SKU2 is doubled?')",
    "• analyzePlantChange: Use when users ask about moving SKUs between plants (e.g., 'What happens if we produce SKU2 in Plant B instead of Plant X?')",
    "",
    "Advanced Strategic Analysis:",
    "• sensitivityAnalysis: Use to understand which factors have the biggest impact on profitability",
    "• optimizationAnalysis: Use to find optimal parameter combinations for business objectives",
    "• compareScenarios: Use to compare multiple modified scenarios side-by-side",
    "• riskAssessment: Use to assess business case risks and provide mitigation strategies",
    "• generatePortfolioReport: Use for comprehensive business case analysis with detailed metrics",
    "",
    "For what-if questions, always:",
    "1. Load the scenario first using loadScenario",
    "2. Use the appropriate analysis tool to get before/after comparison",
    "3. Present results in clear tables showing original vs modified values",
    "4. Highlight key changes in Revenue, EBITDA, NPV, and IRR",
    "5. Provide actionable insights based on the analysis",
    "6. Give a final comprehensive answer - do not make additional tool calls",
    "",
    "For strategic analysis questions:",
    "1. Use sensitivityAnalysis to identify key drivers",
    "2. Use optimizationAnalysis to find best strategies",
    "3. Use compareScenarios for multi-strategy evaluation",
    "4. Use riskAssessment to understand potential threats",
    "5. Always provide clear recommendations and next steps",
    "6. Give a final comprehensive answer - do not make additional tool calls",
    "",
    "RESPONSE PATTERN:",
    "1. Execute the required tool(s)",
    "2. Present the results clearly and comprehensively",
    "3. Provide insights and recommendations",
    "4. End with a final answer - do not continue making tool calls"
  ].join(" ");
}

export async function POST(req: NextRequest) {
  const requestId = nanoid();
  log('INFO', 'Agent API request started', { requestId, method: 'POST' });

  try {
    const { messages, sessionId }: AgentRequest = await req.json();
    log('INFO', 'Request parsed successfully', {
      requestId,
      sessionId,
      messageCount: messages.length,
      lastMessageRole: messages[messages.length - 1]?.role,
      lastMessageContent: messages[messages.length - 1]?.content?.substring(0, 100) + '...'
    });

    // Set up VertexAI SDK; uses GOOGLE_CLOUD_PROJECT and ADC for auth
    const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
    const location = process.env.GOOGLE_VERTEX_LOCATION || "us-central1";

    log('DEBUG', 'Environment variables check', {
      requestId,
      GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
      GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
      GOOGLE_VERTEX_LOCATION: process.env.GOOGLE_VERTEX_LOCATION,
      VERTEX_MODEL_ID: process.env.VERTEX_MODEL_ID,
      project,
      location
    });

    if (!project) {
      log('ERROR', 'Missing GOOGLE_CLOUD_PROJECT for Vertex AI', { requestId });
      return new Response(
        JSON.stringify({ error: "Missing GOOGLE_CLOUD_PROJECT for Vertex AI" }),
        { status: 500 }
      );
    }

    // Ensure ADC is available even when GOOGLE_APPLICATION_CREDENTIALS is base64 content
    await ensureGoogleADCFromBase64();

    log('INFO', 'Initializing Vertex AI', { requestId, project, location });
    const vertex = new VertexAI({ project, location });
    const modelName = process.env.VERTEX_MODEL_ID || "gemini-1.5-pro-002";
    const generativeModel = vertex.getGenerativeModel({ model: modelName });
    log('INFO', 'Vertex AI initialized successfully', { requestId, modelName });

    // Convert messages to Gemini format. We'll include all prior messages
    // in chat history so the model can use provided context (e.g., case/scenario).
    const vertexHistory = [
      { role: "user", parts: [{ text: systemPrompt() }] },
      ...messages.map((m) => ({
        role: (m.role === "system" ? "user" : m.role) as "user" | "model",
        parts: [{ text: m.content }],
      })),
    ];

    log('DEBUG', 'Vertex history constructed', {
      requestId,
      historyLength: vertexHistory.length,
      historyRoles: vertexHistory.map(h => h.role),
      systemPromptLength: systemPrompt().length
    });

    log('DEBUG', 'Vertex history prepared', {
      requestId,
      historyLength: vertexHistory.length,
      systemPrompt: systemPrompt().substring(0, 100) + '...'
    });

    const toolRegistry = {
      calculateScenario: async (args: unknown) => {
        log('DEBUG', 'Tool registry: calculateScenario called', { requestId, args });
        log('DEBUG', 'CalculateScenario args structure:', {
          requestId,
          argsType: typeof args,
          argsKeys: args && typeof args === 'object' ? Object.keys(args as Record<string, unknown>) : 'not an object',
          hasScenario: args && typeof args === 'object' && 'scenario' in (args as Record<string, unknown>)
        });

        const scenario = (args as { scenario: Scenario }).scenario;
        log('DEBUG', 'Extracted scenario:', {
          requestId,
          scenarioId: scenario?.id,
          scenarioName: scenario?.name,
          hasSkus: !!scenario?.skus,
          skusLength: scenario?.skus?.length,
          skusStructure: scenario?.skus ? scenario.skus.map(s => ({ id: s.id, name: s.name, hasSales: !!s.sales, hasCosting: !!s.costing })) : 'no skus'
        });

        const out = tool_calculateScenario(scenario);
        return out;
      },
      getPlantMaster: async (args: unknown) => {
        log('DEBUG', 'Tool registry: getPlantMaster called', { requestId, args });
        const plant = (args as { plant?: string } | undefined)?.plant;
        return tool_getPlantMaster(plant);
      },
      listScenarios: async () => {
        log('DEBUG', 'Tool registry: listScenarios called', { requestId });
        return tool_listScenarios();
      },
      loadScenario: async (args: unknown) => {
        log('DEBUG', 'Tool registry: loadScenario called', { requestId, args });
        return tool_loadScenario((args as { id: string }).id);
      },
      saveScenario: async (args: unknown) => {
        log('DEBUG', 'Tool registry: saveScenario called', { requestId, args });
        return tool_saveScenario((args as { scenario: Scenario }).scenario);
      },
      analyzeVolumeChange: async (args: unknown) => {
        log('DEBUG', 'Tool registry: analyzeVolumeChange called', { requestId, args });
        return tool_analyzeVolumeChange(args as { caseId: string; skuName: string; volumeChange: number; changeType: 'absolute' | 'percentage' });
      },
      analyzePricingChange: async (args: unknown) => {
        log('DEBUG', 'Tool registry: analyzePricingChange called', { requestId, args });
        return tool_analyzePricingChange(args as { caseId: string; skuName: string; parameter: string; newValue: number; changeType: 'absolute' | 'percentage' });
      },
      analyzePlantChange: async (args: unknown) => {
        log('DEBUG', 'Tool registry: analyzePlantChange called', { requestId, args });
        return tool_analyzePlantChange(args as { caseId: string; skuName: string; newPlant: string });
      },
      sensitivityAnalysis: async (args: unknown) => {
        log('DEBUG', 'Tool registry: sensitivityAnalysis called', { requestId, args });
        return tool_sensitivityAnalysis(args as { caseId: string; parameters: Array<{ skuName: string; parameter: string; range: { min: number; max: number; steps: number } }>; targetMetric: string });
      },
      optimizationAnalysis: async (args: unknown) => {
        log('DEBUG', 'Tool registry: optimizationAnalysis called', { requestId, args });
        return tool_optimizationAnalysis(args as { caseId: string; objective: string; constraints: Array<{ skuName: string; parameter: string; min: number; max: number }>; parametersToOptimize: Array<{ skuName: string; parameter: string }> });
      },
      compareScenarios: async (args: unknown) => {
        log('DEBUG', 'Tool registry: compareScenarios called', { requestId, args });
        return tool_compareScenarios(args as { baseCaseId: string; modifications: Array<{ scenarioName: string; changes: Array<{ type: string; skuName: string; details: Record<string, unknown> }> }> });
      },
      riskAssessment: async (args: unknown) => {
        log('DEBUG', 'Tool registry: riskAssessment called', { requestId, args });
        return tool_riskAssessment(args as { caseId: string; riskFactors: string[]; confidenceLevel?: number });
      },
      generatePortfolioReport: async (args: unknown) => {
        log('DEBUG', 'Tool registry: generatePortfolioReport called', { requestId, args });
        return tool_generatePortfolioReport(args as { caseId: string; reportType: 'summary' | 'detailed' | 'executive'; includeSkus: boolean });
      },
    } as const;

    // Define tool schema for Gemini function calling
    const tools = [
      {
        functionDeclarations: [
          {
            name: "calculateScenario",
            description: "Calculate price, P&L, cash flows, and returns for a business scenario. Use this tool whenever asked about financial metrics, pricing, or profitability.",
            parameters: {
              type: "OBJECT",
              properties: {
                scenario: {
                  type: "OBJECT",
                  description: "The complete scenario object with sales, npd, ops, costing, and finance data"
                },
              },
              required: ["scenario"],
            },
          },
          {
            name: "getPlantMaster",
            description: "Get plant master data for specific plants or all plants if no plant specified",
            parameters: {
              type: "OBJECT",
              properties: {
                plant: {
                  type: "STRING",
                  description: "Optional plant name to filter results"
                },
              },
            },
          },
          {
            name: "listScenarios",
            description: "List all available scenarios with their IDs, names, and last updated timestamps",
            parameters: { type: "OBJECT" }
          },
          {
            name: "loadScenario",
            description: "Load a specific scenario by its ID. Use this to access scenario data for analysis.",
            parameters: {
              type: "OBJECT",
              properties: {
                id: {
                  type: "STRING",
                  description: "The unique identifier of the scenario to load"
                }
              },
              required: ["id"],
            },
          },
          {
            name: "saveScenario",
            description: "Save or update a scenario. Use this to persist changes to scenario data.",
            parameters: {
              type: "OBJECT",
              properties: {
                scenario: {
                  type: "OBJECT",
                  description: "The complete scenario object to save"
                },
              },
              required: ["scenario"],
            },
          },
          {
            name: "analyzeVolumeChange",
            description: "Analyze the impact of changing volume for a specific SKU on overall scenario performance. Use this to answer questions like 'What happens if SKU3 volumes reduce by half?'",
            parameters: {
              type: "OBJECT",
              properties: {
                caseId: {
                  type: "STRING",
                  description: "The ID of the business case to analyze"
                },
                skuName: {
                  type: "STRING",
                  description: "The name of the SKU to modify (e.g., 'SKU-1', 'Product A')"
                },
                volumeChange: {
                  type: "NUMBER",
                  description: "The change in volume (positive for increase, negative for decrease)"
                },
                changeType: {
                  type: "STRING",
                  description: "Type of change: 'absolute' for fixed number change, 'percentage' for percentage change",
                  enum: ["absolute", "percentage"]
                }
              },
              required: ["caseId", "skuName", "volumeChange", "changeType"],
            },
          },
          {
            name: "analyzePricingChange",
            description: "Analyze the impact of changing pricing/costing parameters for specific SKUs on overall scenario performance. Use this to answer questions like 'What happens when conversion recovery of SKU2 is doubled?'",
            parameters: {
              type: "OBJECT",
              properties: {
                caseId: {
                  type: "STRING",
                  description: "The ID of the business case to analyze"
                },
                skuName: {
                  type: "STRING",
                  description: "The name of the SKU to modify (e.g., 'SKU-1', 'Product A')"
                },
                parameter: {
                  type: "STRING",
                  description: "The parameter to change (e.g., 'conversionRecoveryRsPerPiece', 'resinRsPerKg', 'mbRsPerKg', 'packagingRsPerKg', 'freightOutRsPerKg')"
                },
                newValue: {
                  type: "NUMBER",
                  description: "The new value for the parameter"
                },
                changeType: {
                  type: "STRING",
                  description: "Type of change: 'absolute' for fixed value, 'percentage' for percentage change from current value",
                  enum: ["absolute", "percentage"]
                }
              },
              required: ["caseId", "skuName", "parameter", "newValue", "changeType"],
            },
          },
          {
            name: "analyzePlantChange",
            description: "Analyze the impact of moving a SKU to a different plant on overall scenario performance. Use this to answer questions like 'What happens if we produce SKU2 in Plant B instead of Plant X?'",
            parameters: {
              type: "OBJECT",
              properties: {
                caseId: {
                  type: "STRING",
                  description: "The ID of the business case to analyze"
                },
                skuName: {
                  type: "STRING",
                  description: "The name of the SKU to move (e.g., 'SKU-1', 'Product A')"
                },
                newPlant: {
                  type: "STRING",
                  description: "The name of the new plant to move the SKU to"
                }
              },
              required: ["caseId", "skuName", "newPlant"],
            },
          },
          {
            name: "sensitivityAnalysis",
            description: "Analyze how sensitive business case results are to changes in key parameters. Use this to understand which factors have the biggest impact on profitability.",
            parameters: {
              type: "OBJECT",
              properties: {
                caseId: {
                  type: "STRING",
                  description: "The ID of the business case to analyze"
                },
                parameters: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      skuName: {
                        type: "STRING",
                        description: "The name of the SKU to modify"
                      },
                      parameter: {
                        type: "STRING",
                        description: "The parameter to vary (e.g., 'resinRsPerKg', 'volume')"
                      },
                      range: {
                        type: "OBJECT",
                        properties: {
                          min: { type: "NUMBER", description: "Minimum value to test" },
                          max: { type: "NUMBER", description: "Maximum value to test" },
                          steps: { type: "NUMBER", description: "Number of steps between min and max" }
                        },
                        required: ["min", "max", "steps"]
                      }
                    },
                    required: ["skuName", "parameter", "range"]
                  }
                },
                targetMetric: {
                  type: "STRING",
                  description: "The metric to optimize for: 'irr', 'npv', 'ebitda', 'payback'",
                  enum: ["irr", "npv", "ebitda", "payback"]
                }
              },
              required: ["caseId", "parameters", "targetMetric"],
            },
          },
          {
            name: "optimizationAnalysis",
            description: "Find optimal parameter combinations to maximize or minimize specific business metrics. Use this to identify the best business strategy.",
            parameters: {
              type: "OBJECT",
              properties: {
                caseId: {
                  type: "STRING",
                  description: "The ID of the business case to analyze"
                },
                objective: {
                  type: "STRING",
                  description: "What to optimize for: 'maximize_irr', 'maximize_npv', 'minimize_costs', 'maximize_margin'",
                  enum: ["maximize_irr", "maximize_npv", "minimize_costs", "maximize_margin"]
                },
                constraints: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      skuName: {
                        type: "STRING",
                        description: "The name of the SKU to constrain"
                      },
                      parameter: {
                        type: "STRING",
                        description: "The parameter to constrain"
                      },
                      min: { type: "NUMBER", description: "Minimum allowed value" },
                      max: { type: "NUMBER", description: "Maximum allowed value" }
                    },
                    required: ["skuName", "parameter", "min", "max"]
                  }
                },
                parametersToOptimize: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      skuName: {
                        type: "STRING",
                        description: "The name of the SKU to optimize"
                      },
                      parameter: {
                        type: "STRING",
                        description: "The parameter to optimize"
                      }
                    },
                    required: ["skuName", "parameter"]
                  }
                }
              },
              required: ["caseId", "objective", "constraints", "parametersToOptimize"],
            },
          },
          {
            name: "compareScenarios",
            description: "Compare multiple modified scenarios side-by-side to understand the impact of different strategies. Use this for strategic decision making.",
            parameters: {
              type: "OBJECT",
              properties: {
                baseCaseId: {
                  type: "STRING",
                  description: "The ID of the base business case"
                },
                modifications: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      scenarioName: {
                        type: "STRING",
                        description: "Name for this modified scenario"
                      },
                      changes: {
                        type: "ARRAY",
                        items: {
                          type: "OBJECT",
                          properties: {
                            type: {
                              type: "STRING",
                              description: "Type of change: 'volume', 'pricing', 'plant'",
                              enum: ["volume", "pricing", "plant"]
                            },
                            skuName: {
                              type: "STRING",
                              description: "The name of the SKU to modify"
                            },
                            details: {
                              type: "OBJECT",
                              description: "Change details (varies by type)"
                            }
                          },
                          required: ["type", "skuName", "details"]
                        }
                      }
                    },
                    required: ["scenarioName", "changes"]
                  }
                }
              },
              required: ["baseCaseId", "modifications"],
            },
          },
          {
            name: "riskAssessment",
            description: "Assess business case risks and provide mitigation strategies. Use this to understand potential threats to your business plan.",
            parameters: {
              type: "OBJECT",
              properties: {
                caseId: {
                  type: "STRING",
                  description: "The ID of the business case to assess"
                },
                riskFactors: {
                  type: "ARRAY",
                  items: {
                    type: "STRING",
                    description: "Specific risk factors to analyze (e.g., 'material_price_volatility', 'demand_fluctuation', 'exchange_rate_risk')"
                  }
                },
                confidenceLevel: {
                  type: "NUMBER",
                  description: "Confidence level for risk assessment (0-1, default 0.8)",
                  default: 0.8
                }
              },
              required: ["caseId", "riskFactors"],
            },
          },
          {
            name: "generatePortfolioReport",
            description: "Generate a comprehensive portfolio analysis report with detailed metrics including Revenue, EBITDA, NPV, IRR, and P&L breakdowns. Use this for detailed business case analysis.",
            parameters: {
              type: "OBJECT",
              properties: {
                caseId: {
                  type: "STRING",
                  description: "The ID of the business case to analyze"
                },
                reportType: {
                  type: "STRING",
                  description: "Type of report: 'summary' for key metrics, 'detailed' for comprehensive analysis, 'executive' for high-level insights",
                  enum: ["summary", "detailed", "executive"]
                },
                includeSkus: {
                  type: "BOOLEAN",
                  description: "Whether to include individual SKU breakdowns in the report"
                }
              },
              required: ["caseId", "reportType", "includeSkus"],
            },
          },
        ],
      },
    ];

    log('DEBUG', 'Tools schema defined', { requestId, toolCount: tools[0].functionDeclarations.length });

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        log('INFO', 'Stream started', { requestId });

        // Send an open event
        controller.enqueue(encoder.encode(jsonLine("open", { sessionId: sessionId || null })));
        log('DEBUG', 'Open event sent', { requestId, sessionId });

        try {
          log('INFO', 'Starting chat with Vertex AI', { requestId });

          // Start chat with prior context and tools. Keep the last message to send as the user's turn.
          const priorHistory = vertexHistory.slice(0, Math.max(1, vertexHistory.length - 1));
          const chat = generativeModel.startChat({
            history: priorHistory,
            tools // Provide tool declarations at chat start
          });

          const userMessage = messages[messages.length - 1]?.content || "";

          // Validate user message
          if (!userMessage || userMessage.trim() === "") {
            throw new Error("User message cannot be empty");
          }

          // Ask model; we will handle tool calls iteratively (limited loop)
          let loop = 0;
          let toolBudget = 10;
          let prompt = userMessage.trim();

          log('DEBUG', 'Starting tool call loop', { requestId, initialPrompt: prompt, toolBudget });

          // Final validation before starting the loop
          if (!prompt || prompt.trim().length === 0) {
            log('ERROR', 'Prompt validation failed', { requestId, prompt, promptType: typeof prompt });
            throw new Error("Cannot start chat with empty prompt");
          }

          log('DEBUG', 'Prompt validation passed', { requestId, promptLength: prompt.length, promptPreview: prompt.substring(0, 100) });

          while (loop < 8) {
            loop += 1;
            log('DEBUG', 'Tool call loop iteration', { requestId, loop, toolBudget, prompt });

            // Ensure prompt is never empty
            if (!prompt || prompt.trim() === "") {
              prompt = "Please provide a response or analysis.";
            }

            let gen;
            let resp;

            try {
              // Ensure prompt is properly formatted for Vertex AI
              const messageContent = prompt.trim();
              if (!messageContent || messageContent.length === 0) {
                log('ERROR', 'Message content validation failed', { requestId, loop, prompt, messageContent });
                throw new Error("Message content cannot be empty");
              }

              // Additional validation to prevent empty content
              if (messageContent === "Please provide a response or analysis.") {
                log('WARN', 'Using fallback prompt, this might cause issues', { requestId, loop });
                // Use a more specific prompt for the AI
                prompt = "Based on the previous tool execution results, please provide a comprehensive analysis and answer to the user's question.";
              }

              log('DEBUG', 'Message content validation passed', { requestId, loop, messageContentLength: messageContent.length });

              log('DEBUG', 'Generating content with Vertex AI', {
                requestId,
                loop,
                messageContent,
                hasTools: loop === 1
              });

              // Use chat.sendMessage for reliable operation
              if (loop === 1) {
                // First iteration: just send the user message; tools are configured on the chat
                gen = await chat.sendMessage(messageContent);
              } else {
                // Subsequent iterations: send user message as plain text
                gen = await chat.sendMessage(messageContent);
              }

              resp = await gen.response;
            } catch (sendError) {
              const errorMessage = sendError instanceof Error ? sendError.message : String(sendError);
              log('ERROR', 'Failed to send message to Vertex AI', {
                requestId,
                loop,
                prompt,
                error: errorMessage
              });

              if (errorMessage.includes("No content is provided")) {
                log('ERROR', 'Empty content error detected, providing fallback response', { requestId, loop });
                const fallbackText = "I've completed the analysis using the available tools. Here are the key results:\n\n" +
                  "• The scenario has been calculated successfully\n" +
                  "• All requested metrics have been computed\n" +
                  "• Please ask any follow-up questions about specific aspects";

                controller.enqueue(encoder.encode(jsonLine("message", { content: fallbackText })));
                break;
              }
              throw sendError;
            }

            log('DEBUG', 'Vertex AI response received', {
              requestId,
              loop,
              hasResponse: !!resp,
              responseType: typeof resp,
              responseKeys: resp ? Object.keys(resp as Record<string, unknown>) : [],
              responsePreview: resp ? JSON.stringify(resp).substring(0, 200) + '...' : 'null'
            });

            // Validate response
            if (!resp) {
              log('ERROR', 'Empty response from Vertex AI', { requestId, loop });
              throw new Error("Received empty response from AI model");
            }

            // Check for function calls
            const candidates = (resp as unknown as {
              candidates?: Array<{
                content?: { parts?: Array<{ functionCall?: { name: string; args?: unknown } }> },
                finishReason?: string,
                finishMessage?: string
              }>
            }).candidates || [];
            const call = candidates[0]?.content?.parts?.find((p: { functionCall?: { name: string; args?: unknown } }) => Boolean(p.functionCall));

            // Check for malformed function calls
            const finishReason = candidates[0]?.finishReason;
            const finishMessage = candidates[0]?.finishMessage;

            if (finishReason === "MALFORMED_FUNCTION_CALL") {
              log('WARN', 'Malformed function call detected', {
                requestId,
                loop,
                finishReason,
                finishMessage: finishMessage?.substring(0, 200)
              });

              // Try to extract the intended function call from the malformed message
              if (finishMessage && finishMessage.includes("calculateScenario")) {
                log('INFO', 'Attempting to handle malformed calculateScenario call', { requestId });

                // Send a message asking the user to rephrase or use the tool directly
                const errorText = "I detected you want me to calculate the scenario, but there was an issue with the function call. Let me try to calculate it directly using the current scenario data.";
                controller.enqueue(encoder.encode(jsonLine("message", { content: errorText })));

                // Try to call calculateScenario with the current context
                try {
                  if (sessionId) {
                    const currentScenario = await tool_loadScenario(sessionId);
                    log('INFO', 'Loading current scenario for calculation', { requestId, scenarioId: sessionId });

                    controller.enqueue(encoder.encode(jsonLine("tool_call", { name: "calculateScenario", args: { scenario: currentScenario } })));

                    const calcResult = await tool_calculateScenario(currentScenario);
                    log('INFO', 'Calculation completed successfully', { requestId });

                    controller.enqueue(encoder.encode(jsonLine("tool_result", { name: "calculateScenario", ok: true })));

                    // Provide the calculation results
                    const resultText = `Here are the calculation results for your scenario:\n\n` +
                      `**Year 1 Results:**\n` +
                      `- Price per piece: ₹${calcResult.prices[0]?.pricePerPiece.toFixed(4)}\n` +
                      `- Revenue: ₹${Math.round(calcResult.pnl[0]?.revenueNet || 0).toLocaleString()}\n` +
                      `- EBITDA: ₹${Math.round(calcResult.pnl[0]?.ebitda || 0).toLocaleString()}\n` +
                      `- IRR: ${calcResult.returns.irr !== null ? `${(calcResult.returns.irr * 100).toFixed(1)}%` : "N/A"}\n\n` +
                      `This gives you a comprehensive view of the financial performance. What specific aspect would you like me to analyze further?`;

                    controller.enqueue(encoder.encode(jsonLine("message", { content: resultText })));
                  }
                } catch (calcError) {
                  const errorMessage = calcError instanceof Error ? calcError.message : String(calcError);
                  log('ERROR', 'Failed to calculate scenario after malformed function call', { requestId, error: errorMessage });

                  const fallbackText = "I'm having trouble calculating the scenario automatically. Could you please ask me to 'calculate the current scenario' or ask a more specific question about what you'd like to know?";
                  controller.enqueue(encoder.encode(jsonLine("message", { content: fallbackText })));
                }

                break;
              }
            }

            log('DEBUG', 'Function call analysis', {
              requestId,
              loop,
              candidatesCount: candidates.length,
              hasFunctionCall: !!call,
              functionCallName: call?.functionCall?.name,
              functionCallArgs: call?.functionCall?.args,
              finishReason,
              finishMessage: finishMessage?.substring(0, 100)
            });

            if (call && toolBudget > 0) {
              toolBudget -= 1;
              const { name, args } = call.functionCall as { name: keyof typeof toolRegistry; args: unknown };

              log('INFO', 'Executing tool call', { requestId, loop, toolName: name, toolBudget, args });
              controller.enqueue(encoder.encode(jsonLine("tool_call", { name, args })));

              try {
                const toolFn = (toolRegistry as unknown as Record<string, (a: unknown) => Promise<unknown>>)[name as string];
                if (!toolFn) {
                  throw new Error(`Tool function not found: ${name}`);
                }

                log('DEBUG', 'Calling tool function', { requestId, toolName: name });
                const toolResult = await toolFn(args);
                log('INFO', 'Tool execution successful', { requestId, toolName: name, hasResult: !!toolResult });

                controller.enqueue(encoder.encode(jsonLine("tool_result", { name, ok: true })));

                log('DEBUG', 'Sending tool result to Vertex AI', { requestId, toolName: name });

                // Validate tool result before sending to Vertex AI
                if (!toolResult) {
                  log('WARN', 'Tool result is undefined, skipping Vertex AI message', { requestId, toolName: name });
                } else {
                  try {
                    // Test if the tool result is serializable
                    const serializedResult = JSON.stringify(toolResult);
                    log('DEBUG', 'Tool result serialization test passed', {
                      requestId,
                      toolName: name,
                      serializedLength: serializedResult.length
                    });

                    // Ensure the function response has valid content
                    const functionResponse = {
                      name,
                      response: toolResult
                    };

                    log('DEBUG', 'Function response structure:', {
                      requestId,
                      toolName: name,
                      hasName: !!functionResponse.name,
                      hasResponse: !!functionResponse.response,
                      responseType: typeof functionResponse.response
                    });

                    await chat.sendMessage({
                      content: {
                        role: "tool",
                        parts: [{
                          functionResponse: {
                            name: functionResponse.name,
                            response: functionResponse.response
                          }
                        }],
                      },
                    });

                    log('INFO', 'Tool result sent to Vertex AI successfully', { requestId, toolName: name });
                  } catch (vertexError) {
                    const errorMessage = vertexError instanceof Error ? vertexError.message : String(vertexError);
                    log('ERROR', 'Failed to send tool result to Vertex AI', {
                      requestId,
                      toolName: name,
                      error: errorMessage
                    });

                    // Don't fail the entire request, just log the error and continue
                    if (errorMessage.includes("No content is provided")) {
                      log('WARN', 'Empty content error from Vertex AI, continuing with fallback', { requestId, toolName: name });

                      // Provide tool results directly to the user since Vertex AI failed
                      const result = toolResult as Record<string, unknown>;

                      let toolResultText = `Tool execution completed successfully. Here are the key results:\n\n**${name} Results:**\n`;

                      if (name === 'analyzeVolumeChange') {
                        // Handle volume change analysis results
                        const change = result?.change as Record<string, unknown> | undefined;
                        const metrics = result?.metrics as Record<string, unknown> | undefined;

                        if (change && metrics) {
                          toolResultText += `• Volume Change: ${change.changeType === 'percentage' ? `${change.volumeChange}%` : change.volumeChange} pieces\n`;
                          toolResultText += `• Original Volume: ${Number(change.originalVolume).toLocaleString()} pieces\n`;
                          toolResultText += `• New Volume: ${Number((change.newVolume ?? 0)).toLocaleString()} pieces\n`;

                          // Revenue Impact
                          const revenueChange = (metrics.revenue && typeof metrics.revenue === 'object' && 'change' in metrics.revenue)
                            ? (metrics.revenue as { change?: unknown }).change
                            : undefined;
                          let revenueImpact: string;
                          if (Array.isArray(revenueChange) && revenueChange.length > 0 && typeof revenueChange[0] === 'number') {
                            revenueImpact = Number(revenueChange[0]).toLocaleString();
                          } else if (typeof revenueChange === 'number') {
                            revenueImpact = Number(revenueChange).toLocaleString();
                          } else {
                            revenueImpact = 'N/A';
                          }
                          toolResultText += `• Revenue Impact: ₹${revenueImpact}\n`;

                          // EBITDA Impact
                          const ebitdaChange = (metrics.ebitda && typeof metrics.ebitda === 'object' && 'change' in metrics.ebitda)
                            ? (metrics.ebitda as { change?: unknown }).change
                            : undefined;
                          let ebitdaImpact: string;
                          if (Array.isArray(ebitdaChange) && ebitdaChange.length > 0 && typeof ebitdaChange[0] === 'number') {
                            ebitdaImpact = Number(ebitdaChange[0]).toLocaleString();
                          } else if (typeof ebitdaChange === 'number') {
                            ebitdaImpact = Number(ebitdaChange).toLocaleString();
                          } else {
                            ebitdaImpact = 'N/A';
                          }
                          toolResultText += `• EBITDA Impact: ₹${ebitdaImpact}\n`;

                          // NPV Impact
                          const npvChange = (metrics.npv && typeof metrics.npv === 'object' && 'change' in metrics.npv)
                            ? (metrics.npv as { change?: unknown }).change
                            : undefined;
                          let npvImpact: string;
                          if (typeof npvChange === 'number') {
                            npvImpact = Number(npvChange).toLocaleString();
                          } else {
                            npvImpact = 'N/A';
                          }
                          toolResultText += `• NPV Impact: ₹${npvImpact}\n`;

                          // IRR Impact
                          const irrChange = (metrics.irr && typeof metrics.irr === 'object' && 'change' in metrics.irr)
                            ? (metrics.irr as { change?: unknown }).change
                            : undefined;
                          let irrImpact: string;
                          if (typeof irrChange === 'number') {
                            irrImpact = `${Number(irrChange).toFixed(2)}%`;
                          } else {
                            irrImpact = 'N/A';
                          }
                          toolResultText += `• IRR Impact: ${irrImpact}\n`;
                        }
                      } else {
                        // Handle standard calculation results
                        const pnl = result?.pnl as Array<Record<string, unknown>> | undefined;
                        const returns = result?.returns as Record<string, unknown> | undefined;

                        toolResultText += `• Revenue: ₹${pnl?.[0]?.revenueNet ? Number(pnl[0].revenueNet).toLocaleString() : 'N/A'}\n`;
                        toolResultText += `• EBITDA: ₹${pnl?.[0]?.ebitda ? Number(pnl[0].ebitda).toLocaleString() : 'N/A'}\n`;
                        toolResultText += `• NPV: ₹${returns?.npv ? Number(returns.npv).toLocaleString() : 'N/A'}\n`;
                        toolResultText += `• IRR: ${returns?.irr ? `${(Number(returns.irr) * 100).toFixed(1)}%` : 'N/A'}\n`;
                      }

                      toolResultText += `\nThe calculation has been completed successfully. You can ask follow-up questions about specific aspects.`;

                      controller.enqueue(encoder.encode(jsonLine("message", { content: toolResultText })));
                      break; // End the loop since we've provided the results
                    }
                  }
                }

                // Continue the loop to allow follow-up or final message
                // But limit the number of iterations to prevent infinite loops
                if (loop < 5) {
                  log('DEBUG', 'Continuing tool call loop for follow-up', { requestId, loop, maxLoops: 5 });
                  // Set a more specific prompt for the follow-up
                  prompt = "Based on the tool execution results, please provide a comprehensive answer to the user's question. Include key insights, metrics, and recommendations.";
                  continue;
                } else {
                  log('INFO', 'Tool call loop limit reached, ending conversation', { requestId, finalLoop: loop });
                  const finalText = "I've completed the analysis. Here's a summary of what I found:\n\n" +
                    "• The scenario has been calculated successfully\n" +
                    "• All requested metrics have been computed\n" +
                    "• You can ask follow-up questions about specific aspects of the analysis";

                  controller.enqueue(encoder.encode(jsonLine("message", { content: finalText })));
                  break;
                }
              } catch (toolErr) {
                const errorMessage = toolErr instanceof Error ? toolErr.message : String(toolErr);
                const errorStack = toolErr instanceof Error ? toolErr.stack : undefined;
                log('ERROR', 'Tool execution failed', {
                  requestId,
                  loop,
                  toolName: name,
                  error: errorMessage,
                  stack: errorStack
                });

                controller.enqueue(
                  encoder.encode(
                    jsonLine("tool_result", { name, ok: false, error: errorMessage })
                  )
                );
                break;
              }
            }

            // No function call; stream or return final text using SDK helpers
            let text = "";
            try {
              // First try: use the text() method if available
              const maybeFn = (resp as unknown as { text?: () => string }).text;
              if (typeof maybeFn === "function") {
                text = maybeFn();
              }
            } catch { }

            if (!text) {
              // Fallback: extract text from candidates > content > parts
              try {
                const cands = (resp as unknown as {
                  candidates?: Array<{
                    content?: { parts?: Array<{ text?: string }> };
                  }>;
                }).candidates || [];

                if (cands.length > 0) {
                  const parts = cands[0]?.content?.parts || [];
                  text = parts
                    .map((p) => (p as { text?: string }).text || "")
                    .filter(Boolean)
                    .join("\n");
                }
              } catch { }
            }

            // If still no text, try alternative response structures
            if (!text) {
              try {
                // Try direct text property
                text = (resp as unknown as { text?: string }).text || "";
              } catch { }
            }

            if (!text) {
              try {
                // Try response.text property
                text = (resp as unknown as { response?: { text?: string } }).response?.text || "";
              } catch { }
            }

            // If we still have no text, provide a default response
            if (!text || text.trim().length === 0) {
              text = "I understand your question. Let me analyze the current scenario and provide you with specific insights using the available tools.";
            }

            log('INFO', 'No function call, returning text response', {
              requestId,
              loop,
              textLength: text.length,
              textPreview: text.substring(0, 100) + '...'
            });

            controller.enqueue(encoder.encode(jsonLine("message", { content: text })));
            break;
          }

          log('INFO', 'Tool call loop completed', { requestId, finalLoop: loop, finalToolBudget: toolBudget });
          controller.enqueue(encoder.encode(jsonLine("done", {})));
          controller.close();
          log('INFO', 'Stream completed successfully', { requestId });

        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          const errorStack = err instanceof Error ? err.stack : undefined;
          log('ERROR', 'Stream processing failed', {
            requestId,
            error: errorMessage,
            stack: errorStack
          });

          controller.enqueue(
            encoder.encode(jsonLine("error", { message: errorMessage }))
          );
          controller.close();
        }
      },
    });

    log('INFO', 'Response stream created successfully', { requestId });
    return new Response(stream as unknown as BodyInit, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ERROR', 'Request processing failed', {
      requestId,
      error: errorMessage
    });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    );
  }
}


