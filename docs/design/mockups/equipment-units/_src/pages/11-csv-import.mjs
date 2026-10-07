import { icon, kindPill, btnPrimary, btnOutline, topbar, pageHeader, content, frame, shell, newMark, select, badge } from '../lib.mjs';

const cardP = (inner, extra = '') => `<section class="rounded-xl border bg-white p-6 ${extra}">${inner}</section>`;
const col = (n, req = false) => `<span class="inline-flex items-center rounded border bg-white px-1.5 py-0.5 font-mono text-[11.5px] ${req ? 'border-gray-400 font-semibold' : 'border-gray-200 text-gray-700'}">${n}</span>`;
const group = (title, sub, cls, cols, mark = '') => `<div class="rounded-lg border ${cls} p-3"><div class="flex items-center gap-2 text-sm font-semibold">${title}${mark}</div><div class="text-xs text-gray-600 mb-2">${sub}</div><div class="flex flex-wrap gap-1.5">${cols}</div></div>`;

const template = cardP(`<div class="flex items-center justify-between"><div><div class="font-medium text-gray-900">Import Type</div><div class="text-sm text-muted-foreground">Select what you want to import</div></div><div class="w-48">${select('Assets')}</div></div>
<div class="mt-4 flex items-center gap-3">${btnOutline('Download Template', 'download')}<span class="text-sm text-muted-foreground">Download a CSV template with example data</span></div>
<div class="mt-5 border-t pt-4"><div class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-900">Template columns: one row per unit or lot ${newMark(1)}</div>
<div class="grid grid-cols-3 gap-3">
${group(`${kindPill('item')} What it is`, 'Rows with the same model and category are one item. Matched to an existing item, or a new one is made.', 'border-gray-200 bg-gray-50', ['manufacturer_model', 'category'].map((c) => col(c, true)).join('') + ['type', 'description', 'replacement_value', 'insurance_class'].map((c) => col(c)).join(''))}
${group(`${kindPill('unit')}${kindPill('lot')} What we own`, 'Serial or tag: a unit (quantity 1). Neither: a lot. Several serials or tags, separated by “;”, make one unit each.', 'border-sky-200 bg-sky-50/50', [col('quantity', true), col('serial_number'), col('tag_number'), col('status'), col('kit'), col('lives_in'), col('insured'), col('recovery_period'), col('retired_on'), col('liquidation_amt')].join(''), newMark(2))}
${group(`${icon('receipt', 'h-3.5 w-3.5')} Purchase line`, 'Rows with the same date, vendor and invoice share a purchase; each row is one line.', 'border-green-200 bg-green-50/50', [col('acquisition_date', true), col('vendor'), col('source'), col('total_inv_amount'), col('payment_method'), col('line_amount'), col('line_cost'), col('item_price'), col('item_cost')].join(''))}
</div><p class="mt-2 text-xs text-muted-foreground">Removed: <span class="font-mono">service_life</span> and <span class="font-mono">dep_method</span> (replaced by <span class="font-mono">recovery_period</span>, #125). New: <span class="font-mono">lives_in</span> (a container kit for a lot).</p></div>`);

const upload = cardP(`<div class="flex items-center justify-between"><div class="font-medium text-gray-900">Upload CSV File</div>${btnOutline('Start New Import', '', 'h-8')}</div><div class="mt-3 flex items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 p-4">${icon('file', 'h-6 w-6 text-sky-600')}<div><div class="text-sm font-medium">lighting-and-cables-2025.csv</div><div class="text-xs text-muted-foreground">Click to select a different file</div></div></div>`);

const summary = cardP(`<div class="flex items-center justify-between"><div class="font-medium text-gray-900 flex items-center gap-2">Import Summary ${newMark(3)}</div>${btnPrimary('Import 4 Ready Rows', 'check')}</div>
<div class="mt-3 grid grid-cols-4 gap-3">
<div class="rounded-lg bg-green-50 p-3"><div class="flex items-center gap-2 text-sm text-green-800">${icon('check-circle', 'h-4 w-4')}Valid rows</div><div class="text-2xl text-green-900">4</div></div>
<div class="rounded-lg bg-red-50 p-3"><div class="flex items-center gap-2 text-sm text-red-800">${icon('x', 'h-4 w-4')}Invalid rows</div><div class="text-2xl text-red-900">1</div></div>
<div class="rounded-lg bg-gray-50 p-3"><div class="text-sm text-gray-700">Items</div><div class="text-2xl text-gray-900">3</div><div class="text-xs text-muted-foreground">1 new · 2 matched</div></div>
<div class="rounded-lg bg-sky-50 p-3"><div class="text-sm text-sky-800">Creates</div><div class="text-2xl text-sky-900">7 units, 2 lots</div><div class="text-xs text-muted-foreground">37 pieces on 4 purchase lines</div></div>
</div>`);

