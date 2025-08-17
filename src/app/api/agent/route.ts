import { NextRequest } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";
import { calculateScenario } from "@/lib/calc";
import {
  CalcOutput,
  PlantMaster,
  Scenario,
} from "@/lib/types";
import plantMasterData from "@/data/plant-master.json" assert { type: "json" };
import { nanoid } from "nanoid";
import { ReadableStream } from "stream/web";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";

export const runtime = "nodejs";

// Add logging utility
function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const logData = data ? ` | Data: ${JSON.stringify(data)}` : '';
  console.log(`[${timestamp}] [${level}] ${message}${logData}`);
}

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
};

type AgentRequest = {
  messages: ChatMessage[];
  sessionId?: string;
};

// File-based persistence under src/data/scenarios
const SCENARIO_DIR = path.join(process.cwd(), "src/data/scenarios");

async function ensureScenarioDir() {
  try {
    log('DEBUG', 'Ensuring scenario directory exists', { path: SCENARIO_DIR });
    await fs.mkdir(SCENARIO_DIR, { recursive: true });
    log('INFO', 'Scenario directory ensured successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ERROR', 'Failed to ensure scenario directory', { error: errorMessage, path: SCENARIO_DIR });
    throw error;
  }
}

// Support GOOGLE_APPLICATION_CREDENTIALS as path or raw JSON
let cachedCredentialsPath: string | undefined;
async function ensureGoogleADCFromBase64(): Promise<void> {
  const envValue = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  console.log("envValue", envValue)
  if (!envValue) return;

  // If it points to an existing file, keep as-is
  try {
    console.log("LOOKING if absolute path is mentioned", envValue)
    await fs.stat(envValue);
    return;
  } catch {
    console.log("absolute path is not found")
    // Not a file path; treat as content
  }

  const normalizeContent = (value: string): string => {
    const trimmed = value.trim();

    // Try raw JSON first (with a few robustness tricks)
    const tryParse = (s: string): string | null => {
      try {
        JSON.parse(s);
        return s;
      } catch {
        return null;
      }
    };

    // a) As-is
    const asIs = tryParse(trimmed);
    if (asIs) return asIs;

    // b) Strip surrounding quotes if the whole value is quoted
    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      const unwrapped = trimmed.slice(1, -1);
      const unwrappedParsed = tryParse(unwrapped);
      if (unwrappedParsed) return unwrappedParsed;
    }

    // c) Extract substring between first '{' and last '}'
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const inner = trimmed.slice(firstBrace, lastBrace + 1);
      const innerParsed = tryParse(inner);
      if (innerParsed) return innerParsed;
    }

    // Not valid raw JSON
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS is not valid JSON');
  };

  try {
    const decodedJson = normalizeContent(envValue);
    const json = JSON.parse(decodedJson) as { client_email?: string };

    const dir = path.join(os.tmpdir(), 'gcp-adc');
    await fs.mkdir(dir, { recursive: true });
    const fileNamePart = (json.client_email || `sa-${nanoid()}`).replace(/[^a-zA-Z0-9_.-]/g, '_');
    const filePath = path.join(dir, `${fileNamePart}.json`);

    if (cachedCredentialsPath !== filePath) {
      // Write with restrictive permissions
      await fs.writeFile(filePath, decodedJson, { encoding: 'utf-8', mode: 0o600 });
      cachedCredentialsPath = filePath;
      log('INFO', 'Prepared GOOGLE_APPLICATION_CREDENTIALS from in-env content', { path: filePath });
    }

    process.env.GOOGLE_APPLICATION_CREDENTIALS = filePath;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ERROR', 'Failed to process GOOGLE_APPLICATION_CREDENTIALS content', { error: errorMessage });
    throw error;
  }
}

