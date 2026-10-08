import { icon, status, btnPrimary, btnOutline, pageHeader, frame, shell, newMark, input, select, field, alertBox, label } from '../lib.mjs';
import { section, money, itemBox, newItem, units, lot, value } from '../forms.mjs';

const card = (body) => `<div class="bg-gray-50 p-4"><div class="rounded-xl border bg-white p-4 space-y-4">${body}</div></div>`;
const buttons = (primary) => `<div class="flex justify-end gap-3 border-t border-gray-200 pt-4">${btnOutline('Cancel')}${btnPrimary(primary)}</div>`;
const financial = ({ date, vendor, price, cost, n = 1 }) => section('Financial Information', `<div class="grid grid-cols-3 gap-3">
  ${field('Acquisition Date <span class="text-red-500">*</span>', input(date, { placeholder: 'mm/dd/yyyy' }))}
  ${field('Vendor', input(vendor, { placeholder: 'Where was this purchased?' }))}
  <div></div>
  ${field('Item Price', money(price), n > 1 ? `Each, for all ${n}` : 'Selling price per item')}
  ${field('Item Cost', money(cost), n > 1 ? `Each, for all ${n}` : 'Burdened cost per item')}
</div>`);
const purchaseBox = (line, tax) => `<div class="rounded-lg border px-3 py-2.5"><div class="flex items-center gap-2 text-sm">${icon('receipt', 'h-4 w-4 text-gray-500')}<span class="font-medium">${line}</span><span class="ml-auto text-xs font-medium text-sky-700">View purchase</span></div><div class="mt-1 text-xs text-muted-foreground">${tax}</div></div>`;

// A. Equipment › Add Item: a new item and its first units.
const addItem = frame(pageHeader({ title: 'Add Item', back: 'Back to Items' }) + card(`
${section('What it is', newItem({
  model: 'Shure ULXD2/SM58', category: 'Audio', type: 'Microphone, Wireless, Handheld', insClass: 'Class B',
  desc: 'Handheld transmitter. Batteries out for transport.', matches: ['Shure ULXD4 Receiver', 'Shure SM58'],
}), true, newMark(1))}
${section('Unit or lot', units({
  qty: 4, tagFrom: 'DSL-0151',
  rows: [['3NG1180417', 'DSL-0151'], ['3NG1180422', 'DSL-0152'], ['3NG1180430', 'DSL-0153'], ['', '', 'Unit 4 needs a serial number or a tag (either will do).']],
}), false, newMark(2))}
${section('Insurance', value({ each: '1,099.00', n: 4 }), false, newMark(3))}
${financial({ date: '10/02/2026', vendor: 'Full Compass', price: '989.00', cost: '1,012.40', n: 4 })}
${buttons('Add Item and 4 Units')}`), 'Equipment › Add Item: a new item with 4 units. Unit 4 still needs a serial or tag, so it can’t be saved yet.');

// B. Item page › Add unit or lot: the item is already chosen.
const addLot = frame(pageHeader({ title: 'Add unit or lot', back: 'Back to XLR Cable, 25 ft', meta: 'XLR Cable, 25 ft' }) + card(`
${section('What it is', itemBox('XLR Cable, 25 ft', 'Audio · Cable, XLR · Class C'), true)}
${section('Unit or lot', lot({ qty: 10 }), false, newMark(4))}
${section('Insurance', value({ each: '16.00' }))}
${financial({ date: '07/24/2026', vendor: 'Cablesmith Direct', price: '14.50', cost: '14.98' })}
${buttons('Add Lot')}`), 'Item page › Add unit or lot, for the 25 ft cable: a lot of 10. Same sections, with the item already chosen.');

