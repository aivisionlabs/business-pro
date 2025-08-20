import React from "react";

interface SectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Section({ title, children, className }: SectionProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm ${
        className || ""
      }`}
    >
      <div className="text-base font-semibold text-slate-900 mb-3">{title}</div>
      {children}
    </div>
  );
}
