// A kit's packing at a gig, in pieces (#185; the gig's Equipment card, Cameron 10-09).
// Counted from the packing list's own rows (getPackingListReport), so the Equipment card and
// the packing list agree: a line's `packed` already applies the shared rules in
// utils/locations.ts (a unit is where its newest row anywhere is; a lot by its newest row per
// kit at the gig; a retired record is never out). Nothing here re-reads tracking rows.
//
// Pieces are the packing list's pieces: a unit is 1, a lot line its quantity, an "any" line its
// N, and a container its number of cases (1 when assigned on its own), not what's inside it.

import { RETURNED_STATUS, SCANNING_MODES } from '../config/inventoryWorkflow';
import type { PackingListRow } from '../services/inventoryManagement.service';

/** Packed pieces with no status recorded (not expected: every packed line has one). */
const PACKED = 'Packed';
const NOT_PACKED = 'Not packed';
const NO_LOCATION = 'No location';

export interface KitPackingSummary {
  /** The pieces the kit asks for. */
  total: number;
  /** How many of them are out at this gig. */
  packed: number;
  /** Packed pieces by status. */
  byStatus: Map<string, number>;
  /** Packed pieces by location (null: none recorded). */
  byLocation: Map<string | null, number>;
}

/** How many of a line's pieces are packed, never more than the line asks for. */
export function packedPieces(row: PackingListRow): number {
  const packed = row.packed ?? (row.status && row.status !== RETURNED_STATUS ? row.quantity : 0);
  return Math.min(packed, row.quantity);
}

const place = (location?: string | null) => (location ?? '').trim() || null;
const add = <K,>(map: Map<K, number>, key: K, n: number) => { if (n > 0) map.set(key, (map.get(key) ?? 0) + n); };

/** Each kit assigned to the gig (by `group_kit_id`): its pieces, and where the packed ones are. */
export function summarizeKitPacking(rows: readonly PackingListRow[]): Map<string, KitPackingSummary> {
  const kits = new Map<string, KitPackingSummary>();
  for (const row of rows) {
    let kit = kits.get(row.group_kit_id);
    if (!kit) kits.set(row.group_kit_id, kit = { total: 0, packed: 0, byStatus: new Map(), byLocation: new Map() });
    const packed = packedPieces(row);
    kit.total += row.quantity;
    kit.packed += packed;
    if (row.kind === 'any') {
      // An "any" line's pieces are the units and lots packed for it, each where it is.
      let left = packed;
      for (const u of row.packed_units ?? []) {
        const n = Math.min(left, u.quantity);
        add(kit.byStatus, u.status ?? PACKED, n);
        add(kit.byLocation, place(u.location), n);
        left -= n;
      }
      add(kit.byStatus, PACKED, left);
      add(kit.byLocation, null, left);
    } else {
      add(kit.byStatus, row.status ?? PACKED, packed);
      add(kit.byLocation, place(row.location), packed);
    }
  }
  return kits;
}

/** Later steps of the workflow first, so a tie leads with how far the kit has got. */
const step = (status: string) => (status === RETURNED_STATUS ? -1 : SCANNING_MODES.findIndex((m) => m.resultingStatus === status));
const byCount = <K,>(map: Map<K, number>, tie: (a: K, b: K) => number = () => 0) =>
  [...map.entries()].sort((a, b) => b[1] - a[1] || tie(a[0], b[0]));

export interface CellSummary {
  text: string;
  /** The full breakdown, for the cell's tooltip. */
  title: string;
  muted?: boolean;
}

/**
 * The Status cell: "All On Site"; "Checked Out 9 of 15" while some are still home; mixed
 * states lead with the most common, "On Site 6 of 15 · In Transit 3"; "Not packed" when none are.
 */
export function kitStatusSummary(summary: KitPackingSummary | undefined): Required<CellSummary> {
  if (!summary || summary.total === 0) return { text: '', title: '', muted: true };
  if (summary.packed === 0) return { text: NOT_PACKED, title: `${NOT_PACKED} ${summary.total}`, muted: true };
  const states = byCount(summary.byStatus, (a, b) => step(b) - step(a));
  const home = summary.total - summary.packed;
  const title = [...states.map(([s, n]) => `${s} ${n}`), ...(home > 0 ? [`${NOT_PACKED} ${home}`] : [])].join(' · ');
  if (states.length === 1 && home === 0) return { text: `All ${states[0][0]}`, title, muted: false };
  const [[lead, n], ...rest] = states;
  return { text: [`${lead} ${n} of ${summary.total}`, ...rest.map(([s, m]) => `${s} ${m}`)].join(' · '), title, muted: false };
}

/** The Location cell: the place every packed piece shares, else "Mixed"; empty when none are out. */
export function kitLocationSummary(summary: KitPackingSummary | undefined): CellSummary {
  const places = byCount(summary?.byLocation ?? new Map<string | null, number>());
  if (places.length === 0) return { text: '', title: '' };
  if (places.length === 1) return { text: places[0][0] ?? '', title: '' };
  return { text: 'Mixed', title: places.map(([p, n]) => `${p ?? NO_LOCATION} ${n}`).join(' · ') };
}
