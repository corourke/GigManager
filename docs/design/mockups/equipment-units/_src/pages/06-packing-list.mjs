import { icon, tracking, gigStatus, tagBadge, btnPrimary, btnOutline, btnGhostSm, topbar, pageHeader, pageTabs, content, frame, card, shell, newMark, badge } from '../lib.mjs';
import { GIG } from '../data.mjs';

const kt = (t) => `<span class="text-[10px] font-normal text-muted-foreground border rounded px-1.5 py-0.5">${t}</span>`;
const done = `<span class="text-emerald-600">${icon('check-circle', 'h-4 w-4')}</span>`;
const todo = `<span class="text-gray-300">${icon('circle', 'h-4 w-4')}</span>`;
const part = `<span class="text-amber-500">${icon('circle', 'h-4 w-4')}</span>`;
const prog = (a, b) => `<span class="inline-flex items-center gap-1.5 whitespace-nowrap text-xs tabular-nums ${a === b ? 'text-emerald-700' : a ? 'text-amber-700' : 'text-muted-foreground'}"><span class="h-1.5 w-12 rounded-full bg-gray-200 overflow-hidden"><span class="block h-full ${a === b ? 'bg-emerald-500' : 'bg-amber-400'}" style="width:${(a / b) * 100}%"></span></span>${a} of ${b}</span>`;
const C = 'border border-gray-200 px-2 py-1.5 align-middle';
const scanned = (s) => s ? `${tracking('Checked Out')} <span class="text-xs text-muted-foreground">Oct 9, 4:12 PM · Staging Area</span>` : '<span class="text-xs text-muted-foreground">Not scanned</span>';

const kit = (name, kind, tag, st, extra = '') => `<tr class="border-t-2 border-t-gray-300"><td class="${C} text-center">${st}</td><td class="${C}"><div class="flex items-center gap-2"><span class="font-semibold">${name}</span>${kt(kind)}${extra}</div></td><td class="${C} font-mono text-xs">${tag}</td><td class="${C} text-center"></td><td class="${C}"></td></tr>`;
const line = (st, name, tag, qty, status, depth = 1) => `<tr><td class="${C} text-center">${st}</td><td class="${C}"><div class="relative ${depth === 1 ? 'pl-6' : 'pl-12'} before:absolute before:${depth === 1 ? 'left-2' : 'left-8'} before:top-1/2 before:w-3 before:border-t before:border-gray-300">${name}</div></td><td class="${C} font-mono text-xs">${tag}</td><td class="${C} text-center tabular-nums">${qty}</td><td class="${C}">${status}</td></tr>`;
const pulled = (tag, sn) => line(done, `<span class="text-muted-foreground">${icon('tag', 'h-3 w-3 inline -mt-0.5 text-sky-700')} ${tag}</span> <span class="text-xs text-muted-foreground font-mono">${sn ? `SN ${sn}` : ''}</span>`, tag, '1', scanned(true), 2);
const any = (n) => badge(`${icon('box', 'h-3 w-3')}any ${n}`, 'bg-white text-gray-600 border-gray-300 text-[10px]');

