import { createClient } from '../utils/supabase/client';
import { handleApiError } from '../utils/api-error-utils';
import { SCANNING_MODES, RETURNED_STATUS } from '../config/inventoryWorkflow';
import { getKitComponentTree, flattenToScanUnits, type KitComponentTreeNode } from './kit.service';
import type { DbInventoryTracking } from '../utils/supabase/types';
import { isRetired, recordKind, type ItemRecord } from '../utils/equipmentItems';
import { bucketsAt, type TrackingRow } from '../utils/locations';

const getSupabase = () => createClient();

export interface GigWithTracking {
  id: string;
  title: string;
  start: string;
  end: string;
  status: string;
  kit_assignments: KitAssignmentWithTracking[];
}

export interface KitAssignmentWithTracking {
  kit_id: string;
  kit: {
    id: string;
    name: string;
    is_container: boolean;
    tag_number?: string | null;
    assets: AssetInKit[];
  };
  tracking_records: DbInventoryTracking[];
}

export interface AssetInKit {
  asset_id: string;
  asset: {
    id: string;
    manufacturer_model?: string | null;
    tag_number?: string | null;
    status?: string | null;
  };
}

export interface KitTrackingSummary {
  kitId: string;
  isContainer: boolean;
  status?: string | null;
  location?: string | null;
  gigTitle?: string | null;
  gigId?: string | null;
  lastScannedAt?: string | null;
  totalAssets: number;
  scannedAssets: number;
  statusCounts: Record<string, number>;
}

export interface LocationItem {
  kit_id: string;
  kit_name?: string | null;
  is_container: boolean;
  asset_id?: string | null;
  asset_name?: string | null;
  tag_number?: string | null;
  status: string;
  location?: string | null;
  gig_id: string;
  gig_title?: string | null;
  scanned_at: string;
  scanned_by_name?: string | null;
}

export interface ManifestRow {
  kit_id: string;
  kit_name?: string | null;
  asset_id?: string | null;
  asset_name?: string | null;
  tag_number?: string | null;
  status: string;
  location?: string | null;
  gig_id: string;
  gig_title?: string | null;
  scanned_at: string;
  scanned_by_name?: string | null;
  notes?: string | null;
  has_conflict: boolean;
}

export interface PackingListRow {
  /** The unit scanned: the container itself for a container row, else the kit an asset is tracked under. */
  kit_id: string;
  kit_name?: string | null;
  is_container: boolean;
  /** unit / lot: a specific record; any: N of an item (#185); container: a sealed case. */
  kind?: 'unit' | 'lot' | 'any' | 'container';
  /** An "any" line's item. */
  item_id?: string | null;
  /** A lot line: how many the lot holds. */
  lot_of?: number | null;
  /** A container: what it holds. */
  contents?: string[];
  /** How many of `quantity` are packed (scanned or counted, not returned). */
  packed?: number;
  /** An "any" line: the units and lots packed for it, each with its own status and place. */
  packed_units?: {
    asset_id: string; tag_number: string | null; serial_number: string | null; quantity: number;
    status?: string | null; location?: string | null;
  }[];
  /** An "any" line of an item with no tags: its pieces are counted, not scanned. */
  counted?: boolean;
  asset_id?: string | null;
  asset_name?: string | null;
  tag_number?: string | null;
  quantity: number;
  status?: string | null;
  location?: string | null;
  scanned_at?: string | null;
  scanned_by_name?: string | null;
  notes?: string | null;
  has_conflict: boolean;
  /** The kit assigned to the gig that this row is packed under (#81): a container assigned on its own is its own group. */
  group_kit_id: string;
  group_kit_name: string;
  group_is_container: boolean;
  group_tag_number: string | null;
  /** The group's kit was added to the gig at pack-out (#185). */
  group_added_at_pack_out?: boolean;
  /** The group of units and lots added at pack-out on their own (#185): not a kit. */
  group_is_loose?: boolean;
}

/** Units and lots added at pack-out on their own (no-kit rows) are one group, after the kits (#185). */
export const LOOSE_GROUP_NAME = 'Added at pack-out';
export const looseGroupId = (gigId: string) => `loose:${gigId}`;

export interface MaintenanceRow {
  asset_id: string;
  asset_name?: string | null;
  tag_number?: string | null;
  kit_id?: string | null;
  kit_name?: string | null;
  last_gig_title?: string | null;
  condition_notes?: string | null;
  date_flagged?: string | null;
  flagged_by_name?: string | null;
}

export interface CreateManualTrackingParams {
  organizationId: string;
  gigId: string;
  kitId: string;
  assetId?: string;
  status: string;
  location?: string | null;
  notes?: string | null;
  createdBy: string;
  isContainerKit?: boolean;
  assetIds?: string[];
  /** With `assetId`: how many of that lot are there (#185: quantity is state). */
  quantity?: number;
  /** With `assetIds`: how many of each lot (1 when not given). */
  quantities?: Record<string, number>;
  /** A logical kit with its own (older) kit-only row: move that row too, as a whole-kit override does. */
  keepKitRow?: boolean;
}

