import { NextRequest, NextResponse } from "next/server";
import { BusinessCase, ObjectiveConfig, PerturbationSpec } from "@/lib/types";
import { SimulationEngine } from "@/lib/calc/simulation/SimulationEngine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Sensitivity API received:", JSON.stringify(body, null, 2));

    const { businessCase, specs, objective, baseline } = body as {
      businessCase: BusinessCase;
      specs: PerturbationSpec[];
      objective: ObjectiveConfig;
      baseline?: Record<string, number | null>;
    };

    if (!businessCase || !Array.isArray(specs) || !objective) {
      console.error("Validation failed:", {
        hasBusinessCase: !!businessCase,
        hasSpecs: !!specs,
        specsLength: specs?.length,
        hasObjective: !!objective
      });
      return NextResponse.json({
        error: "Invalid payload",
        details: {
          hasBusinessCase: !!businessCase,
          hasSpecs: !!specs,
          specsLength: specs?.length,
          hasObjective: !!objective
        }
      }, { status: 400 });
    }

    console.log("Running sensitivity analysis with:", {
      specsCount: specs.length,
      objective: objective.metrics,
      hasBaseline: !!baseline
    });

    const result = SimulationEngine.runSensitivity(
      businessCase,
      specs,
      objective,
      baseline as any
    );

    console.log("Sensitivity analysis completed successfully");
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Sensitivity API error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({
      error: message,
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}


