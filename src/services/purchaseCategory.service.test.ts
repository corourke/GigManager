import { describe, it, expect, vi, beforeEach } from 'vitest';

// A chainable query stub: every builder call returns itself; awaiting it yields `result`.
let result: any = { data: [], error: null };
const calls: any[] = [];
const q: any = new Proxy({}, {
  get: (_t, prop) => prop === 'then'
    ? (res: any, rej: any) => Promise.resolve(result).then(res, rej)
    : (...args: any[]) => { calls.push([prop, ...args]); return q; },
});
const rpc = vi.fn(async () => ({ error: null }));
vi.mock('./base/dataAccess', () => ({
  getCurrentUser: vi.fn(async () => ({ id: 'u1' })),
  getSupabase: () => ({ from: (t: string) => { calls.push(['from', t]); return q; }, rpc }),
}));
vi.mock('./asset.service', () => ({ getDistinctAssetValues: vi.fn(async () => ['Lighting', 'Cases', 'Cases/Bags', 'Small Parts', 'Audio']) }));

import { getExpenseCategories, getEquipmentCategories, listCategories, getCategoryUsage } from './purchaseCategory.service';

describe('category lists', () => {
  beforeEach(() => { calls.length = 0; rpc.mockClear(); result = { data: [], error: null }; });

  it('sets up the organization\'s lists on first use, then reads its active expense categories', async () => {
    result = { data: [{ name: 'Supplies', schedule_c_line: '22' }], error: null };
    expect(await getExpenseCategories('org-1')).toEqual([{ name: 'Supplies', schedule_c_line: '22' }]);
    expect(rpc).toHaveBeenCalledWith('ensure_org_categories', { p_org: 'org-1' });
    expect(calls).toContainEqual(['eq', 'organization_id', 'org-1']);
    expect(calls).toContainEqual(['eq', 'active', true]);
  });

  it('falls back to the 2025 headings if the list cannot load', async () => {
    result = { data: null, error: new Error('relation does not exist') };
    const names = (await getExpenseCategories('org-1')).map(c => c.name);
    expect(names).toContain('Small audio parts');
  });

  it('reads the organization\'s active equipment categories', async () => {
    result = { data: [{ name: 'Audio' }, { name: 'Lighting' }], error: null };
    expect(await getEquipmentCategories('org-1')).toEqual(['Audio', 'Lighting']);
  });

  it('falls back to the categories its equipment uses, tidied, if the list cannot load', async () => {
    result = { data: null, error: new Error('nope') };
    expect(await getEquipmentCategories('org-1')).toEqual(['Audio', 'Cases/Bags', 'Lighting', 'Misc']);
  });

  it('the starter set is the rows with no organization, and isn\'t set up first', async () => {
    result = { data: [], error: null };
    await listCategories('equipment', null);
    expect(rpc).not.toHaveBeenCalled();
    expect(calls).toContainEqual(['from', 'equipment_categories']);
    expect(calls).toContainEqual(['is', 'organization_id', null]);
  });

  it('counts how many expensed lines use each category, by name', async () => {
    result = { data: [{ category: 'Supplies' }, { category: 'supplies ' }, { category: null }, { category: 'Travel' }], error: null };
    expect(await getCategoryUsage('expense', 'org-1')).toEqual({ supplies: 2, travel: 1 });
    expect(calls).toContainEqual(['eq', 'tax_treatment', 'expense']);
  });
});
