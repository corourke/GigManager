import { describe, it, expect } from 'vitest';
import { ACTIVITY_EVENTS, CALENDAR_INDICATOR_EVENT_TYPES, type ActivityEventType } from './activityLog.events';

const EXPECTED_EVENT_TYPES: ActivityEventType[] = [
  'gig.status_changed',
  'gig.rescheduled',
  'gig.renamed',
  'participant.added',
  'participant.removed',
  'staffing.updated',
  'staffing.status_changed',
  'kit_assignment.added',
  'kit_assignment.removed',
  'asset.status_changed',
  'kit.asset_added',
  'kit.asset_removed',
];

describe('ACTIVITY_EVENTS', () => {
  it('contains exactly 12 event types', () => {
    expect(Object.keys(ACTIVITY_EVENTS)).toHaveLength(12);
  });

  it('contains all expected event type keys', () => {
    for (const key of EXPECTED_EVENT_TYPES) {
      expect(ACTIVITY_EVENTS).toHaveProperty(key);
    }
  });

  it('every entry has label, entityType, calendarIndicator, contextKeys, and format', () => {
    for (const [key, cfg] of Object.entries(ACTIVITY_EVENTS)) {
      expect(cfg.label, `${key}.label`).toBeTruthy();
      expect(cfg.entityType, `${key}.entityType`).toBeTruthy();
      expect(typeof cfg.calendarIndicator, `${key}.calendarIndicator`).toBe('boolean');
      expect(Array.isArray(cfg.contextKeys), `${key}.contextKeys`).toBe(true);
      expect(typeof cfg.format, `${key}.format`).toBe('function');
    }
  });

  it('staffing.updated format with changes array renders each change', () => {
    const cfg = ACTIVITY_EVENTS['staffing.updated'];
    const ctx = {
      context_version: 1,
      actor_display_name: 'Jane',
      actor_org_name: 'Acme',
      gig_title: 'Test Gig',
      changes: [
        { type: 'slot_added' as const, role: 'Audio Engineer' },
        { type: 'assigned' as const, role: 'Audio Engineer', user_name: 'Bob' },
      ],
      change_count: 2,
    };
    const result = cfg.format(ctx);
    expect(result).toContain('Audio Engineer slot added');
    expect(result).toContain('Bob assigned as Audio Engineer');
  });

  it('staffing.updated format with empty changes returns fallback text', () => {
    const cfg = ACTIVITY_EVENTS['staffing.updated'];
    const result = cfg.format({ context_version: 1, actor_display_name: '', actor_org_name: '' });
    expect(result).toBe('Staffing updated');
  });

  it('gig.status_changed format uses from_status and to_status', () => {
    const cfg = ACTIVITY_EVENTS['gig.status_changed'];
    const result = cfg.format({
      context_version: 1,
      actor_display_name: '',
      actor_org_name: '',
      from_status: 'Proposed',
      to_status: 'Booked',
    });
    expect(result).toContain('Proposed');
    expect(result).toContain('Booked');
  });
});

describe('CALENDAR_INDICATOR_EVENT_TYPES', () => {
  it('contains exactly gig.status_changed and gig.rescheduled', () => {
    expect(CALENDAR_INDICATOR_EVENT_TYPES).toHaveLength(2);
    expect(CALENDAR_INDICATOR_EVENT_TYPES).toContain('gig.status_changed');
    expect(CALENDAR_INDICATOR_EVENT_TYPES).toContain('gig.rescheduled');
  });
});
