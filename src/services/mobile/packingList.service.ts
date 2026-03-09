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
    const { data: kitAssignments, error: kitError } = await supabase
      .from('gig_kit_assignments')
      .select(`
        kit_id,
        notes,
        kit:kits(
          id,
          name,
          tag_number,
          is_container,
          assets:kit_assets(
            id,
            asset_id,
            quantity,
            asset:assets(*)
          )
        )
      `)
      .eq('gig_id', gigId);

    if (kitError) throw kitError;

    const missingAssetIds: string[] = [];
    (kitAssignments || []).forEach((assignment: any) => {
      (assignment.kit?.assets || []).forEach((assetAssignment: any) => {
        if (!assetAssignment.asset && assetAssignment.asset_id) {
          missingAssetIds.push(assetAssignment.asset_id);
        }
      });
    });

    if (missingAssetIds.length > 0) {
      const { data: assets } = await supabase
        .from('assets')
        .select('id, manufacturer_model, category, description, tag_number, serial_number, status')
        .in('id', missingAssetIds);

      if (assets && assets.length > 0) {
        const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
        (kitAssignments || []).forEach((assignment: any) => {
          (assignment.kit?.assets || []).forEach((assetAssignment: any) => {
            if (!assetAssignment.asset && assetAssignment.asset_id) {
              assetAssignment.asset = assetMap.get(assetAssignment.asset_id) || null;
            }
          });
        });
      }
    }

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
