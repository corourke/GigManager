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

export interface ItemNeedRow {
  itemId: string;
  name: string;
  thisGig: number;
  overlapping: number;
  needed: number;
  owned: number;
  inMaintenance: number;
  inContainers: number;
  free: number;
  short: number;
  status: NeedStatus;
}

/**
 * The "Equipment needed" rows: each item this gig needs, with what the
 * overlapping gigs need of it, against what's free.
 */
export function itemNeedRows(
  thisGig: ReadonlyMap<string, ItemNeed>,
  others: readonly ReadonlyMap<string, ItemNeed>[],
  counts: ReadonlyMap<string, ItemCounts>,
): ItemNeedRow[] {
  const rows: ItemNeedRow[] = [];
  for (const [itemId, need] of thisGig) {
    const c = counts.get(itemId) ?? { name: 'Unknown item', owned: 0, available: 0, inMaintenance: 0, inContainers: 0 };
    const overlapping = others.reduce((n, o) => n + (o.get(itemId)?.total ?? 0), 0);
    const needed = need.total + overlapping;
    const short = Math.max(0, needed - c.available);
    rows.push({
      itemId, name: c.name, thisGig: need.total, overlapping, needed,
      owned: c.owned, inMaintenance: c.inMaintenance, inContainers: c.inContainers, free: c.available, short,
      status: short > 0 ? 'short' : needed === c.available ? 'none-spare' : 'enough',
    });
  }
  return rows;
}
