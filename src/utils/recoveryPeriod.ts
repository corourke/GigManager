/**
 * Tax recovery period of depreciated equipment (#125): 5, 7 or 15 years, stored
 * on the equipment record (`assets.recovery_period`). Only depreciated equipment
 * has one. An equipment category can imply one (`default_recovery_period`); when
 * it doesn't, the user is asked. See docs/technical/financials.md §3.
 */

export type RecoveryPeriod = 5 | 7 | 15;

export const RECOVERY_PERIODS: { value: RecoveryPeriod; label: string; examples: string }[] = [
  { value: 5, label: '5-year', examples: 'Computers and peripherals, phones, tablets, office machines' },
  { value: 7, label: '7-year', examples: 'Most production gear: audio, lighting, video, rigging, cases, tools, furniture' },
  { value: 15, label: '15-year', examples: 'Build-out of a leased shop or studio (not the gear in it)' },
];

export function asRecoveryPeriod(v: unknown): RecoveryPeriod | null {
  const n = Number(v);
  return n === 5 || n === 7 || n === 15 ? n : null;
}

export function recoveryPeriodLabel(v: unknown): string {
  const p = asRecoveryPeriod(v);
  return p ? `${p}-year` : '';
}

/** Category name (any case) → its default period, as loaded from equipment_categories. */
export type CategoryPeriods = Record<string, RecoveryPeriod | null>;

export function categoryPeriod(periods: CategoryPeriods, category: string | null | undefined): RecoveryPeriod | null {
  if (!category) return null;
  return periods[category.trim().toLowerCase()] ?? null;
}

/** The period depreciated equipment gets: the one chosen, else its category's default, else none (ask). */
export function effectiveRecoveryPeriod(
  chosen: unknown,
  periods: CategoryPeriods,
  category: string | null | undefined,
): RecoveryPeriod | null {
  return asRecoveryPeriod(chosen) ?? categoryPeriod(periods, category);
}
