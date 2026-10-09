import { createClient } from '../utils/supabase/client';
import { containerPiecesByItem, summarizeItem } from '../utils/equipmentItems';
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
export async function loadEquipmentNeeds(kitIds: readonly string[]): Promise<EquipmentNeedsData> {
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

  // Pieces inside the organization's container kits are never free for others.
  const recordItem = new Map<string, string>();
  for (const i of items ?? []) for (const r of i.records ?? []) recordItem.set(r.id, i.id);
  const orgId = [...kits.values()].find((k) => k.organization_id)?.organization_id;
  const inContainers = orgId ? await containerPieces(supabase, orgId, recordItem) : new Map<string, number>();

  const counts = new Map<string, ItemCounts>();
  for (const i of items ?? []) {
    const s = summarizeItem(i.records ?? [], inContainers.get(i.id) ?? 0);
    counts.set(i.id, { name: i.manufacturer_model, owned: s.owned, available: s.available, inMaintenance: s.inMaintenance, inContainers: s.inContainers });
  }
  return { ctx, counts };
}

async function containerPieces(supabase: any, organizationId: string, assetItem: ReadonlyMap<string, string>) {
  const { data: containers, error } = await supabase.from('kits').select('id').eq('organization_id', organizationId).eq('is_container', true);
  if (error) throw error;
  const ids: string[] = (containers ?? []).map((k: { id: string }) => k.id);
  if (ids.length === 0) return new Map<string, number>();
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
  return containerPiecesByItem({ containerKitIds, nestedContainerIds, assetItem, unitCache: unitCache.data ?? [], itemCache: itemCache.data ?? [] });
}

/** A gig's needs per item, from its assigned kits. */
export const needsOf = (kitIds: readonly string[], data: EquipmentNeedsData): Map<string, ItemNeed> => gigNeeds(kitIds, data.ctx);
