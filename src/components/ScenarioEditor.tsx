// "use client";
// import { useEffect, useMemo, useState } from "react";
// import { createPortal } from "react-dom";
// import { calculateScenario } from "@/lib/calc";
// import { PlantMaster, Scenario } from "@/lib/types";

// // Import plant master data from JSON file
// // import plantMasterData from "@/data/plant-master.json";

// // Client-side only date component to avoid hydration mismatches
// function ClientOnlyDate({
//   date,
//   format = "en-GB",
// }: {
//   date: string | Date;
//   format?: string;
// }) {
//   const [mounted, setMounted] = useState(false);

//   useEffect(() => {
//     setMounted(true);
//   }, []);

//   if (!mounted) {
//     // Return a placeholder during SSR to avoid hydration mismatch
//     return <span className="text-xs text-slate-500">Loading...</span>;
//   }

//   try {
//     const dateObj = new Date(date);
//     if (isNaN(dateObj.getTime())) {
//       return <span className="text-xs text-slate-500">Invalid date</span>;
//     }

//     return (
//       <span className="text-xs text-slate-500">
//         {dateObj.toLocaleString(format, {
//           day: "2-digit",
//           month: "2-digit",
//           year: "numeric",
//           hour: "2-digit",
//           minute: "2-digit",
//           second: "2-digit",
//           hour12: false,
//         })}
//       </span>
//     );
//   } catch {
//     return (
//       <span className="text-xs text-slate-500">Error formatting date</span>
//     );
//   }
// }

// // Example scenario reference (for docs only)
// /*
// const sampleScenario: Scenario = {
//   id: "veeba-sample",
//   name: "Veeba",
//   createdAt: new Date().toISOString(),
//   updatedAt: new Date().toISOString(),
//   sales: {
//     customer: "Veeba",
//     product: "Plastic Container",
//     productWeightGrams: 0.3,
//     conversionRecoveryRsPerPiece: 0.75,
//     mouldAmortizationRsPerPiece: 0.1,
//     discountRsPerPiece: 0.02,
//     freightOutSalesRsPerPiece: 0.03,
//     baseAnnualVolumePieces: 12000000,
//     inflationPassThrough: true,
//   },
//   npd: {
//     machineName: "Injection Molding Machine",
//     cavities: 16,
//     cycleTimeSeconds: 6.2,
//     plant: "Plant A",
//     polymer: "PP",
//     masterbatch: "Black MB",
//   },
//   ops: {
//     oee: 0.8,
//     powerUnitsPerHour: 60,
//     automation: false,
//     manpowerCount: 6,
//     operatingHoursPerDay: 24,
//     workingDaysPerYear: 365,
//   },
//   costing: {
//     resinRsPerKg: 115,
//     freightInwardsRsPerKg: 2,
//     resinDiscountPct: 0.02,
//     mbRsPerKg: 180,
//     valueAddRsPerPiece: 0.15,
//     packagingRsPerPiece: 0.06,
//     freightOutRsPerPiece: 0.04,
//     wastagePct: 0.02,
//     mbRatioPct: 0.03,
//     conversionInflationPct: [0, 0.03, 0.03, 0.03, 0.03],
//     rmInflationPct: [0, 0.02, 0.02, 0.02, 0.02],
//   },
//   capex: {
//     machineCost: 15000000,
//     mouldCost: 5000000,
//     workingCapitalDays: 30,
//     usefulLifeMachineYears: 10,
//     usefulLifeMouldYears: 5,
//   },
//   finance: {
//     debtPct: 0.6,
//     costOfDebtPct: 0.12,
//     costOfEquityPct: 0.18,
//     corporateTaxRatePct: 0.25,
//     includeCorpSGA: true,
//   },
//   plantMaster: plantMasterData[0], // Default to first plant
//   altConversion: {
//     machineRatePerDayRs: 5000,
//   },
// };
// */

// function InfoIcon({ formula, fields }: { formula: string; fields: string[] }) {
//   return (
//     <div className="group relative">
//       <svg
//         className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help transition-colors"
//         fill="none"
//         stroke="currentColor"
//         viewBox="0 0 24 24"
//       >
//         <path
//           strokeLinecap="round"
//           strokeLinejoin="round"
//           strokeWidth={2}
//           d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
//         />
//       </svg>
//       <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
//         <div className="font-semibold mb-1">Formula:</div>
//         <div className="mb-2">{formula}</div>
//         <div className="font-semibold mb-1">Fields:</div>
//         <div>{fields.join(", ")}</div>
//         <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
//       </div>
//     </div>
//   );
// }

// function PlantDetailsModal({
//   open,
//   plants,
//   onClose,
//   onSelect,
// }: {
//   open: boolean;
//   plants: PlantMaster[];
//   onClose: () => void;
//   onSelect: (p: PlantMaster) => void;
// }) {
//   const [mounted, setMounted] = useState(false);
//   const [query, setQuery] = useState("");

//   useEffect(() => {
//     setMounted(true);
//   }, []);

//   useEffect(() => {
//     if (!mounted) return;
//     document.body.style.overflow = open ? "hidden" : "";
//     return () => {
//       document.body.style.overflow = "";
//     };
//   }, [open, mounted]);

//   if (!open || !mounted) return null;

//   // Ensure we're on the client side and document.body exists
//   if (typeof window === "undefined" || !document.body) {
//     console.log(
//       "PlantDetailsModal: Not on client side or document.body not available"
//     );
//     return null;
//   }

