import { describe, it, expect } from 'vitest';
import { ACTIVITY_EVENTS, CALENDAR_INDICATOR_EVENT_TYPES, type ActivityEventType } from './activityLog.events';

const EXPECTED_EVENT_TYPES: ActivityEventType[] = [
  'gig.created',
  'gig.notes_updated',
  'gig.status_changed',
  'gig.rescheduled',
  'gig.renamed',
  'participant.added',
  'participant.removed',
  'staffing.updated',
  'staffing.status_changed',
  'kit_assignment.added',
  'kit_assignment.removed',
  'asset.created',
  'asset.updated',
  'asset.status_changed',
  'kit.created',
  'kit.updated',
  'kit.asset_added',
  'kit.asset_removed',
  'financial.added',
  'schedule_entry.added',
];

describe('ACTIVITY_EVENTS', () => {
  it('contains exactly 22 event types', () => {
    expect(Object.keys(ACTIVITY_EVENTS)).toHaveLength(22);
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

  it('financial.added format renders each added record', () => {
    const cfg = ACTIVITY_EVENTS['financial.added'];
    const result = cfg.format({
      context_version: 1,
      actor_display_name: '',
      actor_org_name: '',
      financial_changes: [{ amount: 250, fin_type: 'Expense Incurred' }],
      change_count: 1,
    });
    expect(result).toBe('Added Expense Incurred: $250.00');
  });

  it('financial.added format with no changes returns fallback text', () => {
    const cfg = ACTIVITY_EVENTS['financial.added'];
    expect(cfg.format({ context_version: 1, actor_display_name: '', actor_org_name: '' })).toBe('Financial record added');
  });

  it('schedule_entry.added format renders each added entry', () => {
    const cfg = ACTIVITY_EVENTS['schedule_entry.added'];
    const result = cfg.format({
      context_version: 1,
      actor_display_name: '',
      actor_org_name: '',
      schedule_changes: [{ activity_type: 'Load-in', label: null, start_time: '2026-09-20T14:00:00.000Z' }],
      change_count: 1,
    });
    expect(result).toContain('Load-in at');
    expect(result).toContain('20 Sep 2026');
  });

  it('schedule_entry.added format with no changes returns fallback text', () => {
    const cfg = ACTIVITY_EVENTS['schedule_entry.added'];
    expect(cfg.format({ context_version: 1, actor_display_name: '', actor_org_name: '' })).toBe('Schedule entry added');
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

  it('gig.created format returns "Gig created"', () => {
    const cfg = ACTIVITY_EVENTS['gig.created' as ActivityEventType];
    expect(cfg.format({ context_version: 1, actor_display_name: '', actor_org_name: '' })).toBe('Gig created');
  });

  it('gig.notes_updated format returns "Gig notes updated"', () => {
    const cfg = ACTIVITY_EVENTS['gig.notes_updated' as ActivityEventType];
    expect(cfg.format({ context_version: 1, actor_display_name: '', actor_org_name: '' })).toBe('Gig notes updated');
  });

  it('asset.created format returns "Asset created"', () => {
    const cfg = ACTIVITY_EVENTS['asset.created' as ActivityEventType];
    expect(cfg.format({ context_version: 1, actor_display_name: '', actor_org_name: '' })).toBe('Asset created');
  });

  it('asset.updated format with field_changes renders human-readable fields', () => {
    const cfg = ACTIVITY_EVENTS['asset.updated'];
    const result = cfg.format({
      context_version: 1,
      actor_display_name: '',
      actor_org_name: '',
      field_changes: [
        { field: 'manufacturer_model', from: 'A', to: 'B' },
        { field: 'category', from: 'C', to: 'D' },
      ],
    });
    expect(result).toBe('Asset updated: Model, Category');
  });

  it('asset.updated format with empty field_changes returns fallback', () => {
    const cfg = ACTIVITY_EVENTS['asset.updated'];
    expect(cfg.format({ context_version: 1, actor_display_name: '', actor_org_name: '' })).toBe('Asset updated');
  });

  it('kit.created format returns "Kit created"', () => {
    const cfg = ACTIVITY_EVENTS['kit.created' as ActivityEventType];
    expect(cfg.format({ context_version: 1, actor_display_name: '', actor_org_name: '' })).toBe('Kit created');
  });

  it('kit.updated format with field_changes renders human-readable fields', () => {
    const cfg = ACTIVITY_EVENTS['kit.updated'];
    const result = cfg.format({
      context_version: 1,
      actor_display_name: '',
      actor_org_name: '',
      field_changes: [
        { field: 'name', from: 'A', to: 'B' },
        { field: 'rental_value', from: 0, to: 100 },
      ],
    });
    expect(result).toBe('Kit updated: Name, Rental Value');
  });

  it('kit.updated format with empty field_changes returns fallback', () => {
    const cfg = ACTIVITY_EVENTS['kit.updated'];
    expect(cfg.format({ context_version: 1, actor_display_name: '', actor_org_name: '' })).toBe('Kit updated');
  });
});

describe('CALENDAR_INDICATOR_EVENT_TYPES', () => {
  it('contains exactly gig.status_changed and gig.rescheduled', () => {
    expect(CALENDAR_INDICATOR_EVENT_TYPES).toHaveLength(2);
    expect(CALENDAR_INDICATOR_EVENT_TYPES).toContain('gig.status_changed');
    expect(CALENDAR_INDICATOR_EVENT_TYPES).toContain('gig.rescheduled');
  });
});
