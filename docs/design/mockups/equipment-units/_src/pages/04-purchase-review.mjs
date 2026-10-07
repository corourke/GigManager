import { icon, btnOutline, frame, shell, newMark, radio, alertBox, kindPill } from '../lib.mjs';

// ReviewScannedDataDialog: compact, slate, 8–11px labels.
const L = (t) => `<div class="text-[9px] font-bold uppercase tracking-wider text-gray-400">${t}</div>`;
const mini = (v, extra = '') => `<div class="flex h-6 items-center rounded border border-gray-200 bg-white px-1.5 text-[11px] ${extra}">${v}</div>`;
const taxSeg = (dep) => `<span class="inline-flex h-[18px] overflow-hidden rounded border border-gray-300 text-[9px] font-semibold"><span class="px-1.5 flex items-center ${dep ? 'text-gray-500' : 'bg-[#7f1d1d] text-white'}">Expense</span><span class="px-1.5 flex items-center ${dep ? 'bg-[#0369a1] text-white' : 'text-gray-500'}">Depreciate</span></span>`;
const eqPill = (txt, units, on = true) => `<span class="inline-flex h-5 items-center gap-1.5 rounded-full border-[1.5px] ${on ? 'border-[#0369a1] bg-[#f0f9ff] text-[#0369a1]' : 'border-gray-300 text-gray-500'} px-2 text-[10px] font-semibold"><span class="h-2.5 w-4 rounded-full ${on ? 'bg-[#0369a1]' : 'bg-gray-300'}"></span>${txt}${units ? `<span class="text-gray-400">|</span>${units}` : ''}${icon('pencil', 'h-2.5 w-2.5')}</span>`;

const line = (desc, price, qty, amt, cost, dep, pill, active = false) => `
<div class="rounded-md border ${active ? 'border-sky-400 ring-2 ring-sky-200' : 'border-gray-100'} bg-[#f9fafb] p-1.5 space-y-1.5">
  <div class="grid grid-cols-[1fr_72px_40px_72px_68px_14px] gap-1.5 items-center">${mini(desc)}${mini(price, 'justify-end')}${mini(qty, 'justify-center font-semibold')}${mini(amt, 'justify-end')}<div class="flex h-6 items-center justify-end rounded bg-[#f0f9ff] px-1.5 text-[11px] font-bold text-[#0369a1]">${cost}</div>${icon('trash', 'h-3 w-3 text-gray-400')}</div>
  <div class="flex items-center gap-2">${taxSeg(dep)}${pill}</div>
</div>`;