//   // Add error handling for empty plants array
//   if (!plants || plants.length === 0) {
//     console.log("PlantDetailsModal: No plants data available");
//     return createPortal(
//       <div className="fixed inset-0 z-50 flex items-center justify-center">
//         <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
//         <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-[95vw] max-w-5xl max-h-[85vh] overflow-hidden">
//           <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
//             <h3 className="text-lg font-semibold text-slate-900">
//               Plant details
//             </h3>
//             <button
//               onClick={onClose}
//               className="text-slate-500 hover:text-slate-700 rounded-md px-2 py-1"
//               aria-label="Close"
//             >
//               ✕
//             </button>
//           </div>
//           <div className="p-8 text-center">
//             <div className="text-red-600 mb-4">⚠️ No plant data available</div>
//             <div className="text-slate-600 mb-4">
//               Plant master data could not be loaded. Please check the data
//               source.
//             </div>
//             <div className="text-xs text-slate-500">
//               Debug info: plants = {JSON.stringify(plants)}
//             </div>
//           </div>
//         </div>
//       </div>,
//       document.body
//     );
//   }

//   const filtered = plants.filter((p) =>
//     [
//       p.plant,
//       String(p.manpowerRatePerShift),
//       String(p.powerRatePerUnit),
//       String(p.rAndMPerKg),
//       String(p.otherMfgPerKg),
//       String(p.plantSgaPerKg),
//       String(p.corpSgaPerKg),
//       String(p.sellingGeneralAndAdministrativeExpensesPerKg),
//     ]
//       .join(" ")
//       .toLowerCase()
//       .includes(query.toLowerCase())
//   );

//   return createPortal(
//     <div className="fixed inset-0 z-50 flex items-center justify-center">
//       <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
//       <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-[95vw] max-w-5xl max-h-[85vh] overflow-hidden">
//         <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
//           <h3 className="text-lg font-semibold text-slate-900">
//             Plant details
//           </h3>
//           <button
//             onClick={onClose}
//             className="text-slate-500 hover:text-slate-700 rounded-md px-2 py-1"
//             aria-label="Close"
//           >
//             ✕
//           </button>
//         </div>
//         <div className="p-4">
//           <div className="flex items-center justify-between mb-3 gap-3">
//             <input
//               value={query}
//               onChange={(e) => setQuery(e.target.value)}
//               placeholder="Search plants or rates..."
//               className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
//             />
//             <div className="text-xs text-slate-500">
//               {filtered.length} of {plants.length}
//             </div>
//           </div>
//           <div className="overflow-auto rounded-lg border border-slate-200 max-h-[58vh]">
//             <table className="min-w-full text-sm">
//               <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
//                 <tr>
//                   <th className="text-left p-3 font-semibold text-slate-900">
//                     Plant
//                   </th>
//                   <th className="text-right p-3 font-semibold text-slate-900">
//                     Manpower/Shift
//                   </th>
//                   <th className="text-right p-3 font-semibold text-slate-900">
//                     Power/Unit
//                   </th>
//                   <th className="text-right p-3 font-semibold text-slate-900">
//                     R&M/kg
//                   </th>
//                   <th className="text-right p-3 font-semibold text-slate-900">
//                     Other Mfg/kg
//                   </th>
//                   <th className="text-right p-3 font-semibold text-slate-900">
//                     Plant SGA/kg
//                   </th>
//                   <th className="text-right p-3 font-semibold text-slate-900">
//                     Corp SGA/kg
//                   </th>
//                   <th className="text-right p-3 font-semibold text-slate-900">
//                     SG&A/kg
//                   </th>
//                   <th className="p-3" />
//                 </tr>
//               </thead>
//               <tbody>
//                 {filtered.map((p) => (
//                   <tr
//                     key={p.plant}
//                     className="border-b border-slate-100 hover:bg-slate-50"
//                   >
//                     <td className="p-3 text-slate-800 font-medium">
//                       {p.plant}
//                     </td>
//                     <td className="p-3 text-right font-mono text-black font-semibold text-base">
//                       {p.manpowerRatePerShift}
//                     </td>
//                     <td className="p-3 text-right font-mono text-black font-semibold text-base">
//                       {p.powerRatePerUnit}
//                     </td>
//                     <td className="p-3 text-right font-mono text-black font-semibold text-base">
//                       {p.rAndMPerKg}
//                     </td>
//                     <td className="p-3 text-right font-mono text-black font-semibold text-base">
//                       {p.otherMfgPerKg}
//                     </td>
//                     <td className="p-3 text-right font-mono text-black font-semibold text-base">
//                       {p.plantSgaPerKg}
//                     </td>
//                     <td className="p-3 text-right font-mono text-black font-semibold text-base">
//                       {p.corpSgaPerKg}
//                     </td>
//                     <td className="p-3 text-right font-mono text-black font-semibold text-base">
//                       {p.sellingGeneralAndAdministrativeExpensesPerKg}
//                     </td>
//                     <td className="p-3 text-right">
//                       <button
//                         className="px-3 py-1.5 text-xs rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow"
//                         onClick={() => onSelect(p)}
//                       >
//                         Select
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>
//     </div>,
//     document.body
//   );
// }

