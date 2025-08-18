import { NextRequest } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";
import { BusinessCase } from "@/lib/types";

export const runtime = "nodejs";

const SCENARIO_DIR = path.join(process.cwd(), "src/data/scenarios");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const file = path.join(SCENARIO_DIR, `${id}.json`);
  try {
    const raw = await fs.readFile(file, "utf-8");
    return new Response(raw, { headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const file = path.join(SCENARIO_DIR, `${id}.json`);

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

    // Ensure the directory exists
    try {
      await fs.mkdir(SCENARIO_DIR, { recursive: true });
    } catch (dirError) {
      console.error("Failed to create directory:", dirError);
      return new Response(
        JSON.stringify({ error: "Failed to create directory" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    const scenario: BusinessCase = {
      ...input,
      id,
      updatedAt: now,
      createdAt: input.createdAt || now
    };

    // Write the file with proper formatting
    await fs.writeFile(file, JSON.stringify(scenario, null, 2), "utf-8");

    // Verify the file was written successfully
    try {
      await fs.access(file);
      const stats = await fs.stat(file);
      if (stats.size === 0) {
        throw new Error("File is empty after write");
      }
    } catch (verifyError) {
      console.error("File verification failed:", verifyError);
      return new Response(
        JSON.stringify({ error: "File verification failed after save" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully saved scenario ${id} to ${file}`);
    return new Response(
      JSON.stringify({ ok: true, id, updatedAt: now }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error saving scenario:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Failed to save scenario", details: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}


