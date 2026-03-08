import { createClient } from '../../utils/supabase/client';
import { idbStore } from '../../utils/idb/store';

const supabase = createClient();

export const packingListService = {
  /**
   * Fetch gigs within the next 48 hours for the current user
   */
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

  /**
   * Fetch full packing list for a gig (kits, assets, and tracking status)
   */
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
    (kitAssignments || []).forEach((ka: any) => {
      (ka.kit?.assets || []).forEach((ca: any) => {
        if (!ca.asset && ca.asset_id) missingAssetIds.push(ca.asset_id);
      });
    });

    if (missingAssetIds.length > 0) {
      const { data: assets } = await supabase
        .from('assets')
        .select('id, manufacturer_model, category, description, tag_number, serial_number')
        .in('id', missingAssetIds);

      if (assets && assets.length > 0) {
        const assetMap = new Map(assets.map(a => [a.id, a]));
        (kitAssignments || []).forEach((ka: any) => {
          (ka.kit?.assets || []).forEach((ca: any) => {
            if (!ca.asset && ca.asset_id) {
              ca.asset = assetMap.get(ca.asset_id) || null;
            }
          });
        });
      }
    }

    const { data: tracking, error: trackingError } = await supabase
      .from('inventory_tracking')
      .select('*')
      .eq('gig_id', gigId);

    if (trackingError) throw trackingError;

    const { data: gigData } = await supabase
      .from('gigs')
      .select('title')
      .eq('id', gigId)
      .single();

    const packingListData = {
      gig_id: gigId,
      gig_title: gigData?.title || null,
      kits: kitAssignments,
      tracking: tracking || [],
      last_synced: Date.now()
    };

    await idbStore.putPackingList(gigId, packingListData);
    return packingListData;
  },

  /**
   * Sync all data for upcoming gigs
   */
  async syncAllUpcoming() {
    const gigs = await this.fetchUpcomingGigs();
    if (!gigs) return;

    for (const gig of gigs) {
      await this.fetchGigPackingList(gig.id);
    }
  }
};
