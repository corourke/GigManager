import { icon, tracking, unitChip, lotChip, btnPrimary, btnOutline, topbar, equipmentHeader, content, frame, shell, newMark, select, input, field, checkbox, badge } from '../lib.mjs';

const C = 'px-3 py-2 align-middle text-sm';
const pencil = `<span class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground">${icon('pencil', 'h-3.5 w-3.5')}</span>`;
const cnt = (a, b) => `<span class="inline-flex items-center rounded-full bg-gray-900 px-2 py-0.5 text-xs font-semibold text-white tabular-nums">${a} of ${b}</span>`;
const kitHead = (name, kind) => `<tr class="bg-muted/10 border-b"><td colspan="5" class="${C}"><span class="inline-flex items-center gap-2 font-medium">${icon('package', 'h-4 w-4 text-gray-500')}${name}${badge(kind, 'text-[10px] font-normal')}</span></td></tr>`;
const r = (item, ids, gig, when, mark = '') => `<tr class="border-b"><td class="${C} pl-8"><div class="flex items-center gap-2">${item}${mark}</div></td><td class="${C} text-xs">${ids}</td><td class="${C} text-xs">${gig}</td><td class="${C} text-xs text-muted-foreground">${when}</td><td class="px-2 w-12">${pencil}</td></tr>`;
const head = `<thead><tr class="border-b bg-muted/30 text-left text-xs font-semibold"><th class="px-3 py-2">Item</th><th class="px-3 py-2 w-[300px]">Which</th><th class="px-3 py-2 w-[200px]">Gig</th><th class="px-3 py-2 w-[160px]">Last Scanned</th><th class="w-12"></th></tr></thead>`;
const statusH = (s) => `<div class="flex items-center gap-3"><h2 class="text-lg font-bold text-gray-900">${s}</h2><div class="h-px flex-1 bg-gray-200"></div></div>`;
const locH = (l, n) => `<div class="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">${icon('map-pin', 'h-4 w-4')}${l}<span class="rounded-full bg-muted px-2 py-0.5 text-xs">${n}</span></div>`;
const chip = (s, on) => on ? `<span class="rounded-full border px-3 py-1.5 text-xs font-medium ${{ 'Checked Out': 'border-sky-200 bg-sky-50 text-sky-700', 'In Warehouse': 'border-emerald-200 bg-emerald-50 text-emerald-700' }[s]}">${s}</span>` : `<span class="rounded-full border border-dashed border-muted-foreground/30 px-3 py-1.5 text-xs font-medium text-muted-foreground/50">${s}</span>`;

const filters = `<div class="bg-white p-4 rounded-lg border shadow-sm flex flex-col gap-4"><div class="flex items-center gap-2 border-b pb-2 text-sm font-semibold text-gray-700">${icon('filter', 'h-4 w-4')}Location Explorer Filters</div>
<div class="grid grid-cols-3 gap-6"><div><div class="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</div>${input('', { placeholder: 'Filter by location...' })}</div><div><div class="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Item ${newMark(3)}</div>${input('XLR', { icon: 'search' })}</div><div><div class="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status filter</div><div class="flex flex-wrap gap-2">${chip('Checked Out', 1)}${chip('In Transit', 0)}${chip('On Site', 0)}${chip('In Warehouse', 1)}</div></div></div></div>`;

const results = `<div class="space-y-6">
${statusH('Checked Out')}
<div class="pl-4 border-l-2 border-primary/20">${locH('Staging Area', '6 pieces')}
<div class="rounded-md border bg-white shadow-sm overflow-hidden"><table class="w-full">${head}<tbody>
${kitHead('FOH Console Package', 'Items')}
${r(`XLR Cable, 50 ft ${cnt(2, 10)}`, '<span class="text-muted-foreground">2 counted, not scanned</span>', 'Members’ Night (Oct 10)', 'Oct 9, 4:02 PM', newMark(1))}
${kitHead('Main PA: K12.2 Pair', 'Items')}
${r(`XLR Cable, 25 ft ${cnt(2, 30)}`, lotChip(20, '2 from the loose lot'), 'Harvest Gala (Oct 10)', 'Oct 9, 4:12 PM')}
${r(`QSC K12.2 ${cnt(2, 6)}`, `${unitChip('DSL-0101')} ${unitChip('DSL-0103')}`, 'Harvest Gala (Oct 10)', 'Oct 9, 4:12 PM')}
</tbody></table></div></div>
${statusH('In Warehouse')}
<div class="pl-4 border-l-2 border-primary/20">${locH('Warehouse, Bay 2', '28 pieces')}
<div class="rounded-md border bg-white shadow-sm overflow-hidden"><table class="w-full">${head}<tbody>
${r(`XLR Cable, 25 ft ${cnt(18, 30)}`, lotChip(20, '18 of the loose lot'), '—', 'Sep 27, 11:40 AM')}
${r(`XLR Cable, 50 ft ${cnt(4, 10)}`, '<span class="text-muted-foreground">the other 4 units</span>', '—', 'Sep 27, 11:40 AM')}
<tr class="border-b"><td class="${C}"><span class="inline-flex items-center gap-2 font-medium">${icon('chevron-right', 'h-4 w-4 text-gray-400')}${icon('layers', 'h-4 w-4 text-gray-500')}XLR Cable Box${badge('Container', 'bg-primary text-white border-transparent text-[10px]')}</span></td><td class="${C} text-xs font-mono">CASE-02</td><td class="${C} text-xs">—</td><td class="${C} text-xs text-muted-foreground">Sep 27, 11:38 AM</td><td class="px-2">${pencil}</td></tr>
<tr class="border-b text-muted-foreground"><td class="${C} pl-14 text-xs" colspan="5">holds XLR Cable, 50 ft ${cnt(4, 10)} (lot of 4) · XLR Cable, 25 ft 10 · XLR Cable, 15 ft 10 · trunk</td></tr>
</tbody></table></div></div>
</div>`;

