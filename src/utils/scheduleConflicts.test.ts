import { describe, it, expect } from 'vitest';
import { detectScheduleConflicts } from './scheduleConflicts';
import type { GigScheduleEntry } from './supabase/types';

function makeEntry(overrides: Partial<GigScheduleEntry> & { start_time: string; end_time: string }): GigScheduleEntry {
  return {
    id: crypto.randomUUID(),
    gig_id: 'gig-1',
    activity_type: 'Set',
    label: null,
    sort_order: 0,
    notes: null,
    act_participant_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('detectScheduleConflicts', () => {
  it('returns no conflicts when entries do not overlap', () => {
    const entries = [
      makeEntry({ start_time: '2026-06-20T18:00:00Z', end_time: '2026-06-20T19:00:00Z', act_participant_id: 'act-1' }),
      makeEntry({ start_time: '2026-06-20T19:00:00Z', end_time: '2026-06-20T20:00:00Z', act_participant_id: 'act-1' }),
    ];
    expect(detectScheduleConflicts(entries)).toEqual([]);
  });

  it('detects overlap for the same act', () => {
    const entries = [
      makeEntry({ start_time: '2026-06-20T18:00:00Z', end_time: '2026-06-20T19:30:00Z', act_participant_id: 'act-1' }),
      makeEntry({ start_time: '2026-06-20T19:00:00Z', end_time: '2026-06-20T20:00:00Z', act_participant_id: 'act-1' }),
    ];
    const conflicts = detectScheduleConflicts(entries);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe('act-overlap');
  });

  it('does not report false positive for different acts at same time', () => {
    const entries = [
      makeEntry({ start_time: '2026-06-20T18:00:00Z', end_time: '2026-06-20T19:00:00Z', act_participant_id: 'act-1' }),
      makeEntry({ start_time: '2026-06-20T18:00:00Z', end_time: '2026-06-20T19:00:00Z', act_participant_id: 'act-2' }),
    ];
    expect(detectScheduleConflicts(entries)).toEqual([]);
  });

  it('adjacent entries (end === start) are not conflicts', () => {
    const entries = [
      makeEntry({ start_time: '2026-06-20T18:00:00Z', end_time: '2026-06-20T19:00:00Z', act_participant_id: 'act-1' }),
      makeEntry({ start_time: '2026-06-20T19:00:00Z', end_time: '2026-06-20T20:00:00Z', act_participant_id: 'act-1' }),
    ];
    expect(detectScheduleConflicts(entries)).toEqual([]);
  });

  it('excludes entries without act_participant_id from act-overlap detection', () => {
    const entries = [
      makeEntry({ start_time: '2026-06-20T18:00:00Z', end_time: '2026-06-20T20:00:00Z', act_participant_id: null }),
      makeEntry({ start_time: '2026-06-20T18:00:00Z', end_time: '2026-06-20T20:00:00Z', act_participant_id: null }),
    ];
    expect(detectScheduleConflicts(entries)).toEqual([]);
  });

  it('detects multiple conflicts across entries', () => {
    const entries = [
      makeEntry({ start_time: '2026-06-20T18:00:00Z', end_time: '2026-06-20T19:00:00Z', act_participant_id: 'act-1' }),
      makeEntry({ start_time: '2026-06-20T18:30:00Z', end_time: '2026-06-20T19:30:00Z', act_participant_id: 'act-1' }),
      makeEntry({ start_time: '2026-06-20T18:45:00Z', end_time: '2026-06-20T19:15:00Z', act_participant_id: 'act-1' }),
    ];
    const conflicts = detectScheduleConflicts(entries);
    expect(conflicts).toHaveLength(3);
  });
});
