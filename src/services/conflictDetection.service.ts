import { createClient } from '../utils/supabase/client';
import { handleApiError } from '../utils/api-error-utils';

const getSupabase = () => createClient();

export interface Conflict {
  level: 'conflict' | 'warning';
  type: 'staff' | 'venue' | 'equipment';
  gig_id: string;
  gig_title: string;
  start: string;
  end: string;
  details: Record<string, any>;
}

export interface ConflictResult {
  conflicts: Conflict[];
  warnings: Conflict[];
}

/**
 * Check for staff conflicts and warnings - when staff members are assigned to overlapping gigs or gigs within 4 hours
 */
export async function checkStaffConflicts(gigId: string, startTime: string, endTime: string): Promise<ConflictResult> {
  const supabase = getSupabase();
  try {
    // Get staff assignments for the current gig
    const { data: currentGigStaff, error: currentError } = await supabase
      .from('gig_staff_assignments')
      .select(`
        user_id,
        user:user_id(id, first_name, last_name),
        slot:gig_staff_slots!inner(gig_id)
      `)
      .eq('slot.gig_id', gigId);

    if (currentError) throw currentError;
    if (!currentGigStaff || currentGigStaff.length === 0) return { conflicts: [], warnings: [] };

    const staffUserIds = currentGigStaff.map((assignment: any) => assignment.user_id);
    const currentStart = new Date(startTime);
    const currentEnd = new Date(endTime);

    // Find overlapping gigs (CONFLICTS)
    const { data: overlappingGigs, error: overlapError } = await supabase
      .from('gigs')
      .select(`
        id,
        title,
        start,
        end,
        staff_assignments:gig_staff_assignments(
          user_id,
          user:user_id(id, first_name, last_name)
        )
      `)
      .neq('id', gigId)
      .lte('start', endTime)
      .gte('end', startTime);

    if (overlapError) throw overlapError;

    // Find gigs within 4 hours before or after (WARNINGS)
    const warningStart = new Date(currentStart.getTime() - 4 * 60 * 60 * 1000).toISOString();
    const warningEnd = new Date(currentEnd.getTime() + 4 * 60 * 60 * 1000).toISOString();

    const { data: nearbyGigs, error: nearbyError } = await supabase
      .from('gigs')
      .select(`
        id,
        title,
        start,
        end,
        staff_assignments:gig_staff_assignments(
          user_id,
          user:user_id(id, first_name, last_name)
        )
      `)
      .neq('id', gigId)
      .or(`and(start.gte.${warningStart},start.lte.${warningEnd}),and(end.gte.${warningStart},end.lte.${warningEnd})`);

    if (nearbyError) throw nearbyError;

    const conflicts: Conflict[] = [];
    const warnings: Conflict[] = [];

    // Process overlapping gigs (CONFLICTS)
    for (const gig of overlappingGigs || []) {
      const overlappingStaff = gig.staff_assignments?.filter((assignment: any) =>
        staffUserIds.includes(assignment.user_id)
      ) || [];

      if (overlappingStaff.length > 0) {
        conflicts.push({
          level: 'conflict',
          type: 'staff',
          gig_id: gig.id,
          gig_title: gig.title,
          start: gig.start,
          end: gig.end,
          details: {
            conflicting_staff: overlappingStaff.map((sa: any) => ({
              user_id: sa.user_id,
              name: `${sa.user.first_name} ${sa.user.last_name}`
            }))
          }
        });
      }
    }

    // Process nearby gigs (WARNINGS) - exclude those already in conflicts
    const conflictGigIds = new Set(conflicts.map(c => c.gig_id));
    for (const gig of nearbyGigs || []) {
      if (conflictGigIds.has(gig.id)) continue;

      const nearbyStaff = gig.staff_assignments?.filter((assignment: any) =>
        staffUserIds.includes(assignment.user_id)
      ) || [];

      if (nearbyStaff.length > 0) {
        warnings.push({
          level: 'warning',
          type: 'staff',
          gig_id: gig.id,
          gig_title: gig.title,
          start: gig.start,
          end: gig.end,
          details: {
            conflicting_staff: nearbyStaff.map((sa: any) => ({
              user_id: sa.user_id,
              name: `${sa.user.first_name} ${sa.user.last_name}`
            }))
          }
        });
      }
    }

    return { conflicts, warnings };
  } catch (err) {
    return handleApiError(err, 'check staff conflicts');
  }
}

