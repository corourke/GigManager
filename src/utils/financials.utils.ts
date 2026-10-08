/**
 * Official IRS standard mileage rates (business use), by the date of the trip.
 * Ranges are inclusive calendar dates (YYYY-MM-DD); the last range is open-ended.
 * References:
 * - 2023: 65.5 cents per mile
 * - 2024: 67 cents per mile
 * - 2025: 70 cents per mile
 * - 2026-01-01 to 2026-06-30: 72.5 cents per mile (IR-2025-128)
 * - 2026-07-01 onward: 76 cents per mile (IR-2026-29, mid-year increase)
 */
export const IRS_MILEAGE_RATES: ReadonlyArray<{ from: string; to: string | null; rate: number }> = [
  { from: '2023-01-01', to: '2023-12-31', rate: 0.655 },
  { from: '2024-01-01', to: '2024-12-31', rate: 0.67 },
  { from: '2025-01-01', to: '2025-12-31', rate: 0.70 },
  { from: '2026-01-01', to: '2026-06-30', rate: 0.725 },
  { from: '2026-07-01', to: null, rate: 0.76 },
];

/**
 * Gets the IRS mileage rate for a trip on a calendar date (YYYY-MM-DD).
 * The date is compared as text, never parsed as a UTC instant, so a June 30
 * trip stays in June in every timezone. Before the first range the first rate
 * applies; after the last, the last (open-ended) rate.
 */
export function getMileageRateForDate(date: string): number {
  const day = date.slice(0, 10);
  if (day < IRS_MILEAGE_RATES[0].from) return IRS_MILEAGE_RATES[0].rate;
  const range = IRS_MILEAGE_RATES.find((r) => day >= r.from && (r.to === null || day <= r.to));
  return (range ?? IRS_MILEAGE_RATES[IRS_MILEAGE_RATES.length - 1]).rate;
}

/**
 * Calculates the total mileage expense amount.
 * @param distance Distance in miles
 * @param date Calendar date of the travel (YYYY-MM-DD) to determine rate
 * @returns Total amount in dollars, rounded to the cent (half a cent rounds up)
 */
export function calculateMileageAmount(distance: number, date: string): number {
  const rate = getMileageRateForDate(date);
  // toFixed(6) clears float noise first, so 1 mi x $0.725 rounds to 0.73 as in SQL ROUND().
  return Math.round(Number((distance * rate * 100).toFixed(6))) / 100;
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
