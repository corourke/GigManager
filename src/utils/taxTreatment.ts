/**
 * A purchase line's tax treatment (#133): expensed in the year bought, or
 * depreciated over a recovery period. Independent of whether the line is
 * tracked as equipment, except that a depreciated line always is.
 * See docs/technical/financials.md §3.
 */

export type TaxTreatment = 'expense' | 'depreciate';

/** Per-item cost below this is expensed. */
export const TAX_EXPENSE_BELOW = 200;
/** Per-item cost above this is depreciated. In between is the user's call. */
export const TAX_DEPRECIATE_ABOVE = 2500;

/** The question, in Cameron's words, shown behind the (?) next to the choice. */
export const TAX_TREATMENT_HELP =
  'For tax purposes, do you want to mark this item as an expense, or a depreciable asset. ' +
  '(Per-item cost of less than $200 should automatically be expensed. Any item over $2500 should be depreciated. ' +
  'From $200 to $2500 is a grey zone.)';

/**
 * The pre-set for a line, from its per-item cost (after tax and shipping):
 * expense under $200, depreciate over $2,500, and null in between — the user
 * chooses. Never forced: the user can change it until the year is filed.
 */
export function suggestedTaxTreatment(itemCost: number): TaxTreatment | null {
  if (itemCost < TAX_EXPENSE_BELOW) return 'expense';
  if (itemCost > TAX_DEPRECIATE_ABOVE) return 'depreciate';
  return null;
}

export function taxTreatmentLabel(t: TaxTreatment | null | undefined): string {
  if (t === 'expense') return 'Expense';
  if (t === 'depreciate') return 'Depreciate';
  return 'Choose';
}

/** Whether a purchase date falls in a filed (locked) tax year. */
export function isTaxYearLocked(date: string | null | undefined, lockedYears: Set<number>): boolean {
  if (!date) return false;
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) && lockedYears.has(year);
}

/**
 * A purchase line's treatment as stored, or — for rows written before #133 —
 * taken from its row type. Null for headers.
 */
export function lineTaxTreatment(p: { row_type?: string | null; tax_treatment?: string | null }): TaxTreatment | null {
  if (p.row_type === 'header') return null;
  if (p.tax_treatment === 'expense' || p.tax_treatment === 'depreciate') return p.tax_treatment;
  return p.row_type === 'asset' ? 'depreciate' : 'expense';
}
