import { describe, it, expect } from 'vitest';
import { kitNeeds, gigNeeds, itemNeedRows, type KitLine, type KitMeta } from './equipmentNeeds';

// #184 PR 2: count units per item across overlapping gigs (mockup screen 10).
const kits: Record<string, KitMeta> = {
  light: { id: 'light', name: 'Club Lighting Package', is_container: false },
  band: { id: 'band', name: 'Full Band Sound Package', is_container: false },
  pa: { id: 'pa', name: 'Main PA', is_container: false },
  box: { id: 'box', name: 'XLR Cable Box', is_container: true },
};
const lines: Record<string, KitLine[]> = {
  light: [{ equipment_item_id: 'trio', quantity: 4 }],
  pa: [{ equipment_item_id: 'k12', quantity: 2 }, { asset_id: 'amp-1', quantity: 1 }],
  band: [{ child_kit_id: 'pa', quantity: 1 }, { child_kit_id: 'box', quantity: 1 }, { equipment_item_id: 'xlr50', quantity: 4 }],
  box: [{ asset_id: 'xlr50-lot', quantity: 4 }],
};
const assetItem = new Map([['amp-1', 'amp'], ['xlr50-lot', 'xlr50']]);
const ctx = { kits: new Map(Object.entries(kits)), lines: new Map(Object.entries(lines)), assetItem };

describe('kitNeeds', () => {
  it('counts "any" lines and specific units per item, through nested kits', () => {
    expect(Object.fromEntries(kitNeeds('band', ctx))).toEqual({ k12: 2, amp: 1, xlr50: 4 });
  });

  it('stops at a container: its contents travel inside it', () => {
    expect(kitNeeds('box', ctx).size).toBe(0);
  });
});

describe('gigNeeds', () => {
  it('adds up a gig\'s kits per item, and says which kit asks for how many', () => {
    const needs = gigNeeds(['light', 'pa'], ctx);
    expect(needs.get('trio')).toEqual({ total: 4, kits: [{ kit_name: 'Club Lighting Package', quantity: 4 }] });
    expect(needs.get('k12')).toEqual({ total: 2, kits: [{ kit_name: 'Main PA', quantity: 2 }] });
  });
});

describe('itemNeedRows', () => {
  const summaries = new Map([
    ['trio', { name: 'Chauvet Intimidator Trio', owned: 6, available: 6, inMaintenance: 0, inContainers: 0 }],
    ['k12', { name: 'QSC K12.2', owned: 6, available: 5, inMaintenance: 1, inContainers: 0 }],
    ['xlr50', { name: 'XLR Cable, 50 ft', owned: 10, available: 6, inMaintenance: 0, inContainers: 4 }],
  ]);

  it('one row per item this gig needs: this gig, overlapping, needed, owned, free and status', () => {
    const thisGig = new Map([['trio', { total: 4, kits: [] }], ['k12', { total: 2, kits: [] }], ['xlr50', { total: 4, kits: [] }]]);
    const others = [new Map([['trio', { total: 4, kits: [] }], ['k12', { total: 2, kits: [] }], ['xlr50', { total: 2, kits: [] }]])];
    const rows = itemNeedRows(thisGig, others, summaries);
    expect(rows.map((r) => [r.name, r.thisGig, r.overlapping, r.needed, r.owned, r.inMaintenance, r.free, r.status, r.short])).toEqual([
      ['Chauvet Intimidator Trio', 4, 4, 8, 6, 0, 6, 'short', 2],
      ['QSC K12.2', 2, 2, 4, 6, 1, 5, 'enough', 0],
      ['XLR Cable, 50 ft', 4, 2, 6, 10, 0, 6, 'none-spare', 0],
    ]);
  });

  it('an item no other gig needs is still short when this gig alone asks for more than are free', () => {
    const rows = itemNeedRows(new Map([['trio', { total: 7, kits: [] }]]), [], summaries);
    expect(rows[0]).toMatchObject({ overlapping: 0, needed: 7, short: 1, status: 'short' });
  });

  it('an item with no records reads as none owned', () => {
    const rows = itemNeedRows(new Map([['ghost', { total: 1, kits: [] }]]), [], summaries);
    expect(rows[0]).toMatchObject({ name: 'Unknown item', owned: 0, free: 0, short: 1 });
  });
});
