import { icon, status, tracking, unitChip, lotChip, kindPill, btnPrimary, btnOutline, btnGhostSm, rowMenu, select, toggle, topbar, equipmentHeader, content, frame, thead, shell, newMark } from '../lib.mjs';
import { K12, TRIO, money } from '../data.mjs';

const TD = 'px-3 py-2 align-middle';

// An item row: what it is, with counts worked out from its units and lots.
const itemRow = ({ open = false, model, type, category, owned, breakdown, avail, track, value, total, mark = '' }) => `
<tr class="border-b ${open ? 'bg-sky-50/40' : 'hover:bg-gray-50'}">
  <td class="${TD} w-8 text-muted-foreground">${icon(open ? 'chevron-down' : 'chevron-right')}</td>
  <td class="${TD}"><div class="flex items-center gap-2"><span class="text-sm font-semibold text-gray-900">${model}</span>${mark}</div><div class="text-xs text-muted-foreground">${type}</div></td>
  <td class="${TD} text-sm">${category}</td>
  <td class="${TD} text-right"><div class="text-sm font-semibold tabular-nums">${owned}</div><div class="text-xs text-muted-foreground whitespace-nowrap">${breakdown}</div></td>
  <td class="${TD} text-sm">${avail}</td>
  <td class="${TD}">${track}</td>
  <td class="${TD} text-right text-sm tabular-nums">${value}</td>
  <td class="${TD} text-right text-sm font-medium tabular-nums">${total}</td>
  <td class="px-2 w-10">${rowMenu()}</td>
</tr>`;

// A unit or lot under an open item: what we own.
const subRow = ({ id, kind, statusS, where, kit = '', repl, n = 1 }) => `
<tr class="border-b bg-white hover:bg-gray-50">
  <td></td>
  <td class="${TD} pl-6" colspan="2"><div class="flex items-center gap-3"><span class="w-[52px]">${kindPill(kind)}</span>${id}</div></td>
  <td class="${TD} text-right text-sm tabular-nums">${kind === 'lot' ? '' : '1'}</td>
  <td class="${TD}"><div class="flex items-center gap-2">${status(statusS)}</div></td>
  <td class="${TD}"><div class="flex items-center gap-2">${tracking(where[0])}<span class="text-xs text-gray-700 whitespace-nowrap">${where[1]}</span></div>${kit ? `<div class="mt-0.5 text-xs text-muted-foreground">${kit}</div>` : ''}</td>
  <td class="${TD} text-right text-sm tabular-nums">${money(repl)}</td>
  <td class="${TD} text-right text-xs text-muted-foreground tabular-nums">${n > 1 ? `${n} × ${money(repl)}` : ''}</td>
  <td class="px-2">${rowMenu()}</td>
</tr>`;

const unitsTrack = `<span class="inline-flex items-center gap-1 text-xs text-gray-700">${icon('tag', 'h-3.5 w-3.5 text-sky-700')}Units</span>`;
const lotsTrack = `<span class="inline-flex items-center gap-1 text-xs text-gray-700">${icon('layers', 'h-3.5 w-3.5 text-amber-700')}Lots</span>`;
const bothTrack = `<span class="inline-flex items-center gap-2 text-xs text-gray-700"><span class="inline-flex items-center gap-1">${icon('tag', 'h-3.5 w-3.5 text-sky-700')}Units</span><span class="inline-flex items-center gap-1">${icon('layers', 'h-3.5 w-3.5 text-amber-700')}Lots</span></span>`;
const availTxt = (a, extra = '') => `<span class="tabular-nums"><span class="font-medium">${a}</span> available</span>${extra ? `<div class="text-xs text-muted-foreground">${extra}</div>` : ''}`;

const k12Units = K12.units.map((u) => subRow({ id: unitChip(u.tag, u.serial), kind: 'unit', statusS: u.status, where: u.where, kit: u.tag === 'DSL-0104' ? 'Note: woofer rattles (sent 10-02)' : '', repl: u.repl })).join('');

