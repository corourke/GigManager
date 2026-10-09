// What gigs need, per equipment item (#184, mockup screen 10). A gig's kits
// ask for specific units and "N × any" of an item; both count toward the item.
// Counting stops at a container kit: its contents travel inside it, and they
// are already left out of what's free (they're never free for other kits).

export interface KitMeta {
  id: string;
  name: string;
  is_container: boolean;
}

/** A kit line: exactly one of asset_id, equipment_item_id or child_kit_id. */
export interface KitLine {
  asset_id?: string | null;
  equipment_item_id?: string | null;
  child_kit_id?: string | null;
  quantity: number;
}

export interface NeedsContext {
  kits: ReadonlyMap<string, KitMeta>;
  lines: ReadonlyMap<string, readonly KitLine[]>;
  /** Each record's item. */
  assetItem: ReadonlyMap<string, string>;
}

const add = (m: Map<string, number>, key: string, n: number) => m.set(key, (m.get(key) ?? 0) + n);

/** Pieces per item a kit asks for, through nested kits, stopping at containers. */
export function kitNeeds(kitId: string, ctx: NeedsContext, seen: ReadonlySet<string> = new Set()): Map<string, number> {
  const out = new Map<string, number>();
  if (seen.has(kitId) || ctx.kits.get(kitId)?.is_container) return out;
  const path = new Set(seen).add(kitId);
  for (const line of ctx.lines.get(kitId) ?? []) {
    const n = Number(line.quantity) || 0;
    if (line.equipment_item_id) add(out, line.equipment_item_id, n);
    else if (line.asset_id) {
      const item = ctx.assetItem.get(line.asset_id);
      if (item) add(out, item, n);
    } else if (line.child_kit_id) {
      for (const [item, m] of kitNeeds(line.child_kit_id, ctx, path)) add(out, item, m * n);
    }
  }
  return out;
}

export interface ItemNeed {
  total: number;
  /** Which of the gig's kits ask for how many. */
  kits: { kit_name: string; quantity: number }[];
}

/** A gig's needs per item, over its assigned kits. */
export function gigNeeds(kitIds: readonly string[], ctx: NeedsContext): Map<string, ItemNeed> {
  const out = new Map<string, ItemNeed>();
  for (const kitId of kitIds) {
    const name = ctx.kits.get(kitId)?.name ?? 'Unknown kit';
    for (const [item, n] of kitNeeds(kitId, ctx)) {
      const need = out.get(item) ?? { total: 0, kits: [] };
      need.total += n;
      need.kits.push({ kit_name: name, quantity: n });
      out.set(item, need);
    }
  }
  return out;
}

export interface ItemCounts {
  name: string;
  owned: number;
  /** Active, not retired, not inside a container kit. */
  available: number;
  inMaintenance: number;
  inContainers: number;
}

export type NeedStatus = 'enough' | 'none-spare' | 'short';

/** A gig's needs per item, with its effective time range (ms). */
export interface GigNeeds {
  id: string;
  title: string;
  start: number;
  end: number;
  needs: ReadonlyMap<string, ItemNeed>;
}

export interface ItemNeedRow {
  itemId: string;
  name: string;
  thisGig: number;
  /** What the other gigs need at the peak. */
  overlapping: number;
  /** The peak: the most this gig and the gigs running at the same moment need together. */
  needed: number;
  owned: number;
  inMaintenance: number;
  inContainers: number;
  free: number;
  short: number;
  status: NeedStatus;
  /** When the peak starts (ms), and the other gigs that add to it. */
  peakAt: number;
  peakGigs: NeedingGig[];
  /** Every moment this gig is short, with the gigs running then (#230 follow-up). */
  shortMoments: ShortMoment[];
}

export interface NeedingGig { id: string; title: string; need: ItemNeed }
export interface ShortMoment { at: number; needed: number; short: number; gigs: NeedingGig[] }

/**
 * The "Equipment needed" rows: each item this gig needs, against what's free.
 * Needed is the peak concurrent demand: gigs that overlap this one but not
 * each other don't add up (#184 review). The peak starts at this gig's start
 * or at an overlapping gig's start, so those are the moments checked.
 */
export function itemNeedRows(
  thisGig: GigNeeds,
  others: readonly GigNeeds[],
  counts: ReadonlyMap<string, ItemCounts>,
): ItemNeedRow[] {
  const moments = Array.from(new Set([thisGig.start, ...others.map((o) => Math.max(o.start, thisGig.start))]))
    .filter((t) => t <= thisGig.end)
    .sort((a, b) => a - b);
  const rows: ItemNeedRow[] = [];
  for (const [itemId, need] of thisGig.needs) {
    const c = counts.get(itemId) ?? { name: 'Unknown item', owned: 0, available: 0, inMaintenance: 0, inContainers: 0 };
    let peakAt = thisGig.start;
    let peakGigs: GigNeeds[] = [];
    let overlapping = 0;
    const shortMoments: ShortMoment[] = [];
    const needing = (g: GigNeeds): NeedingGig => ({ id: g.id, title: g.title, need: g.needs.get(itemId)! });
    for (const t of moments) {
      const running = others.filter((o) => o.start <= t && o.end >= t && o.needs.has(itemId));
      const sum = running.reduce((n, o) => n + (o.needs.get(itemId)?.total ?? 0), 0);
      if (sum > overlapping) { overlapping = sum; peakAt = t; peakGigs = running; }
      const short = need.total + sum - c.available;
      if (short > 0 && running.length) shortMoments.push({ at: t, needed: need.total + sum, short, gigs: running.map(needing) });
    }
    const needed = need.total + overlapping;
    const short = Math.max(0, needed - c.available);
    rows.push({
      itemId, name: c.name, thisGig: need.total, overlapping, needed,
      owned: c.owned, inMaintenance: c.inMaintenance, inContainers: c.inContainers, free: c.available, short,
      status: short > 0 ? 'short' : needed === c.available ? 'none-spare' : 'enough',
      peakAt, peakGigs: peakGigs.map(needing), shortMoments,
    });
  }
  return rows;
}
