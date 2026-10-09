import { describe, it, expect } from 'vitest';
import { containersIn, kitNeeds, gigNeeds, itemNeedRows, type GigNeeds, type ItemNeed, type KitLine, type KitMeta } from './equipmentNeeds';

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

describe('kitNeeds: nesting', () => {
  it('a sub-kit used twice counts twice', () => {
    const twice = { ...ctx, lines: new Map(Object.entries({ ...lines, double: [{ child_kit_id: 'pa', quantity: 2 }] })) };
    expect(Object.fromEntries(kitNeeds('double', twice))).toEqual({ k12: 4, amp: 2 });
  });

  it('a kit cycle stops instead of looping', () => {
    const cyc = {
      kits: new Map([['a', { id: 'a', name: 'A', is_container: false }], ['b', { id: 'b', name: 'B', is_container: false }]]),
      lines: new Map([['a', [{ child_kit_id: 'b', quantity: 1 }, { equipment_item_id: 'x', quantity: 1 }]], ['b', [{ child_kit_id: 'a', quantity: 1 }]]]),
      assetItem: new Map(),
    };
    expect(Object.fromEntries(kitNeeds('a', cyc))).toEqual({ x: 1 });
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
  const h = (hour: number) => Date.UTC(2026, 9, 10, hour);
  const need = (total: number): ItemNeed => ({ total, kits: [] });
  const gig = (id: string, from: number, to: number, needs: Record<string, number>): GigNeeds =>
    ({ id, title: id, start: h(from), end: h(to), needs: new Map(Object.entries(needs).map(([k, v]) => [k, need(v)])) });

  it('one row per item this gig needs: this gig, overlapping, needed, owned, free and status', () => {
    const thisGig = gig('this', 18, 23, { trio: 4, k12: 2, xlr50: 4 });
    const other = gig('other', 18, 23, { trio: 4, k12: 2, xlr50: 2 });
    const rows = itemNeedRows(thisGig, [other], summaries);
    expect(rows.map((r) => [r.name, r.thisGig, r.overlapping, r.needed, r.owned, r.inMaintenance, r.free, r.status, r.short])).toEqual([
      ['Chauvet Intimidator Trio', 4, 4, 8, 6, 0, 6, 'short', 2],
      ['QSC K12.2', 2, 2, 4, 6, 1, 5, 'enough', 0],
      ['XLR Cable, 50 ft', 4, 2, 6, 10, 0, 6, 'none-spare', 0],
    ]);
    expect(rows[0].peakGigs.map((g) => g.id)).toEqual(['other']);
  });

  it('needed is the peak at any one time: gigs that don\'t overlap each other don\'t add up', () => {
    // This gig runs all day; a morning gig and an evening gig each overlap it, but not each other.
    const thisGig = gig('this', 10, 23, { trio: 1 });
    const rows = itemNeedRows(thisGig, [gig('morning', 10, 13, { trio: 4 }), gig('evening', 18, 23, { trio: 4 })],
      new Map([['trio', { name: 'Trio', owned: 5, available: 5, inMaintenance: 0, inContainers: 0 }]]));
    expect(rows[0]).toMatchObject({ thisGig: 1, overlapping: 4, needed: 5, short: 0, status: 'none-spare' });
    expect(rows[0].peakGigs.map((g) => g.id)).toEqual(['morning']);
    expect(rows[0].peakAt).toBe(h(10));
  });

  it('gigs that do overlap each other at the peak add up', () => {
    const thisGig = gig('this', 10, 23, { trio: 1 });
    const rows = itemNeedRows(thisGig, [gig('a', 12, 20, { trio: 2 }), gig('b', 18, 23, { trio: 2 })],
      new Map([['trio', { name: 'Trio', owned: 4, available: 4, inMaintenance: 0, inContainers: 0 }]]));
    expect(rows[0]).toMatchObject({ needed: 5, short: 1, peakAt: h(18) });
    expect(rows[0].peakGigs.map((g) => g.id).sort()).toEqual(['a', 'b']);
  });

  it('a tie at the peak: the earliest moment is the peak, and each short moment names its own gig (#236)', () => {
    const thisGig = gig('this', 10, 23, { trio: 1 });
    const rows = itemNeedRows(thisGig, [gig('morning', 11, 13, { trio: 2 }), gig('evening', 18, 20, { trio: 2 })],
      new Map([['trio', { name: 'Trio', owned: 2, available: 2, inMaintenance: 0, inContainers: 0 }]]));
    expect(rows[0]).toMatchObject({ overlapping: 2, needed: 3, short: 1, peakAt: h(11) });
    expect(rows[0].peakGigs.map((g) => g.id)).toEqual(['morning']);
    expect(rows[0].shortMoments.map((m) => [m.at, m.needed, m.short, m.gigs.map((g) => g.id)])).toEqual([
      [h(11), 3, 1, ['morning']],
      [h(18), 3, 1, ['evening']],
    ]);
  });

  it('an item no other gig needs is still short when this gig alone asks for more than are free', () => {
    const rows = itemNeedRows(gig('this', 18, 23, { trio: 7 }), [], summaries);
    expect(rows[0]).toMatchObject({ overlapping: 0, needed: 7, short: 1, status: 'short', peakGigs: [] });
  });

  it('an item with no records reads as none owned', () => {
    const rows = itemNeedRows(gig('this', 18, 23, { ghost: 1 }), [], summaries);
    expect(rows[0]).toMatchObject({ name: 'Unknown item', owned: 0, free: 0, short: 1 });
  });
});

// A container is one physical case: two gigs that both reach it need the same case.
describe('containersIn', () => {
  const kits = new Map<string, KitMeta>([
    ['stage', { id: 'stage', name: 'Stage', is_container: false }],
    ['mic-case', { id: 'mic-case', name: 'Mic Case', is_container: true }],
    ['pouch', { id: 'pouch', name: 'Clip Pouch', is_container: true }],
  ])
  const lines = new Map<string, KitLine[]>([
    ['stage', [{ child_kit_id: 'mic-case', quantity: 1 }, { equipment_item_id: 'xlr', quantity: 4 }]],
    ['mic-case', [{ child_kit_id: 'pouch', quantity: 1 }]],
    ['pouch', []],
  ])
  const ctx = { kits, lines, assetItem: new Map() }

  it('the kit itself when it is a container, and every container reached through it', () => {
    expect([...containersIn('mic-case', ctx)].sort()).toEqual(['mic-case', 'pouch'])
    expect([...containersIn('stage', ctx)].sort()).toEqual(['mic-case', 'pouch'])
    expect([...containersIn('pouch', ctx)]).toEqual(['pouch'])
  })
})