const table = `
<div class="rounded-md border bg-white overflow-hidden">
<table class="w-full text-sm">
  ${thead([{ h: '', cls: 'w-8' }, { h: 'Item' }, { h: 'Category' }, { h: 'Owned', cls: 'text-right' }, { h: 'Availability' }, { h: 'Tracked as' }, { h: 'Replacement (each)', cls: 'text-right' }, { h: 'Total value', cls: 'text-right' }, { h: '', cls: 'w-10' }])}
  <tbody>
  ${itemRow({ open: true, model: K12.model, type: K12.type, category: 'Audio', owned: '6', breakdown: '6 units', avail: availTxt(5, '1 in maintenance'), track: unitsTrack, value: '<span class="whitespace-nowrap">$999–$1,049</span>', total: money(6094), mark: newMark(1) })}
  ${k12Units}
  <tr class="border-b bg-white"><td></td><td colspan="8" class="px-3 py-1.5 pl-6"><button class="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:underline">${icon('plus', 'h-3.5 w-3.5')}Add unit or lot</button></td></tr>
  ${itemRow({ model: TRIO.model, type: TRIO.type, category: 'Lighting', owned: '6', breakdown: '6 units', avail: availTxt(2, '4 out on Harvest Gala'), track: unitsTrack, value: money(699), total: money(4194) })}
  ${itemRow({ open: true, model: 'XLR Cable, 25 ft', type: 'Cable, XLR', category: 'Audio', owned: '30', breakdown: '2 lots', avail: availTxt(20, '10 in XLR Cable Box'), track: lotsTrack, value: money(16), total: money(480), mark: newMark(2) })}
  ${subRow({ id: lotChip(10), kind: 'lot', statusS: 'Active', where: ['In Warehouse', 'in XLR Cable Box'], repl: 16, n: 10 })}
  ${subRow({ id: lotChip(20), kind: 'lot', statusS: 'Active', where: ['In Warehouse', 'Warehouse, Bay 2'], kit: '', repl: 16, n: 20 })}
  ${itemRow({ open: true, model: 'XLR Cable, 15 ft', type: 'Cable, XLR', category: 'Audio', owned: '22', breakdown: '12 units · 1 lot of 10', avail: availTxt(12, '10 in XLR Cable Box'), track: bothTrack, value: money(13), total: money(13 * 22), mark: newMark(3) })}
  ${subRow({ id: lotChip(10), kind: 'lot', statusS: 'Active', where: ['In Warehouse', 'in XLR Cable Box'], repl: 13, n: 10 })}
  ${subRow({ id: unitChip('', 'XC15-0001'), kind: 'unit', statusS: 'Active', where: ['In Warehouse', 'Warehouse, Bay 2'], repl: 13 })}
  ${subRow({ id: unitChip('', 'XC15-0002'), kind: 'unit', statusS: 'Active', where: ['In Warehouse', 'Warehouse, Bay 2'], repl: 13 })}
  <tr class="border-b bg-white"><td></td><td colspan="8" class="px-3 py-1.5 pl-6 text-xs text-muted-foreground">+ 10 more units · <span class="font-medium text-sky-700">Show all</span></td></tr>
  ${itemRow({ model: 'XLR Cable, 5 ft', type: 'Cable, XLR', category: 'Audio', owned: '12', breakdown: '12 units', avail: availTxt(12), track: unitsTrack, value: money(9), total: money(108) })}
  ${itemRow({ model: 'XLR Cable, 50 ft', type: 'Cable, XLR', category: 'Audio', owned: '10', breakdown: '6 units · 1 lot of 4', avail: availTxt(4, '4 in XLR Cable Box · 2 in FOH Console Package'), track: bothTrack, value: money(25), total: money(250) })}
  ${itemRow({ model: 'QSC PLD4.5 Amplifier', type: 'Amplifier, Power', category: 'Audio', owned: '1', breakdown: '1 unit', avail: availTxt(1, 'in PA Rack (RACK-01)'), track: unitsTrack, value: money(2799), total: money(2799) })}
  ${itemRow({ model: 'Tessel T58 Dynamic Vocal Microphone', type: 'Microphone, Dynamic, Vocal', category: 'Audio', owned: '6', breakdown: '6 units', avail: availTxt(6, '4 in Mic Case'), track: unitsTrack, value: money(114), total: money(684) })}
  ${itemRow({ model: 'Speaker Stand, Tripod', type: 'Stand, Speaker', category: 'Rigging and Truss', owned: '6', breakdown: '1 lot of 6', avail: availTxt(6), track: lotsTrack, value: money(68), total: money(408) })}
  </tbody>
  <tfoot><tr class="border-t-2 bg-muted/30"><td></td><td class="px-3 py-2 text-sm font-semibold" colspan="2">38 items · 141 units · 12 lots</td><td class="px-3 py-2 text-right text-sm font-semibold tabular-nums">339</td><td colspan="3"></td><td class="px-3 py-2 text-right text-sm font-bold tabular-nums">$71,286</td><td></td></tr></tfoot>
</table>
</div>`;

const filters = `
<div class="mb-3 flex flex-wrap items-center gap-2">
  <div class="relative w-80"><div class="flex h-9 items-center rounded-md border bg-white px-3 text-sm text-muted-foreground">${icon('search', 'h-4 w-4 mr-2')}Search model, type, serial or tag…</div></div>
  <div class="w-40">${select('All categories', { extra: 'bg-white border-gray-200' })}</div>
  <div class="w-40">${select('Active', { extra: 'bg-white border-gray-200' })}</div>
  <div class="w-44">${select('Units and lots', { extra: 'bg-white border-gray-200' })}</div>
  <div class="flex items-center gap-1.5">${newMark(4)}${toggle(['By item', 'Every unit &amp; lot'], 'By item')}</div>
  <div class="ml-auto flex items-center gap-1">${btnGhostSm('Expand all', 'chevrons-up-down')}${btnGhostSm('Columns', 'columns')}</div>
</div>`;