// C. Editing one unit.
const editUnit = frame(pageHeader({ title: 'DSL-0105', back: 'Back to QSC K12.2', badge: status('Active'), meta: 'QSC K12.2 · unit' }) + card(`
${section('What it is', itemBox('QSC K12.2', 'Audio · Speaker, Powered, Full-Range · Class B'), true)}
${section('Unit or lot', units({ qty: 1, fixedQty: true, helpers: false, qtyNote: 'This page edits one unit.', rows: [['GAB118051', 'DSL-0105']] }), false, newMark(5))}
${section('Insurance', value({ each: '1,049.00', insured: true }))}
${section('Purchase', `<div class="space-y-3">${purchaseBox('Sweetwater · 2025-05-02 · QSC K12.2 × 2 @ $949.00', 'Line 1 of 3 · unit 1 of the 2 it created')}
<div class="grid grid-cols-3 gap-3">${field('Acquisition Date', input('2025-05-02'))}${field('Vendor', input('Sweetwater'))}${field('Item Cost', money('949.00'), 'Burdened, per item')}</div>
<div class="grid grid-cols-3 gap-3 items-end">${field('Tax treatment', select('Depreciate', { disabled: true }), 'From the purchase line')}${field('Recovery period', select('5-year property'), 'Shown when depreciated')}<div></div></div></div>`)}
${section('Lifecycle', `<div class="grid grid-cols-3 gap-3">${field('Status', `<div class="flex h-9 items-center justify-between rounded-md bg-input-background px-3">${status('Active')}${icon('chevron-down', 'h-4 w-4 opacity-50')}</div>`)}${field('Retired On', input('', { placeholder: 'mm/dd/yyyy' }))}${field('Disposal or Salvage', money(''))}</div>`, false, newMark(6))}
${buttons('Update Unit')}`), 'Editing one unit (from the K12.2’s units table). Depreciated, so the recovery period shows; Lifecycle appears only when editing.');

const guard = `<div class="grid grid-cols-3 gap-6">
<div class="rounded-xl border bg-white p-4 space-y-3">${label('A tag already in use', 'block')}
<div class="grid grid-cols-2 gap-3">${field('Serial Number', input('3NG1180431', { mono: true }))}${field('Inventory Tag ID', input('DSL-0105', { mono: true, extra: 'border-amber-400' }))}</div>
${alertBox('warn', 'DSL-0105 is already on a QSC K12.2.', 'Tags are usually one per unit. Change it, or save anyway.')}</div>
<div class="rounded-xl border bg-white p-4 space-y-3">${label('The same tag twice', 'block')}
<p class="text-sm text-gray-700">Two rows with the same serial or tag block saving: “Rows 2 and 3 both have DSL-0152.”</p></div>
<div class="rounded-xl border bg-white p-4 space-y-3">${label('Editing a lot, choosing Unit', 'block')}
${alertBox('info', 'A lot of 10 becomes units with Make units…', 'Make units… (on the lot’s row menu) peels off N cables to serial-number them, and Split lot… moves some to a new lot. Both come with #186.')}</div>
</div>`;

export default () => ({
  name: '03-unit-lot-form',
  ...shell({
    id: '03-unit-lot-form',
    body: `<div class="grid grid-cols-2 gap-6 items-start"><div>${addItem}</div><div class="space-y-6">${addLot}${editUnit}</div></div>` + frame(`<div class="bg-gray-50 p-4">${guard}</div>`, 'Checks on serials and tags, and turning a lot into units.'),
    notes: [
      '<b>Three shared sections</b>, the same here and in the purchase pop-up (screen 4): <b>What it is</b>, <b>Unit or lot</b>, and <b>Insurance</b> (replacement value and “insured”). <b>Add Item</b> (from Equipment) starts with a new or existing item. A new item takes its own fields, <b>insurance class and description included</b>, and suggests close matches to avoid duplicates.',
      '<b>Quantity sets the rows</b>. For units, each row is one unit with its own serial or tag (either will do), so 4 microphones bought together are one form, not four. Helpers number tags in sequence, paste a column of serials, or scan. Saving makes one record per row; a row with neither can’t be saved.',
      '<b>Value is entered once</b> and copied to each unit; it can be changed per unit later. Price and cost likewise.',
      '<b>Add unit or lot</b> (from an item page) is the same form with the item already chosen. A lot has a quantity and no serial or tag.',
      '<b>Editing one unit</b> shows one row; the quantity is 1 because this page edits one record. The item’s fields (insurance class, description) are edited on the item page, not here.',
      '<b>Lifecycle</b> (status, retired on, disposal) only shows when editing: new equipment is Active. <b>Recovery period</b> shows only for equipment on a depreciated purchase line (#125).',
    ],
  }),
});