function getLatestByKey(records: DbInventoryTracking[]): DbInventoryTracking[] {
  const map = new Map<string, DbInventoryTracking>();
  for (const record of records) {
    const key = `${record.gig_id}:${record.kit_id ?? ''}:${record.asset_id ?? ''}`;
    const existing = map.get(key);
    // Use string comparison for ISO dates to avoid repeated Date object creation
    if (!existing || record.scanned_at > existing.scanned_at) {
      map.set(key, record);
    }
  }
  return Array.from(map.values());
}

// Like getLatestByKey, but for the Manifest report specifically. A kit scan
// cascades to every asset in that kit's flattened subtree, and each kit
// level in a hierarchy (top-level and every nested sub-kit) can
// independently be scanned — so the same physical asset can end up with
// tracking rows under more than one kit_id. Deduping by kit_id+asset_id
// (getLatestByKey's key) would show that asset once per kit level instead
// of once overall, which is what a manifest is for: confirming every
// physical item is at this location, exactly once. This drops kit_id from
// the key for asset-level rows so only the single most-recently-scanned
// row survives, whichever kit level it was scanned through; kit-level rows
// (asset_id null, the kit itself as a sealed unit) keep kit_id in the key,
// since those are genuinely distinct physical units.
function getLatestManifestRecords(records: DbInventoryTracking[]): DbInventoryTracking[] {
  const map = new Map<string, DbInventoryTracking>();
  for (const record of records) {
    const key = record.asset_id
      ? `${record.gig_id}:${record.asset_id}`
      : `${record.gig_id}:${record.kit_id ?? ''}`;
    const existing = map.get(key);
    if (!existing || record.scanned_at > existing.scanned_at) {
      map.set(key, record);
    }
  }
  return Array.from(map.values());
}

function formatUserName(user: { first_name?: string; last_name?: string; email?: string } | null | undefined): string | null {
  if (!user) return null;
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return full || user.email || null;
}

export async function getActiveGigsWithTracking(organizationId: string): Promise<GigWithTracking[]> {
  const supabase = getSupabase();
  try {
    const now = new Date();
    const pastBound = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const futureBound = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: participatingGigIds, error: participantError } = await supabase
      .from('gig_participants')
      .select('gig_id')
      .eq('organization_id', organizationId);

    if (participantError) throw participantError;

    const gigIds = (participatingGigIds ?? []).map((r: any) => r.gig_id);
    if (gigIds.length === 0) return [];

    const { data: gigs, error: gigsError } = await supabase
      .from('gigs')
      .select('id, title, start, end, status')
      .in('id', gigIds)
      .in('status', ['Booked', 'DateHold'])
      .gte('end', pastBound)
      .lte('start', futureBound);

    if (gigsError) throw gigsError;
    if (!gigs || gigs.length === 0) return [];

    const activeGigIds = gigs.map((g: any) => g.id);

    const { data: assignments, error: assignError } = await supabase
      .from('gig_kit_assignments')
      .select(`
        gig_id,
        kit_id,
        kit:kits!inner(
          id,
          name,
          is_container,
          tag_number
        )
      `)
      .in('gig_id', activeGigIds);

    if (assignError) throw assignError;

    // Every non-container kit's assets, fully flattened — a kit_components
    // row alone can't answer "what assets does this kit have," since a
    // sub-kit component has no asset of its own (that's what crashed here:
    // the old query embedded kit_components -> assets directly, and every
    // sub-kit row resolved to a null asset). Reads the same
    // write-time-maintained cache used elsewhere (kit.service.ts), so
    // nested sub-kits' assets are included too, consistent with how
    // scanning already cascades through the whole hierarchy.
    const nonContainerKitIds = Array.from(new Set(
      (assignments ?? [])
        .filter((a: any) => !a.kit?.is_container)
        .map((a: any) => a.kit_id)
    ));

    const assetsByKit = new Map<string, AssetInKit[]>();
    if (nonContainerKitIds.length > 0) {
      const { data: flattened, error: flattenedError } = await supabase
        .from('kit_flattened_cache')
        .select('kit_id, asset_id, asset:assets(id, manufacturer_model, tag_number, status)')
        .in('kit_id', nonContainerKitIds);

      if (flattenedError) throw flattenedError;

      for (const row of (flattened ?? []) as any[]) {
        const list = assetsByKit.get(row.kit_id) ?? [];
        list.push({
          asset_id: row.asset_id,
          asset: {
            id: row.asset?.id,
            manufacturer_model: row.asset?.manufacturer_model ?? null,
            tag_number: row.asset?.tag_number ?? null,
            status: row.asset?.status ?? null,
          },
        });
        assetsByKit.set(row.kit_id, list);
      }
    }

    const { data: trackingRecords, error: trackingError } = await supabase
      .from('inventory_tracking')
      .select('id, gig_id, kit_id, asset_id, status, location, scanned_at, scanned_by, notes, created_at, scanned_by_user:users!scanned_by(first_name, last_name, email)')
      .eq('organization_id', organizationId)
      .in('gig_id', activeGigIds);

    if (trackingError) throw trackingError;

    const latestTracking = getLatestByKey((trackingRecords ?? []) as DbInventoryTracking[]);

    const trackingByGigAndKit = new Map<string, DbInventoryTracking[]>();
    for (const record of latestTracking) {
      const key = `${record.gig_id}:${record.kit_id ?? ''}`;
      const list = trackingByGigAndKit.get(key) ?? [];
      list.push(record);
      trackingByGigAndKit.set(key, list);
    }

    const result: GigWithTracking[] = gigs.map((gig: any) => {
      const gigAssignments = (assignments ?? []).filter((a: any) => a.gig_id === gig.id);
      return {
        id: gig.id,
        title: gig.title,
        start: gig.start,
        end: gig.end,
        status: gig.status,
        kit_assignments: gigAssignments.map((a: any) => ({
          kit_id: a.kit_id,
          kit: {
            id: a.kit.id,
            name: a.kit.name,
            is_container: a.kit.is_container,
            tag_number: a.kit.tag_number ?? null,
            assets: assetsByKit.get(a.kit_id) ?? [],
          },
          tracking_records: trackingByGigAndKit.get(`${gig.id}:${a.kit_id}`) ?? [],
        })),
      };
    });

    return result;
  } catch (err) {
    return handleApiError(err, 'get active gigs with tracking');
  }
}

