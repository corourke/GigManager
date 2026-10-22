// Maintenance (#186, Cameron 10-18): send equipment to maintenance, edit its details, return it
// to service, and list what's in maintenance or flagged to go when it comes home. The database
// functions (20261022000000) do the work and check who may; sending without a gig first applies
// the Locations rule's home count, which the database leaves to the screens.
import { createClient } from '../utils/supabase/client';
import { handleApiError } from '../utils/api-error-utils';
import { piecesHome, type TrackingRow } from '../utils/locations';
import { recordKind } from '../utils/equipmentItems';

const getSupabase = () => createClient();
const TRACKING_PAGE = 1000;

/** A refusal from the database, with its message as written there and its code (42501, 22023). */
export class MaintenanceError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'MaintenanceError';
    this.code = code;
  }
}

const blank = (s: string | null | undefined) => (s && s.trim() !== '' ? s.trim() : null);

function refused(error: { code?: string; message?: string } | null): never | void {
  if (!error) return;
  // A network failure goes through handleApiError as elsewhere; the database's own refusals read as written.
  if (error.code && error.message) throw new MaintenanceError(error.message, error.code);
  throw error;
}

export interface SendToMaintenanceParams {
  assetId: string;
  quantity: number;
  notes?: string | null;
  location?: string | null;
  /** yyyy-mm-dd */
  expectedBack?: string | null;
  /** The gig it's flagged at, if it's still out there: it goes in when it comes home. */
  gigId?: string | null;
}

/** How many of a record are home, read from its tracking rows by the Locations rule. */
async function homeCount(assetId: string): Promise<{ home: number; unit: boolean }> {
  const supabase = getSupabase();
  const { data: record, error } = await (supabase.from('assets') as any)
    .select('id, quantity, status, serial_number, tag_number, retired_on, organization_id')
    .eq('id', assetId)
    .single();
  if (error) throw error;
  const rows: (TrackingRow & { kit?: { is_container?: boolean } | null })[] = [];
  for (let from = 0; ; from += TRACKING_PAGE) {
    const { data, error: rowsError } = await (supabase.from('inventory_tracking') as any)
      .select('id, gig_id, kit_id, asset_id, status, location, quantity, scanned_at, created_at, kit:kit_id(is_container)')
      .eq('organization_id', record.organization_id)
      .eq('asset_id', assetId)
      .order('id', { ascending: true })
      .range(from, from + TRACKING_PAGE - 1);
    if (rowsError) throw rowsError;
    rows.push(...(data ?? []));
    if ((data ?? []).length < TRACKING_PAGE) break;
  }
  const containers = new Set(rows.filter((r) => r.kit_id && r.kit?.is_container).map((r) => r.kit_id as string));
  return { home: piecesHome(rows, record, (id) => containers.has(id)), unit: recordKind(record) === 'unit' };
}

/**
 * Sends a unit, a lot, or part of a lot to maintenance. With a gig it's still out at, it's only
 * flagged until it comes home (more of a lot flagged at the same gig adds to the flag). Without a
 * gig, no more than are home by the Locations rule. Returns the record now in maintenance or flagged.
 */
export async function sendToMaintenance(params: SendToMaintenanceParams): Promise<string> {
  const { assetId, quantity, gigId } = params;
  try {
    if (!gigId) {
      const { home, unit } = await homeCount(assetId);
      if (unit && home < 1) {
        throw new MaintenanceError("This unit isn't home yet; flag it from the gig it's out at.", '22023');
      }
      if (quantity > home) {
        throw new MaintenanceError(home < 1
          ? "None of them are home; flag them from the gig they're out at."
          : `Only ${home} of them are home; flag the rest from the gig they're out at.`, '22023');
      }
    }
    const { data, error } = await getSupabase().rpc('send_to_maintenance', {
      p_asset_id: assetId,
      p_quantity: quantity,
      p_notes: blank(params.notes),
      p_location: blank(params.location),
      p_expected_back: params.expectedBack || null,
      p_gig_id: gigId || null,
    });
    refused(error);
    return data as string;
  } catch (err) {
    if (err instanceof MaintenanceError) throw err;
    return handleApiError(err, 'send to maintenance');
  }
}

