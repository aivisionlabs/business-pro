// Test script to demonstrate production capacity calculations
// This shows how the formulas work with sample data

function calculateDailyProductionCapacity(cavities, cycleTimeSeconds, oee) {
  // Handle edge case: division by zero
  if (cycleTimeSeconds <= 0) {
    return 0;
  }
  
  // Daily Capacity (in pieces) = (Cavity * 3600 * 24 * OEE) / Cycle Time (in seconds)
  // 3600 seconds per hour * 24 hours per day = 86400 seconds per day
  const dailyCapacity = (cavities * 86400 * oee) / cycleTimeSeconds;
  return dailyCapacity;
}

function calculateUtilizationDays(annualVolume, dailyCapacity) {
  // Utilization Days = Total volume (in pieces) / Daily Capacity (in pieces)
  const utilizationDays = annualVolume / dailyCapacity;
  return utilizationDays;
}

// Sample data from the test case
console.log("=== Production Capacity Calculation Demo ===\n");

const cavities = 4;
const cycleTimeSeconds = 30;
const oee = 0.85;
const annualVolume = 1000000; // 1M pieces

console.log("Input Parameters:");
console.log(`- Cavities: ${cavities}`);
console.log(`- Cycle Time: ${cycleTimeSeconds} seconds`);
console.log(`- OEE: ${oee} (${(oee * 100).toFixed(1)}%)`);
console.log(`- Annual Volume: ${annualVolume.toLocaleString()} pieces\n`);

// Calculate daily capacity
const dailyCapacity = calculateDailyProductionCapacity(cavities, cycleTimeSeconds, oee);
console.log("Daily Production Capacity Calculation:");
console.log(`Formula: (${cavities} × 86400 × ${oee}) ÷ ${cycleTimeSeconds}`);
console.log(`= (${cavities * 86400 * oee}) ÷ ${cycleTimeSeconds}`);
console.log(`= ${dailyCapacity.toFixed(2)} pieces/day\n`);

// Calculate utilization days
const utilizationDays = calculateUtilizationDays(annualVolume, dailyCapacity);
console.log("Utilization Days Calculation:");
console.log(`Formula: ${annualVolume.toLocaleString()} ÷ ${dailyCapacity.toFixed(2)}`);
console.log(`= ${utilizationDays.toFixed(2)} days\n`);

// Show what this means
console.log("Interpretation:");
console.log(`- The machine can produce ${dailyCapacity.toFixed(0)} pieces per day`);
console.log(`- To produce ${annualVolume.toLocaleString()} pieces annually, you need ${utilizationDays.toFixed(1)} days`);
console.log(`- This means the machine will be utilized for ${(utilizationDays / 365 * 100).toFixed(1)}% of the year`);

// Additional examples
console.log("\n=== Additional Examples ===\n");

const examples = [
  { cavities: 6, cycleTime: 45, oee: 0.9, volume: 2000000 },
  { cavities: 2, cycleTime: 60, oee: 0.75, volume: 500000 },
  { cavities: 8, cycleTime: 20, oee: 0.95, volume: 5000000 }
];

examples.forEach((example, index) => {
  const capacity = calculateDailyProductionCapacity(example.cavities, example.cycleTime, example.oee);
  const days = calculateUtilizationDays(example.volume, capacity);
  
  console.log(`Example ${index + 1}:`);
  console.log(`  ${example.cavities} cavities, ${example.cycleTime}s cycle, ${(example.oee * 100).toFixed(0)}% OEE`);
  console.log(`  Daily Capacity: ${capacity.toFixed(0)} pieces/day`);
  console.log(`  Utilization: ${days.toFixed(1)} days (${(days / 365 * 100).toFixed(1)}% of year)\n`);
});
