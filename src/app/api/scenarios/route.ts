import { NextRequest } from "next/server";
import { businessCaseService } from "@/lib/firebase/firestore";
import { BusinessCase, Sku } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const businessCases = await businessCaseService.getAll();

    // Return only metadata for the list view
    const caseMeta = businessCases.map((bcase) => ({
      id: bcase.id,
      name: bcase.name,
      updatedAt: bcase.updatedAt,
    }));

    return new Response(JSON.stringify(caseMeta),
      { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error fetching scenarios:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch scenarios" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const input = (await req.json()) as Partial<BusinessCase> & { name: string };

    const defaultSku: Omit<Sku, 'id'> = {
      businessCaseId: '', // Will be set after creation
      name: "SKU-1",
      sales: {
        productWeightGrams: 0.3,
        conversionRecoveryRsPerPiece: 0,
        baseAnnualVolumePieces: 0,
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
        newMachineRequired: false,
        newMouldRequired: false,
        newInfraRequired: false,
        costOfNewMachine: 0,
        costOfOldMachine: 0,
        costOfNewMould: 0,
        costOfOldMould: 0,
        costOfNewInfra: 0,
        costOfOldInfra: 0,
        lifeOfNewMachineYears: 15,
        lifeOfNewMouldYears: 15,
        lifeOfNewInfraYears: 30,
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

    const businessCaseData: Omit<BusinessCase, 'id' | 'createdAt' | 'updatedAt'> = {
      name: input.name || `Case-${Date.now()}`,
      finance: input.finance || {
        includeCorpSGA: true,
        debtPct: 0,
        costOfDebtPct: 0,
        costOfEquityPct: 0,
        corporateTaxRatePct: 0.25,
      },
      skus: [defaultSku as Sku], // Type assertion since we'll add ID after creation
    };

    // Create the business case in Firebase
    const newId = await businessCaseService.create(businessCaseData);

    return new Response(JSON.stringify({ id: newId }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error creating scenario:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create scenario",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}


