import { createClient } from '../../utils/supabase/client';
import { idbStore } from '../../utils/idb/store';

const supabase = createClient();

export const packingListService = {
  async fetchUpcomingGigs() {
    const lookBack = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const lookAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (import.meta.env.DEV) {
      console.log('[TRACE] packingListService:fetchUpcomingGigs:start', {
        online: navigator.onLine,
        lookBack: lookBack.toISOString(),
        lookAhead: lookAhead.toISOString(),
      });
    }

    const { data: gigs, error } = await supabase
      .from('gigs')
      .select(`
        *,
        participants:gig_participants(
          organization_id,
          role,
          organization:organizations(id, name)
        )
      `)
      .gte('start', lookBack.toISOString())
      .lte('start', lookAhead.toISOString())
      .order('start', { ascending: true });

    if (error) {
      if (import.meta.env.DEV) {
        console.log('[TRACE] packingListService:fetchUpcomingGigs:error', {
          name: (error as any)?.name || null,
          message: (error as any)?.message || String(error),
          code: (error as any)?.code || null,
        });
      }
      throw error;
    }

    if (import.meta.env.DEV) {
      console.log('[TRACE] packingListService:fetchUpcomingGigs:success', {
        count: gigs?.length || 0,
      });
    }

    try {
      await idbStore.putGigs(gigs || []);
    } catch (cacheError: any) {
      if (import.meta.env.DEV) {
        console.log('[TRACE] packingListService:fetchUpcomingGigs:cache-write-error', {
          name: cacheError?.name || null,
          message: cacheError?.message || String(cacheError),
          code: cacheError?.code || null,
        });
      }
    }

    return gigs;
  },

  async fetchGigPackingList(gigId: string) {
    const { data: rawAssignments, error: kitError } = await supabase
      .from('gig_kit_assignments')
      .select('kit_id, notes, kit:kits(id, name, tag_number, is_container)')
      .eq('gig_id', gigId);

    if (kitError) throw kitError;

    const topLevel = (rawAssignments || []).filter((a: any) => a.kit);

    // Walk each top-level kit's nested structure so every sub-kit — at any
    // depth — becomes its own scannable entry below, not just the kits
    // directly assigned to the gig. This is what lets scanning a sub-kit's
    // own physical tag work, and lets a container sub-kit cascade correctly
    // even when it's nested inside a non-container parent.
    const descendantIds = new Set<string>();
    for (const assignment of topLevel) {
      const { data: tree, error: treeError } = await supabase.rpc('get_kit_hierarchy_tree', {
        p_kit_id: (assignment as any).kit.id,
      });
      if (treeError) throw treeError;
      for (const edge of tree || []) descendantIds.add((edge as any).child_kit_id);
    }

    const topLevelIds = new Set(topLevel.map((a: any) => a.kit.id));
    const newDescendantIds = [...descendantIds].filter((id) => !topLevelIds.has(id));

    let descendantKits: any[] = [];
    if (newDescendantIds.length > 0) {
      const { data, error } = await supabase
        .from('kits')
        .select('id, name, tag_number, is_container')
        .in('id', newDescendantIds);
      if (error) throw error;
      descendantKits = data || [];
    }

    // One entry per unique kit in the whole forest (top-level + every
    // descendant, deduped — a kit shared by two parents appears once).
    const allKitNodes = [
      ...topLevel.map((a: any) => ({ kit_id: a.kit.id, notes: a.notes, kit: a.kit })),
      ...descendantKits.map((k) => ({ kit_id: k.id, notes: null, kit: k })),
    ];
    const allKitIds = allKitNodes.map((n) => n.kit_id);

    const { data: flattenedRows, error: flattenError } = allKitIds.length > 0
      ? await supabase.from('kit_flattened_cache').select('kit_id, asset_id, total_quantity').in('kit_id', allKitIds)
      : { data: [], error: null };
    if (flattenError) throw flattenError;

    const assetIdsNeeded = Array.from(new Set((flattenedRows || []).map((r: any) => r.asset_id)));
    let assetMap = new Map<string, any>();
    if (assetIdsNeeded.length > 0) {
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .in('id', assetIdsNeeded);
      if (assetsError) throw assetsError;
      assetMap = new Map((assets || []).map((a: any) => [a.id, a]));
    }

    const assetsByKit = new Map<string, any[]>();
    for (const row of (flattenedRows || []) as any[]) {
      const list = assetsByKit.get(row.kit_id) ?? [];
      list.push({ asset_id: row.asset_id, quantity: row.total_quantity, asset: assetMap.get(row.asset_id) || null });
      assetsByKit.set(row.kit_id, list);
    }

    const kitAssignments = allKitNodes.map((node) => ({
      kit_id: node.kit_id,
      notes: node.notes,
      kit: { ...node.kit, assets: assetsByKit.get(node.kit_id) || [] },
    }));

    const { data: tracking, error: trackingError } = await supabase
      .from('inventory_tracking')
      .select('*')
      .eq('gig_id', gigId)
      .order('scanned_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (trackingError) throw trackingError;

    const scannedByIds = Array.from(new Set((tracking || []).map((record: any) => record.scanned_by).filter(Boolean)));
    let userMap = new Map<string, any>();

    if (scannedByIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', scannedByIds);

      userMap = new Map((users || []).map((user: any) => [user.id, user]));
    }

    const enrichedTracking = (tracking || []).map((record: any) => ({
      ...record,
      scanned_by_user: record.scanned_by ? userMap.get(record.scanned_by) || null : null,
    }));

    const { data: gigData } = await supabase
      .from('gigs')
      .select('title')
      .eq('id', gigId)
      .single();

    const cached = await idbStore.getPackingList(gigId);
    const localOnlyTracking = (cached?.tracking || []).filter((record: any) => !record.id);

    const serverIds = new Set((enrichedTracking || []).map((record: any) => {
      return `${record.kit_id}|${record.asset_id ?? ''}|${record.scanned_at}|${record.status}`;
    }));
    const unsyncedLocal = localOnlyTracking.filter((record: any) => {
      const key = `${record.kit_id}|${record.asset_id ?? ''}|${record.scanned_at}|${record.status}`;
      return !serverIds.has(key);
    });

    const mergedTracking = [...unsyncedLocal, ...enrichedTracking].sort(
      (left: any, right: any) => new Date(right.scanned_at).getTime() - new Date(left.scanned_at).getTime()
    );

    const packingListData = {
      gig_id: gigId,
      gig_title: gigData?.title || null,
      kits: kitAssignments,
      tracking: mergedTracking,
      last_synced: Date.now()
    };

    await idbStore.putPackingList(gigId, packingListData);
    return packingListData;
  },

  async syncAllUpcoming() {
    const gigs = await this.fetchUpcomingGigs();
    if (!gigs) return;

    for (const gig of gigs) {
      await this.fetchGigPackingList(gig.id);
    }
  }
};