const packing = `<div class="rounded-md border overflow-hidden"><table class="w-full text-sm">
<thead><tr class="bg-muted/30 text-left text-xs font-semibold"><th class="${C} w-8 text-center">✓</th><th class="${C}">Name</th><th class="${C} w-32">Tag #</th><th class="${C} w-28 text-center">Qty</th><th class="${C} w-96">Status</th></tr></thead><tbody>
${kit('Main PA: K12.2 Pair', 'Items', 'KIT-005', part, newMark(1))}
${line(done, `<span class="font-medium">2 × QSC K12.2</span> ${any(2)}`, '', prog(2, 2), '<span class="text-xs text-emerald-700">2 scanned</span>')}
${pulled('DSL-0101', 'GAA213409')}
${pulled('DSL-0103', 'GAA213422')}
${line(done, '<span class="font-medium">2 × Speaker Stand, Tripod</span> <span class="text-xs text-muted-foreground">from a lot of 6</span>', '', prog(2, 2), scanned(true))}
${line(todo, '<span class="font-medium">2 × XLR Cable, 25 ft</span> <span class="text-xs text-muted-foreground">from the loose lot</span>', '', prog(0, 2), scanned(false))}
${kit('XLR Cable Box', 'Container', 'CASE-02', done, newMark(2))}
${line('', '<span class="text-muted-foreground">Cable trunk, 30 in · Lot of 10 × XLR Cable, 25 ft · Lot of 10 × XLR Cable, 15 ft</span>', '', '<span class="text-muted-foreground">21</span>', scanned(true))}
${kit('Small XLR Cable Box', 'Container · packed at checkout', 'CASE-03', part, newMark(3))}
${line(done, '<span class="font-medium">10 × XLR Cable, 5 ft</span> ' + any(10), '', prog(10, 10), '<span class="text-xs text-muted-foreground">XC05-0001, -0002, -0003, -0005 … <span class="text-sky-700 font-medium">10 serials</span></span>')}
${line(part, '<span class="font-medium">10 × XLR Cable, 15 ft</span> ' + any(10), '', prog(7, 10), '<span class="text-xs text-amber-700">3 more to scan</span>')}
${line(todo, '<span class="font-medium">4 × XLR Cable, 50 ft</span> ' + any(4), '', prog(0, 4), '<span class="text-xs text-muted-foreground">Not scanned</span>')}
${kit('PA Rack', 'Container', 'RACK-01', done)}
${line('', '<span class="text-muted-foreground">Armorline 8U Rack Case · QSC PLD4.5 (DSL-0031) · dbx DriveRack PA2 (DSL-0032) · Voltline PD-20 (DSL-0021)</span>', '', '<span class="text-muted-foreground">4</span>', scanned(true))}
${kit('Club Lighting Package', 'Items', 'KIT-003', done)}
${line(done, `<span class="font-medium">4 × Chauvet Intimidator Trio</span> ${any(4)}`, '', prog(4, 4), '<span class="text-xs text-emerald-700">DSL-0141, -0142, -0143, -0144</span>')}
</tbody></table></div>`;

const kitsTable = `<table class="w-full text-sm"><thead><tr class="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground border-b"><th class="py-1.5 pr-3">Kit</th><th class="py-1.5 pr-3">Tag #</th><th class="py-1.5 pr-3">Category</th><th class="py-1.5 pr-3">Holds</th><th class="py-1.5 pr-3 text-right">Rental value</th></tr></thead><tbody>
${[['Main PA: K12.2 Pair', 'KIT-005', 'Audio', '2 × QSC K12.2, 2 stands, 4 cables', '$400.00'], ['XLR Cable Box', 'CASE-02', 'Audio', '20 cables (2 lots)', '$60.00'], ['Small XLR Cable Box', 'CASE-03', 'Audio', '24 cables, picked at pack-out', '$45.00'], ['PA Rack', 'RACK-01', 'Audio', '4 units', '$250.00'], ['Club Lighting Package', 'KIT-003', 'Lighting', '4 × Chauvet Intimidator Trio …', '$900.00']].map(([a, b, c, d, e]) => `<tr class="border-b border-border/40 last:border-0"><td class="py-1.5 pr-3 font-semibold">${a}</td><td class="py-1.5 pr-3 font-mono text-xs">${b}</td><td class="py-1.5 pr-3 text-muted-foreground">${c}</td><td class="py-1.5 pr-3 text-muted-foreground">${d}</td><td class="py-1.5 pr-3 text-right tabular-nums">${e}</td></tr>`).join('')}</tbody></table>`;

const gigPage = frame(topbar('Gigs') + pageHeader({
  title: GIG.title, back: 'Back to Gigs', badge: gigStatus('Booked'), meta: `${GIG.date} · ${GIG.venue} ${tagBadge('Corporate')}`,
  actions: btnOutline('Print', 'printer') + `<span class="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-background text-gray-700">${icon('more-v')}</span>` + btnPrimary('Edit', 'pencil'),
  tabs: pageTabs([['Overview'], ['Equipment'], ['Financials'], ['History']], 'Equipment'),
}) + content(`<div class="space-y-4">${card('Equipment', kitsTable, { summary: '5 kits' })}${card('Packing list', packing, { summary: '57 pieces · 41 scanned', actions: btnGhostSm('Columns', 'columns') })}</div>`), `Gigs › ${GIG.title} › Equipment, during pack-out (Oct 9).`);

