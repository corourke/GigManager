import { createClient } from '../utils/supabase/client';
import { handleApiError } from '../utils/api-error-utils';
import { isNoonUTC } from '../utils/dateUtils';

const getSupabase = () => createClient();

const WARNING_BUFFER_MS = 4 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const PARTICIPANT_CONFLICT_ROLES = ['Venue', 'Act'];

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

function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const p: Record<string, string> = {};
    parts.forEach(part => { p[part.type] = part.value; });
    const h = p.hour === '24' ? '00' : p.hour;
    const localStr = `${p.year}-${p.month}-${p.day}T${h}:${p.minute}:${p.second}`;
    const localDate = new Date(localStr + 'Z');
    return date.getTime() - localDate.getTime();
  } catch {
    return 0;
  }
}

function getEffectiveRange(start: string, end: string, timezone?: string): { effectiveStart: Date; effectiveEnd: Date } {
  const isDateOnly = isNoonUTC(start) || isNoonUTC(end);
  if (isDateOnly) {
    const d = new Date(start);
    const calendarDate = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    const tz = timezone || 'UTC';
    const midnightLocal = new Date(`${calendarDate}T00:00:00Z`);
    const offsetMs = getTimezoneOffsetMs(midnightLocal, tz);
    const effectiveStart = new Date(midnightLocal.getTime() + offsetMs);
    const effectiveEnd = new Date(effectiveStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    return { effectiveStart, effectiveEnd };
  }
  return { effectiveStart: new Date(start), effectiveEnd: new Date(end) };
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

function classifyOverlap(
  currentStart: Date,
  currentEnd: Date,
  gigStart: Date,
  gigEnd: Date
): 'conflict' | 'warning' | null {
  if (rangesOverlap(currentStart, currentEnd, gigStart, gigEnd)) {
    return 'conflict';
  }
  const warningStart = new Date(currentStart.getTime() - WARNING_BUFFER_MS);
  const warningEnd = new Date(currentEnd.getTime() + WARNING_BUFFER_MS);
  if (rangesOverlap(warningStart, warningEnd, gigStart, gigEnd)) {
    return 'warning';
  }
  return null;
}

function widenedQueryRange(effectiveStart: Date, effectiveEnd: Date) {
  return {
    queryStart: new Date(effectiveStart.getTime() - WARNING_BUFFER_MS - DAY_MS).toISOString(),
    queryEnd: new Date(effectiveEnd.getTime() + WARNING_BUFFER_MS + DAY_MS).toISOString(),
  };
}

export async function checkStaffConflicts(gigId: string, startTime: string, endTime: string, timezone?: string): Promise<ConflictResult> {
  const supabase = getSupabase();
  try {
    const { data: currentSlots, error: slotsError } = await supabase
      .from('gig_staff_slots')
      .select('id')
      .eq('gig_id', gigId);

    if (slotsError) throw slotsError;
    if (!currentSlots || currentSlots.length === 0) return { conflicts: [], warnings: [] };

    const slotIds = currentSlots.map((s: any) => s.id);

    const { data: currentAssignments, error: assignError } = await supabase
      .from('gig_staff_assignments')
      .select('user_id, user:user_id(id, first_name, last_name)')
      .in('slot_id', slotIds);

    if (assignError) throw assignError;
    if (!currentAssignments || currentAssignments.length === 0) return { conflicts: [], warnings: [] };

    const staffUserIds = currentAssignments.map((a: any) => a.user_id);
    const staffLookup = new Map(currentAssignments.map((a: any) => [a.user_id, a.user]));

    const { effectiveStart: currentStart, effectiveEnd: currentEnd } = getEffectiveRange(startTime, endTime, timezone);
    const { queryStart, queryEnd } = widenedQueryRange(currentStart, currentEnd);

    const { data: candidateGigs, error: candidateError } = await supabase
      .from('gigs')
      .select(`
        id, title, start, end, timezone,
        staff_slots:gig_staff_slots(
          assignments:gig_staff_assignments(user_id, user:user_id(id, first_name, last_name))
        )
      `)
      .neq('id', gigId)
      .neq('status', 'Cancelled')
      .lte('start', queryEnd)
      .gte('end', queryStart);

    if (candidateError) throw candidateError;

    const conflicts: Conflict[] = [];
    const warnings: Conflict[] = [];

    for (const gig of candidateGigs || []) {
      const { effectiveStart: gigStart, effectiveEnd: gigEnd } = getEffectiveRange(gig.start, gig.end, gig.timezone);
      const level = classifyOverlap(currentStart, currentEnd, gigStart, gigEnd);
      if (!level) continue;

      const allAssignments = (gig.staff_slots || []).flatMap((slot: any) => slot.assignments || []);
      const matching = allAssignments.filter((a: any) => staffUserIds.includes(a.user_id));
      if (matching.length === 0) continue;

      const entry: Conflict = {
        level,
        type: 'staff',
        gig_id: gig.id,
        gig_title: gig.title,
        start: gig.start,
        end: gig.end,
        details: {
          conflicting_staff: matching.map((a: any) => ({
            user_id: a.user_id,
            name: `${a.user?.first_name || ''} ${a.user?.last_name || ''}`.trim()
          }))
        }
      };
      (level === 'conflict' ? conflicts : warnings).push(entry);
    }

    return { conflicts, warnings };
  } catch (err) {
    return handleApiError(err, 'check staff conflicts');
  }
}

export async function checkParticipantConflicts(gigId: string, startTime: string, endTime: string, timezone?: string): Promise<ConflictResult> {
  const supabase = getSupabase();
  try {
    const { data: currentParticipants, error: currentError } = await supabase
      .from('gig_participants')
      .select('organization_id, role')
      .eq('gig_id', gigId)
      .in('role', PARTICIPANT_CONFLICT_ROLES);

    if (currentError) throw currentError;
    if (!currentParticipants || currentParticipants.length === 0) return { conflicts: [], warnings: [] };

    const orgIds = currentParticipants.map((p: any) => p.organization_id);

    const { effectiveStart: currentStart, effectiveEnd: currentEnd } = getEffectiveRange(startTime, endTime, timezone);
    const { queryStart, queryEnd } = widenedQueryRange(currentStart, currentEnd);

    const { data: candidateGigs, error: candidateError } = await supabase
      .from('gigs')
      .select(`
        id, title, start, end, timezone,
        participants:gig_participants(role, organization:organization_id(id, name))
      `)
      .neq('id', gigId)
      .neq('status', 'Cancelled')
      .lte('start', queryEnd)
      .gte('end', queryStart);

    if (candidateError) throw candidateError;

    const conflicts: Conflict[] = [];
    const warnings: Conflict[] = [];

    for (const gig of candidateGigs || []) {
      const { effectiveStart: gigStart, effectiveEnd: gigEnd } = getEffectiveRange(gig.start, gig.end, gig.timezone);
      const level = classifyOverlap(currentStart, currentEnd, gigStart, gigEnd);
      if (!level) continue;

      const matchingParticipants = (gig.participants || []).filter((p: any) =>
        PARTICIPANT_CONFLICT_ROLES.includes(p.role) && orgIds.includes(p.organization?.id)
      );
      if (matchingParticipants.length === 0) continue;

      for (const p of matchingParticipants) {
        const entry: Conflict = {
          level,
          type: 'venue',
          gig_id: gig.id,
          gig_title: gig.title,
          start: gig.start,
          end: gig.end,
          details: {
            venue_id: p.organization?.id,
            venue_name: p.organization?.name,
            role: p.role,
          }
        };
        (level === 'conflict' ? conflicts : warnings).push(entry);
      }
    }

    return { conflicts, warnings };
  } catch (err) {
    return handleApiError(err, 'check participant conflicts');
  }
}

export async function checkEquipmentConflicts(gigId: string, startTime: string, endTime: string, timezone?: string): Promise<ConflictResult> {
  const supabase = getSupabase();
  try {
    const { data: currentGigKits, error: currentError } = await supabase
      .from('gig_kit_assignments')
      .select('kit_id')
      .eq('gig_id', gigId);

    if (currentError) throw currentError;
    if (!currentGigKits || currentGigKits.length === 0) return { conflicts: [], warnings: [] };

    const kitIds = currentGigKits.map((a: any) => a.kit_id);
    const { effectiveStart: currentStart, effectiveEnd: currentEnd } = getEffectiveRange(startTime, endTime, timezone);
    const { queryStart, queryEnd } = widenedQueryRange(currentStart, currentEnd);

    const { data: candidateGigs, error: candidateError } = await supabase
      .from('gigs')
      .select(`
        id, title, start, end, timezone,
        kit_assignments:gig_kit_assignments!inner(
          kit:kits!inner(id, name, kit_assets(asset:assets(id, manufacturer_model)))
        )
      `)
      .neq('id', gigId)
      .neq('status', 'Cancelled')
      .lte('start', queryEnd)
      .gte('end', queryStart);

    if (candidateError) throw candidateError;

    const conflicts: Conflict[] = [];
    const warnings: Conflict[] = [];

    for (const gig of candidateGigs || []) {
      const matching = gig.kit_assignments?.filter((a: any) => kitIds.includes(a.kit?.id)) || [];
      if (matching.length === 0) continue;

      const { effectiveStart: gigStart, effectiveEnd: gigEnd } = getEffectiveRange(gig.start, gig.end, gig.timezone);
      const level = classifyOverlap(currentStart, currentEnd, gigStart, gigEnd);
      if (!level) continue;

      const entry: Conflict = {
        level,
        type: 'equipment',
        gig_id: gig.id,
        gig_title: gig.title,
        start: gig.start,
        end: gig.end,
        details: {
          conflicting_kits: matching.map((ka: any) => ({
            kit_id: ka.kit?.id,
            kit_name: ka.kit?.name,
            assets: ka.kit?.kit_assets?.map((a: any) => a.asset?.manufacturer_model) || []
          }))
        }
      };
      (level === 'conflict' ? conflicts : warnings).push(entry);
    }

    return { conflicts, warnings };
  } catch (err) {
    return handleApiError(err, 'check equipment conflicts');
  }
}

export async function checkAllConflicts(gigId: string, startTime: string, endTime: string, timezone?: string): Promise<ConflictResult> {
  try {
    const [staffResult, participantResult, equipmentResult] = await Promise.all([
      checkStaffConflicts(gigId, startTime, endTime, timezone),
      checkParticipantConflicts(gigId, startTime, endTime, timezone),
      checkEquipmentConflicts(gigId, startTime, endTime, timezone)
    ]);

    return {
      conflicts: [
        ...staffResult.conflicts,
        ...participantResult.conflicts,
        ...equipmentResult.conflicts
      ],
      warnings: [
        ...staffResult.warnings,
        ...participantResult.warnings,
        ...equipmentResult.warnings
      ]
    };
  } catch (err) {
    return handleApiError(err, 'check all conflicts');
  }
}

const EXCLUDED_STATUSES = ['Cancelled'];

interface GigForConflictCheck {
  id: string;
  title: string;
  start: string;
  end: string;
  timezone?: string;
  status?: string;
}

export async function checkAllConflictsForGigs(gigs: GigForConflictCheck[]): Promise<Conflict[]> {
  const activeGigs = gigs.filter(g => !g.status || !EXCLUDED_STATUSES.includes(g.status));
  if (activeGigs.length === 0) return [];

  const supabase = getSupabase();
  const gigIds = activeGigs.map(g => g.id);

  try {
    const [staffData, participantData, kitData] = await Promise.all([
      supabase
        .from('gig_staff_slots')
        .select('gig_id, assignments:gig_staff_assignments(user_id, user:user_id(id, first_name, last_name))')
        .in('gig_id', gigIds),
      supabase
        .from('gig_participants')
        .select('gig_id, role, organization:organization_id(id, name)')
        .in('gig_id', gigIds)
        .in('role', PARTICIPANT_CONFLICT_ROLES),
      supabase
        .from('gig_kit_assignments')
        .select('gig_id, kit_id')
        .in('gig_id', gigIds),
    ]);

    if (staffData.error) throw staffData.error;
    if (participantData.error) throw participantData.error;
    if (kitData.error) throw kitData.error;

    const staffByGig = new Map<string, { user_id: string; name: string }[]>();
    for (const slot of staffData.data || []) {
      const assignments = (slot as any).assignments || [];
      for (const a of assignments) {
        const list = staffByGig.get(slot.gig_id) || [];
        list.push({
          user_id: a.user_id,
          name: `${a.user?.first_name || ''} ${a.user?.last_name || ''}`.trim()
        });
        staffByGig.set(slot.gig_id, list);
      }
    }

    const participantsByGig = new Map<string, { org_id: string; name: string; role: string }[]>();
    for (const p of participantData.data || []) {
      const list = participantsByGig.get(p.gig_id) || [];
      list.push({
        org_id: (p.organization as any)?.id,
        name: (p.organization as any)?.name,
        role: p.role,
      });
      participantsByGig.set(p.gig_id, list);
    }

    const kitsByGig = new Map<string, string[]>();
    for (const k of kitData.data || []) {
      const list = kitsByGig.get(k.gig_id) || [];
      list.push(k.kit_id);
      kitsByGig.set(k.gig_id, list);
    }

    const conflicts: Conflict[] = [];

    for (let i = 0; i < activeGigs.length; i++) {
      const gigA = activeGigs[i];
      const { effectiveStart: aStart, effectiveEnd: aEnd } = getEffectiveRange(gigA.start, gigA.end, gigA.timezone);

      for (let j = i + 1; j < activeGigs.length; j++) {
        const gigB = activeGigs[j];
        const { effectiveStart: bStart, effectiveEnd: bEnd } = getEffectiveRange(gigB.start, gigB.end, gigB.timezone);

        if (!rangesOverlap(aStart, aEnd, bStart, bEnd)) continue;

        const staffA = staffByGig.get(gigA.id) || [];
        const staffB_pre = staffByGig.get(gigB.id) || [];
        const partsA_pre = participantsByGig.get(gigA.id) || [];
        const partsB_pre = participantsByGig.get(gigB.id) || [];
        const kitsA_pre = kitsByGig.get(gigA.id) || [];
        const kitsB_pre = kitsByGig.get(gigB.id) || [];

        const staffAIds = new Set(staffA.map(s => s.user_id));
        const overlappingStaff = staffB_pre.filter(s => staffAIds.has(s.user_id));
        if (overlappingStaff.length > 0) {
          conflicts.push({
            level: 'conflict', type: 'staff',
            gig_id: gigB.id, gig_title: gigB.title,
            start: gigB.start, end: gigB.end,
            details: { conflicting_staff: overlappingStaff, other_gig_id: gigA.id, other_gig_title: gigA.title }
          });
          conflicts.push({
            level: 'conflict', type: 'staff',
            gig_id: gigA.id, gig_title: gigA.title,
            start: gigA.start, end: gigA.end,
            details: { conflicting_staff: overlappingStaff, other_gig_id: gigB.id, other_gig_title: gigB.title }
          });
        }

        const orgIdsA = new Set(partsA_pre.map(p => p.org_id));
        const overlappingParts = partsB_pre.filter(p => orgIdsA.has(p.org_id));
        for (const p of overlappingParts) {
          conflicts.push({
            level: 'conflict', type: 'venue',
            gig_id: gigB.id, gig_title: gigB.title,
            start: gigB.start, end: gigB.end,
            details: { venue_id: p.org_id, venue_name: p.name, role: p.role, other_gig_id: gigA.id, other_gig_title: gigA.title }
          });
          conflicts.push({
            level: 'conflict', type: 'venue',
            gig_id: gigA.id, gig_title: gigA.title,
            start: gigA.start, end: gigA.end,
            details: { venue_id: p.org_id, venue_name: p.name, role: p.role, other_gig_id: gigB.id, other_gig_title: gigB.title }
          });
        }

        const kitSetA = new Set(kitsA_pre);
        const overlappingKits = kitsB_pre.filter(k => kitSetA.has(k));
        if (overlappingKits.length > 0) {
          conflicts.push({
            level: 'conflict', type: 'equipment',
            gig_id: gigB.id, gig_title: gigB.title,
            start: gigB.start, end: gigB.end,
            details: { conflicting_kit_ids: overlappingKits, other_gig_id: gigA.id, other_gig_title: gigA.title }
          });
          conflicts.push({
            level: 'conflict', type: 'equipment',
            gig_id: gigA.id, gig_title: gigA.title,
            start: gigA.start, end: gigA.end,
            details: { conflicting_kit_ids: overlappingKits, other_gig_id: gigB.id, other_gig_title: gigB.title }
          });
        }
      }
    }

    const seen = new Set<string>();
    const deduped = conflicts.filter(c => {
      const key = `${c.type}:${c.gig_id}:${c.details.other_gig_id || ''}:${c.details.venue_id || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return deduped;
  } catch (err: any) {
    console.error('Error in batch conflict detection:', err);
    return [];
  }
}
