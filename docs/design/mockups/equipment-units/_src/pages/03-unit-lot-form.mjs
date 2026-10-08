import { icon, status, btnPrimary, btnOutline, pageHeader, frame, shell, newMark, input, select, field, checkbox, alertBox, label } from '../lib.mjs';

const section = (title, body, first = false, mark = '') => `<div class="${first ? '' : 'border-t border-gray-100 pt-4'}"><h3 class="mb-2 flex items-center gap-2 text-gray-900 font-medium">${title}${mark}</h3>${body}</div>`;
const money = (v) => input(v, { extra: 'pl-3' }).replace('<span class="truncate">', '<span class="text-muted-foreground mr-1">$</span><span class="truncate">');
const seg = (opts, active) => `<div class="grid grid-cols-2 gap-2">${opts.map(([n, ic, sub]) => `<div class="relative flex flex-col items-start gap-1 rounded-lg border-2 p-3 ${n === active ? 'border-sky-500 bg-sky-50' : 'border-gray-200 bg-white'}">${n === active ? `<span class="absolute right-2 top-2 text-sky-600">${icon('check-circle', 'h-4 w-4')}</span>` : ''}<span class="flex items-center gap-1.5 text-sm font-semibold">${icon(ic, 'h-4 w-4')}${n}</span><span class="text-xs text-gray-600">${sub}</span></div>`).join('')}</div>`;
const KIND = [['Unit', 'tag', 'One physical thing with a serial number or tag. Quantity is always 1.'], ['Lot', 'layers', 'Several identical things with no serial or tag, counted together.']];

const itemBox = (name, sub) => `<div class="flex items-center gap-3 rounded-lg border bg-gray-50 px-3 py-2.5"><span class="flex h-8 w-8 items-center justify-center rounded-md bg-white border text-gray-600">${icon('box')}</span><div class="min-w-0 flex-1"><div class="text-sm font-semibold">${name}</div><div class="text-xs text-muted-foreground">${sub}</div></div><span class="text-xs font-medium text-sky-700">Change item</span></div>`;

const purchaseBox = (line, tax) => `<div class="rounded-lg border px-3 py-2.5"><div class="flex items-center gap-2 text-sm">${icon('receipt', 'h-4 w-4 text-gray-500')}<span class="font-medium">${line}</span><span class="ml-auto text-xs font-medium text-sky-700">View purchase</span></div><div class="mt-1 text-xs text-muted-foreground">${tax}</div></div>`;

const unitForm = frame(pageHeader({ title: 'DSL-0105', back: 'Back to QSC K12.2', badge: status('Active'), meta: 'QSC K12.2 · unit' }) + `<div class="bg-gray-50 p-4"><div class="rounded-xl border bg-white p-4 space-y-4">
${section('What it is', itemBox('QSC K12.2', 'Audio · Speaker, Powered, Full-Range'), true, newMark(1))}
${section('Unit or lot', seg(KIND, 'Unit') + `<div class="mt-3 grid grid-cols-3 gap-3">
  ${field('Serial Number', input('GAB118051', { mono: true }))}
  ${field('Inventory Tag ID', input('DSL-0105', { mono: true }))}
  ${field('Quantity', input('1', { disabled: true }), 'Always 1 for a unit.')}
</div>`, false, newMark(2))}
${section('Purchase', `<div class="space-y-3">${purchaseBox('Sweetwater · 2025-05-02 · QSC K12.2 × 2 @ $949.00', 'Line 1 of 3 · this is unit 1 of the 2 it created')}
<div class="grid grid-cols-3 gap-3">${field('Acquisition Date', input('2025-05-02'))}${field('Vendor', input('Sweetwater'))}${field('Item Cost', money('949.00'), 'Burdened, per item')}</div>
<div class="grid grid-cols-3 gap-3 items-end">${field('Tax treatment', select('Depreciate'), 'From the purchase line')}${field('Recovery period', select('5-year property'), 'Shown when depreciated')}<div></div></div></div>`, false, newMark(3))}
${section('Insurance', `<div class="grid grid-cols-3 gap-3 items-end">${field('Replacement Value', money('1,049.00'), 'Per item')}<div class="col-span-2 pb-2">${checkbox(true, 'This unit has been added to an insurance policy.')}</div></div>`)}
${section('Lifecycle', `<div class="grid grid-cols-3 gap-3">${field('Status', `<div class="flex h-9 items-center justify-between rounded-md bg-input-background px-3">${status('Active')}${icon('chevron-down', 'h-4 w-4 opacity-50')}</div>`)}${field('Retired On', input('', { placeholder: 'mm/dd/yyyy' }))}${field('Disposal or Salvage', money(''))}</div>`)}
<div class="flex justify-end gap-3 border-t border-gray-200 pt-4">${btnOutline('Cancel')}${btnPrimary('Update Unit')}</div>
</div></div>`, 'Unit form (opened from the K12.2’s units table). Depreciated, so the recovery period shows.');

