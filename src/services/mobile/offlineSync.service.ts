import { createClient } from '../../utils/supabase/client';
import { idbStore, OutboxItem } from '../../utils/idb/store';

const supabase = createClient();

export const offlineSyncService = {
  /**
   * Process all pending items in the outbox
   */
  async processOutbox() {
    const outbox = await idbStore.getOutbox();
    if (outbox.length === 0) return;

    for (const item of outbox) {
      try {
        await this.syncItem(item);
        await idbStore.removeFromOutbox(item.id!);
      } catch (error) {
        console.error('Sync failed for item:', item, error);
        // Update retry count
        item.attempts = (item.attempts || 0) + 1;
        await idbStore.updateOutboxItem(item);
      }
    }
  },

  /**
   * Sync a single item to Supabase
   */
  async syncItem(item: OutboxItem) {
    switch (item.type) {
      case 'PACK_ASSET':
      case 'UNPACK_ASSET':
      case 'CHECK_IN':
      case 'CHECK_OUT':
        // These all map to inventory_tracking insertions/upserts
        const { error } = await supabase
          .from('inventory_tracking')
          .upsert(item.payload, {
            onConflict: 'gig_id, kit_id, asset_id'
          });
        if (error) throw error;
        break;
      default:
        console.warn('Unknown outbox item type:', item.type);
    }
  },

  /**
   * Queue an inventory tracking update for background sync
   */
  async queueTrackingUpdate(payload: any, type: OutboxItem['type']) {
    // Optimistically update IDB local state if needed (can be handled in components)
    return idbStore.addToOutbox({
      type,
      payload,
    });
  }
};

// Auto-sync when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    offlineSyncService.processOutbox();
  });
}