// function ProgressTracker({ scenario }: { scenario: Scenario }) {
//   const totalFields = 25;
//   let filledFields = 0;
//   if (scenario.sales.productWeightGrams > 0) filledFields++;
//   if (
//     scenario.sales.conversionRecoveryRsPerPiece &&
//     scenario.sales.conversionRecoveryRsPerPiece > 0
//   )
//     filledFields++;
//   if (scenario.sales.mouldAmortizationRsPerPiece > 0) filledFields++;
//   if (scenario.sales.discountRsPerPiece >= 0) filledFields++;
//   if (scenario.sales.freightOutSalesRsPerPiece >= 0) filledFields++;
//   if (scenario.sales.baseAnnualVolumePieces > 0) filledFields++;
//   if (scenario.npd.cavities > 0) filledFields++;
//   if (scenario.npd.cycleTimeSeconds > 0) filledFields++;
//   if (scenario.ops.oee > 0) filledFields++;
//   if (scenario.ops.powerUnitsPerHour > 0) filledFields++;
//   if (scenario.ops.manpowerCount > 0) filledFields++;
//   if (scenario.costing.resinRsPerKg > 0) filledFields++;
//   if (scenario.costing.freightInwardsRsPerKg >= 0) filledFields++;
//   if (scenario.costing.resinDiscountPct >= 0) filledFields++;
//   if (scenario.costing.mbRsPerKg > 0) filledFields++;
//   if (scenario.costing.valueAddRsPerPiece >= 0) filledFields++;
//   if (scenario.costing.packagingRsPerPiece >= 0) filledFields++;
//   if (scenario.costing.freightOutRsPerPiece >= 0) filledFields++;
//   if (scenario.costing.wastagePct >= 0) filledFields++;
//   if (scenario.costing.mbRatioPct >= 0) filledFields++;
//   if (scenario.capex.machineCost > 0) filledFields++;
//   if (scenario.capex.mouldCost > 0) filledFields++;
//   if (scenario.capex.workingCapitalDays > 0) filledFields++;
//   if (scenario.capex.usefulLifeMachineYears > 0) filledFields++;
//   if (scenario.capex.usefulLifeMouldYears > 0) filledFields++;
//   const progress = (filledFields / totalFields) * 100;
//   const progressColor =
//     progress < 30 ? "red" : progress < 70 ? "yellow" : "green";
//   return (
//     <div className="mb-8 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
//       <div className="flex items-center justify-between mb-4">
//         <h3 className="text-lg font-semibold text-slate-900">Form Progress</h3>
//         <span className="text-sm text-slate-600">
//           {filledFields} of {totalFields} fields completed
//         </span>
//       </div>
//       <div className="w-full bg-slate-200 rounded-full h-3">
//         <div
//           className={`h-3 rounded-full transition-all duration-500 ${
//             progressColor === "red"
//               ? "bg-red-500"
//               : progressColor === "yellow"
//               ? "bg-yellow-500"
//               : "bg-green-500"
//           }`}
//           style={{ width: `${progress}%` }}
//         />
//       </div>
//       <div className="mt-2 text-xs text-slate-500">
//         {progress < 30
//           ? "Getting started! Fill in the basic fields to see initial results."
//           : progress < 70
//           ? "Good progress! Keep going to get more accurate calculations."
//           : "Almost there! Just a few more fields to complete the scenario."}
//       </div>
//     </div>
//   );
// }

// function Section({
//   title,
//   children,
//   className = "",
// }: {
//   title: string;
//   children: React.ReactNode;
//   className?: string;
// }) {
//   return (
//     <section
//       className={`bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow ${className}`}
//     >
//       <h2 className="text-xl font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">
//         {title}
//       </h2>
//       <div className="space-y-4">{children}</div>
//     </section>
//   );
// }

// function LabeledNumber({
//   label,
//   value,
//   onChange,
//   step = 0.01,
//   placeholder = "",
//   className = "",
//   disabled = false,
// }: {
//   label: string;
//   value: number;
//   onChange: (n: number) => void;
//   step?: number;
//   placeholder?: string;
//   className?: string;
//   disabled?: boolean;
// }) {
//   return (
//     <label className={`flex flex-col gap-2 ${className}`}>
//       <span className="text-sm font-medium text-slate-700">{label}</span>
//       <input
//         className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors placeholder-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed"
//         type="number"
//         step={step}
//         value={Number.isFinite(value) ? value : ""}
//         onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
//         placeholder={placeholder}
//         disabled={disabled}
//       />
//     </label>
//   );
// }

// function LabeledCheckbox({
//   label,
//   checked,
//   onChange,
//   className = "",
//   disabled = false,
// }: {
//   label: string;
//   checked: boolean;
//   onChange: (c: boolean) => void;
//   className?: string;
//   disabled?: boolean;
// }) {
//   return (
//     <label
//       className={`flex items-center gap-3 ${
//         disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
//       } ${className}`}
//     >
//       <input
//         type="checkbox"
//         checked={checked}
//         onChange={(e) => onChange(e.target.checked)}
//         className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 focus:ring-2 disabled:cursor-not-allowed"
//         disabled={disabled}
//       />
//       <span className="text-sm font-medium text-slate-700">{label}</span>
//     </label>
//   );
// }

// function OutputCard({
//   title,
//   value,
//   unit = "",
//   formula,
//   fields,
//   color = "blue",
// }: {
//   title: string;
//   value: string | number;
//   unit?: string;
//   formula: string;
//   fields: string[];
//   color?:
//     | "blue"
//     | "green"
//     | "purple"
//     | "orange"
//     | "indigo"
//     | "teal"
//     | "slate"
//     | "red";
// }) {
//   const colorClasses = {
//     blue: "bg-blue-50 border-blue-200 text-blue-900",
//     green: "bg-green-50 border-green-200 text-green-900",
//     purple: "bg-purple-50 border-purple-200 text-purple-900",
//     orange: "bg-orange-50 border-orange-200 text-orange-900",
//     indigo: "bg-indigo-50 border-indigo-200 text-indigo-900",
//     teal: "bg-teal-50 border-teal-200 text-teal-900",
//     slate: "bg-slate-50 border-slate-200 text-slate-900",
//     red: "bg-red-50 border-red-200 text-red-900",
//   };

//   return (
//     <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
//       <div className="flex items-center justify-between mb-2">
//         <div className="text-sm font-medium">{title}</div>
//         <InfoIcon formula={formula} fields={fields} />
//       </div>
//       <div className="text-2xl font-bold">
//         {value}
//         {unit && <span className="text-lg ml-1">{unit}</span>}
//       </div>
//     </div>
//   );
// }

// function formatRs(n: number) {
//   return `Rs ${Math.round(n).toLocaleString()}`;
// }

// function formatPct(n: number) {
//   return `${(n * 100).toFixed(1)}%`;
// }

// export default function ScenarioEditor({
//   scenario: initial,
//   plantOptions,
//   mode = "edit",
//   onChange,
// }: {
//   scenario: Scenario;
//   plantOptions: PlantMaster[];
//   mode?: "view" | "edit";
//   onChange?: (s: Scenario) => void;
// }) {
//   const [scenario, setScenario] = useState<Scenario>(initial);
//   const [currentMode] = useState<"view" | "edit">(mode);
//   const [saving, setSaving] = useState(false);
//   const [saveStatus, setSaveStatus] = useState<
//     "idle" | "saving" | "success" | "error"
//   >("idle");
//   const [plantModalOpen, setPlantModalOpen] = useState(false);

