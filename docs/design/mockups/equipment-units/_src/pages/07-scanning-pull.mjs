import { icon, phone, frame, shell } from '../lib.mjs';
import { GIG } from '../data.mjs';

const P = '#0284c7';
const header = (sub) => `<div class="sticky top-0 border-b bg-white shadow-sm px-4 pt-3 pb-2 space-y-2">
<div class="flex items-center justify-between"><div><div class="text-lg font-bold">Inventory Mode</div><div class="text-xs"><span style="color:${P}">Harvest Gala Dinner…</span> · ${sub}</div></div><span class="inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-white shadow-lg" style="background:${P}">${icon('barcode')}Scan</span></div>
<div class="flex gap-1.5 overflow-hidden">${['Pack-Out', 'Load Truck', 'Load-In', 'Load-Out'].map((m, i) => `<span class="rounded-md border px-3 py-1.5 text-xs font-medium whitespace-nowrap ${i === 0 ? 'text-white border-transparent' : ''}" ${i === 0 ? `style="background:${P}"` : ''}>${m}</span>`).join('')}</div>
<div class="rounded-xl bg-muted/50 px-4 py-2 text-sm text-gray-700">Staging Area</div></div>`;
const circ = (s) => s === 'done' ? `<span class="text-emerald-600">${icon('check-circle', 'h-6 w-6')}</span>` : s === 'part' ? `<span class="text-amber-500">${icon('circle', 'h-6 w-6')}</span>` : `<span class="text-gray-300">${icon('circle', 'h-6 w-6')}</span>`;
const kitCard = (name, sub, st, body = '') => `<div class="rounded-xl border bg-white ${st === 'done' ? 'border-emerald-200 bg-emerald-50/30' : ''}"><div class="flex min-h-[56px] items-center gap-2 p-2">${circ(st)}<div class="flex-1 min-w-0"><div class="text-sm font-bold">${name}</div><div class="text-[11px] text-muted-foreground">${sub}</div></div>${icon('chevron-up', 'h-4 w-4 text-gray-400')}</div>${body ? `<div class="space-y-1.5 px-2 pb-2">${body}</div>` : ''}</div>`;
const tb = (t) => `<span class="inline-flex h-4 items-center rounded border px-1.5 text-[10px] ${{ 'Checked Out': 'border-sky-200 bg-sky-50 text-sky-700' }[t] || 'border-border bg-muted/40 text-muted-foreground'}">${t}</span>`;
const row = (st, name, meta, extra = '') => `<div class="rounded-lg border p-2 text-sm ${st === 'done' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-muted/20'}"><div class="flex items-center gap-2">${circ(st).replace('h-6 w-6', 'h-5 w-5')}<div class="flex-1 min-w-0"><div class="font-medium">${name}</div><div class="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">${meta}</div></div></div>${extra}</div>`;
const sub = (tag, sn) => `<div class="ml-7 mt-1 flex items-center gap-1.5 text-[11px]"><span class="text-emerald-600">${icon('check', 'h-3 w-3')}</span><span class="font-mono">${tag}</span><span class="font-mono text-muted-foreground">${sn}</span></div>`;
const slot = `<div class="ml-7 mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground"><span class="inline-block h-3 w-3 rounded-full border border-dashed border-gray-400"></span>scan any QSC K12.2</div>`;

// a) before
const a = header('2 / 9 scanned') + `<div class="p-3 space-y-3 overflow-hidden">${kitCard('Main PA: K12.2 Pair', '0 / 8 pieces', 'todo',
  row('todo', '2 × QSC K12.2', `${tb('Not scanned')} <span>0 of 2 · any of 6</span>`, slot + slot) +
  row('todo', '2 × Speaker Stand, Tripod', `${tb('Not scanned')} <span>tap to count</span>`) +
  row('todo', '2 × XLR Cable, 25 ft', `${tb('Not scanned')} <span>tap to count</span>`))}
${kitCard('XLR Cable Box', `<span class="font-mono">CASE-02</span> · Container`, 'done')}
${kitCard('Small XLR Cable Box', `<span class="font-mono">CASE-03</span> · Items · 17 / 24`, 'part')}</div>`;

