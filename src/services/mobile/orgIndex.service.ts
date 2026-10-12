import { createClient } from '../../utils/supabase/client';
import { idbStore } from '../../utils/idb/store';
import { isRetired } from '../../utils/equipmentItems';

const supabase = createClient();
const PAGE = 1000;

export interface IndexKit {
  id: string;
  name: string;
  tag_number: string | null;
  is_container: boolean;
}

export interface IndexRecord {
  id: string;
  tag_number: string | null;
  serial_number: string | null;
  quantity: number | null;
  status: string | null;
  equipment_item_id: string | null;
  item_name: string;
}

/** The organization's kits and equipment still in service, cached on the device (#185). */
export interface OrgIndex {
  org_id: string;
  kits: IndexKit[];
  records: IndexRecord[];
  fetched_at?: number;
}

export type TagMatch = { type: 'kit'; kit: IndexKit } | { type: 'record'; record: IndexRecord };

export interface IndexSearch {
  kits: IndexKit[];
  items: { item_id: string; name: string; records: IndexRecord[] }[];
}

async function allRows<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

export const orgIndexService = {
  /** Read the org's kits and equipment and cache them. Retired records are left out. */
  async refresh(orgId: string): Promise<OrgIndex> {
    const kits = await allRows<any>((from, to) => (supabase.from('kits') as any)
      .select('id, name, tag_number, is_container').eq('organization_id', orgId).order('id').range(from, to));
    const assets = await allRows<any>((from, to) => (supabase.from('assets') as any)
      .select('id, tag_number, serial_number, quantity, status, retired_on, equipment_item_id, manufacturer_model, item:equipment_items(manufacturer_model)')
      .eq('organization_id', orgId).order('id').range(from, to));
    const index: OrgIndex = {
      org_id: orgId,
      kits: kits.map((k) => ({ id: k.id, name: k.name, tag_number: k.tag_number ?? null, is_container: !!k.is_container })),
      records: assets.filter((a) => !isRetired(a)).map((a) => ({
        id: a.id,
        tag_number: a.tag_number ?? null,
        serial_number: a.serial_number ?? null,
        quantity: a.quantity ?? 1,
        status: a.status ?? null,
        equipment_item_id: a.equipment_item_id ?? null,
        item_name: a.item?.manufacturer_model || a.manufacturer_model || 'Unnamed item',
      })),
      fetched_at: Date.now(),
    };
    await idbStore.putOrgIndex(index);
    return index;
  },

  async get(orgId: string): Promise<OrgIndex | null> {
    return (await idbStore.getOrgIndex(orgId)) ?? null;
  },

  /** A scanned tag: a kit or container, or a unit or tagged lot. */
  findTag(index: OrgIndex | null, tag: string): TagMatch | null {
    const t = tag.trim();
    if (!index || !t) return null;
    const kit = index.kits.find((k) => k.tag_number?.trim() === t);
    if (kit) return { type: 'kit', kit };
    const record = index.records.find((r) => r.tag_number?.trim() === t);
    return record ? { type: 'record', record } : null;
  },

  /** "+ Add": kits and items whose name has the text in it; each item with its units and lots. */
  search(index: OrgIndex | null, text: string): IndexSearch {
    const q = text.trim().toLowerCase();
    if (!index || !q) return { kits: [], items: [] };
    const kits = index.kits.filter((k) => k.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
    const byItem = new Map<string, { item_id: string; name: string; records: IndexRecord[] }>();
    for (const r of index.records) {
      if (!r.equipment_item_id || !r.item_name.toLowerCase().includes(q)) continue;
      const item = byItem.get(r.equipment_item_id) ?? { item_id: r.equipment_item_id, name: r.item_name, records: [] };
      item.records.push(r);
      byItem.set(r.equipment_item_id, item);
    }
    return { kits, items: [...byItem.values()].sort((a, b) => a.name.localeCompare(b.name)) };
  },
};
