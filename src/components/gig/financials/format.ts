import { format, parseISO } from 'date-fns';
import { isDue, outstandingAmount, stageLabel, toDateKey, type MoneyRow } from '../../../utils/moneyFlow';

const SYMBOLS: Record<string, string> = { USD: '$', CAD: 'C$', EUR: '€', GBP: '£' };

export const CURRENCY_OPTIONS = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
];

export function formatMoney(amount: number | string | null | undefined, currency: string = 'USD'): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount ?? 0;
  const value = Number.isFinite(n) ? (n as number) : 0;
  return `${SYMBOLS[currency] ?? '$'}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "Oct 3" for a date-only string or timestamp, read as a calendar date. */
export function formatShort(date: string | null | undefined): string {
  if (!date) return '';
  try {
    return format(parseISO(date.slice(0, 10)), 'MMM d');
  } catch {
    return date;
  }
}

export function formatLong(date: string | null | undefined): string {
  if (!date) return '';
  try {
    return format(parseISO(date.slice(0, 10)), 'MMM d, yyyy');
  } catch {
    return date;
  }
}

type NamedRow = MoneyRow & { description?: string | null; paid_at?: string | null };

/** A row's name in the Financials lists: its description, else Booking (money in) or Expense (money out). */
export function rowName(row: NamedRow): string {
  return row.description || (row.direction === 'out' ? 'Expense' : 'Booking');
}

/** Stage with its timing: "Paid Oct 11", "Accepted, payment due", "Invoiced, due Oct 20". */
export function stageText(row: NamedRow, gigEnd?: string | null): string {
  const label = stageLabel(row.direction, row.stage);
  if (row.stage === 'paid') return row.paid_at ? `${label} ${formatShort(row.paid_at)}` : label;
  if (outstandingAmount(row) > 0) {
    if (row.due_date && row.due_date < toDateKey(new Date())) return `${label}, overdue since ${formatShort(row.due_date)}`;
    if (row.due_date) return `${label}, due ${formatShort(row.due_date)}`;
    if (isDue(row, gigEnd)) return `${label}, payment due`;
  }
  return label;
}
