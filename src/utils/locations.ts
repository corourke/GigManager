// Where a unit or lot is (#186, shared with #185's scans). `inventory_tracking`
// is an append-only history: each scan or manual move adds a row, and the
// newest row wins. A unit is in one place. A lot can be split across gigs
// ("N from a lot"): its newest row at each gig, whichever kit it was recorded
// under, says how many are there; the rest are at home.

import { RETURNED_STATUS } from '../config/inventoryWorkflow';
import { isRetired, recordKind, type ItemRecord } from './equipmentItems';

export interface TrackingRow {
  gig_id: string;
  kit_id?: string | null;
  asset_id?: string | null;
  status: string;
  location?: string | null;
  scanned_at: string;
  /** 1 for a unit; N from a lot. */
  quantity?: number | null;
}

export interface Placement {
  /** null: at home (not out at a gig). */
  gig_id: string | null;
  quantity: number;
  status: string | null;
  location: string | null;
}

const newer = (a: TrackingRow, b: TrackingRow | undefined) => !b || a.scanned_at > b.scanned_at;
const home = (quantity: number, from?: TrackingRow): Placement =>
  ({ gig_id: null, quantity, status: from?.status ?? null, location: from?.location ?? null });

/**
 * Where a record is, from the tracking rows (rows for other records are
 * ignored). A retired record is nowhere: it's no longer owned. Home comes
 * first, then each gig.
 */
export function placementOf(rows: readonly TrackingRow[], record: ItemRecord): Placement[] {
  if (isRetired(record)) return [];
  const mine = rows.filter((r) => r.asset_id === record.id);

  if (recordKind(record) === 'unit') {
    let latest: TrackingRow | undefined;
    for (const r of mine) if (newer(r, latest)) latest = r;
    if (!latest || latest.status === RETURNED_STATUS) return [home(1, latest)];
    return [{ gig_id: latest.gig_id, quantity: 1, status: latest.status, location: latest.location ?? null }];
  }

  // A lot: the newest row per gig, whichever kit it was recorded under.
  const byGig = new Map<string, TrackingRow>();
  for (const r of mine) if (newer(r, byGig.get(r.gig_id))) byGig.set(r.gig_id, r);
  const out: Placement[] = [];
  for (const r of byGig.values()) {
    if (r.status === RETURNED_STATUS) continue;
    out.push({ gig_id: r.gig_id, quantity: Math.max(0, Number(r.quantity ?? 1)), status: r.status, location: r.location ?? null });
  }
  out.sort((a, b) => (a.gig_id ?? '').localeCompare(b.gig_id ?? ''));
  const atHome = Math.max(0, Number(record.quantity ?? 1) - out.reduce((n, p) => n + p.quantity, 0));
  return atHome > 0 ? [home(atHome), ...out] : out;
}
