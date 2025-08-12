### Agentic Chat Interface – Design Specification

Reference sources:
- Business workbook requirements and formula logic: [Shared spec](https://chatgpt.com/share/68988c4a-a50c-800d-a3d8-dd1fe7cfa356)
- Agentic chat requirements: [Agent brief](https://chatgpt.com/s/t_689981a7aa788191ad2e245d5f7b2721)

## 1) Objective
Provide an agentic chat system that understands costing and pricing intents for plastic packaging SKUs and uses deterministic tools to fetch data and compute results (price build-up, P&L, cash flows, returns), strictly following the workbook logic.

## 2) High-level capabilities
- Understand natural language queries and map them to tools and structured parameters
- Use tools to compute all numeric results (never freehand math)
- Maintain multi-turn context and scenario state within a session
- Ask targeted clarifying questions for missing critical inputs
- Provide concise answers with key KPIs and compact tables; show assumptions and capacity warnings
- Offer actions: save scenario, load scenario, export CSV/XLSX

## 3) Architecture
- Frontend: `app/chat/page.tsx`
  - Chat UI with streaming tokens
  - Inline tool-call trace (what was called, with concise arguments)
  - Quick actions (buttons) to tweak scenario and re-run
- Backend: `app/api/agent/route.ts`
  - Agent loop with LLM + tool registry
  - Tool handlers (server only) calling the deterministic TS calc engine
  - Input validation and normalization (grams→kg, percent clamping, defaults)
- Deterministic engine (already exists)
  - `src/lib/calc/*` as source of truth

## 4) Tools (server-side handlers)
All tools are server-only and type-safe. LLM must call tools for any number.

- calculateScenario
  - input: `Scenario`
  - output: `{ volumes, prices, pnl, cashflow, returns }` as `CalcOutput`
  - behavior: 5-year projection; inflation pass-through logic; interest-only capex debt; RoCE = EBIT / (NetBlock + NWC); capacity checks

- getPlantMaster
  - input: optional `{ plant?: string }`
  - output: `PlantMaster[]` or single `PlantMaster`
  - storage: `src/data/plant-master.json`

- listScenarios
  - input: none
  - output: `{ id, name, updatedAt }[]`
  - storage: files in `src/data/scenarios/*.json`

- loadScenario
  - input: `{ id: string }`
  - output: `Scenario`

- saveScenario
  - input: `{ scenario: Scenario }`
  - output: `{ id }` (returns provided id or generated)

- exportCsv
  - input: `{ scenario: Scenario, result: CalcOutput, kind: "pnl" | "price" }`
  - output: `{ url }` (temporary URL)

- exportXlsx
  - input: `{ scenario: Scenario, result: CalcOutput }`
  - output: `{ url }`
  - tabs: Price Build-up, P&L (Rs cr / kg / piece), Cash Flows & Returns

## 5) Agent policy
- Source of truth: use tools for all numbers and persistence
- Disambiguation: ask 1–2 focused questions only when necessary (e.g., missing conversion recovery and machine rate)
- Validation: clamp percentages
  to [0,1]; require weight > 0; useful life ≥ 1; capacity warnings if plan > capacity
- Assumptions: default operatingHoursPerDay=24, workingDaysPerYear=365, shifts=3 unless user/scenario overrides

## 6) Prompts
- System prompt (server-only):
  - You are a finance ops costing agent for plastic packaging pricing and returns. Follow the workbook logic in the shared spec exactly. Never compute numbers yourself; call tools. Ask targeted clarifying questions if required inputs are missing. Return concise, high-signal answers with KPIs and tables. Note assumptions and capacity warnings.
- Tool instruction style: always return JSON, with optional short human summary.

## 7) API contracts
- POST `api/agent`
  - body: `{ messages: { role: "system" | "user" | "assistant" | "tool"; content: string; toolName?: string; }[], sessionId?: string }`
  - response: streaming Server-Sent Events or chunked JSON with message deltas and tool-call events
- Internal tools invoked in-process (no public endpoints needed in MVP)

## 8) Data model references
- Use existing `Scenario`, `PlantMaster`, `CalcOutput` from `src/lib/types.ts`
- Extend with `ScenarioMeta { id: string; name: string; createdAt: string; updatedAt: string }` for lists

## 9) UX flows
- “What’s the price per piece if resin increases 6% YoY and volume is 12M?”
  - Agent loads current scenario, applies changes, calls `calculateScenario`, returns Y1 price, EBITDA, NPV; flags capacity if overrun
- “Why is EBITDA low in Y3?”
  - Agent diffs P&L components YoY, highlights drivers (RM/MB inflation, conversion inflation, overheads), suggests sensitivity
- “Save this as Veeba-v2 with Plant B; export XLSX.”
  - Agent switches plant via `getPlantMaster`, recalculates, saves via `saveScenario`, calls `exportXlsx`, returns link

## 10) Validation & defaults
- Weight grams > 0; volume ≥ 0; percent in [0,1]
- If `conversionRecoveryRsPerPiece` missing and `machineRatePerDayRs` missing → ask user
- Default lifecycles: straight-line depreciation; no salvage in MVP
- Working capital based on revenue (days) in MVP

## 11) Observability & safety
- Log tool calls (name, redacted args, duration)
- Per-request tool-call budget (e.g., ≤ 10)
- Timeouts on tools and friendly error messages
- Rate-limiting per session

## 12) Testing
- Unit tests for tool handlers
- Snapshot test for a known scenario to match price, EBITDA, NPV, IRR
- Property tests for inflation compounding and percent clamping

## 13) Implementation plan
- Phase 1
  - Build `/chat` UI and `/api/agent` endpoint
  - Tools: `calculateScenario`, `getPlantMaster`, `listScenarios`, `loadScenario`, `saveScenario`
  - Inline tool-call trace and streaming responses
- Phase 2
  - Add `exportCsv` and `exportXlsx`; format tabs to mirror workbook
  - Explanations: YoY component deltas, capacity utilization
- Phase 3
  - Scenario compare in-chat and sensitivity suggestions
  - Shareable short links for scenarios

## 14) Non-functional requirements
- Latency: tool executions < 50 ms typical; UI responsive, incremental tokens
- Reliability: deterministic results from TS engine; errors fail gracefully with suggestions
- Privacy: no PII; local JSON storage by default; no external uploads unless user triggers export