//   useEffect(() => setScenario(initial), [initial]);

//   const result = useMemo(() => calculateScenario(scenario), [scenario]);

//   function setS(updater: (s: Scenario) => Scenario) {
//     const next = updater(scenario);
//     setScenario(next);
//     onChange?.(next);
//   }

//   async function handleSave() {
//     if (!scenario) return;

//     setSaving(true);
//     setSaveStatus("saving");
//     try {
//       const res = await fetch(`/api/scenarios/${scenario.id}`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           ...scenario,
//           updatedAt: new Date().toISOString(),
//         }),
//       });

//       if (!res.ok) {
//         console.error("Failed to save scenario:", res.statusText);
//         setSaveStatus("error");
//         return;
//       }

//       console.log("Scenario saved successfully");
//       setSaveStatus("success");
//       // Update the local scenario with new timestamp
//       setScenario((prev) => ({
//         ...prev,
//         updatedAt: new Date().toISOString(),
//       }));

//       // Reset success status after 2 seconds
//       setTimeout(() => setSaveStatus("idle"), 2000);
//     } catch (error) {
//       console.error("Error saving scenario:", error);
//       setSaveStatus("error");
//     } finally {
//       setSaving(false);
//     }
//   }

//   const exportJson = () => {
//     const blob = new Blob([JSON.stringify({ scenario, result }, null, 2)], {
//       type: "application/json",
//     });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `${scenario.name
//       .replace(/\s+/g, "-")
//       .toLowerCase()}-calc.json`;
//     a.click();
//     URL.revokeObjectURL(url);
//   };

//   const exportPnlCsv = () => {
//     const header = [
//       "Year",
//       "RevenueNet",
//       "MaterialCost",
//       "MaterialMargin",
//       "ConversionCost",
//       "EBITDA",
//       "Depreciation",
//       "EBIT",
//       "Interest",
//       "PBT",
//       "Tax",
//       "PAT",
//     ];
//     const rows = result.pnl.map((y) => [
//       y.year,
//       y.revenueNet,
//       y.materialCost,
//       y.materialMargin,
//       y.conversionCost,
//       y.ebitda,
//       y.depreciation,
//       y.ebit,
//       y.interestCapex,
//       y.pbt,
//       y.tax,
//       y.pat,
//     ]);
//     const csv = [header, ...rows]
//       .map((r) =>
//         r
//           .map((c) =>
//             typeof c === "string" ? `"${c.replaceAll('"', '""')}"` : c
//           )
//           .join(",")
//       )
//       .join("\n");
//     const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `${scenario.name.replace(/\s+/g, "-").toLowerCase()}-pnl.csv`;
//     a.click();
//     URL.revokeObjectURL(url);
//   };

//   return (
//     <div className="w-full">
//       <div className="w-full">
//         {/* Header */}
//         <div className="mb-8 text-center">
//           <div className="flex items-center justify-between mb-4">
//             <div>
//               <h1 className="text-4xl font-bold text-slate-900 mb-2">
//                 {scenario.name}
//               </h1>
//               <div className="text-xs text-slate-500" suppressHydrationWarning>
//                 Last updated <ClientOnlyDate date={scenario.updatedAt} />
//                 {saveStatus === "success" && (
//                   <span className="ml-2 text-green-600">✓ Just saved</span>
//                 )}
//               </div>
//             </div>
//             <div className="flex items-center gap-3" />
//           </div>
//           <p className="text-lg text-slate-600">
//             Plastic packaging pricing and returns analysis
//           </p>
//         </div>

//         {/* Progress Tracker */}
//         <ProgressTracker scenario={scenario} />

//         {/* Action Bar */}
//         <div className="mb-6 flex items-center justify-center gap-3">
//           <button
//             className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md"
//             onClick={exportJson}
//           >
//             Export JSON
//           </button>
//           <button
//             className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md"
//             onClick={exportPnlCsv}
//           >
//             Export P&L CSV
//           </button>
//         </div>

//         {/* Main Layout: Inputs Left (Bigger), Outputs Right (Smaller) */}
//         <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
//           {/* Left Side - Inputs (4/5 width) */}
//           <div className="xl:col-span-3 space-y-6">
//             {/* Product & Sales Section */}
//             <Section
//               title="📦 Product & Sales"
//               className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
//             >
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <LabeledNumber
//                   label="Product weight (grams)"
//                   value={scenario.sales.productWeightGrams}
//                   onChange={(n) =>
//                     setS((s) => ({
//                       ...s,
//                       sales: { ...s.sales, productWeightGrams: n },
//                     }))
//                   }
//                   placeholder="e.g., 0.3"
//                   disabled={currentMode === "view"}
//                 />
//                 <LabeledNumber
//                   label="Base annual volume (pieces)"
//                   value={scenario.sales.baseAnnualVolumePieces}
//                   onChange={(n) =>
//                     setS((s) => ({
//                       ...s,
//                       sales: {
//                         ...s.sales,
//                         baseAnnualVolumePieces: n,
//                       },
//                     }))
//                   }
//                   step={1}
//                   placeholder="e.g., 12000000"
//                   disabled={currentMode === "view"}
//                 />
//                 <LabeledNumber
//                   label="Conversion recovery (Rs/pc)"
//                   value={scenario.sales.conversionRecoveryRsPerPiece ?? 0}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       sales: {
//                         ...scenario.sales,
//                         conversionRecoveryRsPerPiece: n,
//                       },
//                     })
//                   }
//                   placeholder="e.g., 0.75"
//                 />
//                 <LabeledNumber
//                   label="Mould amortization (Rs/pc)"
//                   value={scenario.sales.mouldAmortizationRsPerPiece}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       sales: {
//                         ...scenario.sales,
//                         mouldAmortizationRsPerPiece: n,
//                       },
//                     })
//                   }
//                   placeholder="e.g., 0.1"
//                 />
//                 <LabeledNumber
//                   label="Discount (Rs/pc)"
//                   value={scenario.sales.discountRsPerPiece}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       sales: { ...scenario.sales, discountRsPerPiece: n },
//                     })
//                   }
//                   placeholder="e.g., 0.02"
//                 />
//                 <LabeledNumber
//                   label="Freight (Sales) (Rs/pc)"
//                   value={scenario.sales.freightOutSalesRsPerPiece}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       sales: {
//                         ...scenario.sales,
//                         freightOutSalesRsPerPiece: n,
//                       },
//                     })
//                   }
//                   placeholder="e.g., 0.03"
//                 />
//                 <div className="md:col-span-2">
//                   <LabeledCheckbox
//                     label="Inflation pass-through"
//                     checked={scenario.sales.inflationPassThrough}
//                     onChange={(c) =>
//                       setS((s) => ({
//                         ...s,
//                         sales: { ...s.sales, inflationPassThrough: c },
//                       }))
//                     }
//                     disabled={currentMode === "view"}
//                   />
//                 </div>
//               </div>
//             </Section>