const review = `<div class="flex h-[640px] bg-white text-gray-900">
<div class="w-[42%] bg-[#f3f4f6] p-4 flex items-center justify-center"><div class="h-full w-[85%] rounded bg-white shadow p-5 text-[9px] text-gray-500 space-y-2">
  <div class="text-[13px] font-bold text-gray-800">Brightline Lighting</div><div>INVOICE #BL-10291 · Oct 29, 2025</div>
  <div class="border-t pt-2 grid grid-cols-[1fr_30px_50px] gap-1"><span>Chauvet DJ Intimidator Trio</span><span>6</span><span class="text-right">$3,894.00</span><span>Omega bracket, pair</span><span>3</span><span class="text-right">$59.85</span><span>Shipping</span><span></span><span class="text-right">$85.00</span></div>
  <div class="border-t pt-2 text-right font-bold text-gray-800">Total $4,038.85</div>
</div></div>
<div class="flex-1 overflow-hidden p-4 space-y-3">
  <div class="flex items-start justify-between"><div><div class="text-[15px] font-semibold">Review Scanned Purchase</div><div class="text-[11px] text-gray-500">Verify the extracted data below.</div></div>${icon('x', 'h-4 w-4 text-gray-400')}</div>
  <div class="border-b pb-1">${L('Purchase summary')}</div>
  <div class="grid grid-cols-2 gap-2"><div>${L('Vendor')}${mini('Brightline Lighting')}</div><div>${L('Date')}${mini('2025-10-29')}</div></div>
  <div class="flex items-center justify-between border-b pb-1">${L('Line items')}<span class="inline-flex h-[22px] items-center gap-1 rounded border border-[#7dd3fc] px-2 text-[10px] font-semibold text-[#0284c7]">${icon('plus', 'h-3 w-3')}Add Item</span></div>
  <div class="grid grid-cols-[1fr_72px_40px_72px_68px_14px] gap-1.5 px-1.5 text-[8px] font-bold uppercase text-gray-400"><span>Description</span><span class="text-right">Item price</span><span class="text-center">Qty</span><span class="text-right">Line amt</span><span class="text-right">Unit cost</span><span></span></div>
  ${line('Chauvet DJ Intimidator Trio', '$649.00', '6', '$3,894.00', '$663.17', true, eqPill('Lighting › Moving Head, Beam', `${icon('tag', 'h-2.5 w-2.5')} 6 units`), true)}
  ${line('Omega bracket, pair', '$19.95', '3', '$59.85', '$20.39', false, eqPill('Equipment', '', false))}
  <div class="rounded border border-[#a7f3d0] bg-[#ecfdf5] px-2 py-1.5 text-[11px] text-emerald-900"><b>Reconciled:</b> Line costs $4,038.85 vs Invoice $4,038.85</div>
  <div class="flex justify-end gap-2 pt-1"><span class="inline-flex h-7 items-center rounded border px-5 text-xs">Cancel</span><span class="inline-flex h-7 items-center rounded bg-[#0284c7] px-4 text-xs font-medium text-white">Save Purchase</span></div>
</div></div>`;

// EquipmentDetailsDialog, reworked: pick or create the item, then units or a lot.
const dlgLabel = (t, hint = '') => `<div class="text-xs font-semibold text-slate-700">${t}${hint ? ` <span class="font-normal text-slate-500">${hint}</span>` : ''}</div>`;
const sIn = (v, { mono = false, ph = '', extra = '' } = {}) => `<div class="flex h-8 items-center rounded-md border border-slate-300 bg-white px-2.5 text-sm ${mono ? 'font-mono text-[12.5px]' : ''} ${extra}">${v ? `<span class="truncate">${v}</span>` : `<span class="text-slate-400 font-sans text-xs">${ph}</span>`}</div>`;
const eqDialog = ({ desc, body, mark = '' }) => `<div class="w-full rounded-lg border bg-white shadow-xl">
<div class="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div><div class="flex items-center gap-2 text-base font-bold">Equipment details${mark}</div><div class="text-xs text-slate-500">${desc}</div></div>${icon('x', 'h-4 w-4 text-slate-400')}</div>
<div class="px-5 py-4 flex flex-col gap-3.5">${body}</div>
<div class="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">${btnOutline('Cancel', '', 'h-8')}<button class="inline-flex h-8 items-center rounded-md bg-sky-700 px-4 text-sm font-medium text-white">Done</button></div></div>`;

const itemPicker = (existing, name, sub) => `<div class="space-y-1.5">${dlgLabel('Item', 'what it is')}
<div class="grid grid-cols-2 gap-2">
<div class="rounded-md border-2 ${existing ? 'border-sky-500 bg-sky-50' : 'border-slate-200'} p-2">${radio(existing, 'An item we already have')}</div>
<div class="rounded-md border-2 ${!existing ? 'border-sky-500 bg-sky-50' : 'border-slate-200'} p-2">${radio(!existing, 'A new item')}</div></div>
${existing ? `<div class="flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 text-sm">${icon('search', 'h-3.5 w-3.5 text-slate-400')}<span class="font-medium">${name}</span><span class="text-xs text-slate-500">${sub}</span><span class="ml-auto">${icon('chevron-down', 'h-4 w-4 text-slate-400')}</span></div>`
    : `<div class="grid grid-cols-2 gap-2"><div>${dlgLabel('Manufacturer &amp; model')}${sIn(name)}</div><div>${dlgLabel('Replacement value', 'each')}${sIn('$699.00')}</div><div>${dlgLabel('Category')}${sIn('Lighting')}</div><div>${dlgLabel('Type')}${sIn('Light Fixture, Moving Head, Beam')}</div></div>
