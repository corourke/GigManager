import { createClient } from '../utils/supabase/client';
import { handleApiError } from '../utils/api-error-utils';
import { isNoonUTC } from '../utils/dateUtils';
import type { OrganizationRole } from '../utils/supabase/types';
import { assetLabel } from './kit.service';
import { loadEquipmentNeeds, needsOf } from './equipmentNeeds.service';
import { itemNeedRows, type GigNeeds, type ItemNeed, type ItemNeedRow, type ShortMoment } from '../utils/equipmentNeeds';

const getSupabase = () => createClient();

const WARNING_BUFFER_MS = 4 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const PARTICIPANT_CONFLICT_ROLES: OrganizationRole[] = ['Venue', 'Act'];

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

/** An item that gigs running at the same time together need more of than are free (#184). */
export interface ItemShort {
  item_id: string;
  item_name: string;
  /** The peak: what this gig and the gigs running with it need at the same moment. */
  needed: number;
  available: number;
  short: number;
  /** When the peak starts, and this gig's timezone, to say the day. */
  peak_at: string;
  timezone?: string;
  this_gig: ItemNeed;
  /** Every other gig that adds to the peak. */
  others: { gig_title: string; need: ItemNeed }[];
}

/** Items short on `rows` (one gig's view) while the other gig is running: the
 *  worst such moment for each, not only the peak's gigs (#230 follow-up). */
function itemsShort(rows: readonly ItemNeedRow[], thisNeeds: ReadonlyMap<string, ItemNeed>, otherId: string, timezone?: string): ItemShort[] {
  const out: ItemShort[] = [];
  for (const r of rows) {
    let worst: ShortMoment | undefined;
    for (const m of r.shortMoments) if (m.gigs.some((g) => g.id === otherId) && (!worst || m.short > worst.short)) worst = m;
    if (!worst) continue;
    out.push({
      item_id: r.itemId, item_name: r.name, needed: worst.needed, available: r.free, short: worst.short,
      peak_at: new Date(worst.at).toISOString(), timezone,
      this_gig: thisNeeds.get(r.itemId)!,
      others: worst.gigs.map((g) => ({ gig_title: g.title, need: g.need })),
    });
  }
  return out;
}

/** A gig's needs with its effective time range, for the peak. */
function timedNeeds(gig: { id: string; title?: string; start: string; end: string; timezone?: string }, needs: ReadonlyMap<string, ItemNeed>): GigNeeds {
  const { effectiveStart, effectiveEnd } = getEffectiveRange(gig.start, gig.end, gig.timezone);
  return { id: gig.id, title: gig.title ?? 'This gig', start: effectiveStart.getTime(), end: effectiveEnd.getTime(), needs };
}

/** Kit assignment rows of the given organization only (all when none is given). */
const ofOrg = <T extends { organization_id?: string | null }>(rows: readonly T[], organizationId: string) =>
  organizationId ? rows.filter((r) => r.organization_id === organizationId) : [...rows];

