import { icon, btnOutline, frame, shell, newMark, alertBox, field, select } from '../lib.mjs';
import { section, newItem, pickedItem, units, lot, value } from '../forms.mjs';

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
  ${line('Chauvet DJ Intimidator Trio', '$649.00', '6', '$3,894.00', '$663.17', true, eqPill('Lighting', `${icon('tag', 'h-2.5 w-2.5')} 6 units`), true)}
  ${line('Omega bracket, pair', '$19.95', '3', '$59.85', '$20.39', false, eqPill('Equipment', '', false))}
  <div class="rounded border border-[#a7f3d0] bg-[#ecfdf5] px-2 py-1.5 text-[11px] text-emerald-900"><b>Reconciled:</b> Line costs $4,038.85 vs Invoice $4,038.85</div>
  <div class="flex justify-end gap-2 pt-1"><span class="inline-flex h-7 items-center rounded border px-5 text-xs">Cancel</span><span class="inline-flex h-7 items-center rounded bg-[#0284c7] px-4 text-xs font-medium text-white">Save Purchase</span></div>
</div></div>`;

// EquipmentDetailsDialog, reworked (#183): the same three sections as the
// unit/lot pages (screen 3), plus the recovery period for a depreciated line.
const eqDialog = ({ desc, body, mark = '' }) => `<div class="w-full rounded-lg border bg-white shadow-xl">
<div class="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div><div class="flex items-center gap-2 text-base font-bold">Equipment details${mark}</div><div class="text-xs text-slate-500">${desc}</div></div>${icon('x', 'h-4 w-4 text-slate-400')}</div>
<div class="px-5 py-4 space-y-4">${body}</div>
<div class="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">${btnOutline('Cancel', '', 'h-8')}<button class="inline-flex h-8 items-center rounded-md bg-sky-700 px-4 text-sm font-medium text-white">Done</button></div></div>`;
const trioUnits = [['IT32510290', 'DSL-0141'], ['IT32510297', 'DSL-0142'], ['IT32510304', 'DSL-0143'], ['IT32510311', 'DSL-0144'], ['', 'DSL-0145'], ['', 'DSL-0146']];
const trioDialog = eqDialog({
  desc: 'Chauvet DJ Intimidator Trio · qty 6 · Depreciate',
  mark: newMark(1),
  body: section('What it is', newItem({ model: 'Chauvet Intimidator Trio', category: 'Lighting', type: 'Light Fixture, Moving Head, Beam', matches: ['Chauvet Intimidator Spot 360', 'Fennimore Spot 150 Moving Head'] }), true)
    + section('Unit or lot', units({ qty: 6, fixedQty: true, qtyNote: 'From the purchase line.', tagFrom: 'DSL-0141', rows: trioUnits }), false, newMark(2))
    + section('Insurance', value({ each: '699.00', n: 6 }))
    + section('Recovery period', `<div class="grid grid-cols-2 gap-3">${field('Recovery period', select('5-year property'), 'Lighting’s default. Shown because the line is depreciated.')}</div>`),
});
const xlrDialog = eqDialog({
  desc: 'XLR Cable 25ft, black · qty 30 · Expense',
  mark: newMark(3),
  body: section('What it is', pickedItem('XLR Cable, 25 ft', 'Audio · 30 owned in 2 lots'), true)
    + section('Unit or lot', lot({ qty: 30, fixedQty: true, qtyNote: 'From the purchase line.' }))
    + section('Insurance', value({ each: '16.00' }))
    + `<p class="text-xs text-slate-500">Adds a lot of 30 to XLR Cable, 25 ft (60 owned after this). Expensed, so no recovery period.</p>`,
});
const partial = `<div class="space-y-3">
${alertBox('info', 'Each unit needs a serial number or a tag; either is enough.', 'Units 5 and 6 have tags only (DSL-0145, DSL-0146), which is fine. A row with neither can’t be saved. To track pieces without serials or tags, choose <b>Lot</b> instead.')}
${alertBox('info', 'Saving creates 1 item and 6 units', 'Chauvet Intimidator Trio (new item) · DSL-0141 to DSL-0146 · each linked to this line, unit cost $663.17, recovery period 5-year. Add them to kits in the kit editor.')}
</div>`;
export default () => ({
  name: '04-purchase-review',
  ...shell({
    id: '04-purchase-review',
    body: `<div class="grid grid-cols-[1fr_640px] gap-6 items-start"><div>${frame(review, 'Financials › Purchases › Scan invoices: the review panel (unchanged, except the Equipment pill now says what it will create).')}<div class="mt-6">${frame(`<div class="bg-white p-4">${partial}</div>`, 'Before saving the Trio line.')}</div></div><div>${frame(`<div class="bg-slate-900/40 p-5">${trioDialog}</div>`, 'Equipment details for the Trio line: a new item, 6 units. The same sections as Add Item (screen 3).')}</div></div>
<div class="grid grid-cols-[640px_1fr] gap-6 items-start"><div>${frame(`<div class="bg-slate-900/40 p-5">${xlrDialog}</div>`, 'Equipment details for a cable line: an existing item, as lots.')}</div><div class="pt-6 text-sm text-gray-700 space-y-3"><p class="font-semibold text-gray-900 flex items-center gap-2">Manual purchases ${newMark(4)}</p><p>Financials › Purchases › Add purchase uses the same Equipment pill and the same Equipment details pop-up, so a manually entered line of 6 also creates 6 units.</p><p>The pop-up has no Financial section (date, vendor and cost come from the purchase) and no Lifecycle (new equipment is Active).</p><p>Editing a saved purchase line shows its units (“6 units: DSL-0141 to DSL-0146”) with a link to the item. Changing the quantity of a saved line asks whether to <b>update the equipment</b> (tick which units come off, or the lot’s quantity follows) or <b>leave it as it is</b>.</p></div></div>`,
    notes: [
      '<b>One line of 6 creates 6 units</b>, so the Trio purchase isn’t split into six lines. The pop-up is built from the <b>same three sections</b> as Add Item (screen 3): <b>What it is</b> (an item we already have, or a new one with model, category, type, insurance class and description; close matches are suggested), <b>Unit or lot</b>, and <b>Insurance</b>.',
      '<b>Unit or lot</b>: the quantity comes from the purchase line and sets the rows; change it on the line. Each unit row needs a serial or a tag (either will do), with helpers to number tags in sequence, paste serials from the invoice, or scan. Each unit gets the line’s unit cost and recovery period.',
      '<b>A lot</b>: the 30 untagged cables from one line become one lot of 30, added to an item we already have.',
      '<b>No Kits field</b>: kit lines (“10 × any”) are set in the kit editor (screen 5). Replacement value is entered once and copied to each unit or the lot, where it can be changed later. The <b>recovery period</b> shows only on a depreciated line.',
    ],
  }),
});
