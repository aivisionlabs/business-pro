import { NextRequest } from "next/server";
import {
  tool_listScenarios,
  tool_loadScenario,
  tool_calculateScenario,
  tool_getPlantMaster,
  tool_analyzeVolumeChange,
  tool_analyzePricingChange,
  tool_analyzePlantChange,
  tool_generatePortfolioReport,
  tool_sensitivityAnalysis,
  tool_optimizationAnalysis,
  tool_compareScenarios,
  tool_riskAssessment,
} from "../route";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  // Pick the first available scenario for evals
  const scenarios = await tool_listScenarios();
  if (!scenarios.length) {
    return new Response(
      JSON.stringify({ error: "No scenarios available to run evals" }),
      { status: 400 }
    );
  }

  const base = await tool_loadScenario(scenarios[0].id);
  const firstSkuName = base.skus[0]?.name;
  const secondSkuName = base.skus[1]?.name || firstSkuName;

  const evals: Record<string, unknown> = {};

  // Basic calc
  evals.calculateScenario = tool_calculateScenario(base);

  // Plant master
  evals.getPlantMaster_all = tool_getPlantMaster();
  evals.getPlantMaster_one = tool_getPlantMaster(base.skus[0]?.plantMaster.plant);

  // What-if: volume
  evals.analyzeVolumeChange = await tool_analyzeVolumeChange({
    caseId: base.id,
    skuName: firstSkuName,
    volumeChange: -50,
    changeType: "percentage",
  });

  // What-if: pricing
  evals.analyzePricingChange = await tool_analyzePricingChange({
    caseId: base.id,
    skuName: firstSkuName,
    parameter: "sales.conversionRecoveryRsPerPiece",
    newValue: 2,
    changeType: "absolute",
  });

  // What-if: plant (if another plant exists in master)
  const allPlants = tool_getPlantMaster() as unknown as { plant: string }[];
  const targetPlant = allPlants.find(p => p.plant !== base.skus[0]?.plantMaster.plant)?.plant || base.skus[0]?.plantMaster.plant;
  evals.analyzePlantChange = await tool_analyzePlantChange({
    caseId: base.id,
    skuName: secondSkuName,
    newPlant: targetPlant,
  });

  // Portfolio report
  evals.generatePortfolioReport = await tool_generatePortfolioReport({
    caseId: base.id,
    reportType: "summary",
    includeSkus: true,
  });

  // Sensitivity (single param, 3 steps)
  evals.sensitivityAnalysis = await tool_sensitivityAnalysis({
    caseId: base.id,
    parameters: [
      {
        skuName: firstSkuName,
        parameter: "costing.resinRsPerKg",
        range: { min: Math.max(0, base.skus[0]?.costing.resinRsPerKg - 5), max: (base.skus[0]?.costing.resinRsPerKg || 0) + 5, steps: 3 },
      },
    ],
    targetMetric: "npv",
  });

  // Optimization (bounded)
  evals.optimizationAnalysis = await tool_optimizationAnalysis({
    caseId: base.id,
    objective: "maximize_npv",
    constraints: [
      {
        skuName: firstSkuName,
        parameter: "costing.resinRsPerKg",
        min: Math.max(0, base.skus[0]?.costing.resinRsPerKg - 5),
        max: (base.skus[0]?.costing.resinRsPerKg || 0) + 5,
      },
    ],
    parametersToOptimize: [
      { skuName: firstSkuName, parameter: "costing.resinRsPerKg" },
    ],
  });

  // Scenario compare (two small mods)
  evals.compareScenarios = await tool_compareScenarios({
    baseCaseId: base.id,
    modifications: [
      {
        scenarioName: "Vol -10%",
        changes: [
          { type: "volume", skuName: firstSkuName, details: { changeType: "percentage", volumeChange: -10 } },
        ],
      },
      {
        scenarioName: "Plant switch",
        changes: [
          { type: "plant", skuName: secondSkuName, details: { newPlant: targetPlant } },
        ],
      },
    ],
  });

  // Risk assessment
  evals.riskAssessment = await tool_riskAssessment({
    caseId: base.id,
    riskFactors: ["material_price_volatility", "demand_fluctuation"],
    confidenceLevel: 0.8,
  });

  return new Response(JSON.stringify({ ok: true, evals }), {
    headers: { "Content-Type": "application/json" },
  });
}


