"use client";

import { useState } from "react";
import { useBusinessCases } from "@/lib/hooks/useFirestore";
import Link from "next/link";

export default function CasesPage() {
  const { businessCases, loading, error } = useBusinessCases();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  async function handleCreateCase() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      // Use the API route instead of the hook directly to avoid type issues
      const res = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        throw new Error("Failed to create case");
      }

      const { id: newId } = await res.json();

      // Clear the input
      setName("");

      // Redirect to the new case
      window.location.href = `/cases/${newId}`;
    } catch (error) {
      console.error("Error creating case:", error);
      alert("Failed to create case. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading cases...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <div className="text-center">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Business Cases</h1>
          <p className="text-slate-600">
            Create and manage your business cases
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            Create a new case
          </h2>
          <div className="flex gap-3">
            <input
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-500"
              placeholder="Enter case name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleCreateCase()}
            />
            <button
              className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:bg-slate-400 hover:bg-blue-700 transition-colors"
              disabled={!name.trim() || creating}
              onClick={handleCreateCase}
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Your cases ({businessCases.length})
          </h2>

          {businessCases.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No business cases yet. Create your first one above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {businessCases.map((businessCase) => (
                <Link
                  key={businessCase.id}
                  href={`/cases/${businessCase.id}`}
                  className="block p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-slate-900">
                        {businessCase.name}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {businessCase.skus?.length || 0} SKU
                        {businessCase.skus?.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">
                        {new Date(businessCase.updatedAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(businessCase.updatedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
