import { icon, unitChip, lotChip, kindPill, btnPrimary, btnOutline, topbar, pageHeader, content, frame, shell, newMark, input, field, checkbox, badge } from '../lib.mjs';

const TD = 'px-3 py-2 align-middle';
const anyPill = badge(`${icon('box', 'h-3 w-3')}Any`, 'bg-white text-gray-700 border-gray-300');
const qtyBox = (n, fixed = false) => fixed ? `<span class="text-sm tabular-nums">${n}</span>` : `<span class="ml-auto inline-flex h-8 w-16 items-center justify-end rounded-md bg-input-background px-2 text-sm tabular-nums">${n}</span>`;
const del = `<span class="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600">${icon('x')}</span>`;
const kitRow = (kind, name, sub, qty, unit, total, { fixed = false, avail = '' } = {}) => `
<tr class="border-b">
  <td class="${TD}"><div class="text-sm font-medium text-gray-900">${name}</div><div class="text-xs text-gray-500">${sub}</div></td>
  <td class="${TD}">${kind}</td>
  <td class="${TD} text-right">${qtyBox(qty, fixed)}</td>
  <td class="${TD} text-xs text-gray-600">${avail}</td>
  <td class="${TD} text-right text-sm tabular-nums">${unit}</td>
  <td class="${TD} text-right text-sm tabular-nums">${total}</td>
  <td class="${TD} text-right">${del}</td>
</tr>`;
const head = `<thead><tr class="border-b bg-gray-50 text-left text-xs font-semibold text-gray-700"><th class="px-3 py-2">Component</th><th class="px-3 py-2">Kind</th><th class="px-3 py-2 text-right">Quantity</th><th class="px-3 py-2">Availability</th><th class="px-3 py-2 text-right">Unit Value</th><th class="px-3 py-2 text-right">Total Value</th><th class="px-3 py-2"></th></tr></thead>`;

const contents = `<section class="rounded-xl border bg-white p-6 space-y-4">
<div class="flex items-center gap-2"><h3 class="text-gray-900 font-medium">Kit Contents</h3>${newMark(1)}<span class="ml-auto">${btnOutline('Add Components', 'plus')}</span></div>
<div class="border rounded-lg overflow-hidden"><table class="w-full">${head}<tbody>
${kitRow(kindPill('unit'), 'Cable trunk, 24 in', `${unitChip('CASE-03')} <span class="ml-1 text-sky-800 font-medium">the container itself</span>`, 1, '$189.00', '$189.00', { fixed: true, avail: 'Specific unit' })}
${kitRow(anyPill, 'XLR Cable, 5 ft', 'any unit · picked by scanning when the box is packed', 10, '$9.00', '$90.00', { avail: '12 units owned · 12 free' })}
${kitRow(anyPill, 'XLR Cable, 15 ft', 'any unit · not the lot that lives in the XLR Cable Box', 10, '$13.00', '$130.00', { avail: '12 units owned · 12 free' })}
${kitRow(anyPill, 'XLR Cable, 50 ft', 'any unit', 4, '$25.00', '$100.00', { avail: '<span class="text-amber-700 font-medium">6 units owned · 4 free</span><div class="text-[11px] text-muted-foreground">2 are in FOH Console Package</div>' })}
</tbody></table></div>
<div class="text-xs text-muted-foreground">“Any” entries say how many of an item, not which ones. The scans at pack-out record which cables went (screen 7).</div>
</section>`;