const lotForm = frame(pageHeader({ title: 'Add unit or lot', back: 'Back to XLR Cable, 25 ft', meta: 'XLR Cable, 25 ft' }) + `<div class="bg-gray-50 p-4"><div class="rounded-xl border bg-white p-4 space-y-4">
${section('What it is', itemBox('XLR Cable, 25 ft', 'Audio · Cable, XLR'), true)}
${section('Unit or lot', seg(KIND, 'Lot') + `<div class="mt-3 grid grid-cols-3 gap-3">
  ${field('Quantity', input('10'))}
  ${field('Serial Number', input('', { disabled: true, placeholder: 'Not for a lot' }))}
  ${field('Inventory Tag ID', input('', { disabled: true, placeholder: 'Not for a lot' }))}
</div>`, false, newMark(4))}
${section('Purchase', `<div class="space-y-3">${purchaseBox('Cablesmith Direct · 2026-07-24 · XLR Cable, 25 ft × 10 @ $14.98', 'Line 2 of 4 · one lot per purchase line')}
<div class="grid grid-cols-3 gap-3">${field('Acquisition Date', input('2026-07-24'))}${field('Vendor', input('Cablesmith Direct'))}${field('Item Cost', money('14.98'))}</div>
<div class="grid grid-cols-3 gap-3">${field('Replacement Value', money('16.00'), 'Per item')}</div>
<div class="grid grid-cols-3 gap-3">${field('Tax treatment', select('Expense'), 'From the purchase line')}<div class="col-span-2 self-center text-xs text-muted-foreground">No recovery period: the line is expensed.</div></div></div>`)}
${section('Lifecycle', `<div class="grid grid-cols-3 gap-3">${field('Status', `<div class="flex h-9 items-center justify-between rounded-md bg-input-background px-3">${status('Active')}${icon('chevron-down', 'h-4 w-4 opacity-50')}</div>`)}</div>`)}
<div class="flex justify-end gap-3 border-t border-gray-200 pt-4">${btnOutline('Cancel')}${btnPrimary('Add Lot')}</div>
</div></div>`, 'Lot form (Add unit or lot, from the 25 ft cable). Expensed, so no recovery period.');

const guard = `<div class="grid grid-cols-2 gap-6">
<div class="rounded-xl border bg-white p-4 space-y-3">${label('Turning a lot into units', 'block')}
<div class="grid grid-cols-3 gap-3">${field('Quantity', input('10'))}${field('Serial Number', input('XC15-0001', { mono: true, extra: 'border-red-500' }))}${field('Inventory Tag ID', input('', { disabled: true }))}</div>
${alertBox('warn', 'A serial number means one physical cable.', 'Make this lot into 10 units, entering a serial or tag for each? <span class="font-semibold text-sky-800 underline">Make 10 units</span> · <span class="font-semibold text-sky-800 underline">Make 1 unit and a lot of 9</span>')}</div>
<div class="rounded-xl border bg-white p-4 space-y-3">${label('Splitting off part of a lot', 'block')}
<p class="text-sm text-gray-700">Row menu on a lot: <b>Split lot…</b> moves some of its quantity to a new lot (to retire 2 damaged cables), and <b>Make units…</b> peels off N cables to serial-number them.</p>
<div class="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">${icon('split', 'h-4 w-4 text-gray-500')}Split <span class="inline-flex h-8 w-14 items-center justify-center rounded-md bg-input-background">2</span> of 20 into a new lot with status <span class="inline-flex h-8 items-center gap-2 rounded-md bg-input-background px-2">${status('Disposed')}</span></div></div>
</div>`;

export default () => ({
  name: '03-unit-lot-form',
  ...shell({
    id: '03-unit-lot-form',
    body: topbarless(),
    notes: [
      '<b>The item is picked, not typed.</b> The form for a unit or lot no longer has model, category or type; those are on the item (screen 2). <b>Change item</b> moves a unit to another item (to fix a mis-grouping after the migration).',
      '<b>Unit or lot</b> is the first choice. A unit has a serial number or a tag (or both) and its quantity is fixed at 1; the database enforces it. A lot has neither and has a quantity.',
      '<b>Purchase</b>: the unit points at its purchase line (the link is reversed, so one line of 2 created both K12.2s). <b>Recovery period</b> stays on the unit and only shows when the line is depreciated; its default comes from the line (#125).',
      '<b>A lot</b> has a quantity and no serial or tag. Where it is comes from scans (the lot of 10 is in the XLR Cable Box today), not from the form.',
      '<b>Guard rails</b>: typing a serial into a lot of 10 offers to turn it into units instead of saving a serial on 10 cables (prod has 3 such records today). Splitting a lot is a row action.',
    ],
  }),
});

function topbarless() {
  return `<div class="grid grid-cols-2 gap-6 items-start"><div>${unitForm}</div><div>${lotForm}</div></div>` + frame(`<div class="bg-gray-50 p-4">${guard}</div>`, 'What happens when a serial is typed into a lot, and how part of a lot is split off.');
}
