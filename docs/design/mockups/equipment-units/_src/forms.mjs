// The three equipment form sections (#183), shared by the unit/lot pages
// (screen 3) and the purchase "Equipment details" pop-up (screen 4), as the
// app will share them.
import { icon, input, select, field, checkbox, alertBox } from './lib.mjs';

export const section = (title, body, first = false, mark = '') => `<div class="${first ? '' : 'border-t border-gray-100 pt-4'}"><h3 class="mb-2 flex items-center gap-2 text-gray-900 font-medium">${title}${mark}</h3>${body}</div>`;
export const money = (v) => input(v, { extra: 'pl-3' }).replace('<span class="truncate">', '<span class="text-muted-foreground mr-1">$</span><span class="truncate">');
const textarea = (v, ph = '') => `<div class="min-h-16 w-full rounded-md bg-input-background px-3 py-2 text-sm">${v || `<span class="text-muted-foreground">${ph}</span>`}</div>`;

const choice = (opts, active) => `<div class="grid grid-cols-2 gap-2">${opts.map(([n, ic, sub]) => `<div class="relative flex flex-col items-start gap-1 rounded-lg border-2 p-3 ${n === active ? 'border-sky-500 bg-sky-50' : 'border-gray-200 bg-white'}">${n === active ? `<span class="absolute right-2 top-2 text-sky-600">${icon('check-circle', 'h-4 w-4')}</span>` : ''}<span class="flex items-center gap-1.5 text-sm font-semibold">${ic ? icon(ic, 'h-4 w-4') : ''}${n}</span><span class="text-xs text-gray-600">${sub}</span></div>`).join('')}</div>`;

// ---------- 1. What it is ----------
export const itemBox = (name, sub, change = true) => `<div class="flex items-center gap-3 rounded-lg border bg-gray-50 px-3 py-2.5"><span class="flex h-8 w-8 items-center justify-center rounded-md bg-white border text-gray-600">${icon('box')}</span><div class="min-w-0 flex-1"><div class="text-sm font-semibold">${name}</div><div class="text-xs text-muted-foreground">${sub}</div></div>${change ? '<span class="text-xs font-medium text-sky-700">Change item</span>' : ''}</div>`;

/** A new item: the item's own fields, insurance class and description included. */
export const newItem = ({ model, category, type, insClass = '', desc = '', matches = [] }) => `${choice([['An item we already have', 'search', 'Search the items you own'], ['A new item', 'plus', 'Enter what it is']], 'A new item')}
<div class="mt-3 grid grid-cols-2 gap-3">
  ${field('Manufacturer and Model <span class="text-red-500">*</span>', input(model))}
  ${field('Category <span class="text-red-500">*</span>', select(category))}
  ${field('Type', input(type), 'General to specific, separated by commas.')}
  ${field('Insurance Class', input(insClass, { placeholder: 'e.g., Class A' }), 'The category used by your insurance company.')}
  <div class="col-span-2">${field('Description', textarea(desc, 'What this item is, and how to handle it…'), 'Supports Markdown formatting')}</div>
</div>
${matches.length ? `<p class="mt-2 text-xs text-gray-600">${icon('info', 'h-3.5 w-3.5 inline -mt-0.5 text-sky-700')} Close to items you already have: ${matches.map((m) => `<span class="font-medium text-sky-700">${m}</span>`).join(' · ')}. Pick one instead if it’s the same thing.</p>` : ''}`;

/** An existing item, picked from the search. */
export const pickedItem = (name, sub) => `${choice([['An item we already have', 'search', 'Search the items you own'], ['A new item', 'plus', 'Enter what it is']], 'An item we already have')}
<div class="mt-3 flex h-9 items-center gap-2 rounded-md bg-input-background px-3 text-sm">${icon('search', 'h-4 w-4 text-muted-foreground')}<span class="font-medium">${name}</span><span class="text-xs text-muted-foreground">${sub}</span><span class="ml-auto">${icon('chevron-down', 'h-4 w-4 opacity-50')}</span></div>`;

// ---------- 2. Unit or lot ----------
const KIND = [['Unit', 'tag', 'Each one has its own serial number or tag.'], ['Lot', 'layers', 'Identical things with no serial or tag, counted together.']];

/**
 * Units: Quantity sets how many serial/tag rows there are.
 * rows: [serial, tag, error?]; qtyNote: help under Quantity; fixedQty: quantity
 * comes from elsewhere (one record being edited, or the purchase line).
 */
export const units = ({ qty, rows, qtyNote = 'One row per unit.', fixedQty = false, helpers = true, tagFrom = '' }) => `${choice(KIND, 'Unit')}
<div class="mt-3 grid grid-cols-3 gap-3">${field('Quantity', input(String(qty), { disabled: fixedQty }), qtyNote)}</div>
<div class="mt-3 rounded-lg border">
${helpers ? `<div class="flex flex-wrap items-center gap-x-4 gap-y-1 border-b bg-gray-50 px-3 py-2 text-xs"><span class="font-semibold text-gray-700">${qty} ${qty === 1 ? 'unit' : 'units'}</span><span class="ml-auto inline-flex items-center gap-1 font-medium text-sky-700">${icon('hash', 'h-3.5 w-3.5')}Number tags from ${tagFrom || '…'}</span><span class="inline-flex items-center gap-1 font-medium text-sky-700">${icon('file', 'h-3.5 w-3.5')}Paste serials</span><span class="inline-flex items-center gap-1 font-medium text-sky-700">${icon('scan', 'h-3.5 w-3.5')}Scan</span></div>` : ''}
<div class="grid grid-cols-[24px_1fr_1fr] items-center gap-x-3 gap-y-2 p-3">
  <span></span><span class="text-sm font-medium text-gray-900">Serial Number</span><span class="text-sm font-medium text-gray-900">Inventory Tag ID</span>
  ${rows.map(([s, t, err], i) => `<span class="text-right text-xs text-muted-foreground">${rows.length > 1 ? i + 1 : ''}</span>${input(s, { mono: true, placeholder: 'Serial number', extra: err ? 'border-red-500' : '' })}${input(t, { mono: true, placeholder: 'e.g., TAG-001', extra: err ? 'border-red-500' : '' })}${err ? `<span></span><p class="col-span-2 -mt-1 text-xs text-red-600">${err}</p>` : ''}`).join('')}
</div></div>`;

export const lot = ({ qty, qtyNote = '', fixedQty = false }) => `${choice(KIND, 'Lot')}
<div class="mt-3 grid grid-cols-3 gap-3">
  ${field('Quantity', input(String(qty), { disabled: fixedQty }), qtyNote)}
  ${field('Serial Number', input('', { disabled: true, placeholder: 'Not for a lot' }))}
  ${field('Inventory Tag ID', input('', { disabled: true, placeholder: 'Not for a lot' }))}
</div>`;

// ---------- 3. Value ----------
export const value = ({ each, n = 1, insured = false }) => `<div class="grid grid-cols-3 gap-3 items-end">
  ${field('Replacement Value', money(each), n > 1 ? `Each, copied to all ${n} units` : 'Per item')}
  <div class="col-span-2 pb-2">${checkbox(insured, n > 1 ? 'These units have been added to an insurance policy.' : 'Added to an insurance policy.')}</div>
</div>`;

export { alertBox };
