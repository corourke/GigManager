import { createClient } from '../utils/supabase/client';
import { handleApiError } from '../utils/api-error-utils';
import { SCANNING_MODES } from '../config/inventoryWorkflow';
import type { DbInventoryTracking } from '../utils/supabase/types';

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
  kit_id: string;
  kit_name?: string | null;
  is_container: boolean;
  asset_id?: string | null;
  asset_name?: string | null;
  tag_number?: string | null;
  status?: string | null;
  location?: string | null;
  scanned_at?: string | null;
  scanned_by_name?: string | null;
  notes?: string | null;
  has_conflict: boolean;
}

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
          tag_number,
          assets:kit_assets(
            asset_id,
            asset:assets(id, manufacturer_model, tag_number, status)
          )
        )
      `)
      .in('gig_id', activeGigIds);

    if (assignError) throw assignError;

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
            assets: (a.kit.assets ?? []).map((ka: any) => ({
              asset_id: ka.asset_id,
              asset: {
                id: ka.asset.id,
                manufacturer_model: ka.asset.manufacturer_model ?? null,
                tag_number: ka.asset.tag_number ?? null,
                status: ka.asset.status ?? null,
              },
            })),
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
      .select('id, gig_id, kit_id, asset_id, status, location, scanned_at, scanned_by, notes, created_at, scanned_by_user:users!scanned_by(first_name, last_name, email), kit:kit_id(name), gig:gig_id(title)')
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
    const { organizationId, gigId, kitId, assetId, status, location, notes, createdBy, isContainerKit, assetIds } = params;
    const now = new Date().toISOString();

    const buildRecord = (targetAssetId?: string) => ({
      organization_id: organizationId,
      gig_id: gigId,
      kit_id: kitId,
      asset_id: targetAssetId ?? null,
      status,
      location: location ?? null,
      notes: notes ?? null,
      scanned_at: now,
      scanned_by: createdBy,
    });

    if (assetId) {
      const record = buildRecord(assetId);
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

    const records = [buildRecord(undefined), ...(assetIds ?? []).map((id) => buildRecord(id))];
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
    const latest = getLatestByKey(records as DbInventoryTracking[]);

    const conflictFlags = await getInventoryConflictFlags(organizationId);

    return latest.map((record): ManifestRow => {
      const rawRecord = records.find((r) => r.id === record.id) as any;
      return {
        kit_id: record.kit_id ?? '',
        kit_name: rawRecord?.kit?.name ?? null,
        asset_id: record.asset_id ?? null,
        asset_name: null,
        tag_number: null,
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
        kit:kits!inner(
          id,
          name,
          is_container,
          tag_number,
          organization_id,
          assets:kit_assets(
            asset_id,
            asset:assets(id, manufacturer_model, tag_number)
          )
        )
      `)
      .eq('gig_id', gigId)
      .eq('kit.organization_id', organizationId);

    if (assignError) throw assignError;

    const { data: trackingData, error: trackingError } = await supabase
      .from('inventory_tracking')
      .select('id, gig_id, kit_id, asset_id, status, location, scanned_at, scanned_by, notes, created_at, scanned_by_user:users!scanned_by(first_name, last_name, email)')
      .eq('organization_id', organizationId)
      .eq('gig_id', gigId);

    if (trackingError) throw trackingError;

    const latest = getLatestByKey((trackingData ?? []) as DbInventoryTracking[]);
    const conflictFlags = await getInventoryConflictFlags(organizationId);

    const rows: PackingListRow[] = [];

    for (const assignment of assignments ?? []) {
      const kit = (assignment as any).kit;
      const kitId = assignment.kit_id;
      const hasConflict = conflictFlags.has(kitId);

      if (kit.is_container) {
        const kitRecord = latest.find((r) => r.kit_id === kitId && !r.asset_id);
        rows.push({
          kit_id: kitId,
          kit_name: kit.name,
          is_container: true,
          asset_id: null,
          asset_name: null,
          tag_number: kit.tag_number ?? null,
          status: kitRecord?.status ?? null,
          location: kitRecord?.location ?? null,
          scanned_at: kitRecord?.scanned_at ?? null,
          scanned_by_name: kitRecord ? formatUserName((kitRecord as any).scanned_by_user) : null,
          notes: kitRecord?.notes ?? null,
          has_conflict: hasConflict,
        });
      } else {
        for (const ka of kit.assets ?? []) {
          const assetId = ka.asset_id;
          const asset = ka.asset;
          const assetRecord = latest.find((r) => r.kit_id === kitId && r.asset_id === assetId);
          rows.push({
            kit_id: kitId,
            kit_name: kit.name,
            is_container: false,
            asset_id: assetId,
            asset_name: asset?.manufacturer_model ?? null,
            tag_number: asset?.tag_number ?? null,
            status: assetRecord?.status ?? null,
            location: assetRecord?.location ?? null,
            scanned_at: assetRecord?.scanned_at ?? null,
            scanned_by_name: assetRecord ? formatUserName((assetRecord as any).scanned_by_user) : null,
            notes: assetRecord?.notes ?? null,
            has_conflict: hasConflict,
          });
        }
      }
    }

    return rows;
  } catch (err) {
    return handleApiError(err, 'get packing list report');
  }
}

export async function getMaintenanceQueueReport(organizationId: string): Promise<MaintenanceRow[]> {
  const supabase = getSupabase();
  try {
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, manufacturer_model, tag_number, kit_assets(kit_id, kit:kits(id, name))')
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
      const kitAsset = asset.kit_assets?.[0];
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
        map.set(record.asset_id, {
          status: record.status,
          location: record.location ?? null,
          gigTitle: record.gig?.title ?? null,
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
      .select('id, is_container, kit_assets(asset_id)')
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
      const assetIds: string[] = ((kit as any).kit_assets ?? []).map((ka: any) => ka.asset_id).filter(Boolean);

      const kitRecords = trackingByKit.get(kitId) ?? [];
      const kitRecord = kitRecords.find((r) => !r.asset_id);
      const assetRecords = kitRecords.filter((r) => r.asset_id);

      const representativeRecord = kitRecord ?? assetRecords[0];
      const rawRecord = representativeRecord as any;

      const statusCounts: Record<string, number> = {};
      for (const ar of assetRecords) {
        statusCounts[ar.status] = (statusCounts[ar.status] ?? 0) + 1;
      }

      map.set(kitId, {
        kitId,
        isContainer,
        status: kitRecord?.status ?? assetRecords[0]?.status ?? null,
        location: representativeRecord?.location ?? null,
        gigTitle: rawRecord?.gig?.title ?? null,
        gigId: representativeRecord?.gig_id ?? null,
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

    const gigMap = new Map((gigs ?? []).map((g: any) => [g.id, g]));
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
