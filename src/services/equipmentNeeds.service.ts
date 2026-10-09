import { createClient } from '../utils/supabase/client';
import { containerPiecesByItem, recordItemMaps, summarizeItem } from '../utils/equipmentItems';
import { gigNeeds, type ItemCounts, type ItemNeed, type KitLine, type KitMeta, type NeedsContext } from '../utils/equipmentNeeds';

const getSupabase = () => createClient();

/** Nested kits are followed this many levels deep at most (the editor warns past 6). */
const MAX_DEPTH = 12;

export interface EquipmentNeedsData {
  ctx: NeedsContext;
  /** Owned, available, in maintenance and in containers, per item asked for. */
  counts: Map<string, ItemCounts>;
}

/**
 * Everything needed to count what a set of kits asks for per item (#184): their
 * lines through nested kits, each record's item, and each item's counts.
 */
export async function loadEquipmentNeeds(kitIds: readonly string[], organizationId?: string): Promise<EquipmentNeedsData> {
  const supabase = getSupabase();
  const kits = new Map<string, KitMeta & { organization_id?: string }>();
  const lines = new Map<string, KitLine[]>();
  const assetItem = new Map<string, string>();
  const empty = { ctx: { kits, lines, assetItem }, counts: new Map<string, ItemCounts>() };
  if (kitIds.length === 0) return empty;

  // The kits and their lines, level by level through nested kits.
  let frontier = Array.from(new Set(kitIds));
  for (let depth = 0; frontier.length && depth < MAX_DEPTH; depth++) {
    const [meta, rows] = await Promise.all([
      (supabase.from('kits') as any).select('id, name, is_container, organization_id').in('id', frontier),
      (supabase.from('kit_components') as any).select('kit_id, asset_id, equipment_item_id, child_kit_id, quantity').in('kit_id', frontier),
    ]);
    if (meta.error) throw meta.error;
    if (rows.error) throw rows.error;
    for (const k of meta.data ?? []) kits.set(k.id, { id: k.id, name: k.name, is_container: !!k.is_container, organization_id: k.organization_id });
    for (const id of frontier) lines.set(id, []);
    for (const r of rows.data ?? []) lines.get(r.kit_id)?.push(r);
    frontier = Array.from(new Set((rows.data ?? []).map((r: KitLine) => r.child_kit_id).filter((id: string | null | undefined): id is string => !!id && !lines.has(id))));
  }

  // Each specific unit's item.
  const assetIds = Array.from(new Set([...lines.values()].flat().map((l) => l.asset_id).filter((id): id is string => !!id)));
  if (assetIds.length) {
    const { data, error } = await (supabase.from('assets') as any).select('id, equipment_item_id').in('id', assetIds);
    if (error) throw error;
    for (const a of data ?? []) if (a.equipment_item_id) assetItem.set(a.id, a.equipment_item_id);
  }

  // The items asked for, with their records.
  const ctx: NeedsContext = { kits, lines, assetItem };
  const itemIds = Array.from(new Set(Array.from(kits.keys()).flatMap((id) => [...gigNeeds([id], ctx).keys()])));
  if (itemIds.length === 0) return { ctx, counts: new Map() };
  const { data: items, error: itemsError } = await (supabase.from('equipment_items') as any)
    .select('id, manufacturer_model, records:assets(id, quantity, status, retired_on, serial_number, tag_number)')
    .in('id', itemIds);
  if (itemsError) throw itemsError;

  // Pieces inside container kits are never free for others. Only Active ones
  // come off what's free: a unit in Maintenance isn't free anyway (#184 review).
  const { all: recordItem, available: availableRecords } = recordItemMaps(items ?? []);
  // The viewing organization's containers; without one, each kit's organization's.
  const orgIds = organizationId ? [organizationId]
    : Array.from(new Set([...kits.values()].map((k) => k.organization_id).filter((id): id is string => !!id)));
  const inContainers = new Map<string, number>();
  const activeInContainers = new Map<string, number>();
  for (const orgId of orgIds) {
    const [all, active] = await containerPieces(supabase, orgId, [recordItem, availableRecords]);
    for (const [k, n] of all) inContainers.set(k, (inContainers.get(k) ?? 0) + n);
    for (const [k, n] of active) activeInContainers.set(k, (activeInContainers.get(k) ?? 0) + n);
  }

  const counts = new Map<string, ItemCounts>();
  for (const i of items ?? []) {
    const s = summarizeItem(i.records ?? [], activeInContainers.get(i.id) ?? 0);
    counts.set(i.id, { name: i.manufacturer_model, owned: s.owned, available: s.available, inMaintenance: s.inMaintenance, inContainers: inContainers.get(i.id) ?? 0 });
  }
  return { ctx, counts };
}

/** Pieces per item inside the organization's container kits, once for each record-to-item map. */
async function containerPieces(supabase: any, organizationId: string, assetItems: readonly ReadonlyMap<string, string>[]) {
  const { data: containers, error } = await supabase.from('kits').select('id').eq('organization_id', organizationId).eq('is_container', true);
  if (error) throw error;
  const ids: string[] = (containers ?? []).map((k: { id: string }) => k.id);
  if (ids.length === 0) return assetItems.map(() => new Map<string, number>());
  const [components, unitCache, itemCache] = await Promise.all([
    supabase.from('kit_components').select('kit_id, child_kit_id').in('kit_id', ids),
    supabase.from('kit_flattened_cache').select('kit_id, asset_id, total_quantity').in('kit_id', ids),
    supabase.from('kit_flattened_item_cache').select('kit_id, equipment_item_id, total_quantity').in('kit_id', ids),
  ]);
  for (const r of [components, unitCache, itemCache]) if (r.error) throw r.error;
  const containerKitIds = new Set(ids);
  const nestedContainerIds = new Set<string>(
    (components.data ?? []).map((c: { child_kit_id: string | null }) => c.child_kit_id).filter((id: string | null): id is string => !!id && containerKitIds.has(id)),
  );
  return assetItems.map((assetItem) =>
    containerPiecesByItem({ containerKitIds, nestedContainerIds, assetItem, unitCache: unitCache.data ?? [], itemCache: itemCache.data ?? [] }));
}

/** A gig's needs per item, from its assigned kits. */
export const needsOf = (kitIds: readonly string[], data: EquipmentNeedsData): Map<string, ItemNeed> => gigNeeds(kitIds, data.ctx);
