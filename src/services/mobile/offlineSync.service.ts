import { createClient } from '../../utils/supabase/client';
import { idbStore, OutboxItem } from '../../utils/idb/store';

const supabase = createClient();

type SyncHandler = (payload: any) => Promise<void>;

const syncHandlers: Record<string, SyncHandler> = {};

const getLatestTrackingQuery = (payload: any) => {
  let query = supabase
    .from('inventory_tracking')
    .select('id, scanned_at, created_at, status, scanned_by, notes')
    .eq('gig_id', payload.gig_id)
    .eq('kit_id', payload.kit_id)
    .order('scanned_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);

  if (payload.asset_id) {
    query = query.eq('asset_id', payload.asset_id);
  } else {
    query = query.is('asset_id', null);
  }

  return query;
};

export function registerSyncHandler(type: string, handler: SyncHandler) {
  syncHandlers[type] = handler;
}

registerSyncHandler('INVENTORY_SCAN', async (payload: any) => {
  const { error } = await supabase
    .from('inventory_tracking')
    .insert({
      organization_id: payload.organization_id,
      gig_id: payload.gig_id,
      kit_id: payload.kit_id,
      asset_id: payload.asset_id ?? null,
      status: payload.status,
      scanned_at: payload.scanned_at,
      scanned_by: payload.scanned_by,
      notes: payload.notes ?? null,
    });

  if (error) {
    throw error;
  }
});

registerSyncHandler('INVENTORY_CLEAR', async (payload: any) => {
  if (payload.record_id) {
    const { error } = await supabase
      .from('inventory_tracking')
      .delete()
      .eq('id', payload.record_id);

    if (error) {
      throw error;
    }
    return;
  }

  const { data: latest, error: latestError } = await getLatestTrackingQuery(payload).maybeSingle();

  if (latestError) {
    throw latestError;
  }

  if (!latest?.id) {
    return;
  }

  const { error } = await supabase
    .from('inventory_tracking')
    .delete()
    .eq('id', latest.id);

  if (error) {
    throw error;
  }
});

registerSyncHandler('INVENTORY_NOTE_UPDATE', async (payload: any) => {
  const recordId = payload.record_id;

  if (recordId) {
    const { error } = await supabase
      .from('inventory_tracking')
      .update({ notes: payload.notes ?? null })
      .eq('id', recordId);

    if (error) {
      throw error;
    }
    return;
  }

  const { data: latest, error: latestError } = await getLatestTrackingQuery(payload).maybeSingle();

  if (latestError) {
    throw latestError;
  }

  if (!latest?.id) {
    return;
  }

  const { error } = await supabase
    .from('inventory_tracking')
    .update({ notes: payload.notes ?? null })
    .eq('id', latest.id);

  if (error) {
    throw error;
  }
});

registerSyncHandler('ASSET_STATUS_UPDATE', async (payload: any) => {
  const { error } = await supabase.rpc('update_asset_status', {
    p_asset_id: payload.asset_id,
    p_status: payload.status,
  });

  if (error) {
    throw error;
  }
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

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    offlineSyncService.processOutbox();
  });
}