//             {/* Production & Operations Section */}
//             <Section
//               title="⚙️ Production & Operations"
//               className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
//             >
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                 <LabeledNumber
//                   label="Cavities"
//                   value={scenario.npd.cavities}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       npd: { ...scenario.npd, cavities: n },
//                     })
//                   }
//                   step={1}
//                   placeholder="e.g., 16"
//                 />
//                 <LabeledNumber
//                   label="Cycle time (sec)"
//                   value={scenario.npd.cycleTimeSeconds}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       npd: { ...scenario.npd, cycleTimeSeconds: n },
//                     })
//                   }
//                   placeholder="e.g., 6.2"
//                 />
//                 <LabeledNumber
//                   label="OEE (0..1)"
//                   value={scenario.ops.oee}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       ops: { ...scenario.ops, oee: n },
//                     })
//                   }
//                   placeholder="e.g., 0.8"
//                 />
//                 <LabeledNumber
//                   label="Power units per hour"
//                   value={scenario.ops.powerUnitsPerHour}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       ops: { ...scenario.ops, powerUnitsPerHour: n },
//                     })
//                   }
//                   placeholder="e.g., 60"
//                 />
//                 <LabeledNumber
//                   label="Manpower count"
//                   value={scenario.ops.manpowerCount}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       ops: { ...scenario.ops, manpowerCount: n },
//                     })
//                   }
//                   step={1}
//                   placeholder="e.g., 6"
//                 />
//                 <div className="flex flex-col gap-2 md:col-span-3">
//                   <div className="flex items-center justify-between gap-3">
//                     <span className="text-sm font-medium text-slate-700">
//                       Plant
//                     </span>
//                     <div className="flex items-center gap-2">
//                       <button
//                         type="button"
//                         onClick={() => setPlantModalOpen(true)}
//                         className="text-xs px-2 py-1 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
//                         disabled={currentMode === "view"}
//                       >
//                         View all plants
//                       </button>
//                     </div>
//                   </div>
//                   <div className="flex items-center gap-3">
//                     <select
//                       className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
//                       value={scenario.plantMaster.plant}
//                       onChange={(e) => {
//                         const pm = plantOptions.find(
//                           (p) => p.plant === e.target.value
//                         ) as PlantMaster;
//                         setS((s) => ({ ...s, plantMaster: pm }));
//                       }}
//                       disabled={currentMode === "view"}
//                     >
//                       {plantOptions && plantOptions.length > 0 ? (
//                         plantOptions.map((p) => (
//                           <option key={p.plant} value={p.plant}>
//                             {p.plant}
//                           </option>
//                         ))
//                       ) : (
//                         <option value="">No plants available</option>
//                       )}
//                     </select>
//                     {/* Debug info */}
//                     <div className="text-xs text-slate-500">
//                       {plantOptions
//                         ? `${plantOptions.length} plants`
//                         : "No plants"}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </Section>

//             {/* Costing Section */}
//             <Section
//               title="💰 Costing & Materials"
//               className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200"
//             >
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <LabeledNumber
//                   label="Resin (Rs/kg)"
//                   value={scenario.costing.resinRsPerKg}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       costing: { ...scenario.costing, resinRsPerKg: n },
//                     })
//                   }
//                   placeholder="e.g., 115"
//                 />
//                 <LabeledNumber
//                   label="MB (Rs/kg)"
//                   value={scenario.costing.mbRsPerKg}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       costing: { ...scenario.costing, mbRsPerKg: n },
//                     })
//                   }
//                   placeholder="e.g., 180"
//                 />
//                 <LabeledNumber
//                   label="Freight inwards (Rs/kg)"
//                   value={scenario.costing.freightInwardsRsPerKg}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       costing: {
//                         ...scenario.costing,
//                         freightInwardsRsPerKg: n,
//                       },
//                     })
//                   }
//                   placeholder="e.g., 2"
//                 />
//                 <LabeledNumber
//                   label="Resin discount (%)"
//                   value={scenario.costing.resinDiscountPct}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       costing: {
//                         ...scenario.costing,
//                         resinDiscountPct: n,
//                       },
//                     })
//                   }
//                   placeholder="e.g., 0.02"
//                 />
//                 <LabeledNumber
//                   label="Value add (Rs/pc)"
//                   value={scenario.costing.valueAddRsPerPiece}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       costing: {
//                         ...scenario.costing,
//                         valueAddRsPerPiece: n,
//                       },
//                     })
//                   }
//                   placeholder="e.g., 0.15"
//                 />
//                 <LabeledNumber
//                   label="Packaging (Rs/pc)"
//                   value={scenario.costing.packagingRsPerPiece}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       costing: {
//                         ...scenario.costing,
//                         packagingRsPerPiece: n,
//                       },
//                     })
//                   }
//                   placeholder="e.g., 0.06"
//                 />
//                 <LabeledNumber
//                   label="Freight out (Rs/pc)"
//                   value={scenario.costing.freightOutRsPerPiece}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       costing: {
//                         ...scenario.costing,
//                         freightOutRsPerPiece: n,
//                       },
//                     })
//                   }
//                   placeholder="e.g., 0.04"
//                 />
//                 <LabeledNumber
//                   label="Wastage (%)"
//                   value={scenario.costing.wastagePct}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       costing: { ...scenario.costing, wastagePct: n },
//                     })
//                   }
//                   placeholder="e.g., 0.02"
//                 />
//                 <LabeledNumber
//                   label="MB ratio (%)"
//                   value={scenario.costing.mbRatioPct}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       costing: { ...scenario.costing, mbRatioPct: n },
//                     })
//                   }
//                   placeholder="e.g., 0.03"
//                 />
//               </div>
//             </Section>

