// Core domain types for the business calculator

export type PlantMaster = {
  plant: string;
  manpowerRatePerShift: number; // Rs per person per shift
  powerRatePerUnit: number; // Rs per kWh/unit
  rAndMPerKg: number; // Rs per kg
  otherMfgPerKg: number; // Rs per kg
  plantSgaPerKg: number; // Rs per kg
  corpSgaPerKg: number; // Rs per kg
};

export type SalesInput = {
  customer: string;
  product: string;
  productWeightGrams: number;
  conversionRecoveryRsPerPiece?: number; // optional; may be derived from alt conversion
  mouldAmortizationRsPerPiece: number;
  discountRsPerPiece: number; // sales discount
  freightOutSalesRsPerPiece: number; // customer freight shown in P&L
  baseAnnualVolumePieces: number; // Year 1 pieces
  yoyGrowthPct: number[]; // length 5, index 0 for Y1 (usually 0), 1..4 for Y2..Y5
  inflationPassThrough: boolean; // if true, hold material margin per piece constant
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
  powerUnitsPerHour: number; // kWh
  automation: boolean;
  manpowerCount: number; // persons
  oee: number; // 0..1
  operatingHoursPerDay?: number; // default 24
  workingDaysPerYear?: number; // default 365
  shiftsPerDay?: number; // default 3
};

export type CostingInput = {
  resinRsPerKg: number;
  freightInwardsRsPerKg: number;
  resinDiscountPct: number; // 0..1
  mbRsPerKg: number; // masterbatch cost per kg
  valueAddRsPerPiece: number;
  packagingRsPerPiece: number;
  freightOutRsPerPiece: number;
  wastagePct: number; // 0..1 on resin and MB
  mbRatioPct: number; // 0..1 of resin replaced by MB
  conversionInflationPct: number[]; // length 5, compounded YoY for conversion and per-piece lines
  rmInflationPct: number[]; // length 5, compounded YoY for RM/MB
  useMbPriceOverride?: boolean; // if false, derive MB cost from resin price
};

export type CapexInput = {
  machineCost: number;
  mouldCost: number;
  workingCapitalDays: number; // days of revenue tied up
  usefulLifeMachineYears: number;
  usefulLifeMouldYears: number;
};

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

export type Scenario = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sales: SalesInput;
  npd: NpdInput;
  ops: OpsInput;
  costing: CostingInput;
  capex: CapexInput;
  finance: FinanceInput;
  altConversion?: AltConversionInput;
  plantMaster: PlantMaster; // selected plant config
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
  mouldAmortPerKg: number;
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
  discountExpense: number;
  customerFreightExpense: number;
  revenueNet: number;
  materialCost: number;
  materialMargin: number;
  powerCost: number;
  manpowerCost: number;
  valueAddCost: number;
  packagingCost: number;
  freightOutCost: number;
  mouldAmortCost: number;
  conversionRecoveryCost: number;
  rAndMCost: number;
  otherMfgCost: number;
  plantSgaCost: number;
  corpSgaCost: number;
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

export type CalcOutput = {
  volumes: YearVolumes[];
  prices: PriceYear[];
  pnl: PnlYear[];
  cashflow: CashflowYear[];
  returns: Returns;
};



