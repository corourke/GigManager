// Counting for equipment items (#162, #182): an item is what a piece of
// equipment is; its records in `assets` are what we own, each a unit (a
// serial number or tag, quantity 1) or a lot (neither, any quantity).
// Owned, available and value are worked out here, never typed in.

export interface ItemRecord {
  id: string;
  quantity?: number | null;
  serial_number?: string | null;
  tag_number?: string | null;
  status?: string | null;
  replacement_value?: number | string | null;
}

export type RecordKind = 'unit' | 'lot';

const filled = (s: string | null | undefined) => !!s && s.trim() !== '';

/** A record with a serial number or a tag is a unit; with neither, a lot. */
export function recordKind(r: Pick<ItemRecord, 'serial_number' | 'tag_number'>): RecordKind {
  return filled(r.serial_number) || filled(r.tag_number) ? 'unit' : 'lot';
}

/** Statuses for equipment we still own. Disposed and Returned are gone. */
export const IN_SERVICE_STATUSES = ['Active', 'Inactive', 'Maintenance'] as const;

export function isInService(status: string | null | undefined): boolean {
  return (IN_SERVICE_STATUSES as readonly string[]).includes(status ?? 'Active');
}

const num = (v: number | string | null | undefined): number => {
  const n = v == null ? NaN : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};
const pieces = (r: ItemRecord) => (r.quantity == null ? 1 : num(r.quantity));

export interface ItemSummary {
  /** Pieces still owned (in-service units and lots). */
  owned: number;
  units: number;
  lots: number;
  /** Active pieces not committed to a container kit. */
  available: number;
  inMaintenance: number;
  inContainers: number;
  /** Sum of replacement value × quantity. */
  totalValue: number;
  minValue: number | null;
  maxValue: number | null;
}

/**
 * Owned, available and value for one item's records. `inContainers` is how
 * many of its pieces sit inside container kits (never free for other kits).
 */
export function summarizeItem(records: readonly ItemRecord[], inContainers = 0): ItemSummary {
  let owned = 0, units = 0, lots = 0, active = 0, inMaintenance = 0, totalValue = 0;
  let minValue: number | null = null;
  let maxValue: number | null = null;
  for (const r of records) {
    if (!isInService(r.status)) continue;
    const n = pieces(r);
    owned += n;
    if (recordKind(r) === 'unit') units++; else lots++;
    const status = r.status ?? 'Active';
    if (status === 'Active') active += n;
    if (status === 'Maintenance') inMaintenance += n;
    if (r.replacement_value != null && r.replacement_value !== '') {
      const v = num(r.replacement_value);
      totalValue += v * n;
      minValue = minValue == null ? v : Math.min(minValue, v);
      maxValue = maxValue == null ? v : Math.max(maxValue, v);
    }
  }
  return {
    owned, units, lots, inMaintenance, inContainers, totalValue, minValue, maxValue,
    available: Math.max(0, active - inContainers),
  };
}

export interface ContainerPiecesInput {
  /** Kits whose tracking type is Container. */
  containerKitIds: ReadonlySet<string>;
  /** Container kits nested inside another container kit (counted through the outer one). */
  nestedContainerIds: ReadonlySet<string>;
  /** kit_flattened_cache rows: specific records, quantities multiplied through nesting. */
  unitCache: readonly { kit_id: string; asset_id: string; total_quantity: number }[];
  /** kit_flattened_item_cache rows: "N × any" lines. */
  itemCache: readonly { kit_id: string; equipment_item_id: string; total_quantity: number }[];
  /** Which item each record belongs to. */
  assetItem: ReadonlyMap<string, string>;
}

/** How many pieces of each item sit inside container kits. */
export function containerPiecesByItem(input: ContainerPiecesInput): Map<string, number> {
  const counts = new Map<string, number>();
  const add = (itemId: string | undefined, n: number) => {
    if (itemId) counts.set(itemId, (counts.get(itemId) ?? 0) + n);
  };
  const counted = (kitId: string) => input.containerKitIds.has(kitId) && !input.nestedContainerIds.has(kitId);
  for (const row of input.unitCache) if (counted(row.kit_id)) add(input.assetItem.get(row.asset_id), row.total_quantity);
  for (const row of input.itemCache) if (counted(row.kit_id)) add(row.equipment_item_id, row.total_quantity);
  return counts;
}

/** Search an item by its model, category or type, or any of its records' serial, tag or vendor. */
export function itemMatchesSearch(
  item: { manufacturer_model?: string | null; category?: string | null; type?: string | null },
  records: readonly (ItemRecord & { vendor?: string | null })[],
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const has = (s: string | null | undefined) => !!s && s.toLowerCase().includes(q);
  return has(item.manufacturer_model) || has(item.category) || has(item.type)
    || records.some((r) => has(r.serial_number) || has(r.tag_number) || has(r.vendor));
}
