import { NextRequest, NextResponse } from "next/server";
import { QuoteCalculator } from "@/lib/calc/engines";
import { QuoteOptimizationInput } from "@/lib/types";

/**
 * POST /api/quotes/optimize - Optimize quote to achieve target NPV/IRR
 */
export async function POST(request: NextRequest) {
  try {
    const body: QuoteOptimizationInput = await request.json();

    // Validate required fields
    if (!body.quote || !body.optimizationMode || !body.businessCase) {
      return NextResponse.json(
        { error: "quote, businessCase, and optimizationMode are required" },
        { status: 400 }
      );
    }

    if (!body.targetNpv && !body.targetIrr) {
      return NextResponse.json(
        { error: "Either targetNpv or targetIrr must be provided" },
        { status: 400 }
      );
    }

    if (!['conversion_only', 'all_components'].includes(body.optimizationMode)) {
      return NextResponse.json(
        { error: "optimizationMode must be 'conversion_only' or 'all_components'" },
        { status: 400 }
      );
    }

    // Perform optimization
    const result = QuoteCalculator.optimizeQuote(body);

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Error optimizing quote:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to optimize quote" },
      { status: 500 }
    );
  }
}