/**
 * Check for venue conflicts and warnings - when multiple gigs are scheduled at the same venue with overlapping times or within 4 hours
 */
export async function checkVenueConflicts(gigId: string, startTime: string, endTime: string): Promise<ConflictResult> {
  const supabase = getSupabase();
  try {
    // Get venue for the current gig
    const { data: currentGigVenue, error: currentError } = await supabase
      .from('gig_participants')
      .select('organization_id')
      .eq('gig_id', gigId)
      .eq('role', 'Venue');

    if (currentError) throw currentError;
    if (!currentGigVenue || currentGigVenue.length === 0) return { conflicts: [], warnings: [] };

    const venueId = currentGigVenue[0].organization_id;
    const currentStart = new Date(startTime);
    const currentEnd = new Date(endTime);

    // Find overlapping gigs at the same venue (CONFLICTS)
    const { data: overlappingGigs, error: overlapError } = await supabase
      .from('gigs')
      .select(`
        id,
        title,
        start,
        end,
        participants:gig_participants!inner(
          role,
          organization:organization_id(id, name)
        )
      `)
      .neq('id', gigId)
      .lte('start', endTime)
      .gte('end', startTime);

    if (overlapError) throw overlapError;

    // Find gigs at same venue within 4 hours before or after (WARNINGS)
    const warningStart = new Date(currentStart.getTime() - 4 * 60 * 60 * 1000).toISOString();
    const warningEnd = new Date(currentEnd.getTime() + 4 * 60 * 60 * 1000).toISOString();

    const { data: nearbyGigs, error: nearbyError } = await supabase
      .from('gigs')
      .select(`
        id,
        title,
        start,
        end,
        participants:gig_participants!inner(
          role,
          organization:organization_id(id, name)
        )
      `)
      .neq('id', gigId)
      .or(`and(start.gte.${warningStart},start.lte.${warningEnd}),and(end.gte.${warningStart},end.lte.${warningEnd})`);

    if (nearbyError) throw nearbyError;

    const conflicts: Conflict[] = [];
    const warnings: Conflict[] = [];

    // Process overlapping gigs (CONFLICTS)
    for (const gig of overlappingGigs || []) {
      const venueParticipant = gig.participants?.find((p: any) => p.role === 'Venue');
      if (venueParticipant && venueParticipant.organization?.id === venueId) {
        conflicts.push({
          level: 'conflict',
          type: 'venue',
          gig_id: gig.id,
          gig_title: gig.title,
          start: gig.start,
          end: gig.end,
          details: {
            venue_id: venueId,
            venue_name: venueParticipant.organization?.name
          }
        });
      }
    }

    // Process nearby gigs at same venue (WARNINGS) - exclude those already in conflicts
    const conflictGigIds = new Set(conflicts.map(c => c.gig_id));
    for (const gig of nearbyGigs || []) {
      if (conflictGigIds.has(gig.id)) continue;

      const venueParticipant = gig.participants?.find((p: any) => p.role === 'Venue');
      if (venueParticipant && venueParticipant.organization?.id === venueId) {
        warnings.push({
          level: 'warning',
          type: 'venue',
          gig_id: gig.id,
          gig_title: gig.title,
          start: gig.start,
          end: gig.end,
          details: {
            venue_id: venueId,
            venue_name: venueParticipant.organization?.name
          }
        });
      }
    }

    return { conflicts, warnings };
  } catch (err) {
    return handleApiError(err, 'check venue conflicts');
  }
}

/**
 * Check for equipment conflicts and warnings - when equipment/kits are assigned to overlapping gigs or gigs within 4 hours
 */
