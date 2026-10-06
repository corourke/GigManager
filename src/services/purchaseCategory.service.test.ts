import { describe, it, expect, vi, beforeEach } from 'vitest';

const order = vi.fn();
vi.mock('../utils/supabase/auth-utils', () => ({
  requireAuth: vi.fn(async () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ order }) }) }) } })),
}));
vi.mock('./asset.service', () => ({ getDistinctAssetValues: vi.fn(async () => ['Lighting', 'Cases', 'Cases/Bags', 'Small Parts', 'Audio']) }));

import { getExpenseCategories, getEquipmentCategories } from './purchaseCategory.service';

describe('purchase categories', () => {
  beforeEach(() => order.mockReset());

  it('loads the shared expense categories', async () => {
    order.mockResolvedValue({ data: [{ name: 'Supplies', schedule_c_line: '27b' }], error: null });
    expect(await getExpenseCategories()).toEqual([{ name: 'Supplies', schedule_c_line: '27b' }]);
  });

  it('falls back to the 2025 headings if the list cannot load', async () => {
    order.mockResolvedValue({ data: null, error: new Error('relation does not exist') });
    const names = (await getExpenseCategories()).map(c => c.name);
    expect(names).toContain('Small audio parts');
    expect(names).toHaveLength(16);
  });

  it('tidies and sorts the equipment categories', async () => {
    expect(await getEquipmentCategories('org-1')).toEqual(['Audio', 'Cases/Bags', 'Lighting', 'Misc']);
  });
});
