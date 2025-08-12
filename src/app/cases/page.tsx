"use client";
import { useEffect, useState } from "react";

// Client-side only date component to avoid hydration mismatches
function ClientOnlyDate({
  date,
  format = "en-GB",
}: {
  date: string | Date;
  format?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder during SSR to avoid hydration mismatch
    return <span className="text-xs text-slate-500">Loading...</span>;
  }

  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return <span className="text-xs text-slate-500">Invalid date</span>;
    }

    return (
      <span className="text-xs text-slate-500">
        Updated{" "}
        {dateObj.toLocaleString(format, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })}
      </span>
    );
  } catch {
    return (
      <span className="text-xs text-slate-500">Error formatting date</span>
    );
  }
}

type CaseMeta = { id: string; name: string; updatedAt: string };

export default function CasesPage() {
  const [cases, setCases] = useState<CaseMeta[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  async function refresh() {
    const res = await fetch("/api/scenarios", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as CaseMeta[];
    setCases(data);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createCase() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        console.error("Failed to create case:", res.status, res.statusText);
        return;
      }

      const { id } = (await res.json()) as { id: string };
      console.log("Created case with ID:", id);

      // Clear the input
      setName("");

      // Wait a moment for the file to be written, then redirect
      setTimeout(() => {
        console.log("Redirecting to case:", id);
        window.location.href = `/cases/${id}`;
      }, 200);
    } catch (error) {
      console.error("Error creating case:", error);
    } finally {
      setCreating(false);
    }
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
            />
            <button
              className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:bg-slate-400"
              disabled={!name.trim() || creating}
              onClick={createCase}
            >
              Create
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            Your cases
          </h2>
          {cases.length === 0 ? (
            <div className="text-slate-500 text-sm">
              No cases yet. Create one above.
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {cases.map((c) => (
                <li
                  key={c.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-slate-900">{c.name}</div>
                    <div suppressHydrationWarning>
                      <ClientOnlyDate date={c.updatedAt} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm"
                      href={`/cases/${c.id}/chat`}
                    >
                      Open Chat
                    </a>
                    <a
                      className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-sm"
                      href={`/cases/${c.id}`}
                    >
                      Edit
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