//             {/* Capex & Finance Section */}
//             <Section
//               title="🏗️ Capex & Finance"
//               className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200"
//             >
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <LabeledNumber
//                   label="Machine cost"
//                   value={scenario.capex.machineCost}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       capex: { ...scenario.capex, machineCost: n },
//                     })
//                   }
//                   placeholder="e.g., 15000000"
//                 />
//                 <LabeledNumber
//                   label="Mould cost"
//                   value={scenario.capex.mouldCost}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       capex: { ...scenario.capex, mouldCost: n },
//                     })
//                   }
//                   placeholder="e.g., 5000000"
//                 />
//                 <LabeledNumber
//                   label="Working capital days"
//                   value={scenario.capex.workingCapitalDays}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       capex: { ...scenario.capex, workingCapitalDays: n },
//                     })
//                   }
//                   placeholder="e.g., 30"
//                 />
//                 <LabeledNumber
//                   label="Useful life (machine, yrs)"
//                   value={scenario.capex.usefulLifeMachineYears}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       capex: {
//                         ...scenario.capex,
//                         usefulLifeMachineYears: n,
//                       },
//                     })
//                   }
//                   placeholder="e.g., 10"
//                 />
//                 <LabeledNumber
//                   label="Useful life (mould, yrs)"
//                   value={scenario.capex.usefulLifeMouldYears}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       capex: {
//                         ...scenario.capex,
//                         usefulLifeMouldYears: n,
//                       },
//                     })
//                   }
//                   placeholder="e.g., 5"
//                 />
//                 <LabeledNumber
//                   label="Debt % of capex"
//                   value={scenario.finance.debtPct}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       finance: { ...scenario.finance, debtPct: n },
//                     })
//                   }
//                   placeholder="e.g., 0.6"
//                 />
//                 <LabeledNumber
//                   label="Cost of debt %"
//                   value={scenario.finance.costOfDebtPct}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       finance: {
//                         ...scenario.finance,
//                         costOfDebtPct: n,
//                       },
//                     })
//                   }
//                   placeholder="e.g., 0.12"
//                 />
//                 <LabeledNumber
//                   label="Cost of equity %"
//                   value={scenario.finance.costOfEquityPct}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       finance: {
//                         ...scenario.finance,
//                         costOfEquityPct: n,
//                       },
//                     })
//                   }
//                   placeholder="e.g., 0.18"
//                 />
//                 <LabeledNumber
//                   label="Corporate tax rate %"
//                   value={scenario.finance.corporateTaxRatePct}
//                   onChange={(n) =>
//                     setScenario({
//                       ...scenario,
//                       finance: {
//                         ...scenario.finance,
//                         corporateTaxRatePct: n,
//                       },
//                     })
//                   }
//                   placeholder="e.g., 0.25"
//                 />
//                 <div className="md:col-span-2">
//                   <LabeledCheckbox
//                     label="Include Corp S,G&A"
//                     checked={scenario.finance.includeCorpSGA}
//                     onChange={(c) =>
//                       setScenario({
//                         ...scenario,
//                         finance: {
//                           ...scenario.finance,
//                           includeCorpSGA: c,
//                         },
//                       })
//                     }
//                   />
//                 </div>
//               </div>
//             </Section>
//           </div>

//           {/* Right Side - Outputs (1/5 width) */}
//           <div className="xl:col-span-2 space-y-6">
//             <Section title="🎯 Key Results (Year 1)">
//               <div className="space-y-4">
//                 <OutputCard
//                   title="Price per piece"
//                   value={`Rs ${result.prices[0]?.pricePerPiece.toFixed(4)}`}
//                   formula="Material cost + Conversion cost + Value add + Packaging + Freight + Mould amort"
//                   fields={[
//                     "Resin price",
//                     "MB price",
//                     "Conversion recovery",
//                     "Value add",
//                     "Packaging",
//                     "Freight",
//                     "Mould amortization",
//                   ]}
//                   color="blue"
//                 />
//                 <OutputCard
//                   title="Revenue (Y1)"
//                   value={formatRs(result.pnl[0]?.revenueNet || 0)}
//                   formula="Price per piece × Volume × (1 - Discount) - Customer freight"
//                   fields={[
//                     "Price per piece",
//                     "Base annual volume",
//                     "Discount",
//                     "Customer freight",
//                   ]}
//                   color="green"
//                 />
//                 <OutputCard
//                   title="EBITDA (Y1)"
//                   value={formatRs(result.pnl[0]?.ebitda || 0)}
//                   formula="Revenue - Material cost - Conversion cost - Plant SGA - Corp SGA"
//                   fields={[
//                     "Revenue",
//                     "Resin cost",
//                     "MB cost",
//                     "Power cost",
//                     "Manpower cost",
//                     "Plant SGA",
//                     "Corp SGA",
//                   ]}
//                   color="purple"
//                 />
//                 <OutputCard
//                   title="NPV"
//                   value={formatRs(result.returns.npv || 0)}
//                   formula="Sum of discounted cash flows - Initial capex"
//                   fields={[
//                     "Machine cost",
//                     "Mould cost",
//                     "EBIT",
//                     "Tax rate",
//                     "WACC",
//                     "Working capital",
//                   ]}
//                   color="orange"
//                 />
//                 <OutputCard
//                   title="IRR"
//                   value={
//                     result.returns.irr !== null
//                       ? formatPct(result.returns.irr)
//                       : "—"
//                   }
//                   formula="Discount rate where NPV = 0"
//                   fields={[
//                     "Cash flows",
//                     "Initial investment",
//                     "Project timeline",
//                   ]}
//                   color="indigo"
//                 />
//                 <OutputCard
//                   title="Payback period"
//                   value={
//                     result.returns.paybackYears
//                       ? `${result.returns.paybackYears.toFixed(2)} years`
//                       : "—"
//                   }
//                   formula="Time to recover initial investment"
//                   fields={["Machine cost", "Mould cost", "Annual cash flows"]}
//                   color="teal"
//                 />
//               </div>
//             </Section>

