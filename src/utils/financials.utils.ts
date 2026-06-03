/**
 * Official IRS Standard Mileage Rates
 * References:
 * - 2024: 67 cents per mile (Notice 2024-08)
 * - 2025: 67.5 cents per mile (Notice 2024-86)
 * - 2026: 67.5 cents per mile (assuming continuation of 2025 rate until updated)
 */
export const IRS_MILEAGE_RATES: Record<number, number> = {
  2024: 0.67,
  2025: 0.675,
  2026: 0.675,
};

/**
 * Gets the IRS mileage rate for a specific year.
 * Defaults to the latest known rate if the year is not found.
 */
export function getMileageRateForYear(year: number): number {
  if (IRS_MILEAGE_RATES[year]) {
    return IRS_MILEAGE_RATES[year];
  }
  
  const years = Object.keys(IRS_MILEAGE_RATES).map(Number).sort((a, b) => b - a);
  if (year < years[years.length - 1]) {
    return IRS_MILEAGE_RATES[years[years.length - 1]];
  }
  return IRS_MILEAGE_RATES[years[0]];
}

/**
 * Calculates the total mileage expense amount.
 * @param distance Distance in miles
 * @param year Year of the travel to determine rate
 * @returns Total amount in dollars
 */
export function calculateMileageAmount(distance: number, year: number): number {
  const rate = getMileageRateForYear(year);
  return Number((distance * rate).toFixed(2));
}

/**
 * Formats mileage information for the notes field.
 * @param distance Distance in miles
 * @param rate Rate in dollars per mile
 * @returns Formatted string: "X miles @ $Y/mile"
 */
export function formatMileageNotes(distance: number, rate: number): string {
  return `${distance} miles @ $${rate.toFixed(3).replace(/\.?0+$/, '')}/mile`;
}