/** Per-item counts, or none if they can't be loaded: the other checks still run. */
async function loadNeedsSafely(kitIds: string[], organizationId?: string) {
  try {
    return await loadEquipmentNeeds(kitIds, organizationId);
  } catch (err) {
    console.error('Error loading equipment needs:', err);
    return { ctx: { kits: new Map(), lines: new Map(), assetItem: new Map() }, counts: new Map() };
  }
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
    const _staffLookup = new Map(currentAssignments.map((a: any) => [a.user_id, a.user]));

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

export async function checkEquipmentConflicts(gigId: string, startTime: string, endTime: string, timezone: string | undefined, organizationId: string): Promise<ConflictResult> {
  const supabase = getSupabase();
  try {
    const { data: assigned, error: currentError } = await supabase
      .from('gig_kit_assignments')
      .select('kit_id, organization_id')
      .eq('gig_id', gigId);

    if (currentError) throw currentError;
    // Only the viewing organization's kits: another participant's equipment isn't ours to count.
    const currentGigKits = ofOrg((assigned ?? []) as any[], organizationId);
    if (currentGigKits.length === 0) return { conflicts: [], warnings: [] };

    const kitIds = currentGigKits.map((a: any) => a.kit_id);
    const { effectiveStart: currentStart, effectiveEnd: currentEnd } = getEffectiveRange(startTime, endTime, timezone);
    const { queryStart, queryEnd } = widenedQueryRange(currentStart, currentEnd);

    const { data: candidates, error: candidateError } = await supabase
      .from('gigs')
      .select(`
        id, title, start, end, timezone,
        kit_assignments:gig_kit_assignments!inner(kit_id, organization_id, kit:kits!inner(id, name))
      `)
      .neq('id', gigId)
      .neq('status', 'Cancelled')
      .lte('start', queryEnd)
      .gte('end', queryStart);

    if (candidateError) throw candidateError;
    const candidateGigs = (candidates ?? [])
      .map((g: any) => ({ ...g, kit_assignments: ofOrg(g.kit_assignments ?? [], organizationId) }))
      .filter((g: any) => g.kit_assignments.length > 0);
    if (candidateGigs.length === 0) return { conflicts: [], warnings: [] };

    // Resolve every kit involved — current gig's and every candidate's — to its
    // flattened asset set in one query, then compare at the asset level, not
    // the kit level. Two different kits sharing a physical asset must conflict.
    const candidateKitIds = candidateGigs.flatMap((g: any) => (g.kit_assignments || []).map((a: any) => a.kit_id));
    const allKitIds = Array.from(new Set([...kitIds, ...candidateKitIds]));

    const { data: flattenedRows, error: flattenError } = await supabase
      .from('kit_flattened_cache')
      .select('kit_id, asset_id, asset:assets(manufacturer_model, tag_number)')
      .in('kit_id', allKitIds);
    if (flattenError) throw flattenError;

    const assetsByKit = new Map<string, Set<string>>();
    const labels = new Map<string, string>();
    for (const row of (flattenedRows || []) as any[]) {
      const set = assetsByKit.get(row.kit_id) ?? new Set<string>();
      set.add(row.asset_id);
      assetsByKit.set(row.kit_id, set);
      if (row.asset) labels.set(row.asset_id, assetLabel(row.asset));
    }

    const currentAssetIds = new Set<string>();
    for (const kitId of kitIds) {
      for (const assetId of assetsByKit.get(kitId) ?? []) currentAssetIds.add(assetId);
    }

    // Per item (#184): what this gig and the gigs overlapping it need, against what's free.
    const levels = new Map(candidateGigs.map((gig: any) => {
      const { effectiveStart: gigStart, effectiveEnd: gigEnd } = getEffectiveRange(gig.start, gig.end, gig.timezone);
      return [gig.id, classifyOverlap(currentStart, currentEnd, gigStart, gigEnd)];
    }));
    const needsData = await loadNeedsSafely(allKitIds, organizationId);
    const thisNeeds = needsOf(kitIds, needsData);
    const gigKitIds = (gig: any) => (gig.kit_assignments || []).map((a: any) => a.kit_id as string);
    const overlapping = candidateGigs.filter((gig: any) => levels.get(gig.id) === 'conflict');
    const rows = itemNeedRows(
      timedNeeds({ id: gigId, start: startTime, end: endTime, timezone }, thisNeeds),
      overlapping.map((gig: any) => timedNeeds(gig, needsOf(gigKitIds(gig), needsData))),
      needsData.counts,
    );

    const conflicts: Conflict[] = [];
    const warnings: Conflict[] = [];

    for (const gig of candidateGigs) {
      const level = levels.get(gig.id);
      if (!level) continue;

      const matching = (gig.kit_assignments || [])
        .map((a: any) => ({
          kit_id: a.kit?.id,
          kit_name: a.kit?.name,
          // what this kit shares with the current gig's kits, by name
          shared_assets: [...(assetsByKit.get(a.kit_id) ?? [])]
            .filter((assetId) => currentAssetIds.has(assetId))
            .map((assetId) => labels.get(assetId) ?? 'Unnamed item')
            .sort(),
        }))
        .filter((k: any) => k.shared_assets.length > 0);
      const short = level === 'conflict' ? itemsShort(rows, thisNeeds, gig.id, timezone) : [];
      if (matching.length === 0 && short.length === 0) continue;

      const entry: Conflict = {
        level,
        type: 'equipment',
        gig_id: gig.id,
        gig_title: gig.title,
        start: gig.start,
        end: gig.end,
        details: { conflicting_kits: matching, items_short: short }
      };
      (level === 'conflict' ? conflicts : warnings).push(entry);
    }

    return { conflicts, warnings };
  } catch (err) {
    return handleApiError(err, 'check equipment conflicts');
  }
}

const STATUS_ORDER = { short: 0, 'none-spare': 1, enough: 2 } as const;

/**
 * What a gig needs per item, against what's free when it and the gigs
 * overlapping it all happen (#184, the gig's "Equipment needed" table).
 */
export async function getEquipmentNeeded(gigId: string, startTime: string, endTime: string, timezone: string | undefined, organizationId: string): Promise<{ overlapping: number; rows: ItemNeedRow[] }> {
  const supabase = getSupabase();
  try {
    const { data: currentGigKits, error: currentError } = await supabase.from('gig_kit_assignments').select('kit_id, organization_id').eq('gig_id', gigId);
    if (currentError) throw currentError;
    const kitIds = ofOrg((currentGigKits ?? []) as any[], organizationId).map((a: any) => a.kit_id as string);
    if (kitIds.length === 0) return { overlapping: 0, rows: [] };

    const { effectiveStart, effectiveEnd } = getEffectiveRange(startTime, endTime, timezone);
    const { queryStart, queryEnd } = widenedQueryRange(effectiveStart, effectiveEnd);
    const { data: candidateGigs, error: candidateError } = await supabase
      .from('gigs')
      .select('id, title, start, end, timezone, kit_assignments:gig_kit_assignments!inner(kit_id, organization_id)')
      .neq('id', gigId)
      .neq('status', 'Cancelled')
      .lte('start', queryEnd)
      .gte('end', queryStart);
    if (candidateError) throw candidateError;
    const overlapping = (candidateGigs ?? [])
      .map((gig: any) => ({ ...gig, kit_ids: ofOrg(gig.kit_assignments ?? [], organizationId).map((a: any) => a.kit_id as string) }))
      .filter((gig: any) => {
        if (gig.kit_ids.length === 0) return false;
        const r = getEffectiveRange(gig.start, gig.end, gig.timezone);
        return rangesOverlap(effectiveStart, effectiveEnd, r.effectiveStart, r.effectiveEnd);
      });

    const data = await loadEquipmentNeeds(Array.from(new Set([...kitIds, ...overlapping.flatMap((g: any) => g.kit_ids)])), organizationId);
    const rows = itemNeedRows(
      timedNeeds({ id: gigId, start: startTime, end: endTime, timezone }, needsOf(kitIds, data)),
      overlapping.map((gig: any) => timedNeeds(gig, needsOf(gig.kit_ids, data))),
      data.counts,
    )
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name));
    return { overlapping: overlapping.length, rows };
  } catch (err) {
    return handleApiError(err, 'work out the equipment needed');
  }
}

