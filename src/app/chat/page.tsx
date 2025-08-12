import AgentChat from "@/components/AgentChat";

export default function ChatPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Agent Chat</h1>
          <p className="text-lg text-slate-600">
            Ask questions about pricing, P&L, returns, and more
          </p>
        </div>

        {/* Chat Interface */}
        <AgentChat
          sessionId="general-chat"
          initialSystemNote="You are a finance ops costing agent for plastic packaging pricing and returns. You can help with scenario analysis, pricing calculations, P&L analysis, and financial modeling. Use the available tools to provide accurate calculations and insights."
          title="Agent Chat"
          placeholder="Ask about price, P&L, returns, scenarios..."
        />
      </div>
    </main>
  );
}
