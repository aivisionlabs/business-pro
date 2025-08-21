import { NextRequest, NextResponse } from "next/server";
import { BusinessCase, ObjectiveConfig, ScenarioDefinition } from "@/lib/types";
import { SimulationEngine } from "@/lib/calc/simulation/SimulationEngine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessCase, scenarios, objective } = body as {
      businessCase: BusinessCase;
      scenarios: ScenarioDefinition[];
      objective: ObjectiveConfig;
    };
    if (!businessCase || !Array.isArray(scenarios) || !objective) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const result = SimulationEngine.runScenarios(businessCase, scenarios, objective);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