<div class="text-[11px] text-slate-500">Closest existing items: <span class="text-sky-700">Chauvet Intimidator Spot 360</span> · <span class="text-sky-700">Fennimore Spot 150 Moving Head</span></div>`}
</div>`;

const trioUnits = [['IT32510290', 'DSL-0141'], ['IT32510297', 'DSL-0142'], ['IT32510304', 'DSL-0143'], ['IT32510311', 'DSL-0144'], ['', 'DSL-0145'], ['', 'DSL-0146']];
const trackAs = (units) => `<div class="space-y-2">${dlgLabel('Track as')}
<div class="grid grid-cols-2 gap-2"><div class="rounded-md border-2 ${units ? 'border-sky-500 bg-sky-50' : 'border-slate-200'} p-2">${radio(units, '6 units', 'A serial or tag for each')}</div><div class="rounded-md border-2 ${!units ? 'border-sky-500 bg-sky-50' : 'border-slate-200'} p-2">${radio(!units, 'A lot of 6', 'No serials or tags')}</div></div></div>`;

const unitsGrid = `<div class="rounded-md border border-slate-200">
<div class="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px]"><span class="font-semibold text-slate-700">6 units</span><span class="ml-auto inline-flex items-center gap-1 text-sky-700 font-medium">${icon('hash', 'h-3 w-3')}Number tags from DSL-0141</span><span class="inline-flex items-center gap-1 text-sky-700 font-medium">${icon('file', 'h-3 w-3')}Paste serials</span><span class="inline-flex items-center gap-1 text-sky-700 font-medium">${icon('scan', 'h-3 w-3')}Scan</span></div>
<div class="grid grid-cols-[22px_1fr_1fr] gap-x-2 gap-y-1.5 p-2.5 text-[11px]"><span></span>${dlgLabel('Serial #')}${dlgLabel('Tag #')}
${trioUnits.map(([s, t], i) => `<span class="self-center text-right text-slate-400">${i + 1}</span>${sIn(s, { mono: true, ph: 'serial' })}${sIn(t, { mono: true })}`).join('')}</div></div>`;

const trioDialog = eqDialog({
  desc: 'Chauvet DJ Intimidator Trio · qty 6 · Depreciate',
  mark: newMark(1),
  body: itemPicker(false, 'Chauvet Intimidator Trio') + trackAs(true) + unitsGrid +
    `<div>${dlgLabel('Kits')}<div class="mt-1 flex flex-wrap gap-1.5 rounded-md border border-slate-300 p-1.5"><span class="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900">${icon('package', 'h-3 w-3')}Club Lighting Package · 4 × any${icon('x', 'h-3 w-3')}</span><span class="text-xs text-slate-400 self-center">Search kits…</span></div></div>`,
});

