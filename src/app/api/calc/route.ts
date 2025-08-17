import { NextRequest, NextResponse } from "next/server";
import { calculateScenario } from "@/lib/calc";
import { BusinessCase } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BusinessCase;
    const result = calculateScenario(body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}


