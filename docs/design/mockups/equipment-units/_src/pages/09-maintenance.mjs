import { icon, status, unitChip, lotChip, kindPill, btnPrimary, btnOutline, rowMenu, topbar, equipmentHeader, content, frame, shell, newMark, input, field, alertBox } from '../lib.mjs';

const C = 'px-3 py-2 align-middle';
const row = (kind, item, which, kit, gig, note, when, by) => `<tr class="border-b"><td class="${C} w-16">${kindPill(kind)}</td><td class="${C} font-medium">${item}</td><td class="${C} whitespace-nowrap">${which}</td><td class="${C} text-xs">${kit}</td><td class="${C} text-xs">${gig}</td><td class="${C} text-xs text-muted-foreground max-w-[220px]">${note}</td><td class="${C} text-xs text-muted-foreground whitespace-nowrap">${when}</td><td class="${C} text-xs text-muted-foreground">${by}</td><td class="px-2">${rowMenu()}</td></tr>`;

const queue = `<div class="mb-3 flex items-center justify-between"><span class="text-sm text-muted-foreground">3 flagged for maintenance: 2 units and 1 piece from a lot</span>${btnOutline('Print', 'printer', 'h-8')}</div>
<div class="rounded-md border overflow-hidden bg-white"><table class="w-full text-sm">
<thead><tr class="border-b bg-muted/30 text-left text-xs font-semibold"><th class="px-3 py-2"></th><th class="px-3 py-2">Item</th><th class="px-3 py-2">Which ${newMark(1)}</th><th class="px-3 py-2">Kit</th><th class="px-3 py-2">Last Gig</th><th class="px-3 py-2">Condition Notes</th><th class="px-3 py-2">Date Flagged</th><th class="px-3 py-2">Flagged By</th><th></th></tr></thead><tbody>
${row('unit', 'QSC K12.2', unitChip('DSL-0104', 'GAA213430'), 'Main PA: K12.2 Pair <span class="text-muted-foreground">(any 2)</span>', 'Fall Food &amp; Wine Festival', 'Woofer rattles above 100 Hz', 'Oct 2, 9:14 AM', 'Cameron')}
${row('unit', 'Fennimore Wash Bar 8', unitChip('DSL-0152', 'FWB8-22107'), 'Club Lighting Package', 'Fall Food &amp; Wine Festival', 'Cell 6 dead', 'Sep 27, 1:02 PM', 'Jordan')}
${row('lot', 'XLR Cable, 25 ft', lotChip(1, 'split from the loose lot'), '—', 'Paper Lanterns Acoustic Night', 'Pin 2 intermittent', 'Sep 12, 11:30 PM', 'Jordan')}
</tbody></table></div>`;

const unitPick = (on, tag, sn, st, where, extra = '') => `<div class="flex items-center gap-3 px-3 py-2 ${on ? 'bg-sky-50' : ''}"><span class="flex h-4 w-4 flex-none items-center justify-center rounded-full border ${on ? 'border-sky-700' : 'border-gray-400'} bg-white">${on ? '<span class="h-2 w-2 rounded-full bg-sky-700"></span>' : ''}</span>${unitChip(tag, sn)}<span class="ml-auto flex items-center gap-2 text-xs text-muted-foreground">${extra}${status(st)}${where}</span></div>`;
const sendDlg = `<div class="w-full rounded-lg border bg-white p-6 shadow-lg"><div class="flex items-start justify-between"><div><h2 class="text-lg font-semibold flex items-center gap-2">Send to maintenance ${newMark(2)}</h2><p class="mt-1 text-sm text-muted-foreground">Pick the unit by tag or serial, or scan it.</p></div>${icon('x', 'h-4 w-4 text-muted-foreground')}</div>
<div class="mt-4 space-y-4">
<div class="flex gap-2"><div class="flex-1">${input('GAA213430', { icon: 'search', mono: true })}</div>${btnOutline('Scan', 'scan')}</div>
<div class="rounded-md border divide-y">
${unitPick(true, 'DSL-0104', 'GAA213430', 'Active', 'Warehouse, Bay 2')}
</div>
<div class="text-xs text-muted-foreground">Other QSC K12.2 units: DSL-0101, -0102, -0103, -0105 and -0106, all Active in Warehouse, Bay 2.</div>
${field('Condition notes', input('Woofer rattles above 100 Hz'))}
<div class="grid grid-cols-2 gap-3">${field('Location', input('Repair Bench', { icon: 'map-pin' }))}${field('Expected back', input('Oct 20, 2026'))}</div>
${alertBox('ok', 'QSC K12.2: 5 of 6 available after this', 'Every booked gig still has enough. The most needed at once is 4, on Oct 10 (Harvest Gala and Members’ Night, 2 each).')}
</div><div class="mt-6 flex justify-end gap-2">${btnOutline('Cancel')}${btnPrimary('Send to maintenance', 'wrench')}</div></div>`;

