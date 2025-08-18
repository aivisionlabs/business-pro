"use client";

import MultiSkuEditor from "@/components/MultiSkuEditor";
import { useBusinessCase, usePlantMaster } from "@/lib/hooks/useFirestore";
import Link from "next/link";
import { use } from "react";

export default function CaseDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { businessCase: scenario, loading, error } = useBusinessCase(id);
  const { plants, loading: plantsLoading } = usePlantMaster();

  if (loading || plantsLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="mx-auto max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading case...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="mx-auto max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Error:</strong> {error}
            </div>
            <Link href="/cases" className="text-blue-600 hover:underline">
              Back to cases
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!scenario) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="mx-auto max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-2xl font-semibold text-slate-900 mb-2">
              Case not found
            </div>
            <Link href="/cases" className="text-blue-600 hover:underline">
              Back to cases
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Note: charts are rendered inside MultiSkuEditor just above the debug panel
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="mx-auto max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Main Content - Full Width */}
        <MultiSkuEditor scenario={scenario} plantOptions={plants} />

        {/* Link to Chat Page */}
        <div className="mt-8 text-center">
          <Link
            href={`/cases/${id}/chat`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Open Chat for this Case
          </Link>
        </div>
      </div>
    </main>
  );
}
