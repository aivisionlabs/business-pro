import AgentChat from "@/components/AgentChat";
import { BusinessCase as Scenario } from "@/lib/types";
import { calculateScenario } from "@/lib/calc";
import * as fs from "fs/promises";
import * as path from "path";
import Link from "next/link";

function formatCrores(n: number): string {
  const crores = n / 10000000; // Convert to crores
  return `₹${crores.toFixed(2).replace(/\.?0+$/, "")} Cr`;
}

async function loadScenario(id: string): Promise<Scenario | null> {
  try {
    const SCENARIO_DIR = path.join(process.cwd(), "src/data/scenarios");
    const file = path.join(SCENARIO_DIR, `${id}.json`);
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as Scenario;
  } catch {
    return null;
  }
}

export default async function CaseChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scenario = await loadScenario(id);

  if (!scenario) {
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

  const calc = calculateScenario(scenario);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Chat: {scenario.name}
            </h1>
            <p className="text-slate-600 text-sm">Case ID: {scenario.id}</p>
          </div>
          <Link
            href={`/cases/${scenario.id}`}
            className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-sm"
          >
            Edit Case
          </Link>
        </div>
        {/* Metrics summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
            <div className="text-xs text-slate-600 mb-1">Price/pc (Y1)</div>
            <div className="text-xl font-semibold text-slate-900">
              ₹{calc.prices[0]?.pricePerPiece.toFixed(4)}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
            <div className="text-xs text-slate-600 mb-1">Revenue (Y1)</div>
            <div className="text-xl font-semibold text-slate-900">
              {formatCrores(calc.pnl[0]?.revenueNet || 0)}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
            <div className="text-xs text-slate-600 mb-1">EBITDA (Y1)</div>
            <div className="text-xl font-semibold text-slate-900">
              {formatCrores(calc.pnl[0]?.ebitda || 0)}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
            <div className="text-xs text-slate-600 mb-1">IRR</div>
            <div className="text-xl font-semibold text-slate-900">
              {calc.returns.irr !== null
                ? `${(calc.returns.irr * 100).toFixed(1)}%`
                : "—"}
            </div>
          </div>
        </div>

        <AgentChat
          sessionId={scenario.id}
          title="Chat about this case"
          initialSystemNote={`You are assisting with business case '${scenario.name}' (id: ${scenario.id}). It contains ${scenario.skus.length} SKUs. Use the available tools (calculateScenario, loadScenario, saveScenario, listScenarios, getPlantMaster) to provide accurate analysis. When asked about P&L, pricing, or returns, call calculateScenario with the current case data and explain both aggregated and per-SKU insights.`}
          context={{ scenario }}
          placeholder="Ask about price, P&L, returns, scenarios..."
        />
      </div>
    </main>
  );
}