const sidebar = `<div class="space-y-4">
<section class="rounded-xl border bg-white p-6 space-y-3"><h3 class="text-gray-900 font-medium flex items-center gap-2">Tracking Type ${newMark(2)}</h3>
<div class="grid grid-cols-2 gap-3">
<div class="relative flex flex-col items-start gap-1.5 rounded-lg border-2 p-3 border-gray-200 bg-white"><span class="flex items-center gap-1.5 text-sm font-semibold">${icon('layers', 'h-4 w-4')}Items</span><span class="text-xs text-gray-600">Each component is scanned individually</span></div>
<div class="relative flex flex-col items-start gap-1.5 rounded-lg border-2 p-3 border-sky-500 bg-sky-50"><span class="absolute right-2 top-2 text-sky-600">${icon('check-circle', 'h-4 w-4')}</span><span class="flex items-center gap-1.5 text-sm font-semibold">${icon('archive', 'h-4 w-4')}Container</span><span class="text-xs text-gray-600">Whole kit scanned as one unit</span></div>
</div>
<div class="rounded-lg border bg-gray-50 p-3 space-y-2"><div class="text-xs font-semibold text-gray-700">Contents</div>
<div class="space-y-2">${['Packed at checkout', 'Scan its contents each time the box is packed; they go back to stock when it is unpacked.'].reduce((a, b) => `<div class="flex items-start gap-2.5"><span class="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full border border-sky-700 bg-white"><span class="h-2 w-2 rounded-full bg-sky-700"></span></span><div><div class="text-sm font-medium">${a}</div><div class="text-xs text-muted-foreground">${b}</div></div></div>`)}
<div class="flex items-start gap-2.5"><span class="mt-0.5 flex h-4 w-4 flex-none rounded-full border border-gray-400 bg-white"></span><div><div class="text-sm font-medium">Always packed</div><div class="text-xs text-muted-foreground">Contents live in the box (the XLR Cable Box). Scanning the box’s tag accounts for everything in it.</div></div></div></div></div>
</section>
<section class="rounded-xl border bg-white p-6"><h3 class="text-gray-900 font-medium mb-3">Kit Summary</h3><div class="grid grid-cols-3 gap-2">${[['4', 'Components'], ['25', 'Pieces'], ['$509', 'Total Value']].map(([n, l]) => `<div><div class="text-2xl text-gray-900">${n}</div><div class="text-xs text-gray-600">${l}</div></div>`).join('')}</div></section>
<section class="rounded-xl border bg-white p-6 space-y-2">${btnPrimary('Update Kit', 'check', 'w-full')}${btnOutline('Cancel', '', 'w-full')}</section>
</div>`;

const basic = `<section class="rounded-xl border bg-white p-6"><h3 class="text-gray-900 font-medium mb-3">Basic Information</h3><div class="grid grid-cols-3 gap-4">${field('Kit Name', input('Small XLR Cable Box'))}${field('Category', input('Audio'))}${field('Tag Number', input('CASE-03', { mono: true }), 'The trunk’s tag')}</div></section>`;

const editor = frame(topbar() + pageHeader({ title: 'Edit Kit', back: 'Back to Kits', meta: 'Small XLR Cable Box' }) + content(`<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"><div class="lg:col-span-2 space-y-6">${basic}${contents}</div>${sidebar}</div>`, '*:max-w-6xl'), 'Equipment › Kits › Small XLR Cable Box › Edit. A container packed from cable stock at checkout.');

// Add Components dialog
const pickRow = (on, kind, name, sub, qty = null, disabled = '') => `<div class="flex items-start gap-3 p-3 ${disabled ? 'bg-gray-50' : ''}"><span class="mt-0.5">${checkbox(on, '')}</span><div class="min-w-0 flex-1"><div class="flex items-center gap-2 text-sm font-medium ${disabled ? 'text-gray-400' : ''}">${name}${kind}</div><div class="text-xs text-gray-500">${sub}</div>${disabled ? `<div class="mt-0.5 text-xs text-amber-700">${disabled}</div>` : ''}</div>${qty !== null ? `<span class="inline-flex h-8 w-16 items-center justify-end rounded-md border bg-white px-2 text-sm">${qty}</span>` : ''}</div>`;
const groupH = (t) => `<div class="bg-gray-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">${t}</div>`;
const addDialog = `<div class="w-full rounded-lg border bg-white p-6 shadow-lg">
<div class="flex items-start justify-between"><div><h2 class="text-lg font-semibold flex items-center gap-2">Add Components ${newMark(3)}</h2><p class="mt-1 text-sm text-muted-foreground">Add how many of an item (any will do), a specific unit or lot, or a kit.</p></div>${icon('x', 'h-4 w-4 text-muted-foreground')}</div>
<div class="mt-4 flex items-center gap-2"><div class="flex h-9 flex-1 items-center rounded-md border px-3 text-sm">${icon('search', 'h-4 w-4 mr-2 text-muted-foreground')}xlr 15</div>${['all', 'items', 'units &amp; lots', 'kits'].map((t, i) => `<span class="rounded-md border px-2 py-0.5 text-xs font-medium ${i === 0 ? 'bg-primary text-white border-transparent' : ''}">${t}</span>`).join('')}</div>
<div class="mt-3 border rounded-lg divide-y">
${groupH('Any of an item')}
${pickRow(true, anyPill, 'XLR Cable, 15 ft', '12 units · 1 lot of 10 · 12 free for this kit', '10')}
${groupH('A specific unit or lot')}
${pickRow(false, kindPill('lot'), 'XLR Cable, 15 ft · Lot of 10', 'lives in XLR Cable Box', null, 'Already in XLR Cable Box. A lot that lives in one container can’t be in another.')}
${pickRow(false, kindPill('unit'), `XLR Cable, 15 ft · ${unitChip('', 'XC15-0001')}`, 'Warehouse, Bay 2')}
${pickRow(false, kindPill('unit'), `XLR Cable, 15 ft · ${unitChip('', 'XC15-0002')}`, 'Warehouse, Bay 2')}
</div>
<div class="mt-4 flex items-center justify-between"><span class="text-sm text-muted-foreground">1 selected</span>${btnPrimary('Add 1 Selected')}</div></div>`;