export interface GigOption {
  id: string;
  title: string;
  start?: string | null;
  timezone?: string | null;
}

// The report pickers' default date window (#109): gigs starting from local
// midnight 30 days before `today` up to, but not including, local midnight 31
// days after it, so day -30 and day +30 are both in. "Today" is the user's
// local date, not each gig's time zone.
export function reportPickerWindow(today: Date = new Date()): { from: string; to: string } {
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  return {
    from: new Date(y, m, d - 30).toISOString(),
    to: new Date(y, m, d + 31).toISOString(),
  };
}

// Gigs the organization participates in, unfiltered by status — for report
// gig-pickers (Manifest, Packing List). By default only gigs inside
// reportPickerWindow; `showAll` drops the window to reach any gig's history.
export async function getGigsForReportPicker(
  organizationId: string,
  options: { showAll?: boolean; today?: Date } = {},
): Promise<GigOption[]> {
  const supabase = getSupabase();
  try {
    const { data: participatingGigIds, error: participantError } = await supabase
      .from('gig_participants')
      .select('gig_id')
      .eq('organization_id', organizationId);

    if (participantError) throw participantError;

    const gigIds = (participatingGigIds ?? []).map((r: any) => r.gig_id);
    if (gigIds.length === 0) return [];

    let query = supabase
      .from('gigs')
      .select('id, title, start, timezone')
      .in('id', gigIds);
    if (!options.showAll) {
      const { from, to } = reportPickerWindow(options.today);
      query = query.gte('start', from).lt('start', to);
    }
    const { data: gigs, error: gigsError } = await query.order('start', { ascending: false });

    if (gigsError) throw gigsError;

    return (gigs ?? []) as GigOption[];
  } catch (err) {
    return handleApiError(err, 'get gigs for report picker');
  }
}

export async function getLocationSuggestions(organizationId: string): Promise<string[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('inventory_tracking')
      .select('location')
      .eq('organization_id', organizationId)
      .not('location', 'is', null)
      .order('location');

    if (error) throw error;

    const dbLocations = (data ?? []).map((r: any) => r.location as string).filter(Boolean);
    const modeDefaults = SCANNING_MODES.map((m) => m.locationLabel);

    const combined = Array.from(new Set([...dbLocations, ...modeDefaults])).sort();
    return combined;
  } catch (err) {
    return handleApiError(err, 'get location suggestions');
  }
}

