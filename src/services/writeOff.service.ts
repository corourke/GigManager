import { format } from 'date-fns';
import { createClient } from '../utils/supabase/client';
import { handleApiError } from '../utils/api-error-utils';
import { requireAuth } from '../utils/supabase/auth-utils';
import { RETURNED_STATUS, SCANNING_MODES } from '../config/inventoryWorkflow';
import { bucketsAt, type TrackingRow } from '../utils/locations';
import { WRITE_OFF_LOCKED_MESSAGE, isLockedYearUndoError } from '../utils/writeOffMessages';

// #185: what is still out at a gig, and writing missing pieces off (Cameron, 10-09).
// Writing off and undoing go through the write_off_pieces / undo_write_off RPCs
// (migration 20261018000000), which allow only Admins and Managers.

const getSupabase = () => createClient();

export interface ReturnRecord {
  id: string;
  manufacturer_model: string;
  tag_number: string | null;
  serial_number: string | null;
  quantity: number | null;
  status: string | null;
  retired_on: string | null;
}

/** One kit's share of a record still out at the gig. */
export interface NotReturnedEntry {
  record: ReturnRecord;
  kitId: string | null;
  kitName: string | null;
  quantity: number;
  status: string;
  location: string | null;
}

/** A write-off made at the gig that hasn't been undone. */
export interface WrittenOffEntry {
  record: ReturnRecord;
  quantity: number;
  note: string | null;
}

const RECORD_FIELDS = 'id, manufacturer_model, tag_number, serial_number, quantity, status, retired_on';
const RETURN_LOCATION = SCANNING_MODES.find((m) => m.resultingStatus === RETURNED_STATUS)?.locationLabel ?? null;

/** What is still out at the gig, kit by kit, and what was written off there. */
export async function getGigReturns(organizationId: string, gigId: string): Promise<{
  notReturned: NotReturnedEntry[];
  writtenOff: WrittenOffEntry[];
}> {
  const supabase = getSupabase();
  try {
    const [atGig, writeOffs] = await Promise.all([
      (supabase.from('inventory_tracking') as any)
        .select('asset_id').eq('organization_id', organizationId).eq('gig_id', gigId).not('asset_id', 'is', null),
      (supabase.from('activity_log') as any)
        .select('entity_id, context').eq('organization_id', organizationId).eq('gig_id', gigId)
        .eq('event_type', 'asset.written_off'),
    ]);
    for (const r of [atGig, writeOffs]) if (r.error) throw r.error;

    const outIds = [...new Set<string>((atGig.data ?? []).map((r: { asset_id: string }) => r.asset_id))];
    const offIds = [...new Set<string>((writeOffs.data ?? []).map((r: { entity_id: string }) => r.entity_id))];
    const [rows, records, offRecords] = await Promise.all([
      outIds.length
        ? (supabase.from('inventory_tracking') as any)
            .select('id, gig_id, kit_id, asset_id, status, location, quantity, scanned_at, created_at, kit:kit_id(name)')
            .eq('organization_id', organizationId).in('asset_id', outIds)
        : { data: [], error: null },
      outIds.length
        ? (supabase.from('assets') as any).select(RECORD_FIELDS).eq('organization_id', organizationId).in('id', outIds)
        : { data: [], error: null },
      offIds.length
        ? (supabase.from('assets') as any).select(RECORD_FIELDS).eq('organization_id', organizationId)
            .in('id', offIds).eq('status', 'Missing')
        : { data: [], error: null },
    ]);
    for (const r of [rows, records, offRecords]) if (r.error) throw r.error;

    const trackingRows = (rows.data ?? []) as (TrackingRow & { kit?: { name: string } | null })[];
    const kitNames = new Map(trackingRows.filter((r) => r.kit_id).map((r) => [r.kit_id!, r.kit?.name ?? null]));
    const notReturned = ((records.data ?? []) as ReturnRecord[])
      .flatMap((record) => bucketsAt(trackingRows, record, gigId).map((b) => ({
        record, kitId: b.kit_id, kitName: b.kit_id ? kitNames.get(b.kit_id) ?? null : null,
        quantity: b.quantity, status: b.status, location: b.location,
      })))
      .sort((a, b) => a.record.manufacturer_model.localeCompare(b.record.manufacturer_model) || (a.kitName ?? '').localeCompare(b.kitName ?? ''));

    const notes = new Map<string, string | null>();
    for (const w of (writeOffs.data ?? []) as { entity_id: string; context: { note?: string | null } | null }[]) {
      notes.set(w.entity_id, w.context?.note ?? null);
    }
    const writtenOff = ((offRecords.data ?? []) as ReturnRecord[])
      .map((record) => ({ record, quantity: Number(record.quantity ?? 1), note: notes.get(record.id) ?? null }))
      .sort((a, b) => a.record.manufacturer_model.localeCompare(b.record.manufacturer_model));

    return { notReturned, writtenOff };
  } catch (err) {
    return handleApiError(err, 'load what is still out at the gig');
  }
}

/** Write pieces off as missing. `stillOut`: how many of that kit's pieces stay at the gig. */
export async function writeOffPieces(params: {
  assetId: string;
  quantity: number;
  gigId: string;
  kitId: string | null;
  stillOut?: number;
  note?: string | null;
}): Promise<string> {
  const supabase = getSupabase();
  try {
    const { data, error } = await (supabase as any).rpc('write_off_pieces', {
      p_asset_id: params.assetId,
      p_quantity: params.quantity,
      p_gig_id: params.gigId,
      p_kit_id: params.kitId,
      p_still_out: params.stillOut ?? 0,
      p_note: params.note ?? null,
      // The caller's own day: a Dec 31 evening write-off lands in that year, not UTC's next one.
      p_on: format(new Date(), 'yyyy-MM-dd'),
    });
    if (error) throw error;
    return data as string;
  } catch (err) {
    return handleApiError(err, 'write off the equipment');
  }
}

/** Bring written-off equipment back; a split-off piece goes back into its lot. */
export async function undoWriteOff(assetId: string): Promise<string> {
  const supabase = getSupabase();
  try {
    const { data, error } = await (supabase as any).rpc('undo_write_off', { p_asset_id: assetId });
    if (error) throw error;
    return data as string;
  } catch (err) {
    // The DB's locked-year text points to a "found" action the app doesn't have.
    if (isLockedYearUndoError(err)) {
      const locked: any = new Error(WRITE_OFF_LOCKED_MESSAGE);
      locked.code = (err as { code?: string }).code;
      throw locked;
    }
    return handleApiError(err, 'undo the write-off');
  }
}

/** Record pieces as back home: a return row in the kit's bucket at the gig. */
export async function markReturned(params: {
  organizationId: string;
  gigId: string;
  kitId: string | null;
  assetId: string;
  quantity: number;
}): Promise<void> {
  try {
    const { supabase, user } = await requireAuth();
    const { error } = await (supabase.from('inventory_tracking') as any).insert({
      organization_id: params.organizationId,
      gig_id: params.gigId,
      kit_id: params.kitId,
      asset_id: params.assetId,
      status: RETURNED_STATUS,
      quantity: Math.max(1, params.quantity),
      location: RETURN_LOCATION,
      scanned_at: new Date().toISOString(),
      scanned_by: user.id,
    });
    if (error) throw error;
  } catch (err) {
    return handleApiError(err, 'mark the equipment returned');
  }
}