// Read-only kit contents (KitDetailScreen's Kit Structure) for the other examples.
const tree = (title, kind, lines, note) => `<section class="rounded-xl border bg-white p-4 space-y-2"><div class="flex items-center gap-2"><h3 class="text-[15px] font-semibold">${title}</h3>${kind}</div><ul class="space-y-1.5 text-sm">${lines.map((l) => `<li class="flex items-center gap-2">${l}</li>`).join('')}</ul><p class="text-xs text-muted-foreground">${note}</p></section>`;
const cBadge = (t) => badge(t, t === 'Container' ? 'bg-primary text-white border-transparent text-[10px]' : 'text-[10px]');

const others = `<div class="grid grid-cols-3 gap-4">
${tree('Main PA: K12.2 Pair', cBadge('Items'), [
  `${anyPill}<b>2 ×</b> QSC K12.2 <span class="text-xs text-muted-foreground">of 6 · 5 free</span>`,
  `${anyPill}<b>2 ×</b> Speaker Stand, Tripod <span class="text-xs text-muted-foreground">from a lot of 6</span>`,
  `${anyPill}<b>2 ×</b> XLR Cable, 25 ft <span class="text-xs text-muted-foreground">from the loose lot</span>`,
  `${anyPill}<b>2 ×</b> Edison Extension Cord, 50 ft`,
], 'Any 2 of the 6 K12.2s will do. Which two went is recorded when they are scanned.')}
${tree('XLR Cable Box', cBadge('Container') + '<span class="font-mono text-xs text-muted-foreground">CASE-02</span>', [
  `${kindPill('unit')}Cable trunk, 30 in ${unitChip('CASE-02')}`,
  `${kindPill('lot')}<b>10 ×</b> XLR Cable, 25 ft ${lotChip(10)}`,
  `${kindPill('lot')}<b>10 ×</b> XLR Cable, 15 ft ${lotChip(10)}`,
], 'Always packed: the untagged cables live in the box. Scanning CASE-02 checks out all 21 pieces.')}
${tree('PA Rack', cBadge('Container') + '<span class="font-mono text-xs text-muted-foreground">RACK-01</span>', [
  `${kindPill('unit')}Armorline 8U Rack Case ${unitChip('RACK-01')}`,
  `${kindPill('unit')}QSC PLD4.5 Amplifier ${unitChip('DSL-0031', 'PLD45-19A0772')}`,
  `${kindPill('unit')}dbx DriveRack PA2 ${unitChip('DSL-0032', 'DRPA2-06611')}`,
  `${kindPill('unit')}Voltline PD-20 ${unitChip('DSL-0021', 'DSL021-24777')}`,
], 'Specific serial-numbered units, always the same ones.')}
</div>`;

export default () => ({
  name: '05-kit-editor',
  ...shell({
    id: '05-kit-editor',
    body: editor + `<div class="grid grid-cols-[560px_1fr] gap-6 items-start"><div>${frame(`<div class="bg-slate-900/40 p-5">${addDialog}</div>`, 'Add Components, searching “xlr 15”.')}</div><div>${frame(`<div class="bg-gray-50 p-4 space-y-3"><div class="text-sm font-medium text-gray-700 flex items-center gap-2">The other examples, as their kit pages list them ${newMark(4)}</div>${others.replace('grid-cols-3', 'grid-cols-1')}</div>`, 'Kit Structure on the kit pages.')}</div></div>`,
    notes: [
      '<b>Two kinds of entry</b>. <b>Any</b>: “10 × XLR Cable, 5 ft”, how many of an item, any unit will do. <b>Unit</b> or <b>Lot</b>: a specific one, such as the trunk the cables travel in. Availability shows how many are owned and free, and warns when a kit asks for more than are free (the 50 ft: 2 of 6 sit in FOH Console Package).',
      '<b>Containers</b> keep today’s choice (scanned as one), with a new setting for their contents. <b>Packed at checkout</b> (the Small XLR Cable Box): its cables come from stock and are scanned into it when packed. <b>Always packed</b> (the XLR Cable Box): its lots live in it, so scanning the box covers them.',
      '<b>Add Components</b> groups results by kind: an item (with a quantity), a specific unit or lot, or a kit. A lot that already lives in one container is greyed out for another, with the reason.',
      '<b>The other examples</b>: the PA kit asks for 2 × any K12.2; the XLR Cable Box lists its trunk and its two lots; the PA Rack lists four specific serial-numbered units. The rack’s and box’s own case is a unit in the kit, and its tag is the kit’s tag (open question).',
    ],
  }),
});