/** Edits the notes, location and expected-back date of a record in maintenance or flagged. */
export async function updateMaintenance(
  assetId: string,
  details: { notes?: string | null; location?: string | null; expectedBack?: string | null },
): Promise<void> {
  try {
    const { error } = await getSupabase().rpc('update_maintenance', {
      p_asset_id: assetId,
      p_notes: blank(details.notes),
      p_location: blank(details.location),
      p_expected_back: details.expectedBack || null,
    });
    refused(error);
  } catch (err) {
    if (err instanceof MaintenanceError) throw err;
    return handleApiError(err, 'update maintenance details');
  }
}

/**
 * Returns a record to service (the status it had), merging a piece split off a lot back into
 * it when it can; on a flagged record, cancels the flag. Returns the record it ends up in.
 */
export async function returnToService(assetId: string): Promise<string> {
  try {
    const { data, error } = await getSupabase().rpc('return_to_service', { p_asset_id: assetId });
    refused(error);
    return data as string;
  } catch (err) {
    if (err instanceof MaintenanceError) throw err;
    return handleApiError(err, 'return to service');
  }
}

export interface MaintenanceListRow {
  asset_id: string;
  item_name: string | null;
  tag_number: string | null;
  serial_number: string | null;
  kind: 'unit' | 'lot';
  /** The record's pieces. */
  quantity: number;
  /** In maintenance: the record's pieces. Flagged: the pieces flagged. */
  pieces: number;
  /** For a piece split off a lot: the lot, its pieces now (null once it's gone), and whether
   *  Return to service will merge the piece back into it (the database's rule). */
  from_lot: { id: string; quantity: number | null; will_merge: boolean } | null;
  notes: string | null;
  location: string | null;
  /** yyyy-mm-dd */
  expected_back: string | null;
  since: string | null;
  flagged_by_name: string | null;
  last_gig_title: string | null;
  /** Flagged: the gig it's coming home from. */
  pending_gig_id: string | null;
  pending_gig_title: string | null;
}

export interface MaintenanceList {
  inMaintenance: MaintenanceListRow[];
  flagged: MaintenanceListRow[];
}

const userName = (u: { first_name?: string | null; last_name?: string | null; email?: string | null } | null | undefined) => {
  if (!u) return null;
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return name || u.email || null;
};
const filled = (s: string | null | undefined) => !!s && s.trim() !== '';