// Print: ink only, ruled rows, write-in lines for "any" entries not yet scanned.
const P = 'border-b border-[#bbb] py-[3px] pr-2 align-top';
const pRow = (q, name, pulledTxt, box = true) => `<tr><td class="${P} w-6">${box ? '☐' : ''}</td><td class="${P} w-10 text-right tabular-nums">${q}</td><td class="${P}">${name}</td><td class="${P} font-mono">${pulledTxt}</td></tr>`;
const pKit = (name, tag) => `<tr><td colspan="4" class="pt-3 pb-1 text-[10pt] font-bold uppercase tracking-[0.08em] border-b-[1.5px] border-black">${name} <span class="font-mono font-normal normal-case tracking-normal text-[8.5pt]">${tag}</span></td></tr>`;
const blanks = (n) => Array.from({ length: n }, () => '<span class="inline-block w-[72px] border-b border-black mr-2">&nbsp;</span>').join('');
const printSheet = `<div class="mx-auto w-[816px] bg-white p-12 text-black text-[10pt] shadow-lg">
<div class="flex justify-between border-b-[3px] border-black pb-2"><div><div class="text-[8pt] uppercase tracking-[0.1em]">Packing list · Demo Sound &amp; Lighting</div><div class="text-[16pt] font-bold">${GIG.title}</div><div>${GIG.date}</div></div><div class="text-right text-[8.5pt]">5 kits · 15 lines · 57 pieces<br>Printed Oct 8, 2026</div></div>
<table class="mt-2 w-full text-[9.5pt]" aria-label="Packing list"><thead><tr class="text-left text-[8.5pt]"><th class="border-b border-black"></th><th class="border-b border-black text-right pr-2">Qty</th><th class="border-b border-black">Item</th><th class="border-b border-black">Pulled (tag or serial)</th></tr></thead><tbody>
${pKit('Main PA: K12.2 Pair', 'KIT-005')}
${pRow(2, 'QSC K12.2 <i>(any)</i>', blanks(2))}
${pRow(2, 'Speaker Stand, Tripod', '<span class="font-sans">from lot</span>')}
${pRow(2, 'XLR Cable, 25 ft', '<span class="font-sans">from lot</span>')}
${pKit('XLR Cable Box', 'CASE-02')}
${pRow(1, 'XLR Cable Box: trunk, 10 × 25 ft, 10 × 15 ft (always packed)', 'CASE-02')}
${pKit('Small XLR Cable Box', 'CASE-03 · packed at checkout')}
${pRow(10, 'XLR Cable, 5 ft <i>(any)</i>', blanks(5) + '<br>' + blanks(5))}
${pRow(10, 'XLR Cable, 15 ft <i>(any)</i>', blanks(5) + '<br>' + blanks(5))}
${pRow(4, 'XLR Cable, 50 ft <i>(any)</i>', blanks(4))}
${pKit('PA Rack', 'RACK-01')}
${pRow(1, 'PA Rack: Armorline 8U case, QSC PLD4.5, dbx DriveRack PA2, Voltline PD-20', 'RACK-01')}
${pKit('Club Lighting Package', 'KIT-003')}
${pRow(4, 'Chauvet Intimidator Trio <i>(any)</i>', blanks(4))}
</tbody></table>
<p class="mt-3 text-[8.5pt]">Printed before pack-out: “any” lines have a blank per piece to write the tag or serial pulled. Printed after scanning, the scanned tags fill the blanks.</p>
</div>`;

export default () => ({
  name: '06-packing-list',
  ...shell({
    id: '06-packing-list',
    body: gigPage + frame(`<div class="bg-gray-200 p-8">${printSheet}</div>`, 'Print › Packing list (before pack-out). Ink only, ruled rows.'),
    notes: [
      '<b>“2 × QSC K12.2”</b> is one line with a progress count. The scans fill it in: under it are the units that went (DSL-0101 and DSL-0103, with serials). Lines from a lot (stands, cables) show a count only, since lot pieces have no tag.',
      '<b>An always-packed container</b> (XLR Cable Box) is one line to check, with its contents listed underneath for reference; scanning CASE-02 covers all 21 pieces.',
      '<b>A container packed at checkout</b> (Small XLR Cable Box) lists its “any” lines with progress, so the crew sees “3 more 15 ft cables to scan”. The box is ready when every line is full.',
      '<b>Print</b> keeps the packing-list print layout. Each “any” line gets a blank per piece to write the tag or serial pulled; once scanned, the blanks print filled in. Equipment (the kit table) gains a short “Holds” column.',
    ],
  }),
});