//             <Section title="📊 Financial Metrics">
//               <div className="space-y-4">
//                 <OutputCard
//                   title="WACC"
//                   value={formatPct(result.returns.wacc)}
//                   formula="(Debt% × Cost of debt × (1-tax)) + (Equity% × Cost of equity)"
//                   fields={[
//                     "Debt percentage",
//                     "Cost of debt",
//                     "Tax rate",
//                     "Cost of equity",
//                   ]}
//                   color="slate"
//                 />
//                 <OutputCard
//                   title="Material margin (Y1)"
//                   value={formatRs(result.pnl[0]?.materialMargin || 0)}
//                   formula="Revenue - Material cost (Resin + MB)"
//                   fields={["Revenue", "Resin cost", "MB cost"]}
//                   color="green"
//                 />
//                 <OutputCard
//                   title="Conversion cost (Y1)"
//                   value={formatRs(result.pnl[0]?.conversionCost || 0)}
//                   formula="Power + Manpower + Value add + Packaging + Freight + Mould + R&M + Other MFG + Plant SGA"
//                   fields={[
//                     "Power cost",
//                     "Manpower cost",
//                     "Value add",
//                     "Packaging",
//                     "Freight",
//                     "Mould amortization",
//                     "R&M cost",
//                     "Other MFG cost",
//                     "Plant SGA",
//                   ]}
//                   color="red"
//                 />
//               </div>
//             </Section>

//             <Section title="⚡ Capacity & Efficiency">
//               <div className="space-y-4">
//                 <OutputCard
//                   title="Annual capacity (pieces)"
//                   value={
//                     Math.round(
//                       (scenario.npd.cavities *
//                         (60 / scenario.npd.cycleTimeSeconds) *
//                         scenario.ops.oee *
//                         (scenario.ops.operatingHoursPerDay || 24) *
//                         (scenario.ops.workingDaysPerYear || 365)) /
//                         1000
//                     ).toLocaleString() + "K"
//                   }
//                   formula="Cavities × (3600/cycle time) × OEE × Hours × Days"
//                   fields={[
//                     "Cavities",
//                     "Cycle time",
//                     "OEE",
//                     "Operating hours",
//                     "Working days",
//                   ]}
//                   color="blue"
//                 />
//                 <OutputCard
//                   title="Capacity utilization (Y1)"
//                   value={`${(
//                     ((result.pnl[0]?.revenueNet || 0) /
//                       (result.prices[0]?.pricePerPiece || 1) /
//                       (scenario.npd.cavities *
//                         (60 / scenario.npd.cycleTimeSeconds) *
//                         scenario.ops.oee *
//                         (scenario.ops.operatingHoursPerDay || 24) *
//                         (scenario.ops.workingDaysPerYear || 365))) *
//                     100
//                   ).toFixed(1)}%`}
//                   formula="(Actual volume / Annual capacity) × 100"
//                   fields={["Base volume", "Annual capacity"]}
//                   color="orange"
//                 />
//               </div>
//             </Section>
//           </div>
//         </div>

//         {/* Bottom Tables - Full Width */}
//         <div className="mt-8 space-y-6">
//           <Section title="📈 Price build-up (per kg, Y1..Y5)">
//             <div className="overflow-x-auto">
//               <table className="min-w-full text-sm">
//                 <thead>
//                   <tr className="border-b border-slate-200">
//                     <th className="text-left p-3 font-semibold text-slate-900">
//                       Component
//                     </th>
//                     {result.prices.map((p) => (
//                       <th
//                         key={p.year}
//                         className="text-right p-3 font-semibold text-slate-900"
//                       >
//                         Y{p.year}
//                       </th>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {(
//                     [
//                       [
//                         "RM",
//                         (p: (typeof result.prices)[number]) => p.perKg.rmPerKg,
//                       ],
//                       [
//                         "MB",
//                         (p: (typeof result.prices)[number]) => p.perKg.mbPerKg,
//                       ],
//                       [
//                         "Value add",
//                         (p: (typeof result.prices)[number]) =>
//                           p.perKg.valueAddPerKg,
//                       ],
//                       [
//                         "Packaging",
//                         (p: (typeof result.prices)[number]) =>
//                           p.perKg.packagingPerKg,
//                       ],
//                       [
//                         "Freight out",
//                         (p: (typeof result.prices)[number]) =>
//                           p.perKg.freightOutPerKg,
//                       ],
//                       [
//                         "Mould amort",
//                         (p: (typeof result.prices)[number]) =>
//                           p.perKg.mouldAmortPerKg,
//                       ],
//                       [
//                         "Conversion",
//                         (p: (typeof result.prices)[number]) =>
//                           p.perKg.conversionPerKg,
//                       ],
//                       [
//                         "Total",
//                         (p: (typeof result.prices)[number]) =>
//                           p.perKg.totalPerKg,
//                       ],
//                     ] as const
//                   ).map(([label, getter]) => (
//                     <tr
//                       key={label as string}
//                       className="border-b border-slate-100 hover:bg-slate-50"
//                     >
//                       <td className="p-3 font-medium text-slate-700">
//                         {label as string}
//                       </td>
//                       {result.prices.map((p) => (
//                         <td
//                           key={p.year}
//                           className="p-3 text-right font-mono text-slate-900"
//                         >
//                           {getter(p).toFixed(2)}
//                         </td>
//                       ))}
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </Section>

