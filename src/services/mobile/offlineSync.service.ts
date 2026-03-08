import { createClient } from '../../utils/supabase/client';
import { idbStore, OutboxItem } from '../../utils/idb/store';

const supabase = createClient();

type SyncHandler = (payload: any) => Promise<void>;

const syncHandlers: Record<string, SyncHandler> = {};

export function registerSyncHandler(type: string, handler: SyncHandler) {
  syncHandlers[type] = handler;
}

registerSyncHandler('INVENTORY_SCAN', async (payload: any) => {
  const { error } = await supabase
    .from('inventory_tracking')
    .upsert(payload, { onConflict: 'gig_id, kit_id, asset_id' });
  if (error) throw error;
});

export const offlineSyncService = {
  async processOutbox() {
    const outbox = await idbStore.getOutbox();
    if (outbox.length === 0) return;

    for (const item of outbox) {
      try {
        await this.syncItem(item);
        await idbStore.removeFromOutbox(item.id!);
      } catch (error) {
        console.error('Sync failed for item:', item, error);
        item.attempts = (item.attempts || 0) + 1;
        await idbStore.updateOutboxItem(item);
      }
    }
  },

  async syncItem(item: OutboxItem) {
    const handler = syncHandlers[item.type];
    if (!handler) {
      console.warn('Unknown outbox item type:', item.type);
      return;
    }
    await handler(item.payload);
  },

  async queueTrackingUpdate(payload: any, type: OutboxItem['type']) {
    return idbStore.addToOutbox({ type, payload });
  }
};

// Auto-sync when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    offlineSyncService.processOutbox();
  });
}
