import { describe, it, expect } from 'vitest';
import { pickLots } from './pickLots';

// #185 (Cameron, 10-09): an "any" line of an untagged item is packed from its lots with no
// "which lot?" prompt: the lot with the most at home first, then the next. Ties: the older lot.
const lot = (id: string, at_home: number, created_at = '2026-01-01T00:00:00Z') => ({ id, at_home, created_at });

describe('pickLots', () => {
  it('takes from the lot with the most at home', () => {
    expect(pickLots([lot('a', 4), lot('b', 9)], 3)).toEqual({ picks: [{ asset_id: 'b', quantity: 3 }], short: 0 });
  });

  it('spills over to the next lot when one can\'t cover the line', () => {
    expect(pickLots([lot('a', 4), lot('b', 6)], 8)).toEqual({ picks: [{ asset_id: 'b', quantity: 6 }, { asset_id: 'a', quantity: 2 }], short: 0 });
  });

  it('a tie goes to the older lot, then the lower id', () => {
    const older = lot('z', 5, '2025-06-01T00:00:00Z');
    const newer = lot('a', 5, '2026-06-01T00:00:00Z');
    expect(pickLots([newer, older], 2).picks).toEqual([{ asset_id: 'z', quantity: 2 }]);
    const sameDay = [lot('b', 5), lot('a', 5)];
    expect(pickLots(sameDay, 2).picks).toEqual([{ asset_id: 'a', quantity: 2 }]);
  });

  it('says how many it couldn\'t find, and skips lots with none at home', () => {
    expect(pickLots([lot('a', 0), lot('b', 2)], 5)).toEqual({ picks: [{ asset_id: 'b', quantity: 2 }], short: 3 });
  });

  it('picks nothing for nothing', () => {
    expect(pickLots([lot('a', 3)], 0)).toEqual({ picks: [], short: 0 });
  });

  // #246 review: a lot with no created_at isn't "oldest"; it goes after the dated ones.
  it('a tie with no created_at goes after a dated lot', () => {
    expect(pickLots([{ id: 'a', at_home: 5, created_at: null }, { id: 'b', at_home: 5, created_at: '2026-03-01T00:00:00Z' }], 3).picks)
      .toEqual([{ asset_id: 'b', quantity: 3 }])
  })
});
