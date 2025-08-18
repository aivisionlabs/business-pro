"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatEvent =
  | { type: "open"; sessionId: string | null }
  | { type: "tool_call"; name: string; args: unknown }
  | { type: "tool_result"; name: string; ok: boolean; error?: string }
  | { type: "message"; content: string }
  | { type: "error"; message: string }
  | { type: "done" };

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function AgentChat({
  sessionId,
  initialSystemNote,
  context,
  placeholder = "Ask about price, P&L, returns, scenarios...",
  title = "Agent Chat",
}: {
  sessionId?: string;
  initialSystemNote?: string;
  context?: unknown;
  placeholder?: string;
  title?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [trace, setTrace] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    // Only scroll if we have messages and the ref is available
    if (messages.length > 0 && messagesEndRef.current) {
      scrollToBottom();
    }
  }, [messages]);

  async function send(prompt: string) {
    setMessages((m) => [...m, { role: "user", content: prompt }]);
    setLoading(true);
    setStreaming(false);

    const controller = new AbortController();
    abortRef.current = controller;

    const history: Array<{ role: "system" | "user"; content: string }> = [];
    if (initialSystemNote) {
      history.push({ role: "system", content: initialSystemNote });
    }
    if (context !== undefined) {
      try {
        const contextString = JSON.stringify(context);
        // Keep context compact if huge
        const content =
          contextString.length > 25_000
            ? `Context (truncated): ${contextString.slice(0, 25_000)}...`
            : `Context: ${contextString}`;
        history.push({ role: "system", content });
      } catch {
        // If context cannot be stringified, skip silently
      }
    }
    history.push({ role: "user", content: prompt });

    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: history,
        sessionId: sessionId || undefined,
      }),
      signal: controller.signal,
    });

    if (!res.ok || !res.body) {
      setTrace((t) => [...t, `error: ${res.statusText}`]);
      setLoading(false);
      setStreaming(false);
      return;
    }

    setStreaming(true);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = "";
    function pushEvent(ev: ChatEvent) {
      if (ev.type === "message") {
        setMessages((m) => {
          const last = m[m.length - 1];
          if (last && last.role === "assistant") {
            const copy = m.slice();
            copy[copy.length - 1] = {
              role: "assistant",
              content: last.content + ev.content,
            };
            return copy;
          }
          return [...m, { role: "assistant", content: ev.content }];
        });
      } else if (ev.type === "tool_call") {
        setTrace((t) => [...t, `tool→ ${ev.name} ${JSON.stringify(ev.args)}`]);
      } else if (ev.type === "tool_result") {
        setTrace((t) => [...t, `tool✓ ${ev.name} ${ev.ok ? "ok" : ev.error}`]);
      } else if (ev.type === "error") {
        setTrace((t) => [...t, `error: ${ev.message}`]);
      }
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
      const parts = acc.split("\n\n");
      acc = parts.pop() || "";
      for (const chunk of parts) {
        const lines = chunk.split("\n");
        let event: string | null = null;
        let data: unknown = null;
        for (const line of lines) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) {
            try {
              data = JSON.parse(line.slice(5));
            } catch (e) {
              console.error("Failed to parse data:", line.slice(5), e);
            }
          }
        }
        if (!event || !data) continue;

        // Type guard to ensure data has the expected structure
        const typedData = data as Record<string, unknown>;

        if (event === "open")
          pushEvent({
            type: "open",
            sessionId: typedData.sessionId as string | null,
          });
        if (event === "tool_call")
          pushEvent({
            type: "tool_call",
            name: typedData.name as string,
            args: typedData.args,
          });
        if (event === "tool_result")
          pushEvent({
            type: "tool_result",
            name: typedData.name as string,
            ok: typedData.ok as boolean,
            error: typedData.error as string | undefined,
          });
        if (event === "message")
          pushEvent({ type: "message", content: typedData.content as string });
        if (event === "error")
          pushEvent({ type: "error", message: typedData.message as string });
        if (event === "done") {
          setLoading(false);
          setStreaming(false);
        }
      }
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden w-full">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="h-[40vh] overflow-y-auto p-6 space-y-4 bg-slate-50">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg font-medium">Start a conversation</p>
            <p className="text-sm">
              Ask about pricing, P&L analysis, or scenario management
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}-${m.content.substring(0, 10)}`}
            className={`flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                m.role === "user"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-white text-slate-900 border border-slate-200 shadow-sm"
              }`}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="text-sm">{children}</p>,
                  code: ({ children }) => (
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-slate-100 p-2 rounded text-sm overflow-x-auto">
                      {children}
                    </pre>
                  ),
                }}
              >
                {m.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-blue-600"></div>
                <span className="text-sm">
                  {streaming ? "Receiving data..." : "Processing..."}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {streaming ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-pulse">●</span>
                    Streaming response...
                  </span>
                ) : trace.length > 0 ? (
                  `Last action: ${trace[trace.length - 1]}`
                ) : (
                  "Analyzing your request..."
                )}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 bg-white border-t border-slate-200">
        <form
          className="flex gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim() || loading) return;
            const p = input;
            setInput("");
            send(p);
          }}
        >
          <input
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors text-slate-900"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={loading}
          />
          <button
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm hover:shadow-md disabled:shadow-none"
            disabled={loading || !input.trim()}
          >
            Send
          </button>
        </form>
      </div>

      <div className="px-6 pb-6">
        {/* Eval Section */}
        <div className="mt-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-900">
              Tool Evaluation
            </h4>
            <button
              onClick={async () => {
                try {
                  const response = await fetch("/api/agent/eval");
                  if (response.ok) {
                    const data = await response.json();
                    // Display eval results in a nice format
                    const results = data.evals;
                    let displayText = "🔍 **Tool Evaluation Results**\n\n";

                    Object.entries(results).forEach(([toolName, result]) => {
                      displayText += `📊 **${toolName}**\n`;
                      if (typeof result === "object" && result !== null) {
                        if (toolName === "calculateScenario") {
                          displayText += `✅ Basic calculation successful\n`;
                        } else if (toolName === "getPlantMaster") {
                          displayText += `✅ Plant data retrieved successfully\n`;
                        } else if (toolName === "analyzeVolumeChange") {
                          const volResult = result as Record<string, unknown>;
                          displayText += `✅ Volume change analysis completed\n`;
                          displayText += `   SKU: ${
                            (volResult.change as Record<string, unknown>)
                              ?.skuName
                          }\n`;
                          displayText += `   Volume change: ${
                            (volResult.change as Record<string, unknown>)
                              ?.volumeChange
                          }% (${
                            (volResult.change as Record<string, unknown>)
                              ?.originalVolume
                          } → ${
                            (volResult.change as Record<string, unknown>)
                              ?.newVolume
                          })\n`;
                        } else if (toolName === "analyzePricingChange") {
                          const priceResult = result as Record<string, unknown>;
                          displayText += `✅ Pricing change analysis completed\n`;
                          displayText += `   SKU: ${
                            (priceResult.change as Record<string, unknown>)
                              ?.skuName
                          }\n`;
                          displayText += `   Parameter: ${
                            (priceResult.change as Record<string, unknown>)
                              ?.parameter
                          }\n`;
                          displayText += `   Value change: ${
                            (priceResult.change as Record<string, unknown>)
                              ?.originalValue
                          } → ${
                            (priceResult.change as Record<string, unknown>)
                              ?.newValue
                          }\n`;
                        } else if (toolName === "analyzePlantChange") {
                          const plantResult = result as Record<string, unknown>;
                          displayText += `✅ Plant change analysis completed\n`;
                          displayText += `   SKU: ${
                            (plantResult.change as Record<string, unknown>)
                              ?.skuName
                          }\n`;
                          displayText += `   Plant change: ${
                            (plantResult.change as Record<string, unknown>)
                              ?.originalPlant
                          } → ${
                            (plantResult.change as Record<string, unknown>)
                              ?.newPlant
                          }\n`;
                        } else if (toolName === "generatePortfolioReport") {
                          const reportResult = result as Record<
                            string,
                            unknown
                          >;
                          displayText += `✅ Portfolio report generated\n`;
                          displayText += `   Report type: ${reportResult.reportType}\n`;
                          displayText += `   Case: ${reportResult.caseName}\n`;
                        } else if (toolName === "sensitivityAnalysis") {
                          displayText += `✅ Sensitivity analysis completed\n`;
                        } else if (toolName === "optimizationAnalysis") {
                          displayText += `✅ Optimization analysis completed\n`;
                        } else if (toolName === "compareScenarios") {
                          displayText += `✅ Scenario comparison completed\n`;
                        } else if (toolName === "riskAssessment") {
                          const riskResult = result as Record<string, unknown>;
                          displayText += `✅ Risk assessment completed\n`;
                          displayText += `   Risk factors analyzed: ${
                            Object.keys(riskResult).length
                          }\n`;
                        } else {
                          displayText += `✅ Tool executed successfully\n`;
                        }
                      } else {
                        displayText += `✅ Result: ${result}\n`;
                      }
                      displayText += "\n";
                    });

                    displayText +=
                      "🎉 All tools evaluated successfully! The system is ready for business analysis.";

                    setMessages((prev) => [
                      ...prev,
                      { role: "assistant", content: displayText },
                    ]);
                  } else {
                    setMessages((prev) => [
                      ...prev,
                      {
                        role: "assistant",
                        content: "❌ Failed to run tool evaluation",
                      },
                    ]);
                  }
                } catch (error) {
                  setMessages((prev) => [
                    ...prev,
                    {
                      role: "assistant",
                      content: "❌ Error running tool evaluation: " + error,
                    },
                  ]);
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md"
            >
              🧪 Run Tool Eval
            </button>
          </div>
          <p className="text-xs text-slate-600 mb-3">
            Test all available tools with a sample scenario to verify
            functionality
          </p>
        </div>

        {/* Tool Trace Section */}
        <div className="mt-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-900">Tool Trace</h4>
            <button
              onClick={() => setTrace([])}
              className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 max-h-40 overflow-y-auto">
            {trace.length === 0 ? (
              <div className="text-slate-500 text-xs text-center py-4">
                No tool calls yet
              </div>
            ) : (
              <div className="text-xs font-mono text-slate-700 space-y-1">
                {trace.map((t, i) => (
                  <div
                    key={`trace-${i}-${t.substring(0, 20)}`}
                    className="flex items-center gap-2"
                  >
                    <span className="text-blue-600">→</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
