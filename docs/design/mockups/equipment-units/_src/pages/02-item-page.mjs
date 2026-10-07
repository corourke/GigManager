import { icon, status, tracking, unitChip, lotChip, kindPill, btnPrimary, btnOutline, btnGhostSm, rowMenu, topbar, pageHeader, content, frame, thead, card, shell, newMark, badge, tagBadge } from '../lib.mjs';
import { K12, money } from '../data.mjs';

const TD = 'px-3 py-2 align-middle whitespace-nowrap';
const lbl = (t) => `<div class="text-xs font-medium text-gray-500 uppercase tracking-wider">${t}</div>`;
const fieldV = (l, v) => `<div>${lbl(l)}<div class="mt-0.5 text-sm font-medium text-gray-900">${v}</div></div>`;

const header = (title, cat, type) => pageHeader({
  title, back: 'Back to Equipment',
  badge: tagBadge(cat) + badge(type, 'bg-sky-50 text-sky-700 border-sky-200'),
  actions: btnOutline('Edit', 'pencil') + btnOutline('Duplicate', 'file') + `<span class="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-background text-gray-700">${icon('more-v')}</span>` + btnPrimary('Add unit or lot', 'plus'),
});

const unitRows = K12.units.map((u) => `
<tr class="border-b hover:bg-muted/30">
  <td class="${TD} w-16">${kindPill('unit')}</td>
  <td class="${TD} font-mono text-[13px]">${u.tag}</td>
  <td class="${TD} font-mono text-[13px] text-gray-700">${u.serial}</td>
  <td class="${TD}">${status(u.status)}</td>
  <td class="${TD}"><div class="flex items-center gap-2">${tracking(u.where[0])}<span class="text-xs whitespace-nowrap">${u.where[1]}</span></div></td>
  <td class="${TD} text-xs text-gray-700 !whitespace-normal">${u.tag === 'DSL-0101' || u.tag === 'DSL-0103' ? 'Harvest Gala (Oct 10) · Main PA' : '<span class="text-muted-foreground">—</span>'}</td>
  <td class="${TD} text-xs text-muted-foreground whitespace-nowrap">${u.acquired}</td>
  <td class="${TD} text-xs"><span class="text-sky-700 hover:underline">${u.acquired === '2024-03-12' ? 'Sweetwater · 2024-03-12' : 'Sweetwater · 2025-05-02'}</span></td>
  <td class="${TD} text-right text-xs tabular-nums">${money(u.cost)}</td>
  <td class="${TD} text-xs text-gray-700 whitespace-nowrap">5-year</td>
  <td class="px-2 w-10">${rowMenu()}</td>
</tr>`).join('');

const unitsTable = `
<div class="rounded-md border bg-white overflow-hidden"><table class="w-full text-sm">
${thead([{ h: '' }, { h: 'Tag #' }, { h: 'Serial #' }, { h: 'Status' }, { h: 'Location' }, { h: 'Booked on' }, { h: 'Acquired' }, { h: 'Purchase' }, { h: 'Cost', cls: 'text-right' }, { h: 'Recovery' }, { h: '' }])}
<tbody>${unitRows}</tbody></table></div>`;

const left = card('Item', `
<div class="grid grid-cols-2 gap-x-6 gap-y-3">
  ${fieldV('Manufacturer &amp; Model', K12.model)}
  ${fieldV('Category', 'Audio')}
  ${fieldV('Type', K12.type)}
  ${fieldV('Replacement value (each)', money(K12.replacement))}
  ${fieldV('Insurance class', 'Audio, Class B')}
  ${fieldV('Insured', '6 of 6 units')}
</div>
<div class="mt-1">${lbl('Description')}<p class="mt-0.5 text-sm text-gray-700">12″ two-way powered loudspeaker, 2000 W. Keep in padded covers; pole-mount or flown.</p></div>`, { actions: newMark(1) });

const stat = (n, l, sub = '') => `<div><div class="text-2xl text-gray-900 tabular-nums">${n}</div><div class="text-xs text-gray-600">${l}</div>${sub ? `<div class="text-[11px] text-muted-foreground">${sub}</div>` : ''}</div>`;
const right = card('Inventory', `
<div class="grid grid-cols-3 gap-3">${stat(6, 'Owned', '6 units')}${stat(5, 'Available')}${stat(1, 'In maintenance')}</div>
<div class="mt-2 border-t pt-2.5 space-y-1.5 text-sm">
  <div class="flex justify-between"><span class="text-gray-600">Total value</span><span class="font-medium tabular-nums">${money(K12.replacement * 6)}</span></div>
  <div class="flex justify-between"><span class="text-gray-600">Where they are</span><span class="text-right text-xs leading-5">5 in Warehouse, Bay 2<br>1 on the Repair Bench</span></div>
  <div class="flex justify-between"><span class="text-gray-600">Next booked</span><span class="text-right text-xs leading-5">2 on Harvest Gala, Oct 10<br>2 on Cedar Hall Showcase, Oct 17</span></div>
</div>`, { actions: newMark(2) });

