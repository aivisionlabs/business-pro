import MultiSkuEditor from "@/components/MultiSkuEditor";
import { BusinessCase as Scenario, PlantMaster } from "@/lib/types";
import * as fs from "fs/promises";
import * as path from "path";
import Link from "next/link";

async function loadScenario(id: string): Promise<Scenario | null> {
  try {
    console.log("Loading scenario with ID:", id);

    // Use direct file system access for server component
    const SCENARIO_DIR = path.join(process.cwd(), "src/data/scenarios");
    const file = path.join(SCENARIO_DIR, `${id}.json`);

    try {
      const raw = await fs.readFile(file, "utf-8");
      const scenario = JSON.parse(raw) as Scenario;
      console.log("Loaded scenario:", scenario.name);
      return scenario;
    } catch (fileError) {
      console.error("File read error:", fileError);
      return null;
    }
  } catch (error) {
    console.error("Error loading scenario:", error);
    return null;
  }
}

async function loadPlantMasterData(): Promise<PlantMaster[]> {
  try {
    const plantMasterPath = path.join(
      process.cwd(),
      "src/data/plant-master.json"
    );
    const raw = await fs.readFile(plantMasterPath, "utf-8");
    return JSON.parse(raw) as PlantMaster[];
  } catch (error) {
    console.error("Failed to load plant master data:", error);
    // Provide a minimal fallback plant
    return [
      {
        plant: "Default Plant",
        manpowerRatePerShift: 500,
        powerRatePerUnit: 7.0,
        rAndMPerKg: 3.0,
        otherMfgPerKg: 1.5,
        plantSgaPerKg: 8.0,
        corpSgaPerKg: 4.0,
        conversionPerKg: 25.8,
        sellingGeneralAndAdministrativeExpensesPerKg: 7.2,
      },
    ];
  }
}

export default async function CaseDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  console.log("CaseDetail: Received params with ID:", id);

  const scenario = await loadScenario(id);
  console.log(
    "CaseDetail: Loaded scenario:",
    scenario ? scenario.name : "null"
  );

  if (!scenario) {
    console.log("CaseDetail: Scenario not found, showing error page");
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold text-slate-900 mb-2">
            Case not found
          </div>
          <Link href="/cases" className="text-blue-600">
            Back to cases
          </Link>
        </div>
      </main>
    );
  }

  // Load plant master data with fallback
  const plants = await loadPlantMasterData();
  console.log("CaseDetail: Loaded", plants.length, "plants");

  console.log("CaseDetail: Rendering page for scenario:", scenario.name);
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="mx-auto max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Main Content - Full Width */}
        <MultiSkuEditor scenario={scenario} plantOptions={plants} />

        {/* Link to Chat Page */}
        <div className="mt-8 flex justify-end">
          <Link
            href={`/cases/${scenario.id}/chat`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700"
          >
            Open Chat for this Case
          </Link>
        </div>
      </div>
    </main>
  );
}
