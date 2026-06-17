import { describe, it, expect } from 'vitest';
import { formatActivityEvent } from './activityLog.utils';
import type { ActivityLogEntry } from './supabase/types';

function makeEntry(overrides: Partial<ActivityLogEntry>): ActivityLogEntry {
  return {
    id: 'test-id',
    organization_id: null,
    actor_id: null,
    event_type: 'gig.status_changed',
    entity_type: 'gig',
    entity_id: 'gig-1',
    gig_id: 'gig-1',
    occurred_at: new Date().toISOString(),
    context: {
      context_version: 1,
      actor_display_name: 'Jane Smith',
      actor_org_name: 'Acme',
    },
    ...overrides,
  } as ActivityLogEntry;
}

describe('formatActivityEvent', () => {
  it('delegates to the registry format function for a known event type', () => {
    const entry = makeEntry({
      event_type: 'gig.status_changed',
      context: {
        context_version: 1,
        actor_display_name: 'Jane',
        actor_org_name: 'Acme',
        from_status: 'Proposed',
        to_status: 'Booked',
      },
    });
    const result = formatActivityEvent(entry);
    expect(result).toContain('Proposed');
    expect(result).toContain('Booked');
  });

  it('returns the raw event_type string for an unknown event type', () => {
    const entry = makeEntry({ event_type: 'unknown.event' });
    const result = formatActivityEvent(entry);
    expect(result).toBe('unknown.event');
  });

  it('formats participant.added events correctly', () => {
    const entry = makeEntry({
      event_type: 'participant.added',
      context: {
        context_version: 1,
        actor_display_name: 'Jane',
        actor_org_name: 'Acme',
        organization_name: 'Bright Lights Co.',
        role: 'Lighting',
      },
    });
    const result = formatActivityEvent(entry);
    expect(result).toContain('Bright Lights Co.');
    expect(result).toContain('Lighting');
  });

  it('formats kit.asset_added events correctly', () => {
    const entry = makeEntry({
      event_type: 'kit.asset_added',
      context: {
        context_version: 1,
        actor_display_name: 'Jane',
        actor_org_name: 'Acme',
        kit_name: 'Small Lighting',
        asset_model: 'LD Moving Head',
        quantity: 4,
      },
    });
    const result = formatActivityEvent(entry);
    expect(result).toContain('4');
    expect(result).toContain('LD Moving Head');
  });
});