const T = 'px-2 py-1.5 text-[0.8rem] align-middle';
const vr = (n, model, itemBadge, qty, serials, tags, creates, line) => `<tr class="border-b"><td class="${T} text-muted-foreground">${n}</td><td class="${T} font-medium">${model}</td><td class="${T}">${itemBadge}</td><td class="${T} text-right tabular-nums">${qty}</td><td class="${T} font-mono text-[11px] max-w-[260px] truncate">${serials}</td><td class="${T} font-mono text-[11px]">${tags}</td><td class="${T}">${creates}</td><td class="${T} text-xs text-muted-foreground">${line}</td><td class="${T}"><span class="inline-flex items-center gap-1 text-xs text-yellow-700">${icon('alert', 'h-3.5 w-3.5')}Ready</span></td></tr>`;
const newItem = badge('New item', 'bg-sky-50 text-sky-800 border-sky-200');
const matched = (n) => badge(`Matches · ${n} owned`, 'bg-white text-gray-700 border-gray-300');
const valid = cardP(`<div class="mb-3 flex items-center gap-2 font-medium text-gray-900">${icon('check-circle', 'h-4 w-4 text-green-600')}Valid Rows (4)</div>
<div class="rounded-md border overflow-hidden"><table class="w-full"><thead><tr class="border-b bg-muted/30 text-left text-xs font-semibold"><th class="px-2 py-2">Row</th><th class="px-2 py-2">Model</th><th class="px-2 py-2">Item</th><th class="px-2 py-2 text-right">Qty</th><th class="px-2 py-2">Serial numbers</th><th class="px-2 py-2">Tags</th><th class="px-2 py-2">Creates</th><th class="px-2 py-2">Purchase line</th><th class="px-2 py-2">Import Status</th></tr></thead><tbody>
${vr(2, 'Chauvet Intimidator Trio', newItem, 6, 'IT32510290; IT32510297; IT32510304; …', 'DSL-0141 … DSL-0146', `${kindPill('unit')} × 6`, 'Brightline Lighting · 2025-10-29 · line 1')}
${vr(3, 'XLR Cable, 25 ft', matched(30), 10, '', '', `${kindPill('lot')} of 10, lives in XLR Cable Box`, 'Cablesmith Direct · 2025-11-14 · line 1')}
${vr(4, 'XLR Cable, 25 ft', matched(30), 20, '', '', `${kindPill('lot')} of 20`, 'Cablesmith Direct · 2025-11-14 · line 2')}
${vr(5, 'QSC K12.2', matched(6), 1, 'GAB118077', 'DSL-0107', `${kindPill('unit')} × 1`, 'Sweetwater · 2025-12-02 · line 1')}
</tbody></table></div>`);

const invalid = cardP(`<div class="mb-3 flex items-center justify-between"><div class="flex items-center gap-2 font-medium text-gray-900">${icon('x', 'h-4 w-4 text-red-600')}Invalid Rows (1) ${newMark(4)}</div>${btnOutline('Re-validate Fixed Rows', '', 'h-8')}</div>
<div class="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2"><div class="text-sm font-semibold">Row 6</div>
<div class="grid grid-cols-5 gap-3 text-xs">${[['manufacturer_model', 'Halden HX-8M Floor Monitor'], ['quantity', '4'], ['serial_number', 'HX8M-55120'], ['tag_number', ''], ['category', 'Audio']].map(([l, v]) => `<div><div class="text-[10px] uppercase tracking-wide text-gray-500">${l}</div><div class="mt-0.5 flex h-8 items-center rounded-md border ${l === 'serial_number' || l === 'quantity' ? 'border-red-500' : 'border-gray-200'} bg-white px-2 font-mono">${v}</div></div>`).join('')}</div>
<div class="text-sm text-red-700 flex items-start gap-1.5">${icon('alert', 'h-4 w-4 mt-0.5')}1 serial number for quantity 4. Give 4 serials separated by “;” (4 units), or clear the serial (a lot of 4).</div></div>`);

export default () => ({
  name: '11-csv-import',
  ...shell({
    id: '11-csv-import',
    body: frame(topbar() + pageHeader({ title: 'CSV Import', back: 'Back to Equipment' }) + content(`<div class="space-y-6">${template}${upload}${summary}${invalid}${valid}</div>`, '*:max-w-6xl'), 'Equipment › Items › Import (Assets), after reading a file.'),
    notes: [
      '<b>The assets template</b> keeps one row per thing bought, but its columns now fall into three groups: what it is (the item), what we own (unit or lot), and the purchase line. Rows with the same model and category land on one item.',
      '<b>Serials and tags</b>: one serial or tag makes a unit of quantity 1. A row of quantity 6 can list 6 serials (or tags) separated by “;” to make 6 units on one purchase line: the six Trios in one row. No serial or tag makes a lot, which can name the container it lives in.',
      '<b>The summary</b> says what will be created before anything is: items new and matched, units and lots, purchase lines. Each row says whether it matched an existing item, so a typo in the model shows up as an unexpected “New item”.',
      '<b>A serial with a quantity above 1</b> is invalid and says how to fix it, the same rule as the form (screen 3). It is how today’s 3 prod records with this problem would be caught on import.',
    ],
  }),
});
