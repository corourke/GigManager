import { OrganizationRole } from '../utils/supabase/types';
import { handleApiError } from '../utils/api-error-utils';
import { UUID_REGEX } from '../utils/validation-utils';
import { getCurrentUser, getSupabase } from './base/dataAccess';
import { resolveGigActivityCtx, type GigActivityCtx, type GigActivityCtxInput } from './gigService.shared';
import { logActivity } from './activityLog.service';

/**
 * Gig participant / venue / act operations (Phase 7, Step 4 — extracted from
 * gig.service.ts). gig.service re-exports these for backwards compatibility.
 */

/**
 * Update gig participants.
 *
 * `loadedIds` are the ids of the rows the caller loaded (or last saved). Only
 * those that are no longer in `participants` are deleted: a row someone else
 * added since is left alone, and with no `loadedIds` nothing is deleted
 * (issue #92).
 *
 * Returns `ids`, parallel to `participants`: each row's database id, including
 * the id of any row inserted by this call (undefined for a row that was
 * skipped). Callers that keep editing the same rows (autosave) must write
 * these back, or their next save sends no id and the row is deleted and
 * inserted again (issue #69).
 */
export async function updateGigParticipants(
  gigId: string,
  participants: Array<{
    id?: string;
    organization_id: string;
    role: OrganizationRole;
    notes?: string | null;
    is_client?: boolean;
  }>,
  activityCtx?: GigActivityCtxInput,
  loadedIds: string[] = []
) {
  try {
    const user = await getCurrentUser();
    const supabase = getSupabase();

    const { data: existingParticipants, error: fetchError } = await supabase
      .from('gig_participants')
      .select('id, organization_id, role')
      .eq('gig_id', gigId);

    if (fetchError) throw fetchError;

    // Callers that own the gig-level save (gig.service#updateGig) pass the
    // whole context; others pass just the org they act as, or nothing, and the
    // rest is derived here rather than silently skipping the activity log
    // (issue #55 — adds via this path weren't logged at all).
    // A failed lookup is reported and skips the log; it doesn't fail the save
    // (issue #103 — it used to log against no organization).
    let effectiveCtx: GigActivityCtx | null = null;
    try {
      effectiveCtx = await resolveGigActivityCtx(
        supabase, user, gigId, activityCtx,
        (existingParticipants ?? []).map(p => p.organization_id),
      );
    } catch (e) { console.error('Activity log context lookup failed:', e); }

    const existingIds = (existingParticipants ?? []).map(p => p.id);
    const incomingIds = participants
      .filter(p => p.id && UUID_REGEX.test(p.id))
      .map(p => p.id!);

    const idsToDelete = existingIds.filter(id => loadedIds.includes(id) && !incomingIds.includes(id));

    if (idsToDelete.length > 0 && effectiveCtx) {
      const removedRows = (existingParticipants ?? []).filter(p => idsToDelete.includes(p.id));
      const orgIds = removedRows.map(r => r.organization_id).filter(Boolean);
      let orgNameMap: Map<string, string> = new Map();
      if (orgIds.length > 0) {
        const { data: orgs } = await (supabase.from('organizations') as any).select('id, name').in('id', orgIds);
        orgNameMap = new Map((orgs ?? []).map((o: any) => [o.id, o.name]));
      }
      for (const row of removedRows) {
        try {
          await logActivity({
            organization_id: effectiveCtx.organization_id,
            event_type: 'participant.removed',
            entity_type: 'participant',
            entity_id: row.id,
            gig_id: gigId,
            context: {
              context_version: 1,
              actor_display_name: effectiveCtx.actor_display_name,
              actor_org_name: effectiveCtx.actor_org_name,
              gig_title: effectiveCtx.gig_title,
              organization_name: orgNameMap.get(row.organization_id) ?? '',
              role: row.role
            }
          });
        } catch (e) { console.error('Activity log failed:', e); }
      }
    }

    if (idsToDelete.length > 0) {
      await supabase.from('gig_participants').delete().in('id', idsToDelete);
    }

    const ids: Array<string | undefined> = [];
    for (const participant of participants) {
      const isDbId = participant.id && UUID_REGEX.test(participant.id);
      const participantData = {
        organization_id: participant.organization_id,
        role: participant.role,
        notes: participant.notes || null,
        is_client: participant.is_client ?? false,
      };

      if (isDbId && existingIds.includes(participant.id!)) {
        await supabase.from('gig_participants').update(participantData).eq('id', participant.id!);
        ids.push(participant.id);
      } else if (participant.organization_id && participant.role) {
        const { data: inserted } = await (supabase.from('gig_participants') as any)
          .insert({ gig_id: gigId, ...participantData })
          .select('id')
          .single();
        ids.push(inserted?.id);
        if (inserted?.id && effectiveCtx) {
          const { data: orgRow } = await (supabase.from('organizations') as any).select('name').eq('id', participant.organization_id).single();
          try {
            await logActivity({
              organization_id: effectiveCtx.organization_id,
              event_type: 'participant.added',
              entity_type: 'participant',
              entity_id: inserted.id,
              gig_id: gigId,
              context: {
                context_version: 1,
                actor_display_name: effectiveCtx.actor_display_name,
                actor_org_name: effectiveCtx.actor_org_name,
                gig_title: effectiveCtx.gig_title,
                organization_name: (orgRow as any)?.name ?? '',
                role: participant.role
              }
            });
          } catch (e) { console.error('Activity log failed:', e); }
        }
      } else {
        ids.push(undefined);
      }
    }

    return { success: true, ids };
  } catch (err) {
    return handleApiError(err, 'update gig participants');
  }
}

/**
 * Update the venue for a gig
 */
export async function updateGigVenue(gigId: string, organizationId: string | null) {
  const supabase = getSupabase();
  try {
    if (organizationId) {
      const { data: existing } = await supabase.from('gig_participants').select('id').eq('gig_id', gigId).eq('role', 'Venue').maybeSingle();
      if (existing) {
        await supabase.from('gig_participants').update({ organization_id: organizationId }).eq('id', existing.id);
      } else {
        await supabase.from('gig_participants').insert({ gig_id: gigId, organization_id: organizationId, role: 'Venue' });
      }
    } else {
      await supabase.from('gig_participants').delete().eq('gig_id', gigId).eq('role', 'Venue');
    }
  } catch (err) {
    return handleApiError(err, 'update gig venue');
  }
}

/**
 * Update the act for a gig
 */
export async function getGigParticipants(gigId: string) {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('gig_participants')
      .select('id, role, organization:organization_id(id, name)')
      .eq('gig_id', gigId);

    if (error) throw error;
    return data || [];
  } catch (err) {
    return handleApiError(err, 'fetch gig participants') as never;
  }
}

export async function updateGigAct(gigId: string, organizationId: string | null) {
  const supabase = getSupabase();
  try {
    if (organizationId) {
      const { data: existing } = await supabase.from('gig_participants').select('id').eq('gig_id', gigId).eq('role', 'Act').maybeSingle();
      if (existing) {
        await supabase.from('gig_participants').update({ organization_id: organizationId }).eq('id', existing.id);
      } else {
        await supabase.from('gig_participants').insert({ gig_id: gigId, organization_id: organizationId, role: 'Act' });
      }
    } else {
      await supabase.from('gig_participants').delete().eq('gig_id', gigId).eq('role', 'Act');
    }
  } catch (err) {
    return handleApiError(err, 'update gig act');
  }
}
