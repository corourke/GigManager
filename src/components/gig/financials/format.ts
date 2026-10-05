import { format, parseISO } from 'date-fns';

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
