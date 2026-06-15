import { handleApiError } from '../utils/api-error-utils';
import { requireAuth } from '../utils/supabase/auth-utils';
import { UUID_REGEX } from '../utils/validation-utils';
import { getKit } from './kit.service';
import { getSupabase } from './gigService.shared';

/**
 * Kit-assignment operations for gigs (Phase 7, Step 4 — extracted from
 * gig.service.ts). gig.service re-exports these for backwards compatibility.
 */

/**
 * Assign a kit to a gig
 */
export async function assignKitToGig(gigId: string, kitId: string, organizationId: string, notes?: string) {
  try {
    const { supabase, user } = await requireAuth();

    const { data, error } = await supabase
      .from('gig_kit_assignments')
      .insert({
        gig_id: gigId,
        kit_id: kitId,
        organization_id: organizationId,
        notes: notes || null,
        assigned_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'assign kit to gig');
  }
}

/**
 * Remove a kit from a gig
 */
export async function removeKitFromGig(assignmentId: string) {
  const supabase = getSupabase();
  try {
    // .select() to confirm a row was removed — RLS denies silently (0 rows, no error)
    const { data, error } = await supabase.from('gig_kit_assignments').delete().eq('id', assignmentId).select();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Kit assignment not found, or you do not have permission to remove it.');
    }
    return { success: true };
  } catch (err) {
    return handleApiError(err, 'remove kit from gig');
  }
}

/**
 * Update a kit assignment for a gig
 */
export async function updateGigKitAssignment(assignmentId: string, updates: { notes?: string }) {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase.from('gig_kit_assignments').update(updates).eq('id', assignmentId).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'update kit assignment');
  }
}

/**
 * Update all kit assignments for a gig
 */
export async function updateGigKitAssignments(gigId: string, organizationId: string, assignments: Array<{
  id?: string;
  kit_id: string;
  notes?: string | null;
}>) {
  try {
    const { supabase, user } = await requireAuth();

    const { data: existingAssignments, error: fetchError } = await supabase
      .from('gig_kit_assignments')
      .select('id, kit_id')
      .eq('gig_id', gigId)
      .eq('organization_id', organizationId);

    if (fetchError) throw fetchError;

    const existingIds = existingAssignments?.map(a => a.id) || [];
    const incomingIds = assignments.filter(a => a.id && UUID_REGEX.test(a.id)).map(a => a.id!);

    const assignmentIdsToDelete = existingIds.filter(id => !incomingIds.includes(id));
    if (assignmentIdsToDelete.length > 0) {
      await supabase.from('gig_kit_assignments').delete().in('id', assignmentIdsToDelete);
    }

    for (const assignment of assignments) {
      const isDbId = assignment.id && UUID_REGEX.test(assignment.id);
      const assignmentData = {
        gig_id: gigId,
        kit_id: assignment.kit_id,
        organization_id: organizationId,
        notes: assignment.notes || null,
      };

      if (isDbId) {
        await supabase.from('gig_kit_assignments').update(assignmentData).eq('id', assignment.id!);
      } else {
        await supabase.from('gig_kit_assignments').insert({ ...assignmentData, assigned_by: user.id });
      }
    }

    return { success: true };
  } catch (err) {
    return handleApiError(err, 'update gig kit assignments');
  }
}

/**
 * Fetch kits assigned to a gig
 */
export async function getGigKits(gigId: string, organizationId?: string) {
  const supabase = getSupabase();
  try {
    let query = supabase
      .from('gig_kit_assignments')
      .select(`
        *,
        kit:kits(
          id,
          name,
          category,
          tag_number,
          rental_value,
          organization_id,
          kit_assets(
            quantity,
            notes,
            asset:assets(*)
          )
        )
      `)
      .eq('gig_id', gigId);

    if (organizationId) query = query.eq('organization_id', organizationId);

    const { data, error } = await query.order('assigned_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    return handleApiError(err, 'fetch gig kits');
  }
}

/**
 * Check for kit availability conflicts
 */
export async function checkKitConflicts(kitId: string, gigId: string, startTime: string, endTime: string) {
  const supabase = getSupabase();
  try {
    const kit = await getKit(kitId);
    if (!kit.kit_assets || kit.kit_assets.length === 0) return { conflicts: [] };

    const assetIds = kit.kit_assets.map((ka: any) => ka.asset.id);

    const { data: overlappingGigs, error } = await supabase
      .from('gigs')
      .select(`
        id,
        title,
        start,
        end,
        gig_kit_assignments!inner(
          kit:kits!inner(
            kit_assets!inner(
              asset_id
            )
          )
        )
      `)
      .neq('id', gigId)
      .lte('start', endTime)
      .gte('end', startTime);

    if (error) throw error;

    const conflicts: any[] = [];
    for (const gig of overlappingGigs || []) {
      const gigAssetIds = new Set<string>();
      for (const assignment of gig.gig_kit_assignments || []) {
        for (const kitAsset of assignment.kit?.kit_assets || []) {
          gigAssetIds.add(kitAsset.asset_id);
        }
      }

      const conflictingAssetIds = assetIds.filter(id => gigAssetIds.has(id));
      if (conflictingAssetIds.length > 0) {
        conflicts.push({
          gig_id: gig.id,
          gig_title: gig.title,
          start: gig.start,
          end: gig.end,
          conflicting_assets: conflictingAssetIds,
        });
      }
    }

    return { conflicts };
  } catch (err) {
    return handleApiError(err, 'check kit conflicts');
  }
}
