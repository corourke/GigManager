// Where a unit or lot is (#186, shared with #185's scans). `inventory_tracking`
// is an append-only history: each scan or manual move adds a row, and the
// newest row wins (undo deletes the newest row; a note edit changes it in place).
//
// A unit is in one place: its newest row, across gigs and kits.
//
// A lot can be split ("N from a lot"). A row's `quantity` is STATE, not a
// delta: how many of the lot are at that gig under that kit as of that row.
// So a lot's count at a gig is the sum, over its kits, of the newest row per
// (gig, kit) — the same key as `getLatestByKey`. A no-kit manual move is its
// own (kit null) bucket. A lot re-recorded under a different kit counts in
// both buckets until one of them is returned. Pieces stay at a gig until
// they're returned (or, once #185 adds it, written off); the rest are at home.
// `assets.quantity` is numeric, but fractional lots aren't expected.

import { RETURNED_STATUS } from '../config/inventoryWorkflow';
import { isRetired, recordKind, type ItemRecord } from './equipmentItems';

export interface TrackingRow {
  id?: string | null;
  gig_id: string;
  kit_id?: string | null;
  asset_id?: string | null;
  /** A scan status, RETURNED_STATUS, or 'Maintenance' (the manual override's
   *  "Mark for Maintenance"). Only RETURNED_STATUS brings a record home. */
  status: string;
  location?: string | null;
  scanned_at: string;
  created_at?: string | null;
  /** How many are there as of this row: 1 for a unit; N of a lot. */
  quantity?: number | null;
}

export interface Placement {
  /** null: at home (not out at a gig). */
  gig_id: string | null;
  quantity: number;
  status: string | null;
  location: string | null;
}

const time = (v?: string | null) => {
  const t = v ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : 0;
};

/** Newest first, the same order as compareTrackingRecords: scanned_at, then
 *  created_at, then id, comparing times as instants. */
export function compareNewestFirst(a: TrackingRow, b: TrackingRow): number {
  return time(b.scanned_at) - time(a.scanned_at)
    || time(b.created_at) - time(a.created_at)
    || String(b.id ?? '').localeCompare(String(a.id ?? ''));
}

const newer = (a: TrackingRow, b: TrackingRow | undefined) => !b || compareNewestFirst(a, b) < 0;
const home = (quantity: number, from?: TrackingRow): Placement =>
  ({ gig_id: null, quantity, status: from?.status ?? null, location: from?.location ?? null });

/**
 * Where a record is, from the tracking rows (rows for other records, and
 * kit-only rows, are ignored). A retired record is nowhere: it's no longer
 * owned. Home comes first, then each gig.
 */
export function placementOf(rows: readonly TrackingRow[], record: ItemRecord): Placement[] {
  if (isRetired(record)) return [];
  const mine = rows.filter((r) => r.asset_id != null && r.asset_id === record.id);

  if (recordKind(record) === 'unit') {
    let latest: TrackingRow | undefined;
    for (const r of mine) if (newer(r, latest)) latest = r;
    if (!latest || latest.status === RETURNED_STATUS) return [home(1, latest)];
    return [{ gig_id: latest.gig_id, quantity: 1, status: latest.status, location: latest.location ?? null }];
  }

  // A lot: the newest row per (gig, kit); a gig's count is the sum over its kits.
  const byBucket = new Map<string, TrackingRow>();
  for (const r of mine) {
    const key = `${r.gig_id}:${r.kit_id ?? ''}`;
    if (newer(r, byBucket.get(key))) byBucket.set(key, r);
  }
  const byGig = new Map<string, { quantity: number; latest: TrackingRow }>();
  let lastReturn: TrackingRow | undefined;
  for (const r of byBucket.values()) {
    if (r.status === RETURNED_STATUS) {
      if (newer(r, lastReturn)) lastReturn = r;
      continue;
    }
    const n = Math.max(0, Number(r.quantity ?? 1));
    const at = byGig.get(r.gig_id);
    if (!at) byGig.set(r.gig_id, { quantity: n, latest: r });
    else byGig.set(r.gig_id, { quantity: at.quantity + n, latest: newer(r, at.latest) ? r : at.latest });
  }
  const out: Placement[] = [...byGig.entries()]
    .map(([gig_id, { quantity, latest }]) => ({ gig_id, quantity, status: latest.status, location: latest.location ?? null }))
    .sort((a, b) => a.gig_id.localeCompare(b.gig_id));
  const atHome = Math.max(0, Number(record.quantity ?? 1) - out.reduce((n, p) => n + p.quantity, 0));
  return atHome > 0 ? [home(atHome, lastReturn), ...out] : out;
}

export interface Bucket {
  /** null: a no-kit manual move. */
  kit_id: string | null;
  quantity: number;
  status: string;
  location: string | null;
}

/**
 * What of a record is still out at one gig, kit by kit (#185): the gig's "Not returned" list
 * and its write-offs act on these buckets. A unit is out at the gig only if its newest row
 * anywhere is there and isn't a return; a lot's bucket is its newest row per kit at the gig.
 */
export function bucketsAt(rows: readonly TrackingRow[], record: ItemRecord, gigId: string): Bucket[] {
  if (isRetired(record)) return [];
  const mine = rows.filter((r) => r.asset_id != null && r.asset_id === record.id);
  const bucket = (r: TrackingRow, quantity: number): Bucket =>
    ({ kit_id: r.kit_id ?? null, quantity, status: r.status, location: r.location ?? null });

  if (recordKind(record) === 'unit') {
    let latest: TrackingRow | undefined;
    for (const r of mine) if (newer(r, latest)) latest = r;
    return latest && latest.gig_id === gigId && latest.status !== RETURNED_STATUS ? [bucket(latest, 1)] : [];
  }

  const byKit = new Map<string, TrackingRow>();
  for (const r of mine) {
    if (r.gig_id !== gigId) continue;
    const key = r.kit_id ?? '';
    if (newer(r, byKit.get(key))) byKit.set(key, r);
  }
  return [...byKit.values()]
    .filter((r) => r.status !== RETURNED_STATUS)
    .map((r) => bucket(r, Math.max(0, Number(r.quantity ?? 1))))
    .sort((a, b) => (a.kit_id ?? '').localeCompare(b.kit_id ?? ''));
}

