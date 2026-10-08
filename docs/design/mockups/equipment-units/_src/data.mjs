// Example data shared by the mockups. Cameron's real examples (#162) plus names
// from the dev demo org (Demo Sound & Lighting). Serials and tags are made up.

export const K12 = {
  model: 'QSC K12.2', category: 'Audio', type: 'Speaker, Powered, Full-Range', replacement: 1049,
  insurance: 'Audio', vendor: 'Sweetwater',
  units: [
    { tag: 'DSL-0101', serial: 'GAA213409', status: 'Active', where: ['In Warehouse', 'Warehouse, Bay 2'], acquired: '2024-03-12', cost: 899, repl: 999 },
    { tag: 'DSL-0102', serial: 'GAA213415', status: 'Active', where: ['In Warehouse', 'Warehouse, Bay 2'], acquired: '2024-03-12', cost: 899, repl: 999 },
    { tag: 'DSL-0103', serial: 'GAA213422', status: 'Active', where: ['In Warehouse', 'Warehouse, Bay 2'], acquired: '2024-03-12', cost: 899, repl: 999 },
    { tag: 'DSL-0104', serial: 'GAA213430', status: 'Maintenance', where: ['In Warehouse', 'Repair Bench'], acquired: '2024-03-12', cost: 899, repl: 999 },
    { tag: 'DSL-0105', serial: 'GAB118051', status: 'Active', where: ['In Warehouse', 'Warehouse, Bay 2'], acquired: '2025-05-02', cost: 949, repl: 1049 },
    { tag: 'DSL-0106', serial: 'GAB118064', status: 'Active', where: ['In Warehouse', 'Warehouse, Bay 2'], acquired: '2025-05-02', cost: 949, repl: 1049 },
  ],
};

export const TRIO = {
  model: 'Chauvet Intimidator Trio', category: 'Lighting', type: 'Light Fixture, Moving Head, Beam', replacement: 699,
  vendor: 'Brightline Lighting', acquired: '2025-10-29',
  units: ['DSL-0141', 'DSL-0142', 'DSL-0143', 'DSL-0144', 'DSL-0145', 'DSL-0146'].map((tag, i) => ({ tag, serial: `IT3${2510290 + i * 7}` })),
};

// XLR cables. 25' and 15' have untagged lots that live in the XLR Cable Box;
// 5', 15' and 50' also have serial-numbered units for the Small XLR Cable Box.
export const XLR = {
  x5: { model: 'XLR Cable, 5 ft', units: 12, lots: [] },
  x15: { model: 'XLR Cable, 15 ft', units: 12, lots: [{ n: 10, home: 'XLR Cable Box' }] },
  x25: { model: 'XLR Cable, 25 ft', units: 0, lots: [{ n: 10, home: 'XLR Cable Box' }, { n: 20, home: '' }] },
  x50: { model: 'XLR Cable, 50 ft', units: 6, lots: [{ n: 4, home: 'XLR Cable Box' }] },
};

export const GIG = { title: 'Harvest Gala Dinner &amp; Dance', date: 'Sat, Oct 10, 2026', venue: 'Harborlight Pavilion' };
export const OTHER_GIG = { title: 'Harborlight Pavilion Members’ Night', date: 'Sat, Oct 10, 2026' };

export const money = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
export const money2 = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