async function persistSaveScenario(scenario: Scenario): Promise<{ id: string }> {
  log('DEBUG', 'Persisting scenario', { scenarioId: scenario.id, scenarioName: scenario.name });
  await ensureScenarioDir();
  const now = new Date().toISOString();
  const id = scenario.id || nanoid();
  const file = path.join(SCENARIO_DIR, `${id}.json`);
  const withMeta: Scenario = {
    ...scenario,
    id,
    updatedAt: now,
    createdAt: scenario.createdAt || now,
  };

  try {
    await fs.writeFile(file, JSON.stringify(withMeta, null, 2), "utf-8");
    log('INFO', 'Scenario saved successfully', { id, file });
    return { id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ERROR', 'Failed to save scenario', { error: errorMessage, id, file });
    throw error;
  }
}

async function persistLoadScenario(id: string): Promise<Scenario> {
  log('DEBUG', 'Loading scenario', { id });
  const file = path.join(SCENARIO_DIR, `${id}.json`);

  try {
    const raw = await fs.readFile(file, "utf-8");
    const scenario = JSON.parse(raw) as Scenario;
    log('INFO', 'Scenario loaded successfully', { id, name: scenario.name });
    return scenario;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ERROR', 'Failed to load scenario', { error: errorMessage, id, file });
    throw error;
  }
}

async function persistListScenarios(): Promise<{ id: string; name: string; updatedAt: string }[]> {
  log('DEBUG', 'Listing scenarios');
  await ensureScenarioDir();

  try {
    const files = await fs.readdir(SCENARIO_DIR);
    log('DEBUG', 'Found scenario files', { fileCount: files.length, files });

    const out: { id: string; name: string; updatedAt: string }[] = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(SCENARIO_DIR, f), "utf-8");
        const s = JSON.parse(raw) as Scenario;
        out.push({ id: s.id, name: s.name, updatedAt: s.updatedAt });
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        log('WARN', 'Failed to parse scenario file', { file: f, error: errorMessage });
      }
    }

    const sorted = out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    log('INFO', 'Scenarios listed successfully', { count: sorted.length });
    return sorted;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ERROR', 'Failed to list scenarios', { error: errorMessage });
    throw error;
  }
}



// Tool handlers - deterministic
function tool_calculateScenario(scenario: Scenario): CalcOutput {
  log('DEBUG', 'Calculating scenario', { scenarioId: scenario.id, scenarioName: scenario.name });
  try {
    const result = calculateScenario(scenario);
    log('INFO', 'Scenario calculation completed successfully', {
      scenarioId: scenario.id,
      hasOutput: !!result,
      outputKeys: result ? Object.keys(result) : []
    });
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    log('ERROR', 'Scenario calculation failed', {
      error: errorMessage,
      scenarioId: scenario.id,
      stack: errorStack
    });
    throw error;
  }
}

function tool_getPlantMaster(plant?: string): PlantMaster | PlantMaster[] {
  log('DEBUG', 'Getting plant master data', { plant, hasPlantData: !!plantMasterData });

  try {
    const all = plantMasterData as unknown as PlantMaster[];
    if (!plant) {
      log('INFO', 'Returning all plant master data', { count: all.length });
      return all;
    }

    const found = all.find((p) => p.plant === plant);
    if (!found) {
      log('WARN', 'Plant not found', { requestedPlant: plant, availablePlants: all.map(p => p.plant) });
      throw new Error("Plant not found");
    }

    log('INFO', 'Plant master data found', { plant, plantData: found });
    return found;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ERROR', 'Failed to get plant master data', { error: errorMessage, plant });
    throw error;
  }
}

async function tool_listScenarios(): Promise<{ id: string; name: string; updatedAt: string }[]> {
  log('DEBUG', 'Tool: listScenarios called');
  return persistListScenarios();
}

async function tool_loadScenario(id: string): Promise<Scenario> {
  log('DEBUG', 'Tool: loadScenario called', { id });
  return persistLoadScenario(id);
}

async function tool_saveScenario(scenario: Scenario): Promise<{ id: string }> {
  log('DEBUG', 'Tool: saveScenario called', { scenarioId: scenario.id, scenarioName: scenario.name });
  return persistSaveScenario(scenario);
}

