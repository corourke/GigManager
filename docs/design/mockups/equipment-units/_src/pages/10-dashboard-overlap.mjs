import { icon, gigStatus, tagBadge, btnPrimary, btnOutline, topbar, pageHeader, pageTabs, content, frame, shell, newMark, badge } from '../lib.mjs';
import { GIG, OTHER_GIG } from '../data.mjs';

const tile = (title, ic, icCls, rows, extra = '') => `<section class="rounded-xl border bg-white p-4 ${extra}"><div class="flex items-center justify-between"><span class="text-sm text-muted-foreground font-bold">${title}</span>${icon(ic, `h-5 w-5 ${icCls}`)}</div><div class="mt-3 space-y-1.5">${rows.map(([l, v, sub]) => `<div class="flex items-baseline justify-between"><span class="text-xs text-muted-foreground">${l}</span><span class="text-foreground ${sub ? '' : ''}">${v}</span></div>${sub ? `<div class="-mt-1 text-right text-[11px] text-muted-foreground">${sub}</div>` : ''}`).join('')}</div></section>`;

const dash = frame(topbar('Dashboard') + pageHeader({ title: 'Dashboard', slotIcon: 'dashboard', meta: 'Welcome back, Cameron!' }) + content(`
<div class="grid grid-cols-4 gap-4">
${tile('Gigs', 'calendar', 'text-sky-500', [['Upcoming', '9'], ['This month', '5'], ['Date holds', '1']], 'opacity-50')}
<div class="relative">${tile('Equipment', 'package', 'text-purple-500', [['Total Value', '$71,486', 'replacement value × units'], ['Insured', '$64,210', '301 of 339 pieces'], ['Rental Value', '$5,310'], ['Owned', '38 items · 339 pieces']], 'ring-2 ring-fuchsia-400')}<span class="absolute -right-2 -top-2">${newMark(1)}</span></div>
${tile('Financials', 'banknote', 'text-green-500', [['Revenue (YTD)', '$48,900'], ['Expenses (YTD)', '$21,450'], ['Net', '$27,450']], 'opacity-50')}
${tile('Team', 'users', 'text-orange-500', [['Members', '7'], ['Unfilled slots', '3']], 'opacity-50')}
</div>
<div class="mt-4 grid grid-cols-4 gap-4"><div></div><div class="rounded-lg border border-dashed border-gray-300 bg-white p-3 text-xs text-gray-600"><div class="font-semibold text-gray-800">Today, for comparison</div><div class="mt-1 flex justify-between"><span>Total Value</span><span class="tabular-nums line-through">$13.2K</span></div><div class="flex justify-between"><span>Insured</span><span class="tabular-nums line-through">$9.8K</span></div><div class="mt-1">Sums item_cost and ignores quantity (#157).</div></div></div>`), 'Dashboard (other tiles faded).');

// Gig page conflict card (ConflictWarning showAsCard), now per item.
const conflictCard = `<section class="rounded-xl border border-orange-200 bg-orange-50/50 p-4 space-y-3">
<div class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-orange-800">${icon('alert-triangle', 'h-4 w-4')}Conflicts detected (1) ${newMark(2)}</div>
<div class="flex items-start gap-3 rounded-lg border bg-white p-3"><span class="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-yellow-50 text-yellow-600">${icon('package')}</span>
<div class="flex-1 space-y-1"><div class="flex items-center gap-2">${badge('Equipment Conflict', 'text-yellow-600 bg-yellow-50 border-yellow-200')}<span class="text-sm font-semibold">${OTHER_GIG.title}</span><span class="text-xs text-muted-foreground">Sat Oct 10, 6:00 PM</span></div>
<div class="text-sm text-gray-800"><b>Chauvet Intimidator Trio</b>: 8 needed on Oct 10, 6 owned. <span class="text-red-700 font-semibold">2 short.</span></div>
<div class="text-xs text-muted-foreground">This gig: 4 (Club Lighting Package, any 4) · ${OTHER_GIG.title}: 4 (Club Lighting Package, any 4)</div></div>
<span class="text-xs font-medium text-sky-700">View</span></div></section>`;