//           <Section title="💼 P&L (Y1..Y5)">
//             <div className="overflow-x-auto">
//               <table className="min-w-full text-sm">
//                 <thead>
//                   <tr className="border-b border-slate-200">
//                     <th className="text-left p-3 font-semibold text-slate-900">
//                       Line
//                     </th>
//                     {result.pnl.map((y) => (
//                       <th
//                         key={y.year}
//                         className="text-right p-3 font-semibold text-slate-900"
//                       >
//                         Y{y.year}
//                       </th>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {(
//                     [
//                       [
//                         "Revenue (net)",
//                         (y: (typeof result.pnl)[number]) => y.revenueNet,
//                       ],
//                       [
//                         "Material cost",
//                         (y: (typeof result.pnl)[number]) => y.materialCost,
//                       ],
//                       [
//                         "Material margin",
//                         (y: (typeof result.pnl)[number]) => y.materialMargin,
//                       ],
//                       [
//                         "Conversion cost",
//                         (y: (typeof result.pnl)[number]) => y.conversionCost,
//                       ],
//                       [
//                         "SG&A cost",
//                         (y: (typeof result.pnl)[number]) => y.sgaCost,
//                       ],
//                       ["EBITDA", (y: (typeof result.pnl)[number]) => y.ebitda],
//                       [
//                         "Depreciation",
//                         (y: (typeof result.pnl)[number]) => y.depreciation,
//                       ],
//                       ["EBIT", (y: (typeof result.pnl)[number]) => y.ebit],
//                       [
//                         "Interest",
//                         (y: (typeof result.pnl)[number]) => y.interestCapex,
//                       ],
//                       ["PBT", (y: (typeof result.pnl)[number]) => y.pbt],
//                       ["Tax", (y: (typeof result.pnl)[number]) => y.tax],
//                       ["PAT", (y: (typeof result.pnl)[number]) => y.pat],
//                     ] as const
//                   ).map(([label, getter]) => (
//                     <tr
//                       key={label as string}
//                       className="border-b border-slate-100 hover:bg-slate-50"
//                     >
//                       <td className="p-3 font-medium text-slate-700">
//                         {label as string}
//                       </td>
//                       {result.pnl.map((y) => (
//                         <td
//                           key={y.year}
//                           className="p-3 text-right font-mono text-slate-900"
//                         >
//                           {formatRs(getter(y))}
//                         </td>
//                       ))}
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </Section>

//           <Section title="📊 Returns & RoCE">
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
//               <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
//                 <div className="text-sm text-slate-600 font-medium mb-1">
//                   WACC
//                 </div>
//                 <div className="text-xl font-bold text-slate-900">
//                   {formatPct(result.returns.wacc)}
//                 </div>
//               </div>
//               <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
//                 <div className="text-sm text-slate-600 font-medium mb-1">
//                   NPV
//                 </div>
//                 <div className="text-xl font-bold text-slate-900">
//                   {formatRs(result.returns.npv)}
//                 </div>
//               </div>
//               <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
//                 <div className="text-sm text-slate-600 font-medium mb-1">
//                   IRR
//                 </div>
//                 <div className="text-xl font-bold text-slate-900">
//                   {result.returns.irr !== null
//                     ? formatPct(result.returns.irr)
//                     : "—"}
//                 </div>
//               </div>
//               <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
//                 <div className="text-sm text-slate-600 font-medium mb-1">
//                   Payback
//                 </div>
//                 <div className="text-xl font-bold text-slate-900">
//                   {result.returns.paybackYears
//                     ? `${result.returns.paybackYears.toFixed(2)} yrs`
//                     : "—"}
//                 </div>
//               </div>
//             </div>
//             <div className="overflow-x-auto">
//               <table className="min-w-full text-sm">
//                 <thead>
//                   <tr className="border-b border-slate-200">
//                     <th className="text-left p-3 font-semibold text-slate-900">
//                       Year
//                     </th>
//                     <th className="text-right p-3 font-semibold text-slate-900">
//                       RoCE
//                     </th>
//                     <th className="text-right p-3 font-semibold text-slate-900">
//                       Net Block
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {result.returns.roceByYear.map((r) => (
//                     <tr
//                       key={r.year}
//                       className="border-b border-slate-100 hover:bg-slate-50"
//                     >
//                       <td className="p-3 font-medium text-slate-700">
//                         Y{r.year}
//                       </td>
//                       <td className="p-3 text-right font-mono text-slate-900">
//                         {formatPct(r.roce)}
//                       </td>
//                       <td className="p-3 text-right font-mono text-slate-900">
//                         {formatRs(r.netBlock)}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </Section>
//         </div>
//       </div>
//       <PlantDetailsModal
//         open={plantModalOpen}
//         plants={plantOptions}
//         onClose={() => setPlantModalOpen(false)}
//         onSelect={(pm) => {
//           setS((s) => ({ ...s, plantMaster: pm }));
//           setPlantModalOpen(false);
//         }}
//       />
//       {/* Floating Save Button */}
//       <div className="fixed bottom-6 right-6 z-40">
//         <button
//           className={`px-4 py-2 rounded-full shadow-lg font-medium transition-colors text-white ${
//             saveStatus === "success"
//               ? "bg-green-600"
//               : saveStatus === "error"
//               ? "bg-red-600"
//               : "bg-blue-600 hover:bg-blue-700"
//           }`}
//           onClick={handleSave}
//           disabled={saving}
//           aria-label="Save scenario"
//         >
//           {saveStatus === "saving"
//             ? "Saving..."
//             : saveStatus === "success"
//             ? "✓ Saved"
//             : saveStatus === "error"
//             ? "✗ Error"
//             : "Save"}
//         </button>
//       </div>
//     </div>
//   );
// }
