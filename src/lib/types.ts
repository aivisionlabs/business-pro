// Core domain types for the business calculator

export type PlantMaster = {
  plant: string;
  manpowerRatePerShift: number; // Rs per person per shift
  powerRatePerUnit: number; // Rs per kWh/unit
  rAndMPerKg: number; // Rs per kg
  otherMfgPerKg: number; // Rs per kg
  plantSgaPerKg: number; // Rs per kg
  corpSgaPerKg: number; // Rs per kg
  conversionPerKg: number; // Rs per kg
  sellingGeneralAndAdministrativeExpensesPerKg: number; // Rs per kg
};

export type SalesInput = {
  baseAnnualVolumePieces: number; // Year 1 pieces
  conversionRecoveryRsPerPiece?: number; // optional; may be derived from alt conversion
  productWeightGrams: number;
};

export type NpdInput = {
  machineName: string;
  cavities: number;
  cycleTimeSeconds: number;
  plant: string; // key to PlantMaster.plant
  polymer: string;
  masterbatch: string;
};

export type OpsInput = {
  oee: number; // 0..1
  operatingHoursPerDay?: number; // default 24
  workingDaysPerYear?: number; // default 365
  machineAvailable?: boolean; // UI-only flag; not used in calc yet
  // New fields for depreciation calculation
  newMachineRequired?: boolean;
  newMouldRequired?: boolean;
  newInfraRequired?: boolean;
  costOfNewMachine?: number;
  costOfOldMachine?: number;
  costOfNewMould?: number;
  costOfOldMould?: number;
  costOfNewInfra?: number;
  costOfOldInfra?: number;
  lifeOfNewMachineYears?: number; // default 15
  lifeOfNewMouldYears?: number; // default 15
  lifeOfNewInfraYears?: number; // default 30
  workingCapitalDays?: number; // days of revenue tied up (moved from capex)
};

export type CostingInput = {
  resinRsPerKg: number;
  freightInwardsRsPerKg: number;
  resinDiscountPct: number; // 0..1
  mbRsPerKg: number; // masterbatch cost per kg
  valueAddRsPerPiece: number;
  // Prefer Rs/kg fields; legacy per-piece kept optional for compatibility
  packagingRsPerKg: number;
  freightOutRsPerKg: number;
  // Legacy optional fields (used as fallback if Rs/kg not provided)
  packagingRsPerPiece?: number;
  freightOutRsPerPiece?: number;
  wastagePct: number; // 0..1 on resin and MB
  mbRatioPct: number; // 0..1 of resin replaced by MB
  conversionInflationPct: number[]; // length 5, compounded YoY for conversion and per-piece lines
  rmInflationPct: number[]; // length 5, compounded YoY for RM/MB
  useMbPriceOverride?: boolean; // if false, derive MB cost from resin price
};

export type CapexInput = Record<string, never>; // Deprecated - all properties moved to OpsInput

export type FinanceInput = {
  includeCorpSGA: boolean;
  debtPct: number; // 0..1 of capex
  costOfDebtPct: number; // APR e.g. 0.12
  costOfEquityPct: number; // e.g. 0.18
  corporateTaxRatePct: number; // e.g. 0.25
};

export type AltConversionInput = {
  machineRatePerDayRs?: number; // optional; used if Sales.conversionRecoveryRsPerPiece is missing
};

// A single SKU within a business case
export type Sku = {
  id: string;
  businessCaseId?: string; // Reference to parent business case (for Firestore relationships)
  name: string;
  sales: SalesInput;
  npd: NpdInput;
  ops: OpsInput;
  costing: CostingInput;
  capex: CapexInput;
  altConversion?: AltConversionInput;
  plantMaster: PlantMaster; // plant config selected for this SKU
};

// A business case can now contain multiple SKUs
export type BusinessCase = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  finance: FinanceInput; // Finance parameters are case-level and applied to all SKUs
  skus: Sku[];
};

export type YearVolumes = {
  year: number; // 1..5
  volumePieces: number;
  weightKg: number;
};

