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
    const existingOrg = new Map((existingParticipants ?? []).map(p => [p.id, p.organization_id]));
    const incomingIds = participants
      .filter(p => p.id && UUID_REGEX.test(p.id))
      .map(p => p.id!);

    // A participation's organization never changes in place (#175): a row moved to another
    // organization is removed and a new one added.
    const moved = new Set(participants
      .filter(p => p.id && existingOrg.has(p.id) && existingOrg.get(p.id) !== p.organization_id)
      .map(p => p.id!));
    const idsToDelete = existingIds.filter(id => (loadedIds.includes(id) && !incomingIds.includes(id)) || moved.has(id));

    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase.from('gig_participants').delete().in('id', idsToDelete);
      if (deleteError) throw deleteError;
    }

    // Logged once the rows are gone.
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

    const ids: Array<string | undefined> = [];
    for (const participant of participants) {
      const isDbId = participant.id && UUID_REGEX.test(participant.id);
      const changes = {
        role: participant.role,
        notes: participant.notes || null,
        is_client: participant.is_client ?? false,
      };

      if (isDbId && existingIds.includes(participant.id!) && !moved.has(participant.id!)) {
        const { error: updateError } = await supabase.from('gig_participants').update(changes).eq('id', participant.id!);
        if (updateError) throw updateError;
        ids.push(participant.id);
      } else if (participant.organization_id && participant.role) {
        const { data: inserted, error: insertError } = await (supabase.from('gig_participants') as any)
          .insert({ gig_id: gigId, organization_id: participant.organization_id, ...changes })
          .select('id')
          .single();
        if (insertError) throw insertError;
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
 * Sets which organization holds a single-holder role (Venue, Act) on a gig. A participation's
 * organization never changes in place (#175): a new one replaces the old by removing and adding.
 * Every write is checked.
 */
async function setGigRoleOrganization(gigId: string, role: 'Venue' | 'Act', organizationId: string | null) {
  const supabase = getSupabase();
  const { data: existing, error: fetchError } = await supabase.from('gig_participants')
    .select('id, organization_id').eq('gig_id', gigId).eq('role', role).maybeSingle();
  if (fetchError) throw fetchError;
  if (existing && existing.organization_id === organizationId) return;
  if (existing) {
    const { error } = await supabase.from('gig_participants').delete().eq('id', existing.id);
    if (error) throw error;
  }
  if (organizationId) {
    const { error } = await supabase.from('gig_participants').insert({ gig_id: gigId, organization_id: organizationId, role });
    if (error) throw error;
  }
}

/**
 * Update the venue for a gig
 */
export async function updateGigVenue(gigId: string, organizationId: string | null) {
  try {
    await setGigRoleOrganization(gigId, 'Venue', organizationId);
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
  try {
    await setGigRoleOrganization(gigId, 'Act', organizationId);
  } catch (err) {
    return handleApiError(err, 'update gig act');
  }
}