// b) scanner overlay
const b = `<div class="flex h-full flex-col bg-black text-white"><div class="flex items-center justify-between bg-black/80 p-4"><div><div class="font-semibold">Scanner</div><div class="text-xs text-zinc-400">Mode: Pack-Out</div></div><div class="flex gap-2"><span class="flex h-11 w-11 items-center justify-center rounded-full bg-white/20">${icon('keyboard', 'h-5 w-5')}</span><span class="flex h-11 w-11 items-center justify-center rounded-full bg-white/20">${icon('x', 'h-5 w-5')}</span></div></div>
<div class="flex flex-1 items-center justify-center bg-gradient-to-b from-zinc-800 to-zinc-900"><div class="h-56 w-56 rounded-lg border-2 border-white/40 flex items-center justify-center"><div class="rounded bg-white px-3 py-2 text-center text-black"><div class="text-[22px] tracking-[-2px] font-mono leading-none">▌▍▌▌▍▍▌▍▌</div><div class="font-mono text-[10px]">DSL-0101</div></div></div></div>
<div class="bg-black/80 p-4 space-y-2"><div class="rounded-lg border border-green-500/40 bg-green-500/15 p-3 text-sm"><div class="flex items-center gap-2 font-semibold">${icon('check-circle', 'h-4 w-4 text-green-400')}Scanned: DSL-0101</div><div class="mt-1 text-xs text-zinc-300">QSC K12.2 · SN GAA213409</div><div class="mt-1 text-xs text-green-300">Counts toward Main PA: 1 of 2 K12.2</div></div><div class="text-center text-xs text-zinc-400">Point camera at a barcode or QR code</div></div></div>`;

// c) after, plus a maintenance warning
const c = header('4 / 9 scanned') + `<div class="p-3 space-y-3 overflow-hidden">${kitCard('Main PA: K12.2 Pair', '2 / 8 pieces', 'part',
  row('done', '2 × QSC K12.2', `${tb('Checked Out')} <span>2 of 2</span>`, sub('DSL-0101', 'GAA213409') + sub('DSL-0103', 'GAA213422')) +
  row('todo', '2 × Speaker Stand, Tripod', `${tb('Not scanned')} <span>tap to count</span>`))}
<div class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 shadow"><div class="flex items-center gap-2 font-semibold">${icon('alert-triangle', 'h-4 w-4 text-amber-600')}DSL-0104 is in Maintenance</div><div class="mt-1 text-xs">QSC K12.2 · “woofer rattles”. Main PA already has its 2 K12.2s.</div><div class="mt-2 grid grid-cols-2 gap-2"><span class="flex h-10 items-center justify-center rounded-lg border bg-white text-sm">Don’t pull</span><span class="flex h-10 items-center justify-center rounded-lg text-sm text-white" style="background:${P}">Pull anyway</span></div></div>
<div class="rounded-xl border bg-white p-3 text-xs text-muted-foreground">A third K12.2 scanned for this kit asks whether to <b>swap</b> it for one already pulled, or add it as extra.</div></div>`;

// d) counting a line: the counter starts at the full amount
const d = header('4 / 9 scanned') + `<div class="relative flex-1 p-3 space-y-3 overflow-hidden">${kitCard('Main PA: K12.2 Pair', '2 / 8 pieces', 'part', row('todo', '2 × Speaker Stand, Tripod', `${tb('Not scanned')}`))}
<div class="absolute inset-0 bg-black/40"></div>
<div class="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 space-y-4 shadow-2xl"><div class="mx-auto h-1 w-10 rounded-full bg-gray-300"></div>
<div><div class="text-base font-bold">2 × Speaker Stand, Tripod</div><div class="text-xs text-muted-foreground">Main PA: K12.2 Pair · from the lot of 6 in Warehouse, Bay 2</div></div>
<div class="flex items-center justify-center gap-6 py-2"><span class="flex h-14 w-14 items-center justify-center rounded-full border text-gray-700">${icon('minus', 'h-6 w-6')}</span><span class="w-16 text-center text-5xl font-bold tabular-nums">2</span><span class="flex h-14 w-14 items-center justify-center rounded-full border text-gray-300">${icon('plus', 'h-6 w-6')}</span></div>
<div class="grid grid-cols-2 gap-2"><span class="flex h-11 items-center justify-center rounded-lg border text-sm">Cancel</span><span class="flex h-11 items-center justify-center rounded-lg text-sm font-medium text-white" style="background:${P}">Confirm line</span></div></div></div>`;