const kits = card('Used in kits', `
<table class="w-full text-sm"><tbody>
<tr class="border-b border-border/40"><td class="py-1.5 pr-3 font-semibold">Main PA: K12.2 Pair</td><td class="py-1.5 pr-3 text-xs text-muted-foreground">KIT-005</td><td class="py-1.5 pr-3">2 × any QSC K12.2</td><td class="py-1.5 text-xs text-muted-foreground">picked by scanning at pack-out</td></tr>
<tr><td class="py-1.5 pr-3 font-semibold">Monitor Pair, Side Fill</td><td class="py-1.5 pr-3 text-xs text-muted-foreground">KIT-007</td><td class="py-1.5 pr-3">${unitChip('DSL-0105')} and ${unitChip('DSL-0106')}</td><td class="py-1.5 text-xs text-muted-foreground">these two units, always</td></tr>
</tbody></table>`, { summary: '2 kits', actions: newMark(4) });

// Same page for an item kept as lots.
const xlr = frame(header('XLR Cable, 25 ft', 'Audio', 'Cable, XLR') + content(`
<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
<div class="lg:col-span-2">${card('Units and lots', `
<div class="rounded-md border bg-white overflow-hidden"><table class="w-full text-sm">
${thead([{ h: '' }, { h: 'Lot' }, { h: 'Qty', cls: 'text-right' }, { h: 'Status' }, { h: 'Location' }, { h: 'Purchase' }, { h: '' }])}
<tbody>
<tr class="border-b"><td class="${TD} w-16">${kindPill('lot')}</td><td class="${TD}">${lotChip(10)}</td><td class="${TD} text-right tabular-nums">10</td><td class="${TD}">${status('Active')}</td><td class="${TD}"><div class="flex items-center gap-2">${tracking('In Warehouse')}<span class="text-xs">in XLR Cable Box (CASE-02)</span></div></td><td class="${TD} text-xs text-sky-700 !whitespace-normal">Cablesmith Direct<br>2026-07-24</td><td class="px-2">${rowMenu()}</td></tr>
<tr class="border-b"><td class="${TD}">${kindPill('lot')}</td><td class="${TD}">${lotChip(20)}</td><td class="${TD} text-right tabular-nums">20</td><td class="${TD}">${status('Active')}</td><td class="${TD}"><div class="text-xs leading-5"><div class="flex items-center gap-2">${tracking('In Warehouse')}<span>18 in Warehouse, Bay 2</span></div><div class="mt-1 flex items-center gap-2">${tracking('Checked Out')}<span>2 in Staging Area (Main PA)</span></div></div></td><td class="${TD} text-xs text-sky-700 !whitespace-normal">Stagecraft Supply Co.<br>2025-03-11</td><td class="px-2">${rowMenu()}</td></tr>
</tbody></table></div>`, { summary: '30 cables in 2 lots', actions: newMark(5) })}</div>
${card('Inventory', `<div class="grid grid-cols-3 gap-3">${stat(30, 'Owned', '2 lots')}${stat(20, 'Available', '10 are in the XLR Cable Box')}${stat(0, 'In maintenance')}</div>`)}
</div>`), 'The same page for an item kept as lots: XLR Cable, 25 ft.');

export default () => ({
  name: '02-item-page',
  ...shell({
    id: '02-item-page',
    body: frame(topbar() + header(K12.model, 'Audio', K12.type) + content(`
<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
  <div class="lg:col-span-2">${left}</div>
  ${right}
  <div class="lg:col-span-3">${card('Units and lots', unitsTable, { summary: '6 units', actions: newMark(3) + btnGhostSm('Columns', 'columns') + btnGhostSm('Add unit or lot', 'plus') })}</div>
  <div class="lg:col-span-2">${kits}</div>
  ${card('Change History', `<ul class="space-y-2 text-xs text-gray-700"><li><b>DSL-0104</b> status Active → Maintenance · Cameron · Oct 2</li><li><b>DSL-0105, DSL-0106</b> added from purchase Sweetwater 2025-05-02 · Cameron</li><li>Replacement value $999 → $1,049 · Cameron · Jan 8</li></ul>`)}
</div>`), 'Equipment › Items › QSC K12.2 (the new item page). Opened from a row on the Items tab.') + xlr,
    notes: [
      '<b>The item card holds what is shared</b> by every K12.2: category, model, type, description, replacement value and insurance class. Edit changes them for all six. Fields that differ per speaker (serial, tag, cost, purchase, status) are on the units.',
      '<b>Inventory is counted, not typed</b>: owned, available and in maintenance come from the units, with where they are and what they are booked on next.',
      '<b>Units and lots</b> is the main table: tag, serial, status, location, booking, purchase line, cost and recovery period, per unit. Clicking a row opens the unit form (screen 3). <b>Add unit or lot</b> is in the title row and on the card.',
      '<b>Used in kits</b> shows both kinds of kit entry: “2 × any QSC K12.2” (the PA kit; scans decide which two) and specific units (a side-fill pair that is always DSL-0105 and DSL-0106).',
      '<b>Items kept as lots</b> use the same page. A lot shows its quantity and where it is, from scans. Its location can be split, as on the lot of 20: 18 in the warehouse and 2 in Staging (#160), without splitting the lot record.',
    ],
  }),
});
