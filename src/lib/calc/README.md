# Calculation Engine Architecture

## Overview
This directory contains a unified, clean calculation engine that consolidates all business logic in one place. The previous design was confusing with calculations scattered across multiple files.

## New Clean Structure

### 🎯 **Single Source of Truth: `CalculationEngine`**
- **One file** handles ALL calculations
- **Clear sections** for different calculation domains
- **No duplicate functions** or scattered logic
- **Easy to maintain** and understand

### 📁 **File Organization**

```
src/lib/calc/
├── engines/
│   ├── CalculationEngine.ts     # 🎯 MAIN ENGINE - All calculations here
│   └── index.ts                 # Clean exports
├── utils.ts                     # Essential utilities only
├── index.ts                     # Main calculateScenario function
└── README.md                    # This file
```

## What Was Fixed

### ❌ **Before (Confusing):**
- `pnl-calculations.ts` - Mixed core + aggregated functions
- `price.ts` - Price calculations + weighted averages
- `pnl.ts` - Main P&L but imports from other files
- `utils.ts` - Mixed utilities + business logic
- `capacity.ts` - Simple functions scattered

### ✅ **After (Clean):**
- `CalculationEngine.ts` - **Everything in one place**
- `utils.ts` - **Only essential utilities**
- **Clear separation** of calculation domains
- **No duplicate functions**
- **Single import** for all calculations

## CalculationEngine Sections

### 1. **Volume & Capacity**
- Production capacity calculations
- Volume calculations across years

### 2. **Price Calculations**
- Raw material costs
- Price by year with inflation
- Per-piece to per-kg conversions

### 3. **Core P&L**
- Revenue, costs, margins
- EBITDA, depreciation, EBIT
- Interest, PBT, tax, PAT

### 4. **Cashflow & Returns**
- Working capital, NPV, IRR
- Payback periods, RoCE

### 5. **Aggregated P&L**
- Multi-SKU calculations
- Chart and display data

### 6. **Per-Kg Calculations**
- Weighted averages
- PnlPerKg component data

## Usage

### Simple Import
```typescript
import { CalculationEngine } from '@/lib/calc/engines';

// All calculations available in one place
const volumes = CalculationEngine.calculateVolumes(weight, pieces);
const prices = CalculationEngine.buildPriceByYear(sales, costing, npd, ops);
const pnl = CalculationEngine.calculateAggregatedPnl(calc, scenario);
```

### Benefits
1. **No more confusion** about where calculations live
2. **Single file** to maintain and debug
3. **Clear organization** by calculation domain
4. **Easy to extend** with new calculations
5. **Consistent interface** across all functions

## Migration Path

### Phase 1: ✅ **Complete**
- Created unified `CalculationEngine`
- Consolidated all calculation logic
- Cleaned up utility functions

### Phase 2: 🔄 **In Progress**
- Update components to use new engine
- Remove legacy engine files
- Clean up old calculation files

### Phase 3: 🎯 **Future**
- Single `CalculationEngine` handles everything
- Clean, maintainable codebase
- Easy to understand and extend

## Why This Design is Better

1. **Single Responsibility** - One engine handles all calculations
2. **Clear Organization** - Logical sections for different domains
3. **No Duplication** - Each calculation exists in one place
4. **Easy Maintenance** - One file to update when business logic changes
5. **Better Testing** - All calculations can be tested together
6. **Clearer Dependencies** - Obvious what each calculation needs

This architecture eliminates the confusion of the previous design while maintaining all the existing functionality and formulas.
