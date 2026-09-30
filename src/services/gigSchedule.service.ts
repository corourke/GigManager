import { handleApiError } from '../utils/api-error-utils';
import { requireAuth } from '../utils/supabase/auth-utils';
import { getSupabase, resolveGigActivityCtx, type GigActivityCtxInput } from './gigService.shared';
import { logActivity } from './activityLog.service';
import type { GigScheduleEntry, ScheduleChange } from '../utils/supabase/types';

/**
 * Fetch schedule entries for a gig, with joined act participant data.
 */
export async function getGigScheduleEntries(gigId: string): Promise<GigScheduleEntry[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('gig_schedule_entries')
      .select(`
        *,
        act_participant:act_participant_id(
          id,
          role,
          organization:organization_id(id, name)
        )
      `)
      .eq('gig_id', gigId)
      .order('sort_order', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return (data || []) as unknown as GigScheduleEntry[];
  } catch (err) {
    return handleApiError(err, 'fetch schedule entries') as never;
  }
}

/**
 * Full-replace update for schedule entries on a gig.
 * Entries with existing IDs are updated, entries without IDs are inserted,
 * entries in the DB but not in the payload are deleted.
 */
export async function updateGigScheduleEntries(
  gigId: string,
  entries: Array<Partial<GigScheduleEntry>>,
  activityCtx?: GigActivityCtxInput
): Promise<void> {
  try {
    const { supabase, user } = await requireAuth();

    const { data: existing } = await supabase
      .from('gig_schedule_entries')
      .select('id')
      .eq('gig_id', gigId);

    const existingIds = existing?.map(e => e.id) || [];
    const incomingIds = entries.filter(e => e.id).map(e => e.id!);

    const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));
    if (idsToDelete.length > 0) {
      await supabase.from('gig_schedule_entries').delete().in('id', idsToDelete);
    }

    const now = new Date().toISOString();

    const toUpsert = entries
      .filter(e => e.id && existingIds.includes(e.id))
      .map(e => ({
        id: e.id!,
        gig_id: gigId,
        activity_type: e.activity_type!,
        label: e.label || null,
        start_time: e.start_time!,
        end_time: e.end_time || null,
        act_participant_id: e.act_participant_id || null,
        sort_order: entries.indexOf(e),
        notes: e.notes || null,
        updated_at: now,
      }));

    const toInsert = entries
      .filter(e => !e.id || !existingIds.includes(e.id))
      .map(e => ({
        gig_id: gigId,
        activity_type: e.activity_type!,
        label: e.label || null,
        start_time: e.start_time!,
        end_time: e.end_time || null,
        act_participant_id: e.act_participant_id || null,
        sort_order: entries.indexOf(e),
        notes: e.notes || null,
        updated_at: now,
      }));

    if (toUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from('gig_schedule_entries')
        .upsert(toUpsert, { onConflict: 'id' });
      if (upsertError) throw upsertError;
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('gig_schedule_entries')
        .insert(toInsert);
      if (insertError) throw insertError;

      try {
        const scheduleChanges: ScheduleChange[] = toInsert.map(e => ({
          activity_type: e.activity_type,
          label: e.label,
          start_time: e.start_time,
        }));
        // Throws on a failed lookup, which the catch below reports (issue #103).
        const ctx = await resolveGigActivityCtx(supabase, user, gigId, activityCtx);
        await logActivity({
          organization_id: ctx.organization_id,
          event_type: 'schedule_entry.added',
          entity_type: 'schedule_entry',
          entity_id: gigId,
          gig_id: gigId,
          context: {
            context_version: 1,
            actor_display_name: ctx.actor_display_name,
            actor_org_name: ctx.actor_org_name,
            gig_title: ctx.gig_title,
            schedule_changes: scheduleChanges,
            change_count: scheduleChanges.length
          }
        });
      } catch (e) { console.error('Activity log failed:', e); }
    }
  } catch (err) {
    return handleApiError(err, 'update schedule entries') as never;
  }
}

/**
 * Duplicate schedule entries from one gig to another, remapping act participant references.
 */
export async function duplicateGigScheduleEntries(
  sourceGigId: string,
  targetGigId: string,
  participantIdMap: Map<string, string>,
  dateOffsetMs: number = 0
): Promise<void> {
  const supabase = getSupabase();
  try {
    const { data: entries, error } = await supabase
      .from('gig_schedule_entries')
      .select('*')
      .eq('gig_id', sourceGigId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    if (!entries || entries.length === 0) return;

    const newEntries = entries.map(entry => {
      const newStart = dateOffsetMs
        ? new Date(new Date(entry.start_time).getTime() + dateOffsetMs).toISOString()
        : entry.start_time;
      return {
        gig_id: targetGigId,
        activity_type: entry.activity_type,
        label: entry.label,
        start_time: newStart,
        end_time: entry.end_time
          ? (dateOffsetMs
              ? new Date(new Date(entry.end_time).getTime() + dateOffsetMs).toISOString()
              : entry.end_time)
          : null,
        act_participant_id: entry.act_participant_id
          ? participantIdMap.get(entry.act_participant_id) || null
          : null,
        sort_order: entry.sort_order,
        notes: entry.notes,
      };
    });

    const { error: insertError } = await supabase
      .from('gig_schedule_entries')
      .insert(newEntries);

    if (insertError) throw insertError;
  } catch (err) {
    return handleApiError(err, 'duplicate schedule entries') as never;
  }
}