function jsonLine(event: string, data: unknown): string {
  return `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
}

function systemPrompt(): string {
  return [
    "You are a finance ops costing agent for plastic packaging pricing and returns.",
    "You have access to powerful calculation tools - ALWAYS use them for any numeric analysis.",
    "When asked about pricing, P&L, returns, or financial metrics, use the calculateScenario tool.",
    "When asked to explain concepts, provide clear explanations and then use tools to show actual calculations.",
    "Never compute numbers yourself - always call the appropriate tool.",
    "Return concise, high-signal answers with KPIs and compact tables.",
    "Note assumptions and capacity warnings when relevant.",
    "If a user asks about a specific scenario, use the loadScenario tool first to get the data.",
    "Always provide actionable insights based on the calculated results."
  ].join(" ");
}

export async function POST(req: NextRequest) {
  const requestId = nanoid();
  log('INFO', 'Agent API request started', { requestId, method: 'POST' });

  try {
    const { messages, sessionId }: AgentRequest = await req.json();
    log('INFO', 'Request parsed successfully', {
      requestId,
      sessionId,
      messageCount: messages.length,
      lastMessageRole: messages[messages.length - 1]?.role,
      lastMessageContent: messages[messages.length - 1]?.content?.substring(0, 100) + '...'
    });

    // Set up VertexAI SDK; uses GOOGLE_CLOUD_PROJECT and ADC for auth
    const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
    const location = process.env.GOOGLE_VERTEX_LOCATION || "us-central1";

    log('DEBUG', 'Environment variables check', {
      requestId,
      GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
      GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
      GOOGLE_VERTEX_LOCATION: process.env.GOOGLE_VERTEX_LOCATION,
      VERTEX_MODEL_ID: process.env.VERTEX_MODEL_ID,
      project,
      location
    });

    if (!project) {
      log('ERROR', 'Missing GOOGLE_CLOUD_PROJECT for Vertex AI', { requestId });
      return new Response(
        JSON.stringify({ error: "Missing GOOGLE_CLOUD_PROJECT for Vertex AI" }),
        { status: 500 }
      );
    }

    // Ensure ADC is available even when GOOGLE_APPLICATION_CREDENTIALS is base64 content
    await ensureGoogleADCFromBase64();

    log('INFO', 'Initializing Vertex AI', { requestId, project, location });
    const vertex = new VertexAI({ project, location });
    const modelName = process.env.VERTEX_MODEL_ID || "gemini-1.5-pro-002";
    const generativeModel = vertex.getGenerativeModel({ model: modelName });
    log('INFO', 'Vertex AI initialized successfully', { requestId, modelName });

    // Convert messages to Gemini format. We'll include all prior messages
    // in chat history so the model can use provided context (e.g., case/scenario).
    const vertexHistory = [
      { role: "user", parts: [{ text: systemPrompt() }] },
      ...messages.map((m) => ({
        role: (m.role === "system" ? "user" : m.role) as "user" | "model",
        parts: [{ text: m.content }],
      })),
    ];

    log('DEBUG', 'Vertex history constructed', {
      requestId,
      historyLength: vertexHistory.length,
      historyRoles: vertexHistory.map(h => h.role),
      systemPromptLength: systemPrompt().length
    });

    log('DEBUG', 'Vertex history prepared', {
      requestId,
      historyLength: vertexHistory.length,
      systemPrompt: systemPrompt().substring(0, 100) + '...'
    });

    const toolRegistry = {
      calculateScenario: async (args: unknown) => {
        log('DEBUG', 'Tool registry: calculateScenario called', { requestId, args });
        const scenario = args as Scenario;
        const out = tool_calculateScenario(scenario);
        return out;
      },
      getPlantMaster: async (args: unknown) => {
        log('DEBUG', 'Tool registry: getPlantMaster called', { requestId, args });
        const plant = (args as { plant?: string } | undefined)?.plant;
        return tool_getPlantMaster(plant);
      },
      listScenarios: async () => {
        log('DEBUG', 'Tool registry: listScenarios called', { requestId });
        return tool_listScenarios();
      },
      loadScenario: async (args: unknown) => {
        log('DEBUG', 'Tool registry: loadScenario called', { requestId, args });
        return tool_loadScenario((args as { id: string }).id);
      },
      saveScenario: async (args: unknown) => {
        log('DEBUG', 'Tool registry: saveScenario called', { requestId, args });
        return tool_saveScenario((args as { scenario: Scenario }).scenario);
      },
    } as const;

    // Define tool schema for Gemini function calling
    const tools = [
      {
        functionDeclarations: [
          {
            name: "calculateScenario",
            description: "Calculate price, P&L, cash flows, and returns for a business scenario. Use this tool whenever asked about financial metrics, pricing, or profitability.",
            parameters: {
              type: "OBJECT",
              properties: {
                scenario: {
                  type: "OBJECT",
                  description: "The complete scenario object with sales, npd, ops, costing, capex, and finance data"
                },
              },
              required: ["scenario"],
            },
          },
          {
            name: "getPlantMaster",
            description: "Get plant master data for specific plants or all plants if no plant specified",
            parameters: {
              type: "OBJECT",
              properties: {
                plant: {
                  type: "STRING",
                  description: "Optional plant name to filter results"
                },
              },
            },
          },
          {
            name: "listScenarios",
            description: "List all available scenarios with their IDs, names, and last updated timestamps",
            parameters: { type: "OBJECT" }
          },
          {
            name: "loadScenario",
            description: "Load a specific scenario by its ID. Use this to access scenario data for analysis.",
            parameters: {
              type: "OBJECT",
              properties: {
                id: {
                  type: "STRING",
                  description: "The unique identifier of the scenario to load"
                }
              },
              required: ["id"],
            },
          },
          {
            name: "saveScenario",
            description: "Save or update a scenario. Use this to persist changes to scenario data.",
            parameters: {
              type: "OBJECT",
              properties: {
                scenario: {
                  type: "OBJECT",
                  description: "The complete scenario object to save"
                },
              },
              required: ["scenario"],
            },
          },
        ],
      },
    ];

    log('DEBUG', 'Tools schema defined', { requestId, toolCount: tools[0].functionDeclarations.length });

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        log('INFO', 'Stream started', { requestId });

        // Send an open event
        controller.enqueue(encoder.encode(jsonLine("open", { sessionId: sessionId || null })));
        log('DEBUG', 'Open event sent', { requestId, sessionId });

        try {
          log('INFO', 'Starting chat with Vertex AI', { requestId });

          // Start chat with prior context and tools. Keep the last message to send as the user's turn.
          const priorHistory = vertexHistory.slice(0, Math.max(1, vertexHistory.length - 1));
          const chat = generativeModel.startChat({
            history: priorHistory,
            tools // Provide tool declarations at chat start
          });

          const userMessage = messages[messages.length - 1]?.content || "";

          // Validate user message
          if (!userMessage || userMessage.trim() === "") {
            throw new Error("User message cannot be empty");
          }

          // Ask model; we will handle tool calls iteratively (limited loop)
          let loop = 0;
          let toolBudget = 10;
          let prompt = userMessage.trim();

          log('DEBUG', 'Starting tool call loop', { requestId, initialPrompt: prompt, toolBudget });

          // Final validation before starting the loop
          if (!prompt || prompt.trim().length === 0) {
            log('ERROR', 'Prompt validation failed', { requestId, prompt, promptType: typeof prompt });
            throw new Error("Cannot start chat with empty prompt");
          }

          log('DEBUG', 'Prompt validation passed', { requestId, promptLength: prompt.length, promptPreview: prompt.substring(0, 100) });

          while (loop < 8) {
            loop += 1;
            log('DEBUG', 'Tool call loop iteration', { requestId, loop, toolBudget, prompt });

            // Ensure prompt is never empty
            if (!prompt || prompt.trim() === "") {
              prompt = "Please provide a response or analysis.";
            }

            let gen;
            let resp;

            try {
              // Ensure prompt is properly formatted for Vertex AI
              const messageContent = prompt.trim();
              if (!messageContent || messageContent.length === 0) {
                log('ERROR', 'Message content validation failed', { requestId, loop, prompt, messageContent });
                throw new Error("Message content cannot be empty");
              }

              log('DEBUG', 'Message content validation passed', { requestId, loop, messageContentLength: messageContent.length });

              log('DEBUG', 'Generating content with Vertex AI', {
                requestId,
                loop,
                messageContent,
                hasTools: loop === 1
              });

              // Use chat.sendMessage for reliable operation
              if (loop === 1) {
                // First iteration: just send the user message; tools are configured on the chat
                gen = await chat.sendMessage(messageContent);
              } else {
                // Subsequent iterations: send user message as plain text
                gen = await chat.sendMessage(messageContent);
              }

              resp = await gen.response;
            } catch (sendError) {
              const errorMessage = sendError instanceof Error ? sendError.message : String(sendError);
              log('ERROR', 'Failed to send message to Vertex AI', {
                requestId,
                loop,
                prompt,
                error: errorMessage
              });

              if (errorMessage.includes("No content is provided")) {
                throw new Error("Invalid message content sent to AI model. Please try again with a different message.");
              }
              throw sendError;
            }

            log('DEBUG', 'Vertex AI response received', {
              requestId,
              loop,
              hasResponse: !!resp,
              responseType: typeof resp,
              responseKeys: resp ? Object.keys(resp as Record<string, unknown>) : [],
              responsePreview: resp ? JSON.stringify(resp).substring(0, 200) + '...' : 'null'
            });

            // Validate response
            if (!resp) {
              log('ERROR', 'Empty response from Vertex AI', { requestId, loop });
              throw new Error("Received empty response from AI model");
            }

            // Check for function calls
            const candidates = (resp as unknown as {
              candidates?: Array<{
                content?: { parts?: Array<{ functionCall?: { name: string; args?: unknown } }> },
                finishReason?: string,
                finishMessage?: string
              }>
            }).candidates || [];
            const call = candidates[0]?.content?.parts?.find((p: { functionCall?: { name: string; args?: unknown } }) => Boolean(p.functionCall));

            // Check for malformed function calls
            const finishReason = candidates[0]?.finishReason;
            const finishMessage = candidates[0]?.finishMessage;

            if (finishReason === "MALFORMED_FUNCTION_CALL") {
              log('WARN', 'Malformed function call detected', {
                requestId,
                loop,
                finishReason,
                finishMessage: finishMessage?.substring(0, 200)
              });

              // Try to extract the intended function call from the malformed message
              if (finishMessage && finishMessage.includes("calculateScenario")) {
                log('INFO', 'Attempting to handle malformed calculateScenario call', { requestId });

                // Send a message asking the user to rephrase or use the tool directly
                const errorText = "I detected you want me to calculate the scenario, but there was an issue with the function call. Let me try to calculate it directly using the current scenario data.";
                controller.enqueue(encoder.encode(jsonLine("message", { content: errorText })));

                // Try to call calculateScenario with the current context
                try {
                  if (sessionId) {
                    const currentScenario = await tool_loadScenario(sessionId);
                    log('INFO', 'Loading current scenario for calculation', { requestId, scenarioId: sessionId });

                    controller.enqueue(encoder.encode(jsonLine("tool_call", { name: "calculateScenario", args: { scenario: currentScenario } })));

                    const calcResult = await tool_calculateScenario(currentScenario);
                    log('INFO', 'Calculation completed successfully', { requestId });

                    controller.enqueue(encoder.encode(jsonLine("tool_result", { name: "calculateScenario", ok: true })));

                    // Provide the calculation results
                    const resultText = `Here are the calculation results for your scenario:\n\n` +
                      `**Year 1 Results:**\n` +
                      `- Price per piece: Rs ${calcResult.prices[0]?.pricePerPiece.toFixed(4)}\n` +
                      `- Revenue: Rs ${Math.round(calcResult.pnl[0]?.revenueNet || 0).toLocaleString()}\n` +
                      `- EBITDA: Rs ${Math.round(calcResult.pnl[0]?.ebitda || 0).toLocaleString()}\n` +
                      `- IRR: ${calcResult.returns.irr !== null ? `${(calcResult.returns.irr * 100).toFixed(1)}%` : "N/A"}\n\n` +
                      `This gives you a comprehensive view of the financial performance. What specific aspect would you like me to analyze further?`;

                    controller.enqueue(encoder.encode(jsonLine("message", { content: resultText })));
                  }
                } catch (calcError) {
                  const errorMessage = calcError instanceof Error ? calcError.message : String(calcError);
                  log('ERROR', 'Failed to calculate scenario after malformed function call', { requestId, error: errorMessage });

                  const fallbackText = "I'm having trouble calculating the scenario automatically. Could you please ask me to 'calculate the current scenario' or ask a more specific question about what you'd like to know?";
                  controller.enqueue(encoder.encode(jsonLine("message", { content: fallbackText })));
                }

                break;
              }
            }

            log('DEBUG', 'Function call analysis', {
              requestId,
              loop,
              candidatesCount: candidates.length,
              hasFunctionCall: !!call,
              functionCallName: call?.functionCall?.name,
              functionCallArgs: call?.functionCall?.args,
              finishReason,
              finishMessage: finishMessage?.substring(0, 100)
            });

            if (call && toolBudget > 0) {
              toolBudget -= 1;
              const { name, args } = call.functionCall as { name: keyof typeof toolRegistry; args: unknown };

              log('INFO', 'Executing tool call', { requestId, loop, toolName: name, toolBudget, args });
              controller.enqueue(encoder.encode(jsonLine("tool_call", { name, args })));

              try {
                const toolFn = (toolRegistry as unknown as Record<string, (a: unknown) => Promise<unknown>>)[name as string];
                if (!toolFn) {
                  throw new Error(`Tool function not found: ${name}`);
                }

                log('DEBUG', 'Calling tool function', { requestId, toolName: name });
                const toolResult = await toolFn(args);
                log('INFO', 'Tool execution successful', { requestId, toolName: name, hasResult: !!toolResult });

                controller.enqueue(encoder.encode(jsonLine("tool_result", { name, ok: true })));

                log('DEBUG', 'Sending tool result to Vertex AI', { requestId, toolName: name });
                await chat.sendMessage({
                  content: {
                    role: "tool",
                    parts: [{ functionResponse: { name, response: toolResult } }],
                  },
                });

                // Continue the loop to allow follow-up or final message
                prompt = "Please continue with your analysis or provide a final response.";
                log('DEBUG', 'Continuing tool call loop', { requestId, loop, newPrompt: prompt });
                continue;
              } catch (toolErr) {
                const errorMessage = toolErr instanceof Error ? toolErr.message : String(toolErr);
                const errorStack = toolErr instanceof Error ? toolErr.stack : undefined;
                log('ERROR', 'Tool execution failed', {
                  requestId,
                  loop,
                  toolName: name,
                  error: errorMessage,
                  stack: errorStack
                });

                controller.enqueue(
                  encoder.encode(
                    jsonLine("tool_result", { name, ok: false, error: errorMessage })
                  )
                );
                break;
              }
            }

            // No function call; stream or return final text using SDK helpers
            let text = "";
            try {
              // First try: use the text() method if available
              const maybeFn = (resp as unknown as { text?: () => string }).text;
              if (typeof maybeFn === "function") {
                text = maybeFn();
              }
            } catch { }

            if (!text) {
              // Fallback: extract text from candidates > content > parts
              try {
                const cands = (resp as unknown as {
                  candidates?: Array<{
                    content?: { parts?: Array<{ text?: string }> };
                  }>;
                }).candidates || [];

                if (cands.length > 0) {
                  const parts = cands[0]?.content?.parts || [];
                  text = parts
                    .map((p) => (p as { text?: string }).text || "")
                    .filter(Boolean)
                    .join("\n");
                }
              } catch { }
            }

            // If still no text, try alternative response structures
            if (!text) {
              try {
                // Try direct text property
                text = (resp as unknown as { text?: string }).text || "";
              } catch { }
            }

            if (!text) {
              try {
                // Try response.text property
                text = (resp as unknown as { response?: { text?: string } }).response?.text || "";
              } catch { }
            }

            // If we still have no text, provide a default response
            if (!text || text.trim().length === 0) {
              text = "I understand your question. Let me analyze the current scenario and provide you with specific insights using the available tools.";
            }

            log('INFO', 'No function call, returning text response', {
              requestId,
              loop,
              textLength: text.length,
              textPreview: text.substring(0, 100) + '...'
            });

            controller.enqueue(encoder.encode(jsonLine("message", { content: text })));
            break;
          }

          log('INFO', 'Tool call loop completed', { requestId, finalLoop: loop, finalToolBudget: toolBudget });
          controller.enqueue(encoder.encode(jsonLine("done", {})));
          controller.close();
          log('INFO', 'Stream completed successfully', { requestId });

        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          const errorStack = err instanceof Error ? err.stack : undefined;
          log('ERROR', 'Stream processing failed', {
            requestId,
            error: errorMessage,
            stack: errorStack
          });

          controller.enqueue(
            encoder.encode(jsonLine("error", { message: errorMessage }))
          );
          controller.close();
        }
      },
    });

    log('INFO', 'Response stream created successfully', { requestId });
    return new Response(stream as unknown as BodyInit, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ERROR', 'Request processing failed', {
      requestId,
      error: errorMessage
    });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    );
  }
}


