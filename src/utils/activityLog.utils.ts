import { ACTIVITY_EVENTS, type ActivityEventType } from './activityLog.events';
import type { ActivityLogEntry } from './supabase/types';

export function formatActivityEvent(entry: ActivityLogEntry): string {
  const cfg = ACTIVITY_EVENTS[entry.event_type as ActivityEventType];
  return cfg ? cfg.format(entry.context) : entry.event_type;
}