const flat = `
<div class="rounded-md border bg-white overflow-hidden">
<table class="w-full text-sm">
  ${thead([{ h: '' }, { h: 'Tag / serial' }, { h: 'Item' }, { h: 'Qty', cls: 'text-right' }, { h: 'Status' }, { h: 'Location' }, { h: 'Purchase' }])}
  <tbody>
  ${[
    ['unit', unitChip('DSL-0104', 'GAA213430'), K12.model, '1', 'Maintenance', ['In Warehouse', 'Repair Bench'], 'Sweetwater · 2024-03-12'],
    ['unit', unitChip('DSL-0141', 'IT32510290'), TRIO.model, '1', 'Active', ['Checked Out', 'Harvest Gala (Club Lighting Package)'], 'Brightline Lighting · 2025-10-29 · line 1 of 1, qty 6'],
    ['lot', lotChip(10), 'XLR Cable, 25 ft', '10', 'Active', ['In Warehouse', 'in XLR Cable Box'], 'Cablesmith Direct · 2026-07-24'],
    ['unit', unitChip('', 'XC15-0001'), 'XLR Cable, 15 ft', '1', 'Active', ['In Warehouse', 'Warehouse, Bay 2'], 'Cablesmith Direct · 2026-08-30'],
  ].map(([k, id, m, q, s, w, p]) => `<tr class="border-b"><td class="${TD} w-16">${kindPill(k)}</td><td class="${TD} whitespace-nowrap">${id}</td><td class="${TD} font-medium whitespace-nowrap">${m}</td><td class="${TD} text-right tabular-nums">${q}</td><td class="${TD}">${status(s)}</td><td class="${TD}"><div class="flex items-center gap-2">${tracking(w[0])}<span class="text-xs">${w[1]}</span></div></td><td class="${TD} text-xs text-muted-foreground">${p}</td></tr>`).join('')}
  </tbody>
</table></div>`;

export default () => ({
  name: '01-equipment-list',
  ...shell({
    id: '01-equipment-list',
    body: frame(
      topbar() +
      equipmentHeader('Items', btnOutline('Upload Invoice', 'file') + btnOutline('Import', 'upload') + btnPrimary('Add Item', 'plus')) +
      content(filters + table),
      'Equipment › Items, grouped by item (default). Three items expanded.',
    ) + frame(content(`<div class="mb-3 flex items-center gap-2"><div class="relative w-80"><div class="flex h-9 items-center rounded-md border bg-white px-3 text-sm">${icon('search', 'h-4 w-4 mr-2 text-muted-foreground')}DSL-01</div></div>${toggle(['By item', 'Every unit &amp; lot'], 'Every unit &amp; lot')}<span class="text-xs text-muted-foreground">Sample rows</span></div>` + flat), 'The same tab with “Every unit &amp; lot”: one row per unit or lot, for finding a serial or tag.'),
    notes: [
      '<b>Rows are items</b> (what it is). <b>Owned</b> is worked out from the item’s units and lots, never typed in, so it can’t drift. Expanding an item shows its units and lots with status and location. The K12.2 shows one unit in maintenance, so 5 of 6 are available.',
      '<b>A lot</b> reads as “Lot of N” with a layers icon, in amber. It has no serial or tag, and comes from one purchase line, so two lots of the same cable can differ in vendor and cost. Its location comes from scans: the lot of 10 is in the XLR Cable Box, the lot of 20 in the warehouse.',
      '<b>An item can have both</b>: the 15 ft cable has 12 serial-numbered units (packed into the Small XLR Cable Box at checkout) and an untagged lot of 10, currently in the XLR Cable Box. <b>A unit</b> reads as a tag icon with its tag, and its serial in grey; its quantity is always 1.',
      '<b>Two views</b> (an in-content toggle, not a second row of tabs): by item, or every unit and lot as its own row, which is how you find a serial or tag. Search matches serial and tag in both. The tab is renamed <b>Items</b> (was Assets).',
      '<b>Replacement value</b> is on each unit and lot (an older K12.2 is worth $999, a newer one $1,049); the item row shows the range. Total value adds them up, the same figure the dashboard will show (#157). The footer counts items, units, lots and pieces.',
      '<b>Status</b> moves to the unit or lot (one K12.2 in Maintenance), so the item row shows availability instead of a single status. The Status filter filters units and lots; an item shows when any of them match.',
    ],
  }),
});
