import { describe, it, expect, vi } from 'vitest';
import { createClient } from '../utils/supabase/client';
import { loadEquipmentNeeds, needsOf } from './equipmentNeeds.service';

vi.mock('../utils/supabase/client', () => ({ createClient: vi.fn() }));

/** A query that filters rows by .in() and .eq(), like PostgREST. */
function table(rows: any[]) {
  let out = rows;
  const q: any = {
    select: () => q,
    in: (col: string, vals: any[]) => { out = out.filter((r) => vals.includes(r[col])); return q; },
    eq: (col: string, val: any) => { out = out.filter((r) => r[col] === val); return q; },
    then: (res: any, rej: any) => Promise.resolve({ data: out, error: null }).then(res, rej),
  };
  return q;
}

describe('loadEquipmentNeeds (#184)', () => {
  it('follows nested kits, maps units to items, and counts owned, available and in containers', async () => {
    const db: Record<string, any[]> = {
      kits: [
        { id: 'band', name: 'Full Band', is_container: false, organization_id: 'org' },
        { id: 'pa', name: 'Main PA', is_container: false, organization_id: 'org' },
        { id: 'box', name: 'XLR Cable Box', is_container: true, organization_id: 'org' },
      ],
      kit_components: [
        { kit_id: 'band', child_kit_id: 'pa', quantity: 1 },
        { kit_id: 'band', equipment_item_id: 'xlr', quantity: 4 },
        { kit_id: 'pa', equipment_item_id: 'k12', quantity: 2 },
        { kit_id: 'pa', asset_id: 'amp-1', quantity: 1 },
        { kit_id: 'box', asset_id: 'xlr-lot', quantity: 4 },
      ],
      assets: [{ id: 'amp-1', equipment_item_id: 'amp' }],
      equipment_items: [
        { id: 'k12', manufacturer_model: 'QSC K12.2', records: [{ id: 'k1', status: 'Active', tag_number: 'K1' }, { id: 'k2', status: 'Maintenance', tag_number: 'K2' }] },
        { id: 'amp', manufacturer_model: 'Amp', records: [{ id: 'amp-1', status: 'Active', tag_number: 'A1' }] },
        { id: 'xlr', manufacturer_model: 'XLR 50 ft', records: [{ id: 'xlr-lot', status: 'Active', quantity: 10 }] },
      ],
      kit_flattened_cache: [{ kit_id: 'box', asset_id: 'xlr-lot', total_quantity: 4 }],
      kit_flattened_item_cache: [],
    };
    vi.mocked(createClient).mockReturnValue({ from: (t: string) => table(db[t] ?? []) } as any);

    const data = await loadEquipmentNeeds(['band']);
    expect(Object.fromEntries([...needsOf(['band'], data)].map(([k, v]) => [k, v.total]))).toEqual({ k12: 2, amp: 1, xlr: 4 });
    expect(data.counts.get('k12')).toEqual({ name: 'QSC K12.2', owned: 2, available: 1, inMaintenance: 1, inContainers: 0 });
    expect(data.counts.get('xlr')).toEqual({ name: 'XLR 50 ft', owned: 10, available: 6, inMaintenance: 0, inContainers: 4 });
  });
});
