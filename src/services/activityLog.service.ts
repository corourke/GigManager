import { createClient } from '../utils/supabase/client';
import { requireAuth } from '../utils/supabase/auth-utils';
import { handleApiError } from '../utils/api-error-utils';
import type { ActivityEventType } from '../utils/activityLog.events';
import type { ActivityLogContext, ActivityLogEntry } from '../utils/supabase/types';

export async function logActivity(entry: {
  organization_id: string | null;
  event_type: ActivityEventType;
  entity_type: string;
  entity_id: string;
  gig_id?: string | null;
  context: ActivityLogContext;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('log_activity', {
    p_organization_id: entry.organization_id,
    p_event_type: entry.event_type,
    p_entity_type: entry.entity_type,
    p_entity_id: entry.entity_id,
    p_gig_id: entry.gig_id ?? null,
    p_context: entry.context as any,
  });
  if (error) throw error;
}

export async function getRecentActivity(options?: {
  limit?: number;
  daysCutoff?: number;
  eventTypes?: ActivityEventType[];
}): Promise<ActivityLogEntry[]> {
  try {
    const { supabase } = await requireAuth();
    const limit = options?.limit ?? 50;
    const daysCutoff = options?.daysCutoff ?? 30;
    const cutoffDate = new Date(Date.now() - daysCutoff * 24 * 60 * 60 * 1000).toISOString();

    let query = (supabase.from('activity_log') as any)
      .select('*')
      .gte('occurred_at', cutoffDate)
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (options?.eventTypes && options.eventTypes.length > 0) {
      query = query.in('event_type', options.eventTypes);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as ActivityLogEntry[];
  } catch (err) {
    return handleApiError(err, 'fetch recent activity') as any;
  }
}

export async function getEntityActivity(
  entityType: string,
  entityId: string
): Promise<ActivityLogEntry[]> {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await (supabase.from('activity_log') as any)
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('occurred_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ActivityLogEntry[];
  } catch (err) {
    return handleApiError(err, 'fetch entity activity') as any;
  }
}

export async function getGigActivity(gigId: string): Promise<ActivityLogEntry[]> {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await (supabase.from('activity_log') as any)
      .select('*')
      .eq('gig_id', gigId)
      .order('occurred_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ActivityLogEntry[];
  } catch (err) {
    return handleApiError(err, 'fetch gig activity') as any;
  }
}
