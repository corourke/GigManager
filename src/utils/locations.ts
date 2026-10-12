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

/**
 * The rows that say where things are now, for a view of everything by place (Equipment →
 * Locations). A kit's own (kit-only) row: its newest, across gigs. A unit: its newest row,
 * across gigs and kits. A lot (`isLot`): its newest row per (gig, kit), as placementOf counts
 * it, so pieces still out show at each gig; but a bucket whose newest row is a return isn't a
 * place on its own: the pieces back home show once, at the lot's newest return (#255). Each
 * item reports its own newest row: a container's newer kit-only row (a note, an override)
 * doesn't move what's in it (Cameron, 10-10). A lot's pieces in a container (`isContainer`)
 * are one place per container, its newest row across gigs: the case holds the same pieces
 * wherever it goes. And a lot is in no more places than it has pieces (`lotQuantity`): its
 * places count newest first (each row's `quantity`), and an older one is stale once the newer
 * ones already hold the whole lot, so a one-piece lot shows once, at its newest row (10-11).
 */
export function currentRows<R extends TrackingRow>(
  rows: readonly R[],
  opts: {
    isLot?: (assetId: string) => boolean;
    isContainer?: (kitId: string) => boolean;
    lotQuantity?: (assetId: string) => number | null | undefined;
  } = {},
): R[] {
  const latest = new Map<string, R>();
  for (const r of rows) {
    const key = r.asset_id == null
      ? `kit:${r.kit_id ?? ''}`
      : opts.isLot?.(r.asset_id)
        ? r.kit_id && opts.isContainer?.(r.kit_id)
          ? `clot:${r.asset_id}:${r.kit_id}`
          : `lot:${r.asset_id}:${r.gig_id}:${r.kit_id ?? ''}`
        : `unit:${r.asset_id}`;
    if (newer(r, latest.get(key))) latest.set(key, r);
  }
  const isHome = (key: string, r: R) => key.startsWith('lot:') && r.status === RETURNED_STATUS;
  const lotHome = new Map<string, R>();
  for (const [key, r] of latest) {
    if (isHome(key, r) && newer(r, lotHome.get(r.asset_id as string))) lotHome.set(r.asset_id as string, r);
  }
  const kept = [...latest].filter(([key, r]) => !isHome(key, r) || lotHome.get(r.asset_id as string) === r);
  // Newest first, keep a lot's places until the newer ones hold the whole lot; the first always stays.
  const placed = new Map<string, number>();
  const stale = new Set<R>();
  for (const [key, r] of [...kept].sort(([, a], [, b]) => (newer(a, b) ? -1 : newer(b, a) ? 1 : 0))) {
    if (!key.startsWith('lot:') && !key.startsWith('clot:')) continue;
    const id = r.asset_id as string;
    const total = opts.lotQuantity?.(id);
    const sofar = placed.get(id);
    const pieces = Math.max(1, Number(r.quantity) || 1);
    if (sofar !== undefined && total != null && sofar >= total) stale.add(r);
    else placed.set(id, (sofar ?? 0) + pieces);
  }
  return kept.filter(([, r]) => !stale.has(r)).map(([, r]) => r);
}


/**
 * A lot's pieces at each of its current rows (from `currentRows`), so every view of a lot adds up
 * to it: out rows newest first, each holding no more than the lot has left; the rest are home, on
 * its newest current return row (if any). Only a return brings pieces home.
 */
export function lotPieces<R extends TrackingRow>(current: readonly R[], lotSize: number): {
  pieces: Map<R, number>; home: number; homeRow: R | null;
} {
  const pieces = new Map<R, number>();
  let left = Math.max(0, lotSize);
  let homeRow: R | null = null;
  for (const r of [...current].sort(compareNewestFirst)) {
    if (r.status === RETURNED_STATUS) {
      if (!homeRow) homeRow = r;
      continue;
    }
    const n = Math.min(left, Math.max(1, Number(r.quantity) || 1));
    pieces.set(r, n);
    left -= n;
  }
  if (homeRow) pieces.set(homeRow, left);
  return { pieces, home: left, homeRow };
}

/** One lot's current rows and pieces (`currentRows`, then `lotPieces`). */
export function lotNow<R extends TrackingRow>(rows: readonly R[], lotSize: number, isContainer?: (kitId: string) => boolean) {
  const current = currentRows(rows, { isLot: () => true, isContainer, lotQuantity: () => lotSize });
  return lotPieces(current, lotSize);
}

/** An item's pieces at one place: a gig (and location there), or home (gig_id null). */
export interface Whereabout {
  gig_id: string | null;
  /** At a gig: its newest row's location. At home: a return scan's location, else null ("Not checked out"). */
  location: string | null;
  quantity: number;
}

/**
 * Where an item's pieces are (#186, Cameron 10-11), summed per place across its units and lots,
 * by the Locations rule (`currentRows`), so this agrees with the Locations lines: a unit is at its
 * newest row; a lot at its current places, with a lot in a container (`isContainer`) one place per
 * container. Pieces at home have no place ("Not checked out"), unless everything in that record
 * came back on a return scan: then they're at that scan's location. Out places come first, then
 * home, each most pieces first.
 */
export function whereabouts(
  rows: readonly TrackingRow[],
  records: readonly ItemRecord[],
  isContainer?: (kitId: string) => boolean,
): Whereabout[] {
  const places = new Map<string, Whereabout>();
  const add = (gig_id: string | null, location: string | null, quantity: number) => {
    if (quantity <= 0) return;
    const key = `${gig_id ?? ''}|${location ?? ''}`;
    const at = places.get(key);
    if (at) at.quantity += quantity;
    else places.set(key, { gig_id, location, quantity });
  };
  for (const record of records) {
    if (isRetired(record)) continue;
    const mine = rows.filter((r) => r.asset_id != null && r.asset_id === record.id);
    if (recordKind(record) === 'unit') {
      const [latest] = currentRows(mine);
      if (!latest) add(null, null, 1);
      else if (latest.status === RETURNED_STATUS) add(null, latest.location ?? null, 1);
      else add(latest.gig_id, latest.location ?? null, 1);
      continue;
    }
    const { pieces, home, homeRow } = lotNow(mine, Number(record.quantity ?? 1), isContainer);
    let someOut = false;
    for (const [r, n] of pieces) {
      if (r === homeRow) continue;
      if (n > 0) someOut = true;
      add(r.gig_id, r.location ?? null, n);
    }
    add(null, !someOut && homeRow ? homeRow.location ?? null : null, home);
  }
  return [...places.values()].sort((a, b) => Number(a.gig_id === null) - Number(b.gig_id === null) || b.quantity - a.quantity);
}
