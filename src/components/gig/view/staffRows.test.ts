import { describe, it, expect } from 'vitest';
import { formatRate, formatUnits, rateBasis, staffRows } from './staffRows';

const slot = (assignment: Record<string, unknown>) => ({
  id: 's1', role: 'A1', count: 1,
  staff_assignments: [{ id: 'a1', user_id: 'u1', status: 'Confirmed', ...assignment }],
});

describe('rate units (#171)', () => {
  it('shows a rate per its stored unit', () => {
    expect(staffRows([slot({ rate: 50, rate_unit: 'hour' })] as any)[0].pay).toBe('$50 / hr');
    expect(staffRows([slot({ rate: 400, rate_unit: 'day' })] as any)[0].pay).toBe('$400 / day');
    expect(staffRows([slot({ rate: 225, rate_unit: 'half_day' })] as any)[0].pay).toBe('$225 / ½ day');
  });

  it('reads a rate with no unit as hourly', () => {
    expect(staffRows([slot({ rate: 50 })] as any)[0].pay).toBe('$50 / hr');
    expect(formatRate(50, null)).toBe('$50 / hr');
  });

  it('shows a fee as a flat amount, with no unit', () => {
    expect(staffRows([slot({ fee: 400, rate_unit: 'day' })] as any)[0].pay).toBe('$400 fee');
  });

  it('counts units in words', () => {
    expect(formatUnits(1, 'hour')).toBe('1 hour');
    expect(formatUnits(2.5, 'hour')).toBe('2.5 hours');
    expect(formatUnits(1, 'day')).toBe('1 day');
    expect(formatUnits(3, 'day')).toBe('3 days');
    expect(formatUnits(1, 'half_day')).toBe('1 half day');
    expect(formatUnits(2, 'half_day')).toBe('2 half days');
  });

  it('describes a rate total with its units, and a fee as Fee', () => {
    expect(rateBasis({ rate: 400, rate_unit: 'day', units_completed: 3 })).toBe('3 days × $400 / day');
    expect(rateBasis({ rate: 50, units_completed: null })).toBe('1 hour × $50 / hr');
    expect(rateBasis({ fee: 450, rate_unit: 'day' })).toBe('Fee');
    expect(rateBasis({})).toBe('');
  });
});
