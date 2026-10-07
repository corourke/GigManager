import { icon, kindPill, badge, PAGES } from '../lib.mjs';

const BLURB = {
  '01-equipment-list': 'Items with their units and lots, worked-out counts, availability, and a flat view for finding a serial or tag.',
  '02-item-page': 'Shared fields once; the units and lots table; which kits use the item and how.',
  '03-unit-lot-form': 'Unit or lot first; serial or tag locks quantity to 1; purchase link; recovery period when depreciated.',
  '04-purchase-review': 'One line of 6 Trios creates 6 units: pick or create the item, enter serials or tags, or keep a lot.',
  '05-kit-editor': '“N × any” or a specific unit or lot; Items kits confirm each line, containers scan as one.',
  '06-packing-list': '“2 × QSC K12.2” filled in by scans, container progress, and the printout with write-in blanks.',
  '07-scanning-pull': 'Scanning the K12.2s that go, and counting cable and stand lines with a counter that starts full.',
  '08-locations-override': 'Counts per place (#160) and overrides that move part of a lot.',
  '09-maintenance': 'Sending one specific unit by serial, or one piece of a lot; availability impact.',
  '10-dashboard-overlap': 'Dashboard total = units × replacement value (#157); conflicts counted per item.',
  '11-csv-import': 'Template grouped by item / unit or lot / purchase; “;”-separated serials; serial-with-quantity guard.',
};

export default () => ({
  name: 'index',
  title: 'Equipment units mockups',
  html: `<main class="mx-auto max-w-6xl">
<header class="mb-6"><div class="mb-2 flex items-center gap-2"><span class="rounded bg-fuchsia-600 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">Mockups</span><span class="text-sm text-gray-600">GitHub issue #162 · for review, nothing is built</span></div>
<h1 class="text-[28px] font-bold text-gray-900">Equipment items and units</h1>
<p class="mt-2 max-w-3xl text-[15px] text-gray-700">Splitting <b>what it is</b> (a new <i>item</i>, such as “QSC K12.2”) from <b>what we own</b> (an existing <i>asset</i> row, now a <i>unit</i> or a <i>lot</i>), so serial numbers, tags, quantities and kits work properly. Each screen below uses Cameron’s examples: the K12.2 PA kit, the XLR Cable Box, the Small XLR Cable Box packed at checkout, the PA Rack, and the six Chauvet Intimidator Trios bought on one line.</p></header>

<section class="mb-8 grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-4 text-sm">
<div><div class="mb-1">${kindPill('item')}</div><b>Item</b>: what it is. Model, category, type, replacement value. Quantity is counted from its units and lots.</div>
<div><div class="mb-1">${kindPill('unit')}</div><b>Unit</b>: one physical thing with a serial number or tag. Quantity is always 1.</div>
<div><div class="mb-1">${kindPill('lot')}</div><b>Lot</b>: several identical untagged things, counted together, such as 10 untagged cables.</div>
<div><div class="mb-1">${badge(`${icon('box', 'h-3 w-3')}Any`, 'bg-white text-gray-700 border-gray-300')}</div><b>“N × any”</b>: a kit entry for how many of an item; scans decide which.</div>
</section>

<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
${PAGES.map(([id, name], i) => `<a href="${id}.html" class="group block overflow-hidden rounded-xl border bg-white shadow-sm hover:border-sky-400 hover:shadow-md">
<div class="h-44 overflow-hidden border-b bg-gray-100"><img src="png/${id}.png" alt="${name} mockup" class="w-full object-cover object-top"></div>
<div class="p-4"><div class="text-xs font-semibold text-sky-700">Screen ${i + 1}</div><div class="text-[15px] font-semibold text-gray-900 group-hover:text-sky-700">${name}</div><p class="mt-1 text-sm text-gray-600">${BLURB[id]}</p></div></a>`).join('')}
</div>
<p class="mt-8 text-xs text-gray-500">Generated from <span class="font-mono">_src/</span> (see <span class="font-mono">_src/build.mjs</span>). Pink numbered dots mark what is new; each screen ends with “What changes and why”. Pink dots and the dark banner are mockup chrome, not part of the design.</p>
</main>`,
});