export async function checkEquipmentConflicts(gigId: string, startTime: string, endTime: string): Promise<ConflictResult> {
  const supabase = getSupabase();
  try {
    // Get kit assignments for the current gig
    const { data: currentGigKits, error: currentError } = await supabase
      .from('gig_kit_assignments')
      .select('kit_id')
      .eq('gig_id', gigId);

    if (currentError) throw currentError;
    if (!currentGigKits || currentGigKits.length === 0) return { conflicts: [], warnings: [] };

    const kitIds = currentGigKits.map((assignment: any) => assignment.kit_id);
    const currentStart = new Date(startTime);
    const currentEnd = new Date(endTime);

    // Find overlapping gigs with conflicting kit assignments (CONFLICTS)
    const { data: overlappingGigs, error: overlapError } = await supabase
      .from('gigs')
      .select(`
        id,
        title,
        start,
        end,
        kit_assignments:gig_kit_assignments!inner(
          kit:kits!inner(
            id,
            name,
            kit_assets(
              asset:assets(id, manufacturer_model)
            )
          )
        )
      `)
      .neq('id', gigId)
      .lte('start', endTime)
      .gte('end', startTime);

    if (overlapError) throw overlapError;

    // Find gigs with same kits within 4 hours before or after (WARNINGS)
    const warningStart = new Date(currentStart.getTime() - 4 * 60 * 60 * 1000).toISOString();
    const warningEnd = new Date(currentEnd.getTime() + 4 * 60 * 60 * 1000).toISOString();

    const { data: nearbyGigs, error: nearbyError } = await supabase
      .from('gigs')
      .select(`
        id,
        title,
        start,
        end,
        kit_assignments:gig_kit_assignments!inner(
          kit:kits!inner(
            id,
            name,
            kit_assets(
              asset:assets(id, manufacturer_model)
            )
          )
        )
      `)
      .neq('id', gigId)
      .or(`and(start.gte.${warningStart},start.lte.${warningEnd}),and(end.gte.${warningStart},end.lte.${warningEnd})`);

    if (nearbyError) throw nearbyError;

    const conflicts: Conflict[] = [];
    const warnings: Conflict[] = [];

    // Process overlapping gigs (CONFLICTS)
    for (const gig of overlappingGigs || []) {
      const overlappingKitIds = gig.kit_assignments?.filter((assignment: any) =>
        kitIds.includes(assignment.kit?.id)
      ) || [];

      if (overlappingKitIds.length > 0) {
        const conflictingKits = overlappingKitIds.map((ka: any) => ({
          kit_id: ka.kit?.id,
          kit_name: ka.kit?.name,
          assets: ka.kit?.kit_assets?.map((asset: any) => asset.asset?.manufacturer_model) || []
        }));

        conflicts.push({
          level: 'conflict',
          type: 'equipment',
          gig_id: gig.id,
          gig_title: gig.title,
          start: gig.start,
          end: gig.end,
          details: {
            conflicting_kits: conflictingKits
          }
        });
      }
    }

    // Process nearby gigs with same kits (WARNINGS) - exclude those already in conflicts
    const conflictGigIds = new Set(conflicts.map(c => c.gig_id));
    for (const gig of nearbyGigs || []) {
      if (conflictGigIds.has(gig.id)) continue;

      const nearbyKitIds = gig.kit_assignments?.filter((assignment: any) =>
        kitIds.includes(assignment.kit?.id)
      ) || [];

      if (nearbyKitIds.length > 0) {
        const conflictingKits = nearbyKitIds.map((ka: any) => ({
          kit_id: ka.kit?.id,
          kit_name: ka.kit?.name,
          assets: ka.kit?.kit_assets?.map((asset: any) => asset.asset?.manufacturer_model) || []
        }));

        warnings.push({
          level: 'warning',
          type: 'equipment',
          gig_id: gig.id,
          gig_title: gig.title,
          start: gig.start,
          end: gig.end,
          details: {
            conflicting_kits: conflictingKits
          }
        });
      }
    }

    return { conflicts, warnings };
  } catch (err) {
    return handleApiError(err, 'check equipment conflicts');
  }
}

/**
 * Check for all types of conflicts
 */
export async function checkAllConflicts(gigId: string, startTime: string, endTime: string): Promise<ConflictResult> {
  try {
    const [staffResult, venueResult, equipmentResult] = await Promise.all([
      checkStaffConflicts(gigId, startTime, endTime),
      checkVenueConflicts(gigId, startTime, endTime),
      checkEquipmentConflicts(gigId, startTime, endTime)
    ]);

    return {
      conflicts: [
        ...staffResult.conflicts,
        ...venueResult.conflicts,
        ...equipmentResult.conflicts
      ],
      warnings: [
        ...staffResult.warnings,
        ...venueResult.warnings,
        ...equipmentResult.warnings
      ]
    };
  } catch (err) {
    return handleApiError(err, 'check all conflicts');
  }
}