export async function getItemsByLocation(
  organizationId: string,
  filters: { location?: string; status?: string | string[]; gigId?: string }
): Promise<LocationItem[]> {
  const supabase = getSupabase();
  try {
    if (!filters.location && !filters.status && !filters.gigId) {
      return [];
    }

    let query = supabase
      .from('inventory_tracking')
      .select('id, gig_id, kit_id, asset_id, status, location, scanned_at, scanned_by, notes, created_at, scanned_by_user:users!scanned_by(first_name, last_name, email), kit:kit_id(name, is_container), gig:gig_id(title)')
      .eq('organization_id', organizationId);

    if (filters.location) {
      query = query.eq('location', filters.location);
    }
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }
    if (filters.gigId) {
      query = query.eq('gig_id', filters.gigId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const records = (data ?? []) as any[];
    const latest = getLatestByKey(records as DbInventoryTracking[]);

    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, manufacturer_model, tag_number')
      .in('id', latest.filter((r) => r.asset_id).map((r) => r.asset_id as string));

    if (assetsError) throw assetsError;

    const assetMap = new Map((assets ?? []).map((a: any) => [a.id, a]));

    return latest.map((record): LocationItem => {
      const asset = record.asset_id ? assetMap.get(record.asset_id) : null;
      const rawRecord = records.find((r) => r.id === record.id) as any;
      return {
        kit_id: record.kit_id ?? '',
        kit_name: rawRecord?.kit?.name ?? null,
        is_container: !!rawRecord?.kit?.is_container,
        asset_id: record.asset_id ?? null,
        asset_name: asset?.manufacturer_model ?? null,
        tag_number: asset?.tag_number ?? null,
        status: record.status,
        location: record.location ?? null,
        gig_id: record.gig_id,
        gig_title: rawRecord?.gig?.title ?? null,
        scanned_at: record.scanned_at,
        scanned_by_name: formatUserName(rawRecord?.scanned_by_user),
      };
    });
  } catch (err) {
    return handleApiError(err, 'get items by location');
  }
}

export async function createManualTrackingRecord(params: CreateManualTrackingParams): Promise<DbInventoryTracking[]> {
  const supabase = getSupabase();
  try {
    const { organizationId, gigId, kitId, assetId, status, location, notes, createdBy, isContainerKit, assetIds, quantity, quantities, keepKitRow } = params;
    const now = new Date().toISOString();

    const buildRecord = (targetAssetId?: string, n = 1) => ({
      organization_id: organizationId,
      gig_id: gigId,
      kit_id: kitId,
      asset_id: targetAssetId ?? null,
      status,
      location: location ?? null,
      notes: notes ?? null,
      scanned_at: now,
      scanned_by: createdBy,
      quantity: Math.max(1, Math.floor(n)),
    });

    if (assetId) {
      const record = buildRecord(assetId, quantity ?? 1);
      const { data, error } = await supabase
        .from('inventory_tracking')
        .insert(record)
        .select('*')
        .single();
      if (error) throw error;
      return [data as DbInventoryTracking];
    }

    if (isContainerKit) {
      const record = buildRecord(undefined);
      const { data, error } = await supabase
        .from('inventory_tracking')
        .insert(record)
        .select('*')
        .single();
      if (error) throw error;
      return [data as DbInventoryTracking];
    }

    // A logical kit isn't scanned itself: a row per asset under it, as the phone writes (#185).
    const records = [
      ...(keepKitRow ? [buildRecord(undefined)] : []),
      ...(assetIds ?? []).map((id) => buildRecord(id, quantities?.[id] ?? 1)),
    ];
    // Only "any" lines: which units or lots fill them is chosen when packing, so there's nothing
    // to move by hand. Say so, rather than report a save that wrote nothing.
    if (records.length === 0) {
      throw new Error('This kit has no specific units or lots to move. Its "any" lines are filled when packing: scan or count them on the phone.');
    }
    const { data, error } = await supabase
      .from('inventory_tracking')
      .insert(records)
      .select('*');
    if (error) throw error;
    return (data ?? []) as DbInventoryTracking[];
  } catch (err) {
    return handleApiError(err, 'create manual tracking record');
  }
}

export async function getManifestReport(
  organizationId: string,
  filters: { location: string; gigId?: string }
): Promise<ManifestRow[]> {
  const supabase = getSupabase();
  try {
    let query = supabase
      .from('inventory_tracking')
      .select('id, gig_id, kit_id, asset_id, status, location, scanned_at, scanned_by, notes, created_at, scanned_by_user:users!scanned_by(first_name, last_name, email), kit:kit_id(name), gig:gig_id(title)')
      .eq('organization_id', organizationId)
      .eq('location', filters.location);

    if (filters.gigId) {
      query = query.eq('gig_id', filters.gigId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const records = (data ?? []) as any[];
    const latest = getLatestManifestRecords(records as DbInventoryTracking[]);

    // Without this, every asset-level row rendered its kit's name instead of
    // its own (the UI falls back to kit_name when asset_name is null) — a
    // kit with 8 distinct assets showed up as 8 identical-looking rows.
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, manufacturer_model, tag_number')
      .in('id', latest.filter((r) => r.asset_id).map((r) => r.asset_id as string));

    if (assetsError) throw assetsError;

    const assetMap = new Map((assets ?? []).map((a: any) => [a.id, a]));

    const conflictFlags = await getInventoryConflictFlags(organizationId);

    return latest.map((record): ManifestRow => {
      const rawRecord = records.find((r) => r.id === record.id) as any;
      const asset = record.asset_id ? assetMap.get(record.asset_id) : null;
      return {
        kit_id: record.kit_id ?? '',
        kit_name: rawRecord?.kit?.name ?? null,
        asset_id: record.asset_id ?? null,
        asset_name: asset?.manufacturer_model ?? null,
        tag_number: asset?.tag_number ?? null,
        status: record.status,
        location: record.location ?? null,
        gig_id: record.gig_id,
        gig_title: rawRecord?.gig?.title ?? null,
        scanned_at: record.scanned_at,
        scanned_by_name: formatUserName(rawRecord?.scanned_by_user),
        notes: record.notes ?? null,
        has_conflict: record.kit_id ? conflictFlags.has(record.kit_id) : false,
      };
    });
  } catch (err) {
    return handleApiError(err, 'get manifest report');
  }
}

export async function getPackingListReport(organizationId: string, gigId: string): Promise<PackingListRow[]> {
  const supabase = getSupabase();
  try {
    const { data: assignments, error: assignError } = await supabase
      .from('gig_kit_assignments')
      .select(`
        kit_id,
        added_at_pack_out,
        kit:kits!inner(
          id,
          name,
          is_container,
          tag_number,
          organization_id
        )
      `)
      .eq('gig_id', gigId)
      .eq('kit.organization_id', organizationId);

    if (assignError) throw assignError;

    // Every non-container kit's scannable units, respecting container
    // boundaries at every level, not just the top one — kit_flattened_cache
    // can't do this, since it flattens straight through every container
    // (a nested container's contents would leak out as individual rows
    // instead of one row for the sealed unit). getKitComponentTree walks
    // the real kit_components tree; flattenToScanUnits stops the moment a
    // container is reached, wherever it sits in the hierarchy.
    const scanUnitsByKit = new Map<string, ReturnType<typeof flattenToScanUnits>>();
    const containerContents = new Map<string, string[]>();
    for (const assignment of assignments ?? []) {
      const kit = (assignment as any).kit;
      if (kit?.is_container) {
        // A container assigned on its own is one line, listing what it holds (#185). The
        // list is a courtesy: if it can't be read, the line still shows.
        const tree = await getKitComponentTree(assignment.kit_id).catch(() => [] as KitComponentTreeNode[]);
        containerContents.set(assignment.kit_id, flattenToScanUnits([{
          clientKey: 'top', type: 'kit', quantity: 1, children: tree,
          kit: { id: assignment.kit_id, name: kit.name, category: null, is_container: true, tag_number: kit.tag_number ?? null },
        }], { id: assignment.kit_id, name: kit.name })[0]?.contents ?? []);
      } else {
        const tree = await getKitComponentTree(assignment.kit_id);
        scanUnitsByKit.set(assignment.kit_id, sumRepeatedLines(flattenToScanUnits(tree, { id: assignment.kit_id, name: kit.name })));
      }
    }

    const { data: trackingData, error: trackingError } = await supabase
      .from('inventory_tracking')
      .select('id, gig_id, kit_id, asset_id, status, location, quantity, scanned_at, scanned_by, notes, created_at, '
        + 'scanned_by_user:users!scanned_by(first_name, last_name, email), '
        + 'asset:asset_id(equipment_item_id, tag_number, serial_number, manufacturer_model, quantity, status, retired_on)')
      .eq('organization_id', organizationId)
      .eq('gig_id', gigId);

    if (trackingError) throw trackingError;

    const gigRows = ((trackingData ?? []) as any[]).filter((r) => r.gig_id === gigId);
    const latest = getLatestByKey(gigRows as unknown as DbInventoryTracking[]);

    // Packed means there now (#240 re-review): a unit only where its newest row anywhere puts
    // it, kit and gig; a lot by its newest row per kit here; a retired record never (bucketsAt).
    // So every row of what's been tracked here, from any gig.
    const recordById = new Map<string, ItemRecord>();
    for (const r of gigRows) if (r.asset_id && r.asset) recordById.set(r.asset_id, { id: r.asset_id, ...r.asset });
    let everyRow: TrackingRow[] = [];
    if (recordById.size > 0) {
      const { data: allRows, error: allRowsError } = await supabase
        .from('inventory_tracking')
        .select('id, gig_id, kit_id, asset_id, status, location, quantity, scanned_at, created_at')
        .eq('organization_id', organizationId)
        .in('asset_id', [...recordById.keys()]);
      if (allRowsError) throw allRowsError;
      everyRow = (allRows ?? []) as TrackingRow[];
    }
    const packedIn = (assetId: string | null, kitId: string | null) => {
      const record = assetId ? recordById.get(assetId) : undefined;
      if (!record) return 0;
      return bucketsAt(everyRow, record, gigId).filter((b) => b.kit_id === kitId).reduce((n, b) => n + b.quantity, 0);
    };
    const conflictFlags = await getInventoryConflictFlags(organizationId);

    // #185: an "any" line of an item with inventory tags is scanned piece by piece; without, counted.
    const anyItemIds = [...new Set([...scanUnitsByKit.values()].flat().filter((u) => u.kind === 'any' && u.item_id).map((u) => u.item_id!))];
    const taggedItems = new Set<string>();
    if (anyItemIds.length) {
      const { data: tagged, error: taggedError } = await (supabase.from('assets') as any)
        .select('equipment_item_id, tag_number, status, retired_on').eq('organization_id', organizationId).in('equipment_item_id', anyItemIds)
        .not('tag_number', 'is', null);
      if (taggedError) throw taggedError;
      // A blank tag isn't a tag, and a retired record's tag doesn't make the item scanned.
      for (const a of (tagged ?? []) as { equipment_item_id: string; tag_number: string | null; status: string | null; retired_on: string | null }[]) {
        if ((a.tag_number ?? '').trim() && !isRetired(a)) taggedItems.add(a.equipment_item_id);
      }
    }
    const isOut = (r: DbInventoryTracking | undefined) => !!r && r.status !== RETURNED_STATUS;

    const rows: PackingListRow[] = [];

    for (const assignment of assignments ?? []) {
      const kit = (assignment as any).kit;
      const kitId = assignment.kit_id;
      const hasConflict = conflictFlags.has(kitId);
      const group = {
        group_kit_id: kitId,
        group_kit_name: kit.name,
        group_is_container: !!kit.is_container,
        group_tag_number: kit.tag_number ?? null,
        ...((assignment as any).added_at_pack_out ? { group_added_at_pack_out: true } : {}),
      };

      if (kit.is_container) {
        const kitRecord = latest.find((r) => r.kit_id === kitId && !r.asset_id);
        rows.push({
          kit_id: kitId,
          kit_name: kit.name,
          is_container: true,
          asset_id: null,
          asset_name: null,
          tag_number: kit.tag_number ?? null,
          // A top-level kit is assigned to a gig once (gig_kit_assignments
          // has no quantity of its own) — quantity only varies for a
          // component *inside* a kit's tree, handled below.
          quantity: 1,
          kind: 'container',
          contents: containerContents.get(kitId) ?? [],
          packed: isOut(kitRecord) ? 1 : 0,
          status: kitRecord?.status ?? null,
          location: kitRecord?.location ?? null,
          scanned_at: kitRecord?.scanned_at ?? null,
          scanned_by_name: kitRecord ? formatUserName((kitRecord as any).scanned_by_user) : null,
          notes: kitRecord?.notes ?? null,
          has_conflict: hasConflict,
          ...group,
        });
      } else {
        const units = scanUnitsByKit.get(kitId) ?? [];
        // A unit on a specific line of the kit doesn't also fill one of its "any" lines.
        const specific = new Set(units.filter((u) => u.asset_id).map((u) => `${u.kit_id}:${u.asset_id}`));
        for (const unit of units) {
          const unitConflict = conflictFlags.has(unit.kit_id);
          if (unit.kind === 'any') {
            const forItem = latest.filter((r) => r.kit_id === unit.kit_id && r.asset_id
              && (r as any).asset?.equipment_item_id === unit.item_id && !specific.has(`${r.kit_id}:${r.asset_id}`));
            const packedUnits = forItem
              .map((r) => ({
                asset_id: r.asset_id!, tag_number: (r as any).asset?.tag_number ?? null,
                serial_number: (r as any).asset?.serial_number ?? null, quantity: packedIn(r.asset_id, unit.kit_id),
                status: r.status, location: r.location ?? null,
              }))
              .filter((u) => u.quantity > 0);
            rows.push({
              kit_id: unit.kit_id, kit_name: unit.kit_name, is_container: false, kind: 'any', item_id: unit.item_id,
              asset_id: null, asset_name: unit.asset_name, tag_number: null, quantity: unit.quantity,
              packed: packedUnits.reduce((n, u) => n + u.quantity, 0), packed_units: packedUnits,
              counted: !taggedItems.has(unit.item_id ?? ''),
              status: null, location: null, scanned_at: null, scanned_by_name: null, notes: null,
              has_conflict: unitConflict, ...group,
            });
            continue;
          }
          const unitRecord = latest.find((r) => r.kit_id === unit.kit_id && (r.asset_id ?? null) === unit.asset_id);
          rows.push({
            kit_id: unit.kit_id,
            kit_name: unit.kit_name,
            is_container: unit.is_container,
            kind: unit.kind,
            lot_of: unit.lot_of ?? null,
            contents: unit.contents,
            packed: unit.kind === 'container' ? (isOut(unitRecord) ? unit.quantity : 0) : packedIn(unit.asset_id, unit.kit_id),
            asset_id: unit.asset_id,
            asset_name: unit.asset_name,
            tag_number: unit.tag_number,
            quantity: unit.quantity,
            status: unitRecord?.status ?? null,
            location: unitRecord?.location ?? null,
            scanned_at: unitRecord?.scanned_at ?? null,
            scanned_by_name: unitRecord ? formatUserName((unitRecord as any).scanned_by_user) : null,
            notes: unitRecord?.notes ?? null,
            has_conflict: unitConflict,
            ...group,
          });
        }
      }
    }

    // What was added at pack-out on its own: each record's newest no-kit row here says how many.
    const looseId = looseGroupId(gigId);
    for (const r of latest.filter((t) => !t.kit_id && t.asset_id && (t as any).asset)
      .sort((a, b) => ((a as any).asset.manufacturer_model ?? '').localeCompare((b as any).asset.manufacturer_model ?? ''))) {
      const asset = (r as any).asset;
      const kind = recordKind(asset) === 'unit' && Number(asset.quantity ?? 1) <= 1 ? 'unit' : 'lot';
      const quantity = kind === 'unit' ? 1 : Math.max(1, Number(r.quantity ?? 1) || 1);
      rows.push({
        kit_id: looseId, kit_name: LOOSE_GROUP_NAME, is_container: false, kind,
        lot_of: kind === 'lot' ? Number(asset.quantity ?? 1) : null,
        packed: packedIn(r.asset_id, null),
        asset_id: r.asset_id, asset_name: asset.manufacturer_model ?? null, tag_number: asset.tag_number ?? null,
        quantity,
        status: r.status, location: r.location ?? null, scanned_at: r.scanned_at ?? null,
        scanned_by_name: formatUserName((r as any).scanned_by_user), notes: r.notes ?? null,
        has_conflict: false,
        group_kit_id: looseId, group_kit_name: LOOSE_GROUP_NAME, group_is_container: false, group_tag_number: null, group_is_loose: true,
      });
    }

    // A container reachable both directly (its own gig_kit_assignments row)
    // and nested inside another assigned kit's tree would otherwise produce
    // one row from each path: the same sealed case shown twice. Other lines
    // are summed within their kit instead (sumRepeatedLines).
    const seen = new Set<string>();
    const dedupedRows = rows.filter((row) => {
      if (!row.is_container) return true;
      if (seen.has(row.kit_id)) return false;
      seen.add(row.kit_id);
      return true;
    });

    return dedupedRows;
  } catch (err) {
    return handleApiError(err, 'get packing list report');
  }
}

/**
 * One line per unit, lot or "any" item within a kit (#240 review): nested lines are filed under
 * the owning kit, so 3 SM57s in "Drum mics" and 2 in "Guitar mics" are one line of 5, not 3.
 * A tracked unit listed twice stays one line of 1. Containers stay as they are.
 */
function sumRepeatedLines(units: ReturnType<typeof flattenToScanUnits>): ReturnType<typeof flattenToScanUnits> {
  const out: ReturnType<typeof flattenToScanUnits> = [];
  const byKey = new Map<string, (typeof out)[number]>();
  for (const unit of units) {
    if (unit.kind === 'container') {
      out.push(unit);
      continue;
    }
    const key = `${unit.kit_id}:${unit.asset_id ?? ''}:${unit.item_id ?? ''}`;
    const first = byKey.get(key);
    if (first) {
      // A tracked unit is one physical thing: listed twice, it's still one line of 1.
      if (unit.kind !== 'unit') first.quantity += unit.quantity;
      continue;
    }
    const copy = { ...unit };
    byKey.set(key, copy);
    out.push(copy);
  }
  return out;
}

export async function getMaintenanceQueueReport(organizationId: string): Promise<MaintenanceRow[]> {
  const supabase = getSupabase();
  try {
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      // kit_components has two FKs to kits (kit_id and child_kit_id) — the
      // hint picks the direct-parent-kit relationship, or PostgREST throws
      // PGRST201 for an ambiguous embed.
      .select('id, manufacturer_model, tag_number, kit_components(kit_id, kit:kits!kit_assets_kit_id_fkey(id, name))')
      .eq('organization_id', organizationId)
      .eq('status', 'Maintenance');

    if (assetsError) throw assetsError;

    const assetIds = (assets ?? []).map((a: any) => a.id);
    if (assetIds.length === 0) return [];

    const { data: trackingData, error: trackingError } = await supabase
      .from('inventory_tracking')
      .select('id, gig_id, kit_id, asset_id, status, location, scanned_at, scanned_by, notes, created_at, scanned_by_user:users!scanned_by(first_name, last_name, email), gig:gig_id(title)')
      .eq('organization_id', organizationId)
      .in('asset_id', assetIds)
      .order('scanned_at', { ascending: false });

    if (trackingError) throw trackingError;

    const latestByAsset = new Map<string, any>();
    for (const record of (trackingData ?? []) as any[]) {
      if (record.asset_id && !latestByAsset.has(record.asset_id)) {
        latestByAsset.set(record.asset_id, record);
      }
    }

    return (assets ?? []).map((asset: any): MaintenanceRow => {
      const kitAsset = asset.kit_components?.[0];
      const kit = kitAsset?.kit;
      const latestRecord = latestByAsset.get(asset.id);
      return {
        asset_id: asset.id,
        asset_name: asset.manufacturer_model ?? null,
        tag_number: asset.tag_number ?? null,
        kit_id: kit?.id ?? null,
        kit_name: kit?.name ?? null,
        last_gig_title: latestRecord?.gig?.title ?? null,
        condition_notes: latestRecord?.notes ?? null,
        date_flagged: latestRecord?.scanned_at ?? null,
        flagged_by_name: formatUserName(latestRecord?.scanned_by_user),
      };
    });
  } catch (err) {
    return handleApiError(err, 'get maintenance queue report');
  }
}

export async function getAssetTrackingSummary(
  organizationId: string
): Promise<Map<string, { status: string; location?: string | null; gigTitle?: string | null }>> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('inventory_tracking')
      .select('asset_id, gig_id, status, location, scanned_at, created_at, id, gig:gig_id(title)')
      .eq('organization_id', organizationId)
      .not('asset_id', 'is', null)
      .order('scanned_at', { ascending: false });

    if (error) throw error;

    const map = new Map<string, { status: string; location?: string | null; gigTitle?: string | null }>();
    for (const record of (data ?? []) as any[]) {
      if (record.asset_id && !map.has(record.asset_id)) {
        // Once returned, the asset isn't actively checked out to the gig
        // that last scanned it — even though the record itself still
        // points at that gig (rows are always gig-scoped).
        const isReturned = record.status === RETURNED_STATUS;
        map.set(record.asset_id, {
          status: record.status,
          location: record.location ?? null,
          gigTitle: isReturned ? null : (record.gig?.title ?? null),
        });
      }
    }
    return map;
  } catch (err) {
    return handleApiError(err, 'get asset tracking summary');
  }
}

export async function getKitTrackingSummary(
  organizationId: string
): Promise<Map<string, KitTrackingSummary>> {
  const supabase = getSupabase();
  try {
    const { data: kits, error: kitsError } = await supabase
      .from('kits')
      .select('id, is_container, kit_components!kit_assets_kit_id_fkey(asset_id)')
      .eq('organization_id', organizationId);

    if (kitsError) throw kitsError;

    const { data: trackingData, error: trackingError } = await supabase
      .from('inventory_tracking')
      .select('kit_id, asset_id, gig_id, status, location, scanned_at, created_at, id, gig:gig_id(title)')
      .eq('organization_id', organizationId)
      .order('scanned_at', { ascending: false });

    if (trackingError) throw trackingError;

    const latestRecords = getLatestByKey((trackingData ?? []) as DbInventoryTracking[]);

    const map = new Map<string, KitTrackingSummary>();

    // Pre-group tracking records by kit_id to avoid O(K*L) complexity
    const trackingByKit = new Map<string, DbInventoryTracking[]>();
    for (const record of latestRecords) {
      if (record.kit_id) {
        const list = trackingByKit.get(record.kit_id) ?? [];
        list.push(record);
        trackingByKit.set(record.kit_id, list);
      }
    }

    for (const kit of kits ?? []) {
      const kitId = (kit as any).id;
      const isContainer = (kit as any).is_container;
      const assetIds: string[] = ((kit as any).kit_components ?? []).map((kc: any) => kc.asset_id).filter(Boolean);

      const kitRecords = trackingByKit.get(kitId) ?? [];
      const kitRecord = kitRecords.find((r) => !r.asset_id);
      const assetRecords = kitRecords.filter((r) => r.asset_id);

      // A logical kit isn't scanned itself (#185): its newest row, kit-level or not, says where it is.
      const newestAsset = assetRecords.reduce<DbInventoryTracking | undefined>(
        (best, r) => (!best || r.scanned_at > best.scanned_at ? r : best), undefined);
      const representativeRecord = !isContainer && kitRecord && newestAsset && newestAsset.scanned_at > kitRecord.scanned_at
        ? newestAsset : kitRecord ?? newestAsset;
      const rawRecord = representativeRecord as any;
      const status = representativeRecord?.status ?? null;
      // Once returned, the kit isn't actively checked out to the gig that
      // last scanned it — even though the record itself still points at
      // that gig (rows are always gig-scoped).
      const isReturned = status === RETURNED_STATUS;

      const statusCounts: Record<string, number> = {};
      for (const ar of assetRecords) {
        statusCounts[ar.status] = (statusCounts[ar.status] ?? 0) + 1;
      }

      map.set(kitId, {
        kitId,
        isContainer,
        status,
        location: representativeRecord?.location ?? null,
        gigTitle: isReturned ? null : (rawRecord?.gig?.title ?? null),
        gigId: isReturned ? null : (representativeRecord?.gig_id ?? null),
        lastScannedAt: representativeRecord?.scanned_at ?? null,
        totalAssets: assetIds.length,
        scannedAssets: assetRecords.length,
        statusCounts,
      });
    }

    return map;
  } catch (err) {
    return handleApiError(err, 'get kit tracking summary');
  }
}

export async function getInventoryConflictFlags(organizationId: string): Promise<Set<string>> {
  const supabase = getSupabase();
  try {
    const { data: participatingGigIds, error: participantError } = await supabase
      .from('gig_participants')
      .select('gig_id')
      .eq('organization_id', organizationId);

    if (participantError) throw participantError;

    const gigIds = (participatingGigIds ?? []).map((r: any) => r.gig_id);
    if (gigIds.length === 0) return new Set();

    const { data: gigs, error: gigsError } = await supabase
      .from('gigs')
      .select('id, start, end, timezone')
      .in('id', gigIds)
      .not('status', 'eq', 'Cancelled');

    if (gigsError) throw gigsError;

    const { data: kitAssignments, error: kitError } = await supabase
      .from('gig_kit_assignments')
      .select('gig_id, kit_id')
      .in('gig_id', gigIds);

    if (kitError) throw kitError;

    const _gigMap = new Map((gigs ?? []).map((g: any) => [g.id, g]));
    const kitsByGig = new Map<string, string[]>();
    for (const assignment of kitAssignments ?? []) {
      const list = kitsByGig.get((assignment as any).gig_id) ?? [];
      list.push((assignment as any).kit_id);
      kitsByGig.set((assignment as any).gig_id, list);
    }

    const activeGigs = (gigs ?? []) as any[];
    const conflictedKitIds = new Set<string>();

    for (let i = 0; i < activeGigs.length; i++) {
      const gigA = activeGigs[i];
      const aStart = new Date(gigA.start);
      const aEnd = new Date(gigA.end);
      const kitsA = new Set(kitsByGig.get(gigA.id) ?? []);

      for (let j = i + 1; j < activeGigs.length; j++) {
        const gigB = activeGigs[j];
        const bStart = new Date(gigB.start);
        const bEnd = new Date(gigB.end);

        if (aStart > bEnd || aEnd < bStart) continue;

        const kitsB = kitsByGig.get(gigB.id) ?? [];
        for (const kitId of kitsB) {
          if (kitsA.has(kitId)) {
            conflictedKitIds.add(kitId);
          }
        }
      }
    }

    return conflictedKitIds;
  } catch (err) {
    return handleApiError(err, 'get inventory conflict flags');
  }
}
