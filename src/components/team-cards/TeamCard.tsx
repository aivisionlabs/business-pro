import { useState } from "react";

// Team Card Component with Progress Bar
interface TeamCardProps {
  title: string;
  team: string;
  children: React.ReactNode;
  progress: number;
  filledFields: number;
  totalFields: number;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function TeamCard({
  title,
  team,
  children,
  progress,
  filledFields,
  totalFields,
  isCollapsible = false,
  defaultCollapsed = false,
}: TeamCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      {/* Card Header with Progress Bar */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-slate-900">
              {title}
            </span>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
              {team}
            </span>
          </div>
          {isCollapsible && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              {isCollapsed ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Progress Bar - Hidden for Operations team */}
        {team !== "Ops" && (
          <>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-slate-600">Progress</span>
              <span className="text-xs font-medium text-slate-700">
                {filledFields}/{totalFields} fields
              </span>
            </div>
          </>
        )}
      </div>

      {/* Card Content */}
      {!isCollapsed && <div className="p-4">{children}</div>}
    </div>
  );
}
