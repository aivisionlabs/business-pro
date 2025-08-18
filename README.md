# BusinessCase Pro - Multi-SKU Financial Analysis Platform

A comprehensive business analysis platform for plastic packaging pricing and returns, featuring multi-SKU support and advanced what-if analysis capabilities.

## Features

### Core Business Analysis
- **Multi-SKU Support**: Manage and analyze business cases with multiple SKUs
- **Financial Calculations**: P&L, NPV, IRR, cash flows, and returns analysis
- **Plant Management**: Plant-specific costing and efficiency metrics
- **Scenario Management**: Save, load, and compare business scenarios

### Advanced What-If Analysis Tools
- **Volume Change Analysis**: Analyze impact of volume changes on profitability
- **Pricing Change Analysis**: Understand impact of pricing/costing parameter changes
- **Plant Change Analysis**: Evaluate moving SKUs between different plants
- **Sensitivity Analysis**: Identify key drivers and their impact on business metrics
- **Optimization Analysis**: Find optimal parameter combinations for business objectives
- **Scenario Comparison**: Compare multiple modified scenarios side-by-side
- **Risk Assessment**: Assess business case risks and provide mitigation strategies
- **Portfolio Reports**: Generate comprehensive business case analysis reports

## Quick Start

### 1. Setup
```bash
npm install
npm run dev
```

### 2. Access the Platform
- **Main Chat**: `/chat` - General business analysis questions
- **Case Management**: `/cases` - View and manage business cases
- **Case Analysis**: `/cases/[id]` - Edit and analyze specific cases
- **Case Chat**: `/cases/[id]/chat` - Chat about specific business cases

### 3. Test All Tools
Use the **🧪 Run Tool Eval** button in any chat interface to test all available analysis tools with a sample scenario.

## Tool Evaluation

The platform includes a comprehensive evaluation system that tests all tools:

### API Endpoint
- **GET** `/api/agent/eval` - Runs all tools with sample data

### What Gets Tested
1. **Basic Calculations**: `calculateScenario`
2. **Data Access**: `getPlantMaster` (all plants + specific plant)
3. **Volume Analysis**: `analyzeVolumeChange` (50% reduction)
4. **Pricing Analysis**: `analyzePricingChange` (conversion recovery change)
5. **Plant Analysis**: `analyzePlantChange` (move SKU to different plant)
6. **Portfolio Reports**: `generatePortfolioReport` (summary with SKUs)
7. **Sensitivity Analysis**: `sensitivityAnalysis` (resin price sensitivity)
8. **Optimization**: `optimizationAnalysis` (maximize NPV)
9. **Scenario Comparison**: `compareScenarios` (volume vs plant changes)
10. **Risk Assessment**: `riskAssessment` (material price + demand risks)

### Example Questions You Can Ask

#### Volume & Pricing Changes
- "What happens if SKU3 volumes reduce by half?"
- "What's the impact of doubling conversion recovery for SKU2?"
- "How does a 15% increase in resin prices affect profitability?"

#### Plant & Operational Changes
- "What happens if we move SKU2 to Plant B?"
- "How does changing from 2 shifts to 3 shifts affect costs?"

#### Strategic Analysis
- "Which factors are most sensitive to changes in our business case?"
- "What's the optimal resin price to maximize IRR?"
- "Compare our current strategy with a 20% volume increase scenario"
- "What are the main risks to our business plan and how can we mitigate them?"

## Architecture

### Data Structure
- **BusinessCase**: Container for multiple SKUs with shared finance parameters
- **SKU**: Individual product with sales, NPD, ops, costing, and capex data
- **PlantMaster**: Plant-specific configuration and cost parameters

### Calculation Engine
- **Per-SKU Calculations**: Individual SKU financial metrics
- **Aggregated Results**: Portfolio-level financial performance
- **Weighted Averages**: Cross-SKU metrics using volume weights

### Tool System
- **Deterministic Tools**: All calculations use actual business logic
- **What-If Analysis**: Scenario modification and comparison
- **Strategic Tools**: Optimization, sensitivity, and risk analysis

## Development

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

### Key Files
- `src/app/api/agent/route.ts` - Main agent API with all tools
- `src/app/api/agent/eval/route.ts` - Tool evaluation endpoint
- `src/components/AgentChat.tsx` - Chat interface with eval button
- `src/lib/calc/` - Calculation engine
- `src/lib/types.ts` - Type definitions

## Business Value

- **Immediate Impact Analysis**: Quickly see financial impact of changes
- **Data-Driven Decisions**: All calculations use actual business logic
- **Strategic Planning**: Advanced tools help with optimization and risk management
- **User Experience**: Intuitive SKU names make system accessible to business users
- **Comprehensive Analysis**: Multiple perspectives (Revenue, EBITDA, NPV, IRR)

## Next Steps

The platform is ready for business users to:
1. **Start Using**: Ask what-if questions through the chat interface
2. **Test Scenarios**: Try different business scenarios and see their financial impact
3. **Strategic Planning**: Use advanced tools for portfolio optimization and risk assessment
4. **Further Enhancements**: Add more specific business logic or additional analysis tools as needed
