export interface ScheduleTimes {
  start_time: string;
  end_time?: string | null;
}

const ms = (iso: string | null | undefined) => {
  if (!iso) return NaN;
  return new Date(iso).getTime();
};

/**
 * The gig window widened to cover every schedule item (#12): an item before
 * the gig's start moves the start back; an item (or its end) after the gig's
 * end moves the end out. All-day gigs are never changed. Returns null when
 * nothing needs to move.
 */
export function widenGigToSchedule(
  gig: { start: string; end: string },
  entries: readonly ScheduleTimes[],
  allDay: boolean,
): { start: string; end: string } | null {
  if (allDay) return null;
  let start = ms(gig.start);
  let end = ms(gig.end);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  let changed = false;
  for (const e of entries) {
    const s = ms(e.start_time);
    if (Number.isNaN(s)) continue;
    const f = Number.isNaN(ms(e.end_time)) ? s : ms(e.end_time);
    if (s < start) { start = s; changed = true; }
    if (f > end) { end = f; changed = true; }
  }
  return changed ? { start: new Date(start).toISOString(), end: new Date(end).toISOString() } : null;
}
