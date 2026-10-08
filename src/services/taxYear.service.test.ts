import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTaxYears, getLockedTaxYears, saveTaxYear, deleteTaxYear } from './taxYear.service';

const chain: any = {};
const getCurrentUser = vi.fn();
vi.mock('./base/dataAccess', () => ({
  getSupabase: () => ({ from: (t: string) => chain.from(t) }),
  getCurrentUser: () => getCurrentUser(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  for (const m of ['from', 'select', 'upsert', 'delete', 'eq', 'order', 'single']) chain[m] = vi.fn(() => chain);
  getCurrentUser.mockResolvedValue({ id: 'u1' });
});

describe('tax year service', () => {
  it('lists an organization\'s years, newest first', async () => {
    chain.order.mockResolvedValueOnce({ data: [{ year: 2025, locked: true }], error: null });
    expect(await getTaxYears('org-1')).toEqual([{ year: 2025, locked: true }]);
    expect(chain.from).toHaveBeenCalledWith('tax_years');
    expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1');
    expect(chain.order).toHaveBeenCalledWith('year', { ascending: false });
  });

  it('requires a signed-in user', async () => {
    getCurrentUser.mockRejectedValueOnce(new Error('not signed in'));
    await expect(getTaxYears('org-1')).rejects.toThrow();
  });

  it('returns only the locked years, and an empty set if they cannot be read', async () => {
    chain.order.mockResolvedValueOnce({ data: [{ year: 2024, locked: true }, { year: 2025, locked: false }], error: null });
    expect([...(await getLockedTaxYears('org-1'))]).toEqual([2024]);
    chain.order.mockResolvedValueOnce({ data: null, error: { message: 'denied' } });
    expect((await getLockedTaxYears('org-1')).size).toBe(0);
  });

  it('upserts a year on organization and year', async () => {
    chain.single.mockResolvedValueOnce({ data: { year: 2025, locked: true }, error: null });
    await saveTaxYear('org-1', 2025, { locked: true });
    expect(chain.upsert).toHaveBeenCalledWith({ organization_id: 'org-1', year: 2025, locked: true }, { onConflict: 'organization_id,year' });
  });

  it('removes a year by organization and year', async () => {
    chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ error: null });
    await deleteTaxYear('org-1', 2025);
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenNthCalledWith(1, 'organization_id', 'org-1');
    expect(chain.eq).toHaveBeenNthCalledWith(2, 'year', 2025);
  });
});
