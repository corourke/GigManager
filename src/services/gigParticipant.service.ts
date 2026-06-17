import { OrganizationRole } from '../utils/supabase/types';
import { handleApiError } from '../utils/api-error-utils';
import { requireAuth } from '../utils/supabase/auth-utils';
import { UUID_REGEX } from '../utils/validation-utils';
import { getSupabase } from './gigService.shared';

/**
 * Gig participant / venue / act operations (Phase 7, Step 4 — extracted from
 * gig.service.ts). gig.service re-exports these for backwards compatibility.
 */

/**
 * Update gig participants
 */
export async function updateGigParticipants(gigId: string, participants: Array<{
  id?: string;
  organization_id: string;
  role: OrganizationRole;
  notes?: string | null;
}>) {
  try {
    const { supabase } = await requireAuth();

    const { data: existingParticipants, error: fetchError } = await supabase
      .from('gig_participants')
      .select('id')
      .eq('gig_id', gigId);

    if (fetchError) throw fetchError;

    const existingIds = existingParticipants?.map(p => p.id) || [];
    const incomingIds = participants
      .filter(p => p.id && UUID_REGEX.test(p.id))
      .map(p => p.id!);

    const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));
    if (idsToDelete.length > 0) {
      await supabase.from('gig_participants').delete().in('id', idsToDelete);
    }

    for (const participant of participants) {
      const isDbId = participant.id && UUID_REGEX.test(participant.id);
      const participantData = {
        organization_id: participant.organization_id,
        role: participant.role,
        notes: participant.notes || null,
      };

      if (isDbId && existingIds.includes(participant.id!)) {
        await supabase.from('gig_participants').update(participantData).eq('id', participant.id!);
      } else if (participant.organization_id && participant.role) {
        await supabase.from('gig_participants').insert({ gig_id: gigId, ...participantData });
      }
    }

    return { success: true };
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
