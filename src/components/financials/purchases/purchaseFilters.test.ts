import { describe, it, expect } from 'vitest';
import { DATE_PRESETS, DEFAULT_DATE_PRESET, presetRange, purchaseTotals } from './purchaseFilters';

// Wednesday 15 April 2026, mid-afternoon local time.
const today = new Date(2026, 3, 15, 15, 30);

describe('purchase report date presets', () => {
  it('defaults to the last 30 days', () => {
    expect(DEFAULT_DATE_PRESET).toBe('last-30');
    expect(presetRange('last-30', today)).toEqual({ from: '2026-03-16', to: '2026-04-15' });
  });

  it('covers the common periods', () => {
    expect(DATE_PRESETS.map((p) => p.label)).toEqual([
      'Last 30 days', 'This month', 'Last month', 'This quarter', 'This year', 'Last year', 'All time',
    ]);
    expect(presetRange('this-month', today)).toEqual({ from: '2026-04-01', to: '2026-04-30' });
    expect(presetRange('last-month', today)).toEqual({ from: '2026-03-01', to: '2026-03-31' });
    expect(presetRange('this-quarter', today)).toEqual({ from: '2026-04-01', to: '2026-06-30' });
    expect(presetRange('this-year', today)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
    expect(presetRange('last-year', today)).toEqual({ from: '2025-01-01', to: '2025-12-31' });
    expect(presetRange('all', today)).toEqual({ from: '', to: '' });
  });

  it('handles January for last month and the first quarter', () => {
    const jan = new Date(2026, 0, 10);
    expect(presetRange('last-month', jan)).toEqual({ from: '2025-12-01', to: '2025-12-31' });
    expect(presetRange('this-quarter', jan)).toEqual({ from: '2026-01-01', to: '2026-03-31' });
  });

  it('uses the local date, not UTC, late in the evening', () => {
    const lateEvening = new Date(2026, 3, 30, 23, 45);
    expect(presetRange('last-30', lateEvening).to).toBe('2026-04-30');
  });
});

describe('purchase report totals', () => {
  it('adds up line costs and counts assets and expenses', () => {
    const groups = [
      { children: [{ line_cost: 100, asset_id: 'a1' }, { line_cost: 25.5 }] },
      { children: [{ line_cost: 10, row_type: 'asset' }, { line_cost: null }] },
    ];
    expect(purchaseTotals(groups as any)).toEqual({ totalCost: 135.5, assetCount: 2, expenseCount: 2 });
  });
});
