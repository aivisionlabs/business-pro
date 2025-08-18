import { NextRequest } from "next/server";
import { businessCaseService } from "@/lib/firebase/firestore";
import { BusinessCase } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  try {
    const businessCase = await businessCaseService.getById(id);

    if (!businessCase) {
      return new Response(JSON.stringify({ error: "Scenario not found" }),
        { status: 404 });
    }

    return new Response(JSON.stringify(businessCase),
      { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error fetching scenario:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch scenario" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  try {
    // Validate request body
    const input = await req.json();
    if (!input || typeof input !== 'object') {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    if (!input.id || input.id !== id) {
      return new Response(
        JSON.stringify({ error: "Scenario ID mismatch" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!input.name || typeof input.name !== 'string') {
      return new Response(
        JSON.stringify({ error: "Scenario name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update the business case in Firebase
    const updates: Partial<BusinessCase> = {
      name: input.name,
      finance: input.finance,
      skus: input.skus,
    };

    await businessCaseService.update(id, updates);

    return new Response(JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error updating scenario:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to update scenario",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  try {
    await businessCaseService.delete(id);
    return new Response(JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error deleting scenario:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to delete scenario",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}


