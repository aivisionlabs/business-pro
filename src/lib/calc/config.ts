/**
 * Central configuration for calculation engine
 */
export const CALCULATION_CONFIG = {
  /** Number of years to calculate for */
  YEARS: 10,
  /** Number of years to display in UI (subset of total years) */
  UI_DISPLAY_YEARS: 5,
} as const;
