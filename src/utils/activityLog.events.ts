import type { ActivityLogContext } from './supabase/types';
import { format } from 'date-fns';

interface EventTypeConfig {
  label: string;
  entityType: string;
  calendarIndicator: boolean;
  contextKeys: (keyof ActivityLogContext)[];
  format: (ctx: ActivityLogContext) => string;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '?';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy HH:mm');
  } catch {
    return dateStr;
  }
}

export const ACTIVITY_EVENTS = {
  'gig.status_changed': {
    label: 'Status Changed',
    entityType: 'gig',
    calendarIndicator: true,
    contextKeys: ['gig_title', 'from_status', 'to_status'],
    format: (ctx) => `Status changed from ${ctx.from_status} to ${ctx.to_status}`,
  },
  'gig.rescheduled': {
    label: 'Rescheduled',
    entityType: 'gig',
    calendarIndicator: true,
    contextKeys: ['gig_title', 'from', 'to'],
    format: (ctx) =>
      `Rescheduled from ${formatDate(ctx.from?.start)} to ${formatDate(ctx.to?.start)}`,
  },
  'gig.renamed': {
    label: 'Renamed',
    entityType: 'gig',
    calendarIndicator: false,
    contextKeys: ['from_title', 'to_title'],
    format: (ctx) => `Renamed from '${ctx.from_title}' to '${ctx.to_title}'`,
  },
  'participant.added': {
    label: 'Participant Added',
    entityType: 'participant',
    calendarIndicator: false,
    contextKeys: ['gig_title', 'organization_name', 'role'],
    format: (ctx) => `${ctx.organization_name} added as ${ctx.role} participant`,
  },
  'participant.removed': {
    label: 'Participant Removed',
    entityType: 'participant',
    calendarIndicator: false,
    contextKeys: ['gig_title', 'organization_name', 'role'],
    format: (ctx) => `${ctx.organization_name} removed as ${ctx.role} participant`,
  },
  'staffing.updated': {
    label: 'Staffing Updated',
    entityType: 'staffing',
    calendarIndicator: false,
    contextKeys: ['gig_title', 'changes', 'change_count'],
    format: (ctx) => {
      if (!ctx.changes?.length) return 'Staffing updated';
      const summary = ctx.changes
        .map((c) => {
          if (c.type === 'slot_added') return `${c.role} slot added`;
          if (c.type === 'slot_removed') return `${c.role} slot removed`;
          if (c.type === 'assigned') return `${c.user_name} assigned as ${c.role}`;
          if (c.type === 'unassigned') return `${c.user_name} unassigned from ${c.role}`;
          return c.type;
        })
        .join('; ');
      return `Staffing updated: ${summary}`;
    },
  },
  'staffing.status_changed': {
    label: 'Staffing Status Changed',
    entityType: 'staffing',
    calendarIndicator: false,
    contextKeys: ['gig_title', 'user_name', 'role', 'from_status', 'to_status'],
    format: (ctx) =>
      `${ctx.user_name}'s ${ctx.role} status changed from ${ctx.from_status} to ${ctx.to_status}`,
  },
  'kit_assignment.added': {
    label: 'Kit Assigned',
    entityType: 'kit_assignment',
    calendarIndicator: false,
    contextKeys: ['gig_title', 'kit_name'],
    format: (ctx) => `${ctx.kit_name} kit assigned`,
  },
  'kit_assignment.removed': {
    label: 'Kit Removed',
    entityType: 'kit_assignment',
    calendarIndicator: false,
    contextKeys: ['gig_title', 'kit_name'],
    format: (ctx) => `${ctx.kit_name} kit removed`,
  },
  'asset.status_changed': {
    label: 'Asset Status Changed',
    entityType: 'asset',
    calendarIndicator: false,
    contextKeys: ['asset_model', 'category', 'from_status', 'to_status'],
    format: (ctx) => `Status changed from ${ctx.from_status} to ${ctx.to_status}`,
  },
  'kit.asset_added': {
    label: 'Asset Added to Kit',
    entityType: 'kit',
    calendarIndicator: false,
    contextKeys: ['kit_name', 'asset_model', 'quantity'],
    format: (ctx) => `${ctx.quantity}× ${ctx.asset_model} added to kit`,
  },
  'kit.asset_removed': {
    label: 'Asset Removed from Kit',
    entityType: 'kit',
    calendarIndicator: false,
    contextKeys: ['kit_name', 'asset_model'],
    format: (ctx) => `${ctx.asset_model} removed from kit`,
  },
} as const satisfies Record<string, EventTypeConfig>;

export type ActivityEventType = keyof typeof ACTIVITY_EVENTS;

export const CALENDAR_INDICATOR_EVENT_TYPES: ActivityEventType[] = Object.entries(ACTIVITY_EVENTS)
  .filter(([, cfg]) => cfg.calendarIndicator)
  .map(([type]) => type as ActivityEventType);
