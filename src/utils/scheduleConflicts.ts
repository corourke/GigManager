import type { GigScheduleEntry } from './supabase/types';

export interface ScheduleConflict {
  entryA: GigScheduleEntry;
  entryB: GigScheduleEntry;
  type: 'act-overlap';
}

export function detectScheduleConflicts(entries: GigScheduleEntry[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const withActAndRange = entries.filter(e => e.act_participant_id && e.start_time && e.end_time);

  for (let i = 0; i < withActAndRange.length; i++) {
    for (let j = i + 1; j < withActAndRange.length; j++) {
      const a = withActAndRange[i];
      const b = withActAndRange[j];

      if (a.act_participant_id !== b.act_participant_id) continue;

      const aStart = new Date(a.start_time).getTime();
      const aEnd = new Date(a.end_time!).getTime();
      const bStart = new Date(b.start_time).getTime();
      const bEnd = new Date(b.end_time!).getTime();

      if (aStart < bEnd && bStart < aEnd) {
        conflicts.push({ entryA: a, entryB: b, type: 'act-overlap' });
      }
    }
  }

  return conflicts;
}
