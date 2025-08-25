import { NextRequest, NextResponse } from "next/server";
import { QuoteCalculator } from "@/lib/calc/engines";
import { QuoteGenerationInput, CustomerQuote } from "@/lib/types";

/**
 * POST /api/quotes - Generate a new customer quote
 */
export async function POST(request: NextRequest) {
  try {
    const body: QuoteGenerationInput = await request.json();

    // Validate required fields
    if (!body.businessCase) {
      return NextResponse.json(
        { error: "businessCase is required" },
        { status: 400 }
      );
    }

    // Generate the quote
    const quote = QuoteCalculator.generateQuote(body);

    return NextResponse.json({ quote }, { status: 201 });
  } catch (error) {
    console.error("Error generating quote:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate quote" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/quotes - Update quote totals after component changes
 */
export async function PUT(request: NextRequest) {
  try {
    const body: { quote: CustomerQuote } = await request.json();

    if (!body.quote) {
      return NextResponse.json(
        { error: "quote is required" },
        { status: 400 }
      );
    }

    // Validate the quote
    const validation = QuoteCalculator.validateQuote(body.quote);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Invalid quote data", details: validation.errors },
        { status: 400 }
      );
    }

    // Update totals
    const updatedQuote = QuoteCalculator.updateQuoteTotals(body.quote);

    return NextResponse.json({ quote: updatedQuote });
  } catch (error) {
    console.error("Error updating quote:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update quote" },
      { status: 500 }
    );
  }
}
