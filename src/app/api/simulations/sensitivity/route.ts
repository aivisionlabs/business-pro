// This endpoint is deprecated. Sensitivity is now computed client-side for RoCE (Y1).
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    error: "Sensitivity API deprecated. Use client-side RiskSensitivity component.",
  }, { status: 410 });
}


