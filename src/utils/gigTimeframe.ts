import { isNoonUTC } from './dateUtils';

interface GigTimeframeFields {
  start: string;
  end?: string | null;
  timezone?: string | null;
}

/** Calendar date (YYYY-MM-DD) of `date` in `timeZone`; browser local when unset or invalid. */
const calendarDate = (date: Date, timeZone?: string | null): string => {
  const format = (tz?: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  try {
    return format(timeZone || undefined);
  } catch {
    return format();
  }
};

/**
 * Whether a gig belongs under Past rather than Upcoming (#74).
 *
 * A gig is past only once its last calendar day is over, in the gig's own
 * timezone. The last day is taken from `end`, or `start` when there's no end.
 * Date-only gigs are stored as noon UTC, so their day is the UTC date.
 */
export const isGigPast = (gig: GigTimeframeFields, now: Date = new Date()): boolean => {
  const last = gig.end || gig.start;
  const lastDay = isNoonUTC(last)
    ? new Date(last).toISOString().slice(0, 10)
    : calendarDate(new Date(last), gig.timezone);
  return lastDay < calendarDate(now, gig.timezone);
};
