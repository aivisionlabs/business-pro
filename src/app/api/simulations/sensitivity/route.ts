import { NextRequest, NextResponse } from "next/server";
import { BusinessCase, ObjectiveConfig, PerturbationSpec } from "@/lib/types";
import { SimulationEngine } from "@/lib/calc/simulation/SimulationEngine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessCase, specs, objective } = body as {
      businessCase: BusinessCase;
      specs: PerturbationSpec[];
      objective: ObjectiveConfig;
    };

    if (!businessCase || !Array.isArray(specs) || !objective) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const result = SimulationEngine.runSensitivity(businessCase, specs, objective);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


