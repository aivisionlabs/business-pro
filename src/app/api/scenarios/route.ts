import { NextRequest } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";
import { nanoid } from "nanoid";
import { BusinessCase, Sku } from "@/lib/types";

export const runtime = "nodejs";

const SCENARIO_DIR = path.join(process.cwd(), "src/data/scenarios");

async function ensureDir() {
  try {
    await fs.mkdir(SCENARIO_DIR, { recursive: true });
  } catch { }
}

export async function GET() {
  await ensureDir();
  const files = await fs.readdir(SCENARIO_DIR);
  const out: { id: string; name: string; updatedAt: string }[] = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(SCENARIO_DIR, f), "utf-8");
      const s = JSON.parse(raw) as BusinessCase;
      out.push({ id: s.id, name: s.name, updatedAt: s.updatedAt });
    } catch { }
  }
  out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
}

export async function POST(req: NextRequest) {
  await ensureDir();
  try {
    const input = (await req.json()) as Partial<BusinessCase> & { name: string };
    const now = new Date().toISOString();
    const id = input.id || nanoid();
    const file = path.join(SCENARIO_DIR, `${id}.json`);
    const defaultSku: Sku = {
      id: nanoid(6),
      name: "SKU-1",
      sales: {
        customer: "",
        product: "",
        productWeightGrams: 0.3,
        conversionRecoveryRsPerPiece: 0,
        mouldAmortizationRsPerPiece: 0,
        discountRsPerPiece: 0,
        freightOutSalesRsPerPiece: 0,
        baseAnnualVolumePieces: 0,
        yoyGrowthPct: [0, 0, 0, 0, 0],
        inflationPassThrough: true,
      },
      npd: {
        machineName: "",
        cavities: 1,
        cycleTimeSeconds: 1,
        plant: "",
        polymer: "",
        masterbatch: "",
      },
      ops: {
        oee: 0.8,
        powerUnitsPerHour: 0,
        automation: false,
        manpowerCount: 0,
        operatingHoursPerDay: 24,
        workingDaysPerYear: 365,
        shiftsPerDay: 3,
      },
      costing: {
        resinRsPerKg: 0,
        freightInwardsRsPerKg: 0,
        resinDiscountPct: 0,
        mbRsPerKg: 0,
        valueAddRsPerPiece: 0,
        packagingRsPerKg: 0,
        freightOutRsPerKg: 0,
        wastagePct: 0,
        mbRatioPct: 0,
        conversionInflationPct: [0, 0, 0, 0, 0],
        rmInflationPct: [0, 0, 0, 0, 0],
      },
      capex: {
        machineCost: 0,
        mouldCost: 0,
        infraCost: 0,
        workingCapitalDays: 0,
        usefulLifeMachineYears: 15,
        usefulLifeMouldYears: 15,
        usefulLifeInfraYears: 30,
      },
      plantMaster: {
        plant: "",
        manpowerRatePerShift: 0,
        powerRatePerUnit: 0,
        rAndMPerKg: 0,
        otherMfgPerKg: 0,
        plantSgaPerKg: 0,
        corpSgaPerKg: 0,
        conversionPerKg: 0,
        sellingGeneralAndAdministrativeExpensesPerKg: 0,
      },
      altConversion: {},
    };

    const scenario: BusinessCase = {
      id,
      name: input.name || `Case-${id}`,
      createdAt: input.createdAt || now,
      updatedAt: now,
      finance: input.finance || {
        includeCorpSGA: true,
        debtPct: 0,
        costOfDebtPct: 0,
        costOfEquityPct: 0,
        corporateTaxRatePct: 0.25,
      },
      skus: input.skus && input.skus.length ? input.skus : [defaultSku],
    };

    // Write the file and ensure it's completed
    await fs.writeFile(file, JSON.stringify(scenario, null, 2), "utf-8");

    // Verify the file was written
    try {
      await fs.access(file);
    } catch {
      throw new Error("File write verification failed");
    }

    return new Response(JSON.stringify({ id }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error creating scenario:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create scenario", details: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}