export async function checkAllConflicts(gigId: string, startTime: string, endTime: string, timezone: string | undefined, organizationId: string): Promise<ConflictResult> {
  try {
    const [staffResult, participantResult, equipmentResult] = await Promise.all([
      checkStaffConflicts(gigId, startTime, endTime, timezone),
      checkParticipantConflicts(gigId, startTime, endTime, timezone),
      checkEquipmentConflicts(gigId, startTime, endTime, timezone, organizationId)
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

export async function checkAllConflictsForGigs(gigs: GigForConflictCheck[], organizationId: string): Promise<Conflict[]> {
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
        .select('gig_id, kit_id, organization_id, kit:kits(id, name)')
        .in('gig_id', gigIds),
    ]);

    if (staffData.error) throw staffData.error;
    if (participantData.error) throw participantData.error;
    if (kitData.error) throw kitData.error;
    // Only the viewing organization's kits count, for units and per item (org scoping).
    const ownKits = ofOrg((kitData.data || []) as any[], organizationId);

    // Resolve every assigned kit to its flattened asset set in one query, so
    // "the same equipment" means shared assets, not shared kit rows — two
    // different kits sharing a physical asset must conflict.
    const allKitIds = Array.from(new Set(ownKits.map((k) => k.kit_id)));
    const assetsByKit = new Map<string, Set<string>>();
    const labels = new Map<string, string>();
    if (allKitIds.length > 0) {
      const { data: flattenedRows, error: flattenError } = await supabase
        .from('kit_flattened_cache')
        .select('kit_id, asset_id, asset:assets(manufacturer_model, tag_number)')
        .in('kit_id', allKitIds);
      if (flattenError) throw flattenError;
      for (const row of (flattenedRows || []) as any[]) {
        const set = assetsByKit.get(row.kit_id) ?? new Set<string>();
        set.add(row.asset_id);
        assetsByKit.set(row.kit_id, set);
        if (row.asset) labels.set(row.asset_id, assetLabel(row.asset));
      }
    }

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

    // Per gig, the union of flattened asset IDs across all of its assigned kits.
    const assetsByGig = new Map<string, Set<string>>();
    const kitsByGig = new Map<string, { kit_id: string; kit_name: string }[]>();
    for (const k of ownKits) {
      const gigAssets = assetsByGig.get(k.gig_id) ?? new Set<string>();
      for (const assetId of assetsByKit.get(k.kit_id) ?? []) gigAssets.add(assetId);
      assetsByGig.set(k.gig_id, gigAssets);
      const gigKits = kitsByGig.get(k.gig_id) ?? [];
      gigKits.push({ kit_id: k.kit_id, kit_name: k.kit?.name });
      kitsByGig.set(k.gig_id, gigKits);
    }

    // The gig's kits that hold any of the shared assets, in the same shape the
    // single-gig check produces, so the banner can name the kits and assets.
    const kitsSharing = (gigId: string, shared: Set<string>) =>
      (kitsByGig.get(gigId) ?? [])
        .map((k) => ({
          ...k,
          shared_assets: [...(assetsByKit.get(k.kit_id) ?? [])]
            .filter((assetId) => shared.has(assetId))
            .map((assetId) => labels.get(assetId) ?? 'Unnamed item')
            .sort(),
        }))
        .filter((k) => k.shared_assets.length > 0);

    // Per item (#184): each gig's needs, and its rows against every gig overlapping it.
    const ownKitIds = (gigId: string) => ownKits.filter((k) => k.gig_id === gigId).map((k) => k.kit_id as string);
    const needsData = await loadNeedsSafely(Array.from(new Set(activeGigs.flatMap((g) => ownKitIds(g.id)))), organizationId);
    const timed = new Map(activeGigs.map((g) => [g.id, timedNeeds(g, needsOf(ownKitIds(g.id), needsData))]));
    const rowsByGig = new Map(activeGigs.map((g) => {
      const t = timed.get(g.id)!;
      const others = activeGigs.filter((o) => o.id !== g.id).map((o) => timed.get(o.id)!).filter((o) => o.start <= t.end && o.end >= t.start);
      return [g.id, itemNeedRows(t, others, needsData.counts)];
    }));
    const shortFor = (gigId: string, otherId: string) =>
      itemsShort(rowsByGig.get(gigId)!, timed.get(gigId)!.needs, otherId, activeGigs.find((g) => g.id === gigId)?.timezone);

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
        const assetsA = assetsByGig.get(gigA.id) ?? new Set<string>();
        const assetsB = assetsByGig.get(gigB.id) ?? new Set<string>();

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

        const overlappingAssetIds = [...assetsA].filter(id => assetsB.has(id));
        const shortA = shortFor(gigA.id, gigB.id);
        const shortB = shortFor(gigB.id, gigA.id);
        // Each side gets an entry only for its own shortage, or the units both book.
        const shared = new Set(overlappingAssetIds);
        if (overlappingAssetIds.length > 0 || shortB.length > 0) {
          conflicts.push({
            level: 'conflict', type: 'equipment',
            gig_id: gigB.id, gig_title: gigB.title,
            start: gigB.start, end: gigB.end,
            details: { conflicting_asset_ids: overlappingAssetIds, conflicting_kits: kitsSharing(gigB.id, shared), items_short: shortB, other_gig_id: gigA.id, other_gig_title: gigA.title }
          });
        }
        if (overlappingAssetIds.length > 0 || shortA.length > 0) {
          conflicts.push({
            level: 'conflict', type: 'equipment',
            gig_id: gigA.id, gig_title: gigA.title,
            start: gigA.start, end: gigA.end,
            details: { conflicting_asset_ids: overlappingAssetIds, conflicting_kits: kitsSharing(gigA.id, shared), items_short: shortA, other_gig_id: gigB.id, other_gig_title: gigB.title }
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