/** Everything in maintenance, and everything flagged to go when it comes home, newest first (undated last). */
export async function getMaintenanceList(organizationId: string): Promise<MaintenanceList> {
  const supabase = getSupabase();
  try {
    const { data, error } = await (supabase.from('assets') as any)
      .select('id, organization_id, manufacturer_model, serial_number, tag_number, quantity, status, equipment_item_id, purchase_line_id, '
        + 'maintenance_notes, maintenance_location, maintenance_expected_back, maintenance_since, maintenance_from, '
        + 'maintenance_pending, maintenance_pending_gig_id, maintenance_pending_quantity, '
        + 'flagged_by:users!maintenance_by(first_name, last_name, email), pending_gig:gigs!maintenance_pending_gig_id(title)')
      .eq('organization_id', organizationId)
      .or('status.eq.Maintenance,maintenance_pending.eq.true')
      .order('maintenance_since', { ascending: false, nullsFirst: false });
    if (error) throw error;
    const records = (data ?? []) as any[];
    if (records.length === 0) return { inMaintenance: [], flagged: [] };

    // The lots split-off pieces came from: their size now, and whether a piece would merge back.
    const fromIds = [...new Set(records.map((r) => r.maintenance_from).filter(Boolean))] as string[];
    const lots = new Map<string, any>();
    if (fromIds.length) {
      const { data: lotData, error: lotError } = await (supabase.from('assets') as any)
        .select('id, organization_id, quantity, status, retired_on, maintenance_pending, equipment_item_id, purchase_line_id')
        .in('id', fromIds);
      if (lotError) throw lotError;
      for (const l of (lotData ?? []) as any[]) lots.set(l.id, l);
    }

    // The last gig each was at (a split-off piece has no rows of its own: its lot's).
    const trackedIds = [...new Set([...records.map((r) => r.id), ...fromIds])];
    const { data: rowData, error: rowError } = await (supabase.from('inventory_tracking') as any)
      .select('id, asset_id, scanned_at, created_at, gig:gig_id(title)')
      .eq('organization_id', organizationId)
      .in('asset_id', trackedIds)
      .order('scanned_at', { ascending: false });
    if (rowError) throw rowError;
    const lastGig = new Map<string, string | null>();
    for (const r of (rowData ?? []) as any[]) {
      if (!lastGig.has(r.asset_id)) lastGig.set(r.asset_id, r.gig?.title ?? null);
    }

    const inMaintenance: MaintenanceListRow[] = [];
    const flagged: MaintenanceListRow[] = [];
    for (const r of records) {
      const quantity = Number(r.quantity ?? 1);
      const lot = r.maintenance_from ? lots.get(r.maintenance_from) : undefined;
      const unit = recordKind(r) === 'unit';
      // return_to_service's rule, exactly: a lot with no purchase line takes any piece; one with a
      // line takes only a piece on that line.
      const willMerge = !!lot && !unit && !lot.retired_on && ['Active', 'Inactive'].includes(lot.status)
        && !lot.maintenance_pending && (lot.organization_id ?? null) === (r.organization_id ?? null)
        && (lot.equipment_item_id ?? null) === (r.equipment_item_id ?? null)
        && (lot.purchase_line_id == null || lot.purchase_line_id === r.purchase_line_id);
      const row: MaintenanceListRow = {
        asset_id: r.id,
        item_name: r.manufacturer_model ?? null,
        tag_number: r.tag_number ?? null,
        serial_number: r.serial_number ?? null,
        kind: unit ? 'unit' : 'lot',
        quantity,
        pieces: r.maintenance_pending ? Number(r.maintenance_pending_quantity ?? quantity) : quantity,
        from_lot: r.maintenance_from
          ? { id: r.maintenance_from, quantity: lot ? Number(lot.quantity ?? 1) : null, will_merge: willMerge }
          : null,
        notes: r.maintenance_notes ?? null,
        location: r.maintenance_location ?? null,
        expected_back: r.maintenance_expected_back ?? null,
        since: r.maintenance_since ?? null,
        flagged_by_name: userName(r.flagged_by),
        last_gig_title: lastGig.get(r.id) ?? (r.maintenance_from ? lastGig.get(r.maintenance_from) ?? null : null),
        pending_gig_id: r.maintenance_pending_gig_id ?? null,
        pending_gig_title: r.pending_gig?.title ?? null,
      };
      (r.maintenance_pending ? flagged : inMaintenance).push(row);
    }
    return { inMaintenance, flagged };
  } catch (err) {
    return handleApiError(err, 'get the maintenance list');
  }
}

/** Which piece a row is: a unit's tag and serial, a piece split off a lot, or a lot (or part of one). */
export function whichLabel(row: MaintenanceListRow): string {
  if (row.kind === 'unit') {
    return [row.tag_number, filled(row.serial_number) ? `S/N ${row.serial_number}` : null].filter(filled).join(' · ') || '—';
  }
  if (row.from_lot) {
    return row.from_lot.quantity == null
      ? `${row.pieces} split from a lot no longer on hand`
      : `${row.pieces} split from the lot (now ${row.from_lot.quantity})`;
  }
  return row.pieces < row.quantity ? `${row.pieces} of the lot of ${row.quantity}` : `Whole lot of ${row.quantity}`;
}

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Expected back before today (dates as yyyy-mm-dd, in local time). */
export function isOverdue(expectedBack: string | null | undefined, today: string = localToday()): boolean {
  return !!expectedBack && expectedBack < today;
}