const xlrDialog = eqDialog({
  desc: 'XLR Cable 25ft, black · qty 30 · Expense',
  mark: newMark(3),
  body: itemPicker(true, 'XLR Cable, 25 ft', '30 owned in 2 lots') + `<div class="space-y-2">${dlgLabel('Track as')}
<div class="grid grid-cols-2 gap-2"><div class="rounded-md border-2 border-slate-200 p-2">${radio(false, '30 units', 'A serial or tag for each')}</div><div class="rounded-md border-2 border-sky-500 bg-sky-50 p-2">${radio(true, 'Lots', 'No serials or tags')}</div></div></div>
<div class="rounded-md border border-slate-200 p-2.5 space-y-2 text-sm">
<div class="flex items-center gap-2">${kindPill('lot')}<span class="inline-flex h-8 w-14 items-center justify-center rounded-md border border-slate-300 font-medium">10</span><span class="text-slate-600">lives in</span><span class="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 px-2">${icon('package', 'h-3.5 w-3.5 text-slate-500')}XLR Cable Box (CASE-02)${icon('chevron-down', 'h-3.5 w-3.5 text-slate-400')}</span></div>
<div class="flex items-center gap-2">${kindPill('lot')}<span class="inline-flex h-8 w-14 items-center justify-center rounded-md border border-slate-300 font-medium">20</span><span class="text-slate-600">loose stock</span></div>
<div class="text-xs text-sky-700 font-medium">+ Another lot</div></div>
<div class="text-[11px] text-slate-500">Adds 30 to XLR Cable, 25 ft. Totals 30 of 30.</div>`,
});

const partial = `<div class="space-y-3">
${alertBox('info', 'Each unit needs a serial number or a tag; either is enough.', 'Units 5 and 6 have tags only (DSL-0145, DSL-0146), which is fine. A row with neither can’t be saved. To track pieces without serials or tags, choose <b>A lot of 6</b> instead.')}
${alertBox('info', 'Saving creates 1 item and 6 units', 'Chauvet Intimidator Trio (new item) · DSL-0141 to DSL-0146 · each linked to this line, unit cost $663.17, recovery period from the line (5-year). Adds the item to Club Lighting Package as 4 × any.')}
</div>`;

export default () => ({
  name: '04-purchase-review',
  ...shell({
    id: '04-purchase-review',
    body: `<div class="grid grid-cols-[1fr_560px] gap-6 items-start"><div>${frame(review, 'Financials › Purchases › Scan invoices: the review panel (unchanged, except the Equipment pill now says what it will create).')}<div class="mt-6">${frame(`<div class="bg-white p-4">${partial}</div>`, 'Before saving the Trio line.')}</div></div><div>${frame(`<div class="bg-slate-900/40 p-5">${trioDialog}</div>`, 'Equipment details for the Trio line: a new item, 6 units.')}</div></div>
<div class="grid grid-cols-[560px_1fr] gap-6 items-start"><div>${frame(`<div class="bg-slate-900/40 p-5">${xlrDialog}</div>`, 'Equipment details for a cable line: an existing item, as lots.')}</div><div class="pt-6 text-sm text-gray-700 space-y-3"><p class="font-semibold text-gray-900 flex items-center gap-2">Manual purchases ${newMark(4)}</p><p>Financials › Purchases › Add purchase uses the same Equipment pill and the same Equipment details pop-up, so a manually entered line of 6 also creates 6 units.</p><p>Editing a saved purchase line shows its units (“6 units: DSL-0141 to DSL-0146”) with a link to the item. Changing the quantity of a saved line asks which units to add or remove; it never deletes a unit silently.</p></div></div>`,
    notes: [
      '<b>One line of 6 creates 6 units</b>. Cameron no longer splits the Trio purchase into six lines. The pop-up first asks <b>which item</b>: one we already have (search) or a new one (model, category, type, replacement value; it suggests close matches to avoid duplicates).',
      '<b>Units or a lot</b>: for units, a serial and a tag per row, with helpers to number tags in sequence, paste a column of serials from the invoice, or scan them. Each unit needs a serial or a tag (either will do) and gets the line’s unit cost and recovery period. <b>Track as</b> decides units or a lot; a unit is never folded into a lot, and a lot has no serials or tags.',
      '<b>Lots</b>: the 30 cables from one line can be split into lots, and a lot can be put in a container now (10 into the XLR Cable Box). The totals must add up to the line quantity.',
      '<b>Same pop-up for manual purchases</b>. Serial # and Tag # move out of the pop-up’s single row (which assumed one record per line); replacement value moves to the item. The Kits field adds the item to a kit as “N × any”.',
    ],
  }),
});
