import { icon, unitChip, kindPill, btnPrimary, btnOutline, topbar, equipmentHeader, content, frame, shell, newMark, input, field, checkbox, phone } from '../lib.mjs';

const C = 'px-3 py-2 align-middle';
const back = (d) => d ? `<span class="tabular-nums">${d}</span>` : '<span class="italic text-muted-foreground">not set</span>';
const row = (item, which, note, where, due, flagged) => `<tr class="border-b"><td class="${C} w-16">${kindPill('unit')}</td><td class="${C} font-medium">${item}</td><td class="${C} whitespace-nowrap">${which}</td><td class="${C} text-xs text-gray-700 max-w-[220px]">${note}</td><td class="${C} text-xs whitespace-nowrap">${where}</td><td class="${C} text-xs whitespace-nowrap">${back(due)}</td><td class="${C} text-xs text-muted-foreground">${flagged}</td>
<td class="${C} whitespace-nowrap text-right"><span class="inline-flex h-8 items-center gap-1.5 rounded-md border bg-white px-3 text-xs font-medium">${icon('check', 'h-3.5 w-3.5')}Return to service</span><span class="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground">${icon('pencil', 'h-3.5 w-3.5')}</span></td></tr>`;

const queue = `<div class="mb-3 flex items-center justify-between"><span class="text-sm text-muted-foreground">3 units in maintenance</span>${btnOutline('Print', 'printer', 'h-8')}</div>
<div class="rounded-md border overflow-hidden bg-white"><table class="w-full text-sm">
<thead><tr class="border-b bg-muted/30 text-left text-xs font-semibold"><th class="px-3 py-2"></th><th class="px-3 py-2">Item</th><th class="px-3 py-2">Which ${newMark(1)}</th><th class="px-3 py-2">Condition Notes</th><th class="px-3 py-2">Location</th><th class="px-3 py-2">Expected Back</th><th class="px-3 py-2">Flagged</th><th class="px-3 py-2 text-right">${newMark(2)}</th></tr></thead><tbody>
${row('QSC K12.2', unitChip('DSL-0104', 'GAA213430'), 'Woofer rattles above 100 Hz', 'Repair Bench', 'Oct 20, 2026', 'Oct 2 · Unload after Fall Food &amp; Wine Festival · Cameron')}
${row('Fennimore Wash Bar 8', unitChip('DSL-0152', 'FWB8-22107'), 'Cell 6 dead. Sent to Brightline for warranty repair.', 'Brightline Lighting', 'Nov 3, 2026', 'Sep 27 · Load-Out, Fall Food &amp; Wine Festival · Jordan')}
${row('Tessel W2 Wireless Handheld', unitChip('DSL-0091', 'W2-11873'), 'Battery door latch broken', 'Repair Bench', '', 'Sep 12 · Unload after Paper Lanterns Acoustic Night · Jordan')}
</tbody></table></div>`;

const editDlg = `<div class="w-full rounded-lg border bg-white p-6 shadow-lg"><div class="flex items-start justify-between"><div><h2 class="text-lg font-semibold flex items-center gap-2">Maintenance details ${newMark(3)}</h2><p class="mt-1 text-sm text-muted-foreground">QSC K12.2 · ${unitChip('DSL-0104', 'GAA213430')}</p></div>${icon('x', 'h-4 w-4 text-muted-foreground')}</div>
<div class="mt-4 space-y-4">
${field('Condition notes', `<div class="min-h-[72px] rounded-md bg-input-background px-3 py-2 text-sm">Woofer rattles above 100 Hz. Replacement driver ordered from QSC, ETA Oct 17.</div>`)}
<div class="grid grid-cols-2 gap-3">${field('Location', input('Repair Bench', { icon: 'map-pin' }))}${field('Expected back', input('Oct 20, 2026', { icon: 'calendar' }))}</div>
</div>
<div class="mt-6 flex items-center gap-2">${btnOutline('Return to service', 'check')}<span class="ml-auto"></span>${btnOutline('Cancel')}${btnPrimary('Save')}</div></div>`;

// How a unit gets here: the note dialog in Inventory Mode (MobileInventoryMode), during a scan.
const P = '#0284c7';
const scanNote = `<div class="relative flex-1 bg-gray-50">
<div class="p-3 space-y-2 opacity-40"><div class="rounded-xl border bg-white p-3 text-sm font-bold">Main PA: K12.2 Pair</div><div class="rounded-lg border bg-white p-2 text-sm">2 × QSC K12.2</div></div>
<div class="absolute inset-0 bg-black/40"></div>
<div class="absolute inset-x-3 top-16 rounded-2xl bg-white p-4 space-y-3 shadow-2xl">
<div><div class="text-base font-bold">QSC K12.2</div><div class="text-xs text-muted-foreground font-mono">DSL-0104 · SN GAA213430 · scanned at Unload</div></div>
<div class="space-y-1"><div class="text-xs font-medium">Notes on item condition</div><div class="min-h-[64px] rounded-lg border bg-white px-3 py-2 text-sm">Woofer rattles above 100 Hz</div></div>
<div class="rounded-lg border p-3 bg-orange-50 border-orange-200">${checkbox(true, '<span class="font-medium">Send to maintenance</span>')}
<div class="mt-2 grid grid-cols-2 gap-2 text-xs"><div><div class="mb-1 text-muted-foreground">Location</div><div class="rounded-md border bg-white px-2 py-1.5">Repair Bench</div></div><div><div class="mb-1 text-muted-foreground">Expected back</div><div class="rounded-md border bg-white px-2 py-1.5 text-muted-foreground">optional</div></div></div></div>
<div class="grid grid-cols-2 gap-2"><span class="flex h-11 items-center justify-center rounded-lg border text-sm">Cancel</span><span class="flex h-11 items-center justify-center rounded-lg text-sm font-medium text-white" style="background:${P}">Save</span></div></div></div>`;
const scanPhone = phone(`<div class="border-b bg-white px-4 py-3"><div class="text-lg font-bold">Inventory Mode</div><div class="text-xs"><span style="color:${P}">Fall Food &amp; Wine Festival</span> · Unload</div></div>${scanNote}`, 'Sending a unit to maintenance happens while scanning: the item’s note, with <b>Send to maintenance</b> ticked (today’s “Maintenance Req’d”).');

export default () => ({
  name: '09-maintenance',
  ...shell({
    id: '09-maintenance',
    body: frame(topbar() + equipmentHeader('Maintenance') + content(queue), 'Equipment › Maintenance: the list of units in maintenance.') +
      `<div class="grid grid-cols-[1fr_440px] gap-6 items-start"><div>${frame(`<div class="bg-slate-900/40 p-5">${editDlg}</div>`, 'Editing one (the pencil on a row).')}</div><div>${frame(`<div class="bg-gray-100 p-5 flex justify-center">${scanPhone}</div>`, 'How it got there: during scanning (mobile).')}</div></div>`,
    notes: [
      '<b>Which one</b>: the list shows units by tag and serial, so “the K12.2 with the rattle” is DSL-0104, not “one of the six”. The item’s other units stay Active and available.',
      '<b>Return to service</b> is a button on each row: the unit goes back to Active. Nothing is sent to maintenance from this page.',
      '<b>Editing</b> is limited to what changes while it’s away: condition notes, location and expected-back date. Return to service is here too.',
      '<b>Sending to maintenance happens during scanning</b>, from the item’s note in Inventory Mode (the existing “Maintenance Req’d” checkbox), with an optional location and expected-back date.',
    ],
  }),
});