// e) packing the Small XLR Cable Box from stock
const e = header('17 / 24 counted') + `<div class="p-3 space-y-3 overflow-hidden">
<div class="rounded-xl border bg-white p-3 text-sm"><div class="flex items-center gap-2 font-semibold">${icon('layers', 'h-4 w-4 text-gray-500')}Small XLR Cable Box <span class="text-[11px] font-normal text-muted-foreground">CASE-03 · Items kit</span></div><div class="text-xs text-muted-foreground mt-0.5">These cables have no inventory tags, so each line is counted.</div></div>
${row('done', 'Cable trunk, 24 in', `${tb('Checked Out')} <span class="font-mono">CASE-03</span> <span>scanned</span>`)}
${row('done', '10 × XLR Cable, 5 ft', `${tb('Checked Out')} <span>10 of 10 counted</span>`)}
${row('part', '10 × XLR Cable, 15 ft', `<span class="text-amber-700 font-medium">7 of 10 counted · 3 short</span>`)}
${row('todo', '4 × XLR Cable, 50 ft', `${tb('Not scanned')} <span>tap to count · 4 free</span>`)}
<div class="text-center text-xs text-muted-foreground">The box is complete when every line is. A short line stays open until it is counted again.</div></div>`;

export default () => ({
  name: '07-scanning-pull',
  ...shell({
    id: '07-scanning-pull',
    body: frame(`<div class="bg-gray-100 px-6 py-8 space-y-10">
<div class="flex justify-center gap-10">${phone(a, `<b>1.</b> Pack-out for ${GIG.title}. “2 × QSC K12.2” shows two empty slots: any K12.2 fills one.`)}${phone(b, '<b>2.</b> Scanning DSL-0101 resolves one slot. The scanner says which line it counted toward.')}${phone(c, '<b>3.</b> Both slots filled with the units that went. Scanning a unit in Maintenance warns first.')}</div>
<div class="flex justify-center gap-10">${phone(d, '<b>4.</b> Stands have no tags, so tapping the line opens the counter at the full amount: confirm, or tap − first if some are missing.')}${phone(e, '<b>5.</b> The Small XLR Cable Box is an Items kit: the trunk (a Unit line) is scanned; the cables have no tags, so their lines are counted (one short here).')}</div>
</div>`, 'Mobile PWA › Inventory Mode (also embedded in the web “Track a gig” dialog).'),
    notes: [
      '<b>Resolving “2 × K12.2” by scanning</b>: the line shows a slot per piece. Scanning any K12.2 fills a slot and records <i>that</i> unit on the gig, so later the system knows DSL-0101 and DSL-0103 went (and which came back).',
      '<b>Guard rails</b>: a unit in Maintenance or booked on an overlapping gig warns before it is pulled; a third K12.2 for a kit that has its two offers a swap. ',
      '<b>Scan or count</b> follows the item, not the kit: an “any” line of tagged items (K12.2s) is scanned piece by piece; an “any” line of untagged items (stands, cables) is counted. The counter starts at the full amount, so a full line is one tap on <b>Confirm line</b>; − records fewer and leaves the line short.',
      '<b>No packing step</b>: the Small XLR Cable Box is an ordinary Items kit. Its trunk is scanned and its untagged cable lines counted; the kit is complete when every line is. Containers (XLR Cable Box, PA Rack) are always checked off as one.',
    ],
  }),
});