const C = 'px-3 py-2 text-sm';
const need = (item, here, other, owned, out, free, res) => `<tr class="border-b last:border-0"><td class="${C} font-medium">${item}</td><td class="${C} text-right tabular-nums">${here}</td><td class="${C} text-right tabular-nums">${other}</td><td class="${C} text-right tabular-nums font-semibold">${here + other}</td><td class="${C} text-right tabular-nums">${owned}</td><td class="${C} text-right tabular-nums text-muted-foreground">${out}</td><td class="${C} text-right tabular-nums">${free}</td><td class="${C}">${res}</td></tr>`;
const ok = `<span class="inline-flex items-center gap-1 text-xs font-medium text-green-700">${icon('check', 'h-3.5 w-3.5')}Enough</span>`;
const tight = (t) => `<span class="inline-flex items-center gap-1 text-xs font-medium text-amber-700">${icon('alert-triangle', 'h-3.5 w-3.5')}${t}</span>`;
const short = (t) => `<span class="inline-flex items-center gap-1 text-xs font-medium text-red-700">${icon('alert', 'h-3.5 w-3.5')}${t}</span>`;
const needTable = `<section class="rounded-xl border bg-white p-4 space-y-2.5"><div class="flex items-center gap-2"><h2 class="text-[15px] font-semibold">Equipment needed on Oct 10</h2><span class="text-xs text-muted-foreground">this gig and the 1 that overlaps it</span>${newMark(3)}</div>
<div class="rounded-md border overflow-hidden"><table class="w-full"><thead><tr class="border-b bg-muted/30 text-left text-xs font-semibold"><th class="px-3 py-2">Item</th><th class="px-3 py-2 text-right">This gig</th><th class="px-3 py-2 text-right">Overlapping</th><th class="px-3 py-2 text-right">Needed</th><th class="px-3 py-2 text-right">Owned</th><th class="px-3 py-2 text-right">In maintenance</th><th class="px-3 py-2 text-right">Free</th><th class="px-3 py-2"></th></tr></thead><tbody>
${need('Chauvet Intimidator Trio', 4, 4, 6, 0, 6, short('2 short'))}
${need('QSC K12.2', 2, 2, 6, 1, 5, ok)}
${need('XLR Cable, 50 ft', 4, 2, 10, 0, '6 <span class="text-[11px] text-muted-foreground">of 10</span>', tight('none spare · 4 are a lot in XLR Cable Box'))}
${need('XLR Cable, 25 ft', 2, 0, 30, 1, 19, ok)}
</tbody></table></div>
<p class="text-xs text-muted-foreground">Counts units per item, whichever kits ask for them. A specific unit (the PA Rack’s amp) conflicts only if the same unit is booked twice. A lot that lives in a container counts only toward that container.</p></section>`;

const gig = frame(topbar('Gigs') + pageHeader({
  title: GIG.title, back: 'Back to Gigs', badge: gigStatus('Booked'), meta: `${GIG.date} · ${GIG.venue} ${tagBadge('Corporate')}`,
  actions: btnOutline('Print', 'printer') + `<span class="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-background text-gray-700">${icon('more-v')}</span>` + btnPrimary('Edit', 'pencil'),
  tabs: pageTabs([['Overview'], ['Equipment'], ['Financials'], ['History']], 'Equipment'),
}) + content(`<div class="space-y-4">${conflictCard}${needTable}</div>`), `Gigs › ${GIG.title} › Equipment: the overlapping-equipment warning.`);

const alertForm = `<div class="rounded-lg border border-orange-200 bg-orange-50 p-4"><div class="flex items-center gap-2 text-sm font-semibold text-orange-800">${icon('alert-triangle', 'h-4 w-4')}1 Conflict Detected</div><div class="mt-2 text-sm text-gray-800"><b>${OTHER_GIG.title}</b> (Sat Oct 10, 6:00 PM) - Not enough equipment: Chauvet Intimidator Trio (8 needed, 6 owned)</div></div>`;

export default () => ({
  name: '10-dashboard-overlap',
  ...shell({
    id: '10-dashboard-overlap',
    body: dash + gig + frame(`<div class="bg-white p-4">${alertForm}</div>`, 'The compact alert (gig list, calendar, kit editor), same wording.'),
    notes: [
      '<b>Dashboard total</b> becomes units × the item’s replacement value, the same $71,486 as the Items footer (#157); Insured counts the same way. A new “Owned” row gives items and pieces. Today’s tile sums item_cost without quantity: $13.2K.',
      '<b>The conflict</b> is now about an item, not a shared record: “Chauvet Intimidator Trio: 8 needed on Oct 10, 6 owned. 2 short.” It says which kits ask for them on each gig.',
      '<b>Equipment needed</b> (new, under the warning) shows the sums behind it for every item the overlapping gigs share: needed, owned, in maintenance, free. “Any” entries add up per item; it also flags when nothing is spare, like the 50 ft cables.',
    ],
  }),
});
