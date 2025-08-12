import { NextRequest } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";
import { Scenario } from "@/lib/types";

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
    const input = (await req.json()) as Scenario;
    const now = new Date().toISOString();
    const scenario: Scenario = { ...input, id, updatedAt: now, createdAt: input.createdAt || now };
    await fs.writeFile(file, JSON.stringify(scenario, null, 2), "utf-8");
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to save" }), { status: 400 });
  }
}