export type PriceComponentsPerKg = {
  rmPerKg: number;
  mbPerKg: number;
  valueAddPerKg: number;
  packagingPerKg: number;
  freightOutPerKg: number;
  conversionPerKg: number;
  totalPerKg: number;
};

export type PriceYear = {
  year: number;
  perKg: PriceComponentsPerKg;
  pricePerPiece: number;
};

export type PnlYear = {
  year: number;
  revenueGross: number;
  revenueNet: number;
  materialCost: number;
  materialMargin: number;
  powerCost: number;
  manpowerCost: number;
  valueAddCost: number;
  packagingCost: number;
  freightOutCost: number;
  conversionRecoveryCost: number;
  rAndMCost: number;
  otherMfgCost: number;
  plantSgaCost: number;
  corpSgaCost: number;
  sgaCost: number;
  conversionCost: number;
  grossMargin: number;
  ebitda: number;
  depreciation: number;
  ebit: number;
  interestCapex: number;
  pbt: number;
  tax: number;
  pat: number;
};

export type CashflowYear = {
  year: number;
  nwc: number;
  changeInNwc: number;
  fcf: number;
  pv: number;
  cumulativeFcf: number;
};

export type Returns = {
  wacc: number;
  npv: number;
  irr: number | null;
  paybackYears: number | null;
  roceByYear: { year: number; roce: number; netBlock: number }[];
};

// Per-SKU output for drill-down views
export type SkuCalcOutput = {
  skuId: string;
  name: string;
  volumes: YearVolumes[];
  prices: PriceYear[];
  pnl: PnlYear[];
};

// Aggregated case output (sums of SKUs) + optional per-SKU breakdowns
export type CalcOutput = {
  // Aggregated across all SKUs
  volumes: YearVolumes[];
  prices: PriceYear[]; // price components shown as weighted-average per kg; for simplicity we expose totals derived from first SKU if needed
  pnl: PnlYear[];
  weightedAvgPricePerKg: WeightedAvgPricePerKgYear[]; // per-kg values for each P&L line item
  cashflow: CashflowYear[];
  returns: Returns;
  // Optional per-SKU breakdowns for UI tabs
  bySku?: SkuCalcOutput[];
};

export type WeightedAvgPricePerKgYear = {
  year: number;
  // Revenue components per kg
  revenueNetPerKg: number;
  // Cost components per kg
  materialCostPerKg: number;
  materialMarginPerKg: number;
  conversionCostPerKg: number;
  grossMarginPerKg: number;
  sgaCostPerKg: number;
  ebitdaPerKg: number;
  depreciationPerKg: number;
  ebitPerKg: number;
  interestPerKg: number;
  pbtPerKg: number;
  patPerKg: number;
};

// Temporary alias so existing imports keep working while UI migrates
export type Scenario = BusinessCase;



// ==============================
// Simulation Types (Risk Engine)
// ==============================

export type OutcomeMetric = "NPV" | "IRR" | "PNL_Y1" | "PNL_Y5" | "PNL_TOTAL";

export type ObjectiveConfig = {
  metrics: OutcomeMetric[];
};

export type PerturbationSpec = {
  variableId: string; // dot-path into BusinessCase/Sku input space
  deltas: number[]; // e.g., [-0.2, -0.1, 0.1, 0.2] if percent=true else absolute
  percent?: boolean; // default true
};

export type SensitivityRunItem = {
  variableId: string;
  delta: number;
  metrics: Record<OutcomeMetric, number | null>;
};

export type SensitivityResponse = {
  baseline: Record<OutcomeMetric, number | null>;
  results: SensitivityRunItem[]; // can be used for Tornado
};

// Scenario Modeling
export type ScenarioDefinition = {
  id: string;
  name: string;
  overrides: Record<string, number>; // dot-path to numeric field => absolute value
};

export type ScenarioRunResult = {
  scenarioId: string;
  name: string;
  metrics: Record<OutcomeMetric, number | null>;
};

export type ScenarioResponse = {
  baseline: Record<OutcomeMetric, number | null>;
  results: ScenarioRunResult[];
};

