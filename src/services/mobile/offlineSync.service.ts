import { createClient } from '../../utils/supabase/client';
import { idbStore, OutboxItem } from '../../utils/idb/store';
import { toast } from 'sonner';

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
      location: payload.location ?? null,
      // How many of the unit or lot are there as of this scan (#185); 1 for a unit.
      quantity: Math.max(1, Math.floor(Number(payload.quantity ?? 1)) || 1),
    });

  if (error) {
    throw error;
  }
});

registerSyncHandler('INVENTORY_CLEAR', async (payload: any) => {
  // A kit added at pack-out, removed: every row it wrote at the gig (#185 PR 2). Rows queued
  // before this sync first, so they go too.
  if (payload.all_for_kit) {
    const { error } = await supabase.from('inventory_tracking').delete()
      .eq('gig_id', payload.gig_id)
      .eq('kit_id', payload.kit_id);
    if (error) throw error;
    return;
  }
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

  // Refused (not allowed, e.g. Staff bringing back written-off equipment): a retry won't
  // change that, so say why and drop it rather than retrying it silently forever.
  if ((error as any)?.code === '42501') {
    toast.error(`Status not changed: ${(error as any).message}`);
    return;
  }
  if (error) {
    throw error;
  }
});

// A kit added at pack-out (#185): a flagged assignment. Already there (a retry) counts as done;
// refused (not allowed, or the kit is gone) won't change on a retry, so say why and drop it.
registerSyncHandler('KIT_ASSIGNMENT_ADD', async (payload: any) => {
  const { error } = await (supabase.from('gig_kit_assignments') as any).insert(payload);
  if ((error as any)?.code === '23505') return;
  if ((error as any)?.code === '42501') {
    toast.error(`Kit not added to the gig: ${(error as any).message}`);
    return;
  }
  if (error) throw error;
});

// Removing a kit added at pack-out: only the adder's own flagged assignment.
registerSyncHandler('KIT_ASSIGNMENT_REMOVE', async (payload: any) => {
  const { error } = await (supabase.from('gig_kit_assignments') as any)
    .delete()
    .eq('gig_id', payload.gig_id)
    .eq('kit_id', payload.kit_id)
    .eq('added_at_pack_out', true)
    .eq('assigned_by', payload.assigned_by);
  if ((error as any)?.code === '42501') {
    toast.error(`Kit not removed from the gig: ${(error as any).message}`);
    return;
  }
  if (error) throw error;
});

registerSyncHandler('STAFF_ASSIGNMENT_UPDATE', async (payload: any) => {
  const updateData: Record<string, any> = { status: payload.status };
  if (payload.status === 'Confirmed') {
    updateData.confirmed_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from('gig_staff_assignments')
    .update(updateData)
    .eq('id', payload.assignmentId);

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
