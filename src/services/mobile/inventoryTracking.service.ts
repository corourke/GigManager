import { idbStore } from '../../utils/idb/store';
import { offlineSyncService } from './offlineSync.service';
import { createClient } from '../../utils/supabase/client';

const supabase = createClient();

export const inventoryTrackingService = {
  /**
   * Match a scanned tag number to an asset or kit within the organization
   */
  async matchTag(tagNumber: string) {
    // 1. Check kits first
    const { data: kit, error: kitError } = await supabase
      .from('kits')
      .select('id, name, tag_number')
      .eq('tag_number', tagNumber)
      .single();

    if (!kitError && kit) {
      return { type: 'kit', item: kit };
    }

    // 2. Check assets
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, name, tag_number')
      .eq('tag_number', tagNumber)
      .single();

    if (!assetError && asset) {
      return { type: 'asset', item: asset };
    }

    return null;
  },

  /**
   * Submit a scan result for a gig
   */
  async submitScan(params: {
    gigId: string;
    kitId: string;
    assetId?: string;
    status: string;
  }) {
    const { gigId, kitId, assetId, status } = params;

    const payload = {
      gig_id: gigId,
      kit_id: kitId,
      asset_id: assetId || null,
      status,
      scanned_at: new Date().toISOString(),
    };

    // 1. Optimistically update local IndexedDB packing list
    const packingList = await idbStore.getPackingList(gigId);
    if (packingList) {
      const existingIndex = packingList.tracking.findIndex(
        (t: any) => t.gig_id === gigId && t.kit_id === kitId && t.asset_id === (assetId || null)
      );

      if (existingIndex > -1) {
        packingList.tracking[existingIndex] = { ...packingList.tracking[existingIndex], ...payload };
      } else {
        packingList.tracking.push(payload);
      }
      
      await idbStore.putPackingList(gigId, packingList);
    }

    // 2. Queue for sync
    await offlineSyncService.queueTrackingUpdate(payload, 'INVENTORY_SCAN');

    // 3. Attempt immediate sync
    try {
      if (navigator.onLine) {
        await offlineSyncService.processOutbox();
      }
    } catch (error) {
      console.warn('Background sync failed, will retry later', error);
    }

    return payload;
  }
};
