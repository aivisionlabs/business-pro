# Risk Analysis User Guide

This guide explains how to use the Risk Analysis features in the Business Pro application, including Sensitivity Analysis and Scenario Modeling.

## Overview

The Risk Analysis module provides two powerful tools for understanding the impact of uncertainty on your business case:

1. **Sensitivity Analysis** - Tests how changes in individual variables affect key metrics
2. **Scenario Modeling** - Compares different business scenarios against your baseline

Both tools are designed as full-page width cards with intuitive configuration options and clear visual outputs.

## Sensitivity Analysis

### What It Does
Sensitivity Analysis helps you identify which variables have the greatest impact on your business case outcomes. It creates a "Tornado Chart" showing the relative importance of different input variables.

### How to Use

#### Step 1: Access the Tool
- Navigate to any business case in the application
- Scroll down to find the "Sensitivity Analysis" card
- The card shows a clean interface with configuration and run options

#### Step 2: Configure Variables
Click the **"Configure Variables"** button to open the configuration panel:

- **Perturbation Range**: Use the slider to set how much each variable will be changed
  - Range: 5% to 30% (default: 10%)
  - Variables will be tested at ±[range]% and ±[range/2]%
  - Example: At 10%, variables are tested at -10%, -5%, +5%, +10%

- **Select Variables**: Choose which variables to analyze by clicking on them
  - **Costing Variables**: Resin cost, labor cost, overhead cost
  - **Sales Variables**: Annual volume, net price per piece
  - **Finance Variables**: Cost of debt, equity contribution

#### Step 3: Run Analysis
- Click **"Run Sensitivity"** to execute the analysis
- The system will calculate the impact of each variable change
- Results are displayed in a Tornado Chart format

#### Step 4: Interpret Results
The results show:
- **Baseline NPV**: Your current business case NPV
- **Tornado Chart**: Variables ranked by impact on NPV
- **Impact Values**: Absolute change in NPV (in Crores) for each variable

**Key Insights:**
- Variables at the top have the greatest impact
- Longer bars indicate higher sensitivity
- Focus risk management efforts on high-impact variables

### Example Use Cases
- **Cost Sensitivity**: Test how resin price changes affect profitability
- **Volume Sensitivity**: Understand impact of demand fluctuations
- **Finance Sensitivity**: Assess debt cost impact on returns

---

## Scenario Modeling

### What It Does
Scenario Modeling allows you to compare different business scenarios against your baseline case. It's perfect for "what-if" analysis and strategic planning.

### How to Use

#### Step 1: Access the Tool
- Find the "Scenario Modeling" card below the Sensitivity Analysis
- The interface shows preset scenarios and custom scenario options

#### Step 2: Configure Scenarios
Click **"Configure Scenarios"** to open the configuration panel:

**Preset Scenarios:**
- **Recession**: Economic downturn with 20% volume reduction
- **High Demand**: Strong growth with 20% volume increase
- **Supply Disruption**: 10% increase in resin costs
- **Price Pressure**: 10% reduction in selling price
- **Cost Inflation**: 15% labor cost increase, 10% overhead increase

**Custom Scenarios:**
- Click **"+ Add Custom"** to create your own scenarios
- Name your scenario and add a description
- Configure specific variable overrides as needed

#### Step 3: Select Scenarios
- Click on scenarios to include/exclude them from analysis
- Selected scenarios show with blue borders and checkmarks
- You can mix preset and custom scenarios

#### Step 4: Run Analysis
- Click **"Run Scenarios"** to execute the comparison
- The system calculates metrics for each scenario
- Results are displayed in a comparison table

#### Step 5: Interpret Results
The results table shows:
- **Baseline**: Your current business case metrics
- **Each Scenario**: NPV, IRR, and PAT Y1 values
- **Change vs Baseline**: Percentage change from baseline
- **Color Coding**: Green for positive changes, red for negative

**Key Metrics:**
- **NPV (Net Present Value)**: Total value of the business case
- **IRR (Internal Rate of Return)**: Annualized return percentage
- **PAT Y1 (Profit After Tax Year 1)**: First-year profitability

### Example Use Cases
- **Market Conditions**: Compare recession vs. growth scenarios
- **Cost Changes**: Test impact of supplier price increases
- **Strategic Options**: Evaluate different pricing strategies
- **Risk Assessment**: Identify worst-case and best-case outcomes

---

## Best Practices

### Sensitivity Analysis
1. **Start with Key Variables**: Focus on variables you can control or monitor
2. **Use Realistic Ranges**: 10-15% is usually sufficient for most analyses
3. **Prioritize by Impact**: Focus risk management on high-sensitivity variables
4. **Regular Updates**: Re-run analysis when input assumptions change

### Scenario Modeling
1. **Define Clear Scenarios**: Each scenario should represent a distinct business condition
2. **Balance Optimism/Pessimism**: Include both positive and negative scenarios
3. **Use Consistent Assumptions**: Ensure scenarios are comparable
4. **Document Assumptions**: Keep track of what each scenario represents

### General Tips
- **Save Important Results**: Take screenshots or notes of key findings
- **Compare with Industry**: Benchmark your sensitivity against industry standards
- **Update Regularly**: Refresh analysis as your business case evolves
- **Share Insights**: Use results to inform decision-making and planning

---

## Technical Details

### Variables Available
The system supports analysis of these variable types:
- **SKU-level variables**: Volume, pricing, costs
- **Plant-level variables**: Labor rates, overhead costs
- **Finance variables**: Debt costs, equity structure

### Calculation Method
- **Sensitivity**: Monte Carlo simulation with specified perturbations
- **Scenarios**: Direct calculation with variable overrides
- **Metrics**: NPV, IRR, P&L measures across 5-year horizon

### Performance
- **Sensitivity Analysis**: Typically completes in 10-30 seconds
- **Scenario Modeling**: Usually completes in 5-15 seconds
- **Results**: Cached for quick viewing and comparison

---

## Troubleshooting

### Common Issues
1. **No Results**: Ensure variables are selected and scenarios are configured
2. **Slow Performance**: Reduce the number of variables or scenarios
3. **Unexpected Results**: Check that variable paths are correct
4. **Calculation Errors**: Verify that all required inputs are provided

### Getting Help
- Check that your business case has complete data
- Ensure all SKUs have valid plant configurations
- Verify that financial parameters are reasonable
- Contact support if issues persist

---

## Advanced Features

### Custom Variable Paths
For advanced users, the system supports custom variable paths:
- Format: `skus.[index].[category].[field]`
- Example: `skus.0.costing.resinRsPerKg`

### Batch Analysis
- Run multiple sensitivity analyses with different configurations
- Compare results across different perturbation ranges
- Export results for external analysis

### Integration
- Results integrate with the main business case view
- Sensitivity insights inform scenario planning
- Scenario results feed into risk assessment reports

---

This Risk Analysis module provides powerful tools for understanding and managing business uncertainty. Use these features to make more informed decisions and build more robust business cases.