const lotDlg = `<div class="w-full rounded-lg border bg-white p-6 shadow-lg"><div class="flex items-start justify-between"><div><h2 class="text-lg font-semibold flex items-center gap-2">Send to maintenance ${newMark(3)}</h2><p class="mt-1 text-sm text-muted-foreground">XLR Cable, 25 ft · loose lot of 20</p></div>${icon('x', 'h-4 w-4 text-muted-foreground')}</div>
<div class="mt-4 space-y-4">${field('How many', `<div class="flex items-center gap-2"><span class="inline-flex h-9 w-16 items-center justify-center rounded-md bg-input-background text-sm font-semibold">1</span><span class="text-sm text-gray-600">of 20</span></div>`, 'They become a lot of 1 with status Maintenance; the loose lot drops to 19. When fixed, it merges back.')}
${field('Condition notes', input('Pin 2 intermittent'))}
${alertBox('warn', 'Main PA: K12.2 Pair has 2 of these out on Harvest Gala', 'If the bad cable is one of those two, send it from the gig’s packing list instead, so the gig shows 1 short.')}</div>
<div class="mt-6 flex justify-end gap-2">${btnOutline('Cancel')}${btnPrimary('Send 1 to maintenance', 'wrench')}</div></div>`;

const shortDlg = alertBox('error', 'Sending DSL-0105 and DSL-0106 would leave Oct 10 short of QSC K12.2s', 'Harvest Gala Dinner &amp; Dance and Harborlight Pavilion Members’ Night overlap on Oct 10 and need 2 each: 4 in all. After this, 3 would be free (DSL-0104 is already in maintenance). <span class="font-semibold underline">Send anyway</span> · <span class="font-semibold underline">Cancel</span>');

export default () => ({
  name: '09-maintenance',
  ...shell({
    id: '09-maintenance',
    body: frame(topbar() + equipmentHeader('Maintenance', btnPrimary('Send to maintenance', 'wrench')) + content(queue), 'Equipment › Maintenance (the queue).') +
      `<div class="grid grid-cols-2 gap-6 items-start"><div>${frame(`<div class="bg-slate-900/40 p-5">${sendDlg}</div>`, 'How DSL-0104 got there (Oct 2): one specific K12.2, found by its serial number.')}</div><div class="space-y-6">${frame(`<div class="bg-slate-900/40 p-5">${lotDlg}</div>`, 'Sending 1 cable from an untagged lot.')}${frame(`<div class="bg-white p-4">${shortDlg}</div>`, 'When it would leave a booked gig short (sending two more K12.2s on Oct 5).')}</div></div>`,
    notes: [
      '<b>Which one</b>: the queue lists units by tag and serial, so “the K12.2 with the rattle” is DSL-0104, not “one of the six”. The item’s other units stay Active and available.',
      '<b>Send to maintenance</b> is a new title-row action (today it is only a checkbox on an override or a scan note). Search by tag or serial, or scan. It shows what the item’s availability will be, and flags a gig that would be left short.',
      '<b>Lots</b>: sending 1 untagged cable splits it off as a lot of 1 with status Maintenance; fixing it merges it back into its lot. Whether to split, or only record a count in maintenance, is an open question.',
      '<b>Return from maintenance</b> is a row action on the queue; it sets the unit back to Active and the location you choose.',
    ],
  }),
});
