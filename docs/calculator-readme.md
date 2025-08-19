## Calculator Feature – Detailed README

Authoritative spec is aligned to the workbook discussion captured here: [Workbook requirements and formulas](https://chatgpt.com/share/68988c4a-a50c-800d-a3d8-dd1fe7cfa356).

### What this is
- A deterministic calculator that converts business inputs into price build-up, 5-year P&L, cash flows, and investment-return metrics for a business case containing one or more SKUs.
- Implemented as pure TypeScript modules in `src/lib/calc/*` and surfaced via UI (`/`) and API (`/api/calc`).

### Quick start
- Open `/` to use the interactive calculator. Adjust inputs in the left panels; results update live.
- Export JSON snapshot or P&L CSV with the buttons in the header.
- Programmatic use: POST your `Scenario` JSON to `/api/calc`.

### Data model (summary)
- `BusinessCase` contains:
  - `finance` (case-level) and an array `skus[]` where each `Sku` has `sales`, `npd`, `ops`, `costing`, `capex`, optional `altConversion`, and a selected `plantMaster` row.
- Full TypeScript types are in `src/lib/types.ts`.

### Notation
- Years: t ∈ {1..5}, with t=1 as base year and index i = t − 1 for arrays.
- `productWeightKg = productWeightGrams / 1000`.
- Growth multipliers and inflation factors are compounded across years.

## Inputs per SKU
### Sales
- `productWeightGrams` (> 0)
- `conversionRecoveryRsPerPiece` (optional; see alternate conversion)
- `mouldAmortizationRsPerPiece`
- `discountRsPerPiece` (booked as expense in P&L)
- `freightOutSalesRsPerPiece` (customer freight, booked as expense in P&L)
- `baseAnnualVolumePieces`
- `inflationPassThrough` (Yes/No)

### NPD
- `cavities`
- `cycleTimeSeconds`
- `plant` (string key to plant master)

### Ops
- `oee` (0..1)
- `powerUnitsPerHour`
- `manpowerCount`
- Optional defaults: `operatingHoursPerDay=24`, `workingDaysPerYear=365`, `shiftsPerDay=3`

### Costing
- `resinRsPerKg`, `freightInwardsRsPerKg`, `resinDiscountPct`
- `mbRsPerKg`, `mbRatioPct`, `useMbPriceOverride` (if false, MB derived off resin)
- `valueAddRsPerPiece`, `packagingRsPerPiece`, `freightOutRsPerPiece`
- `wastagePct`
- `rmInflationPct[5]`, `conversionInflationPct[5]`

### Capex
- `machineCost`, `mouldCost`, `workingCapitalDays`
- `usefulLifeMachineYears`, `usefulLifeMouldYears` (≥ 1)

### Finance
- `includeCorpSGA` (bool)
- `debtPct`, `costOfDebtPct`, `costOfEquityPct`, `corporateTaxRatePct`

### Alternate conversion (optional)
- `machineRatePerDayRs` (used if explicit conversion recovery is absent)

### Plant master (selected row)
- `manpowerRatePerShift`, `powerRatePerUnit`, `rAndMPerKg`, `otherMfgPerKg`, `plantSgaPerKg`, `corpSgaPerKg`

## Derived capacity
- Units per hour: \(\text{unitsPerHour} = \text{cavities} \times \frac{60}{\text{cycleTimeSeconds}} \times \text{oee}\)
- Units per day: \(\text{unitsPerDay} = \text{unitsPerHour} \times \text{operatingHoursPerDay}\)
- Annual capacity (pieces): \(\text{annualCapacityPieces} = \text{unitsPerDay} \times \text{workingDaysPerYear}\)
- Capacity warning if planned Y1 volume > annual capacity.

## Volumes and weights
- Growth factor: \(\text{growthFactor}(1) = 1\); for t > 1: \(\prod_{y=2}^{t}
- Volume pieces: \(\text{volumePieces}(t) = \text{baseVolume} \times \text{growthFactor}(t)\)
- Weight kg: \(\text{weightKg}(t) = \text{volumePieces}(t) \times \text{productWeightKg}\)

## Inflation factors
- For series of rates `rmInflationPct[i]` and `conversionInflationPct[i]` (length 5):
  - \(\text{inflRM}(i) = \prod_{k=0}^{i} (1 + \text{rmInflationPct}[k])\)
  - \(\text{inflConv}(i) = \prod_{k=0}^{i} (1 + \text{conversionInflationPct}[k])\)
  - Typically `rates[0] = 0` for Y1.

## Price build-up (Year 1 base; extend with inflation)
### Raw material and MB per kg (Y1)
- Resin net: \(\text{resinNet} = \max(0, \text{resinRsPerKg} \times (1 - \text{resinDiscountPct})) + \text{freightInwardsRsPerKg}\)
- RM per kg: \(\text{rmY1} = \text{resinNet} \times (1 + \text{wastagePct})\)
- MB base: `mbRsPerKg` (if `useMbPriceOverride !== false`) else `resinNet`
- MB per kg: \(\text{mbY1} = \text{mbBase} \times \text{mbRatioPct} \times (1 + \text{wastagePct})\)

### Per-piece items expressed per kg (Y1)
- Value add per kg: \(\frac{\text{valueAddRsPerPiece}}{\text{productWeightKg}}\)
- Packaging per kg: \(\frac{\text{packagingRsPerPiece}}{\text{productWeightKg}}\)
- Freight out per kg: \(\frac{\text{freightOutRsPerPiece}}{\text{productWeightKg}}\)
- Conversion per kg: \(\frac{\text{conversionRecoveryRsPerPiece}}{\text{productWeightKg}}\) (see alternate conversion below)

### Totals (Y1)
- Material per kg: \(\text{materialPerKg\_Y1} = \text{rmY1} + \text{mbY1}\)
- Per-piece group per kg: sum of the five per-kg items above
- Price per kg (Y1): sum of material per kg and per-piece group per kg
- Material per piece (Y1): \(\text{materialPerKg\_Y1} \times \text{productWeightKg}\)
- Per-piece group (Y1): direct sum of per-piece items (value add, packaging, freight out, mould amort, conversion)
- Price per piece (Y1): material per piece + per-piece group

### Years 2..5 with inflation
- If inflation pass-through = Yes:
  - Material per kg in t: \(\text{materialPerKg}(t) = \text{materialPerKg\_Y1} \times \text{inflRM}(i)\)
  - Hold material margin per piece constant vs Y1:
    - \(\text{pricePerPiece}(t) = \text{materialPerPiece}(t) + \text{materialMarginPerPiece\_Y1}\)
- If pass-through = No:
  - \(\text{pricePerPiece}(t) = \text{pricePerPiece\_Y1} \times \text{inflConv}(i)\)
  - Per-kg components inflating with `inflConv` as applicable.

### Alternate conversion method
- If `conversionRecoveryRsPerPiece` is blank and `machineRatePerDayRs` is provided:
  - \(\text{recoveryPerPiece} = \frac{\text{machineRatePerDayRs}}{\text{unitsPerDay}}\)
  - Conversion per kg (Y1): \(\frac{\text{recoveryPerPiece}}{\text{productWeightKg}}\)

## P&L (per year t) per SKU and aggregated case totals
### Revenue and material
- Revenue gross: \(\text{revenueGross}(t) = \text{pricePerPiece}(t) \times \text{volumePieces}(t)\)
- Discount expense: \(\text{discountRsPerPiece} \times \text{volumePieces}(t)\)
- Customer freight expense: \(\text{freightOutSalesRsPerPiece} \times \text{volumePieces}(t)\)
- Revenue net: \(\text{revenueNet}(t) = \text{revenueGross} - \text{discountExpense}\)
- Material cost per kg: \(\text{rmPerKg}(t) + \text{mbPerKg}(t)\)
- Material cost: \(\text{materialCost}(t) = \text{materialCostPerKg}(t) \times \text{weightKg}(t)\)
- Material margin: \(\text{materialMargin}(t) = \text{revenueNet}(t) - \text{materialCost}(t)\)

### Conversion, overheads, EBITDA
- Power cost total year: \(\text{powerUnitsPerHour} \times \text{operatingHoursPerDay} \times \text{workingDaysPerYear} \times \text{powerRatePerUnit}\)
- Manpower cost total year: \(\text{manpowerCount} \times \text{shiftsPerDay} \times \text{workingDaysPerYear} \times \text{manpowerRatePerShift}\)
- Per-piece items at piece scale: value add, packaging, freight out, mould amort, conversion recovery
- Plant-driven per kg costs: `rAndMPerKg`, `otherMfgPerKg`, `plantSgaPerKg`, optional `corpSgaPerKg`
- Conversion cost: sum of power, manpower, value add, packaging, freight out, mould amort, conversion recovery, R&M, other mfg
- Gross margin: \(\text{materialMargin} - \text{conversionCost}\)
- EBITDA: \(\text{grossMargin} - \text{plantSgaCost} - \text{corpSgaCost}\)

### Depreciation, interest, tax, PAT
- Depreciation per year: \(\frac{\text{machineCost}}{\text{usefulLifeMachineYears}} + \frac{\text{mouldCost}}{\text{usefulLifeMouldYears}}\)
- Opening debt: \(\text{debtPct} \times (\text{machineCost} + \text{mouldCost})\)
- Interest (capex): \(\text{openingDebt} \times \text{costOfDebtPct}\) (interest-only in MVP)
- EBIT: \(\text{EBITDA} - \text{depreciation}\)
- PBT: \(\text{EBIT} - \text{interestCapex}\)
- Tax: \(\max(0, \text{PBT}) \times \text{corporateTaxRatePct}\)
- PAT: \(\text{PBT} - \text{tax}\)

### P&L views
- Per kg: divide lines by `weightKg(t)`
- Per piece: divide lines by `volumePieces(t)`
- Rs cr: divide absolute rupees by 1e7 (if desired)

## Working capital and cash flows (case level)
- Net Working Capital: \(\text{NWC}(t) = \frac{\text{workingCapitalDays}}{365} \times \text{revenueNet}(t)\)
- Change in NWC: \(\Delta \text{NWC}(t) = \text{NWC}(t) - \text{NWC}(t-1)\), with \(\text{NWC}(0) = 0\)
- Capex(0): \(\text{machineCost} + \text{mouldCost}\); Capex(t>0)=0 in MVP
- Free Cash Flow: \(\text{FCF}(t) = \text{EBIT}(t) \times (1 - \text{taxRate}) + \text{depreciation}(t) - \Delta \text{NWC}(t) - \text{Capex}(t)\)

## Returns (case level)
- Weights: \(\text{equityPct} = 1 - \text{debtPct}\)
- WACC: \(\text{debtPct} \times \text{costDebt} \times (1 - \text{taxRate}) + \text{equityPct} \times \text{costEquity}\)
- PV: \(\text{PV}(t) = \frac{\text{FCF}(t)}{(1 + \text{WACC})^{t}}\)
- NPV: \(\sum_{t=0}^{5} \text{PV}(t)\)
- IRR: internal rate of return of series [FCF(0), …, FCF(5)]
- Payback: first year where cumulative FCF ≥ 0, with linear interpolation within year
- Net Block: \(\text{capex0} - t \times \text{depreciationPerYear}\) (straight-line; no salvage in MVP)
- RoCE(t): \(\frac{\text{EBIT}(t)}{\text{NetBlock}(t) + \text{NWC}(t)}\)

## Inflation handling summary
- RM and MB inflate by `rmInflationPct` compounding.
- Per-piece and overheads inflate by `conversionInflationPct` compounding.
- If pass-through is On, keep material margin per piece equal to Year 1 by repricing.

## Validation and warnings
- Enforce: weight > 0; volume ≥ 0; percent inputs in [0,1]; useful life ≥ 1
- If both conversion recovery and machine rate are missing → input error
- Capacity utilization warning when planned volume exceeds capacity

## Examples
- A sample scenario is provided at `src/data/examples/veeba.json`.
- To inspect Year 1 outputs via API:
  - `curl -sS http://localhost:3000/api/calc -H 'Content-Type: application/json' -d @src/data/examples/veeba.json | jq '.prices[0], .pnl[0], .returns'`

## Programmatic API
- Endpoint: `POST /api/calc`
- Body: a `Scenario` JSON
- Response: `CalcOutput` including arrays for volumes, prices, pnl, cashflow, and returns

## Testing guidelines
- Unit tests should verify:
  - Price build-up with/without inflation pass-through
  - Conversion recovery computed directly vs from machine rate
  - Depreciation schedules and RoCE denominator (NetBlock + NWC)
  - NPV/IRR/payback across edge cases (e.g., negative early cash flows)

## References
- Business workbook requirements and formula logic: [Spec](https://chatgpt.com/share/68988c4a-a50c-800d-a3d8-dd1fe7cfa356)
- Agentic chat brief (future-facing): [Agent brief](https://chatgpt.com/s/t_689981a7aa788191ad2e245d5f7b2721)


