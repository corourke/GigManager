import { createClient } from '../utils/supabase/client';
import { handleApiError } from '../utils/api-error-utils';
import { requireAuth } from '../utils/supabase/auth-utils';
import type { DbAsset, DbEquipmentItem } from '../utils/supabase/types';
import { containerPiecesByItem } from '../utils/equipmentItems';

// Equipment items (#162, #182): what a piece of equipment is. Its units and
// lots are rows in `assets`, each pointing at its item (migration 20261014000000).

const getSupabase = () => createClient();

export type EquipmentItemWithRecords = DbEquipmentItem & { records: DbAsset[] };

/** The fields an item shares with every unit and lot it has. */
export const ITEM_FIELDS = ['category', 'manufacturer_model', 'type', 'description', 'insurance_class'] as const;
export type ItemFields = Partial<Pick<DbEquipmentItem, (typeof ITEM_FIELDS)[number]>>;

const withRecords = (row: any): EquipmentItemWithRecords => ({ ...row, records: row?.records ?? [] });

/** The organization's items, each with its units and lots. */
export async function getItems(organizationId: string): Promise<EquipmentItemWithRecords[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await (supabase.from('equipment_items') as any)
      .select('*, records:assets(*)')
      .eq('organization_id', organizationId)
      .order('manufacturer_model');
    if (error) throw error;
    return (data ?? []).map(withRecords);
  } catch (err) {
    return handleApiError(err, 'fetch equipment items');
  }
}

/** One item with its units and lots. */
export async function getItem(itemId: string): Promise<EquipmentItemWithRecords> {
  const supabase = getSupabase();
  try {
    const { data, error } = await (supabase.from('equipment_items') as any)
      .select('*, records:assets(*)')
      .eq('id', itemId)
      .single();
    if (error) throw error;
    return withRecords(data);
  } catch (err) {
    return handleApiError(err, 'fetch equipment item');
  }
}

/**
 * Change what an item is. Until every screen reads items (#183–#186), its
 * units and lots keep their own copies of these fields, so they are updated
 * too; the database keeps each record on this item while they match.
 */
export async function updateItem(itemId: string, fields: ItemFields): Promise<DbEquipmentItem> {
  try {
    const { supabase, user } = await requireAuth();
    // Trimmed; a cleared optional field (type, description, insurance class) is null.
    const shared = Object.fromEntries(ITEM_FIELDS.filter((f) => f in fields).map((f) => {
      const value = typeof fields[f] === 'string' ? (fields[f] as string).trim() : fields[f];
      return [f, value === '' && f !== 'category' && f !== 'manufacturer_model' ? null : value];
    }));

    const { data, error } = await (supabase.from('equipment_items') as any)
      .update({ ...shared, updated_by: user.id })
      .eq('id', itemId)
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new Error('Another item already has this manufacturer & model and category.');
      }
      throw error;
    }

    if (Object.keys(shared).length > 0) {
      const { error: recordsError } = await (supabase.from('assets') as any)
        .update({ ...shared, updated_by: user.id })
        .eq('equipment_item_id', itemId);
      if (recordsError) throw recordsError;
    }
    return data;
  } catch (err) {
    return handleApiError(err, 'update equipment item');
  }
}

/**
 * How many pieces of each item sit inside container kits, which are never
 * free for other kits (#162 Q8). `assetItem` maps each record to its item.
 */
export async function getContainerPieces(
  organizationId: string,
  assetItem: ReadonlyMap<string, string>,
): Promise<Map<string, number>> {
  const supabase = getSupabase();
  try {
    const { data: kits, error } = await (supabase.from('kits') as any)
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_container', true);
    if (error) throw error;
    const containerKitIds = new Set<string>((kits ?? []).map((k: { id: string }) => k.id));
    if (containerKitIds.size === 0) return new Map();
    const ids = [...containerKitIds];

    const [components, unitCache, itemCache] = await Promise.all([
      (supabase.from('kit_components') as any).select('kit_id, child_kit_id').in('kit_id', ids).not('child_kit_id', 'is', null),
      (supabase.from('kit_flattened_cache') as any).select('kit_id, asset_id, total_quantity').in('kit_id', ids),
      (supabase.from('kit_flattened_item_cache') as any).select('kit_id, equipment_item_id, total_quantity').in('kit_id', ids),
    ]);
    for (const r of [components, unitCache, itemCache]) if (r.error) throw r.error;

    const nestedContainerIds = new Set<string>(
      (components.data ?? [])
        .map((c: { child_kit_id: string }) => c.child_kit_id)
        .filter((id: string) => containerKitIds.has(id)),
    );
    return containerPiecesByItem({
      containerKitIds, nestedContainerIds, assetItem,
      unitCache: unitCache.data ?? [],
      itemCache: itemCache.data ?? [],
    });
  } catch (err) {
    return handleApiError(err, 'count equipment in containers');
  }
}

export interface ItemKitLine {
  id: string;
  quantity: number;
  asset_id: string | null;
  equipment_item_id: string | null;
  kit: { id: string; name: string; tag_number: string | null; is_container: boolean } | null;
}

/**
 * The kit lines that use an item: "N × any" of it, or one of its specific
 * units or lots (`recordIds`).
 */
export async function getItemKitLines(itemId: string, recordIds: readonly string[]): Promise<ItemKitLine[]> {
  const supabase = getSupabase();
  try {
    const filter = recordIds.length
      ? `equipment_item_id.eq.${itemId},asset_id.in.(${recordIds.join(',')})`
      : `equipment_item_id.eq.${itemId}`;
    const { data, error } = await (supabase.from('kit_components') as any)
      .select('id, quantity, asset_id, equipment_item_id, kit:kits!kit_assets_kit_id_fkey(id, name, tag_number, is_container)')
      .or(filter);
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    return handleApiError(err, 'fetch the kits that use this item');
  }
}
