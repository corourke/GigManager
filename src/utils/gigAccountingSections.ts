import type { GigAccountingSummary } from './supabase/types';
import { toDateKey } from './moneyFlow';

/**
 * The Gig Accounting report's three sections. Every gig lands in exactly one:
 *   needs-attention  money is due now: owed to you past its due date or on a
 *                    gig that is over, or you owe money now; also a completed
 *                    gig with no money in recorded at all
 *   upcoming         money still to come or to pay, not yet due
 *   settled          the gig is over and nothing is outstanding either way
 * A cancelled gig where no money ever moved or was committed is left out.
 */
export type AccountingSectionId = 'needs-attention' | 'upcoming' | 'settled';

export const SECTION_LABELS: Record<AccountingSectionId, string> = {
  'needs-attention': 'Needs attention',
  upcoming: 'Upcoming',
  settled: 'Settled',
};

/** Status text colors: due now (amber), still to come (sky), done (green). */
export const STATUS_TONE: Record<AccountingSectionId, string> = {
  'needs-attention': 'bg-amber-100 text-amber-900',
  upcoming: 'bg-sky-100 text-sky-900',
  settled: 'bg-green-100 text-green-800',
};

export const SECTION_ORDER: AccountingSectionId[] = ['needs-attention', 'upcoming', 'settled'];

export function classifyGig(gig: GigAccountingSummary, now: Date = new Date()): AccountingSectionId | null {
  const nothingMoved =
    gig.contractAmount === 0 && gig.received === 0 && gig.totalCosts === 0 && gig.paymentsToMake === 0;
  if (gig.gigStatus === 'Cancelled' && nothingMoved) return null;

  if (gig.dueRevenue > 0 || gig.paymentsDue > 0) return 'needs-attention';
  if (gig.gigStatus === 'Completed' && gig.contractAmount === 0) return 'needs-attention';

  const over = new Date(gig.gigEnd || gig.gigStart).getTime() < now.getTime();
  if (over && gig.outstandingRevenue === 0 && gig.paymentsToMake === 0) return 'settled';
  return 'upcoming';
}

/** One line on why a gig sits where it does, for the report's Status column. */
export function gigStatusText(gig: GigAccountingSummary): string {
  const parts: string[] = [];
  if (gig.gigStatus === 'Completed' && gig.contractAmount === 0) parts.push('No money in recorded');
  else if (gig.moneyInBadge) parts.push(gig.moneyInBadge.label);
  if (gig.paymentsDue > 0) parts.push(`You owe ${formatWhole(gig.paymentsDue)} now`);
  else if (gig.paymentsToMake > 0) parts.push(`You owe ${formatWhole(gig.paymentsToMake)}`);
  return parts.join(' · ') || 'Nothing recorded';
}

const formatWhole = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

// ─── Timeframe presets (on the gig's start date) ────────────────────────────

export type TimeframePreset = 'last-30' | 'last-90' | 'this-year' | 'last-year' | 'all' | 'custom';

export const TIMEFRAME_PRESETS: { id: TimeframePreset; label: string }[] = [
  { id: 'last-30', label: 'Last 30 days' },
  { id: 'last-90', label: 'Last 90 days' },
  { id: 'this-year', label: 'This year' },
  { id: 'last-year', label: 'Last year' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom' },
];

export const DEFAULT_TIMEFRAME: TimeframePreset = 'this-year';

/** Inclusive YYYY-MM-DD bounds; empty = open. `custom` passes its own bounds through. */
export function timeframeRange(
  preset: TimeframePreset,
  now: Date = new Date(),
  custom: { from: string; to: string } = { from: '', to: '' },
): { from: string; to: string } {
  const daysAgo = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return toDateKey(d);
  };
  const y = now.getFullYear();
  switch (preset) {
    case 'last-30':
      return { from: daysAgo(30), to: toDateKey(now) };
    case 'last-90':
      return { from: daysAgo(90), to: toDateKey(now) };
    case 'this-year':
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case 'last-year':
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    case 'all':
      return { from: '', to: '' };
    case 'custom':
      return custom;
  }
}

/** Whether a gig's start date (as a local calendar date) falls in the range. */
export function inTimeframe(gig: GigAccountingSummary, range: { from: string; to: string }): boolean {
  const day = toDateKey(new Date(gig.gigStart));
  if (range.from && day < range.from) return false;
  if (range.to && day > range.to) return false;
  return true;
}