// Where is one item? (#160's example)
const seg = (n, cls) => `<div class="${cls} h-full" style="width:${n * 10}%"></div>`;
const whereCard = `<section class="rounded-xl border bg-white p-4 space-y-3"><div class="flex items-center gap-2"><h2 class="text-[15px] font-semibold">XLR Cable, 50 ft</h2><span class="text-xs text-muted-foreground">10 owned · 6 units, 1 lot of 4</span>${newMark(2)}</div>
<div class="flex h-3 overflow-hidden rounded-full">${seg(4, 'bg-emerald-400')}${seg(2, 'bg-sky-400')}${seg(4, 'bg-emerald-200')}</div>
<ul class="space-y-1.5 text-sm"><li class="flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-sm bg-emerald-400"></span><b>4</b> in XLR Cable Box (CASE-02) ${tracking('In Warehouse')}<span class="text-xs text-muted-foreground">the lot of 4</span></li>
<li class="flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-sm bg-sky-400"></span><b>2</b> in Staging Area (FOH Console Package) ${tracking('Checked Out')}<span class="text-xs text-muted-foreground">counted at pack-out</span></li>
<li class="flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-sm bg-emerald-200"></span><b>4</b> in Warehouse, Bay 2 ${tracking('In Warehouse')}<span class="text-xs text-muted-foreground">units not checked out</span></li></ul></section>`;

const dlg = (desc, body, btn) => `<div class="w-full rounded-lg border bg-white p-6 shadow-lg"><div class="flex items-start justify-between"><div><h2 class="text-lg font-semibold">Manual Tracking Override</h2><p class="mt-1 text-sm text-muted-foreground">${desc}</p></div>${icon('x', 'h-4 w-4 text-muted-foreground')}</div><div class="mt-4 flex flex-col gap-4">${body}</div><div class="mt-6 flex justify-end gap-2">${btnOutline('Cancel')}${btnPrimary(btn)}</div></div>`;
const lotDlg = dlg('XLR Cable, 25 ft · loose lot of 20', `
${field('Move', `<div class="flex items-center gap-2"><span class="inline-flex h-9 w-16 items-center justify-center rounded-md bg-input-background text-sm font-semibold">2</span><span class="text-sm text-gray-600">of the 2 in</span><div class="flex-1">${select('Staging Area (Main PA) · Checked Out')}</div></div>`, 'Where they are now. The other 18 stay where they are.')}
${field('Status', select('In Warehouse'))}${field('Location', input('Warehouse, Bay 2', { icon: 'map-pin' }))}${field('Notes', input('', { placeholder: 'Optional notes...' }))}
<div class="rounded-md bg-muted/40 px-3 py-2 text-xs text-gray-700">After: <b>20 in Warehouse, Bay 2</b>.</div>`, 'Move 2');
const unitDlg = dlg('QSC K12.2 · Main PA: K12.2 Pair · Harvest Gala', `
<div class="space-y-1.5">${field('Which units', `<div class="rounded-md border divide-y">${[['DSL-0101', 'GAA213409', true], ['DSL-0103', 'GAA213422', false]].map(([t, s, on]) => `<div class="flex items-center gap-3 px-3 py-2">${checkbox(on, '')}${unitChip(t, s)}<span class="ml-auto">${tracking('Checked Out')}</span></div>`).join('')}</div>`)}</div>
${field('Status', select('In Warehouse'))}${field('Location', input('Repair Bench', { icon: 'map-pin' }))}
${checkbox(true, 'Mark for Maintenance')}`, 'Save Override');

export default () => ({
  name: '08-locations-override',
  ...shell({
    id: '08-locations-override',
    body: frame(topbar() + equipmentHeader('Locations', btnOutline('Print manifest', 'printer')) + content(`<div class="space-y-4">${filters}${whereCard}${results}</div>`), 'Equipment › Locations, filtered to XLR items, Checked Out and In Warehouse.') +
      `<div class="grid grid-cols-2 gap-6 items-start"><div>${frame(`<div class="bg-slate-900/40 p-5">${lotDlg}</div>`, 'Override part of a lot: putting 2 cables back in the warehouse (#160).')}</div><div>${frame(`<div class="bg-slate-900/40 p-5">${unitDlg}</div>`, 'Override specific units: pick them by tag.')}</div></div>`,
    notes: [
      '<b>Counts per place</b>: each row says how many of the item are there, out of how many owned (“XLR Cable, 50 ft · 2 of 10”), and which: the units by tag when they were scanned (the K12.2s), the lot, or just a count when the line was counted (the 50 ft cables).',
      '<b>Where is one item?</b> When the Item filter matches one item, a summary card shows every place it is, with counts. This is #160’s example: 4 in the XLR Cable Box, 2 in Staging Area (FOH Console Package), 4 in the warehouse.',
      '<b>A new Item filter</b> next to Location, Gig and Status. Containers keep their one line, with their contents counted under it.',
      '<b>Overrides take a quantity</b>. For a lot: move N from where they are now; the rest stay put. For units: tick which ones. Scans and overrides record a quantity, so the latest scan no longer erases a split.',
    ],
  }),
});
