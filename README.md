Business Pro – a pricing and returns calculator for plastic packaging SKUs, built with Next.js + TypeScript.

### What’s included
- **Deterministic calculator**: interactive UI and API powered by `src/lib/calc/*`
- **Agentic chat**: `/chat` UI backed by Google Vertex AI with function calling to the deterministic engine
- **Local data**: plant master and scenarios stored as JSON under `src/data/*`

## Prerequisites
- Node.js 18+
- A Google Cloud project with Vertex AI API enabled
- Authentication for server runtime (one of):
  - `gcloud auth application-default login` on your dev machine, or
  - Service account JSON and `GOOGLE_APPLICATION_CREDENTIALS` pointing to it

## Setup
1) Install dependencies
```bash
npm install
```

2) Configure environment
- Required:
  - `GOOGLE_CLOUD_PROJECT` (or `GCLOUD_PROJECT`)
- Optional (defaults shown):
  - `GOOGLE_VERTEX_LOCATION=us-central1`
  - `VERTEX_MODEL_ID=gemini-1.5-pro-002`

Example for local dev (bash/zsh):
```bash
export GOOGLE_CLOUD_PROJECT=your-gcp-project-id
# if using a service account key
export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/key.json
export GOOGLE_VERTEX_LOCATION=us-central1
export VERTEX_MODEL_ID=gemini-1.5-pro-002
```

## Run
```bash
npm run dev
```
Open `http://localhost:3000`.

## How to use
### 1) Calculator UI (deterministic)
- Go to `/` (home). Adjust values in the sections:
  - Sales, NPD/Ops/Plant, Costing, Capex & Finance
- Outputs auto-recalculate (Price build-up, P&L Y1..Y5, Returns & RoCE)
- Buttons: Export JSON (scenario+result), Export P&L CSV

Key files:
- `src/lib/calc/*` – deterministic engine (source of truth for numbers)
- `src/app/page.tsx` – calculator UI
- `src/app/api/calc/route.ts` – raw calculation API
- `src/data/plant-master.json` – plant-level rates
- `src/data/examples/veeba.json` – sample scenario

### 2) Agent Chat (Vertex AI + tools)
- Go to `/chat`
- Ask natural language questions like:
  - “What’s the price per piece if resin increases 6% YoY and volume is 12M?”
  - “Why is EBITDA low in Y3?”
  - “Save this as Veeba-v2 and list scenarios.”
- The UI shows responses and a tool-call trace inline.

Backend details:
- Endpoint: `POST /api/agent` streams Server-Sent Events
- Tools (server-only) call the deterministic engine and local data:
  - `calculateScenario(scenario)`
  - `getPlantMaster(plant?)`
  - `listScenarios()`
  - `loadScenario({ id })`
  - `saveScenario({ scenario })`
- Scenarios persist under `src/data/scenarios/*.json` (dev-only storage)

### 3) APIs
- Calculate scenario directly:
```bash
curl -sS http://localhost:3000/api/calc \
  -H 'Content-Type: application/json' \
  -d @src/data/examples/veeba.json | jq '.prices[0], .pnl[0], .returns'
```

- Agent endpoint (SSE). Minimal example:
```bash
curl -N http://localhost:3000/api/agent \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      { "role": "user", "content": "What is Y1 price per piece for the sample?" }
    ]
  }'
```

## Data and persistence
- Plant master: `src/data/plant-master.json`
- Scenarios: `src/data/scenarios/*.json` (auto-created). Not production-grade storage.

## Troubleshooting
- Vertex AI auth errors (401/403):
  - Ensure `GOOGLE_CLOUD_PROJECT` is set and ADC is configured (gcloud or service account)
  - Enable Vertex AI API in your GCP project
  - Service account should have sufficient roles (e.g., Vertex AI User)
- Missing model/location: set `VERTEX_MODEL_ID` and `GOOGLE_VERTEX_LOCATION`

## Notes
- `/api/agent` runs on Node.js runtime to allow file IO for scenarios.
- All numeric outputs are produced by the deterministic engine (`src/lib/calc/*`). The agent never freehands math.

## References
- `docs/agent-chat-spec.md` – agentic chat design and contracts
