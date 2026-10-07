import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';
import {
  buildIncomeReport, buildExpenseReport, buildAssetReport,
  incomeCsv, expensesCsv, assetsCsv, disposalsCsv, reportFilename,
  type ReportPurchaseLine, type ReportGigRow,
} from './taxReports';

const line = (o: Partial<ReportPurchaseLine>): ReportPurchaseLine => ({
  id: 'l', purchase_date: '2026-03-01', vendor: 'Sweetwater', description: 'item', category: 'Supplies',
  quantity: 1, item_cost: 10, line_cost: 10, tax_treatment: 'expense', asset_id: null,
  parent: { purchase_date: '2026-03-01', vendor: 'Sweetwater' }, asset: null, ...o,
});
const gigRow = (o: Partial<ReportGigRow>): ReportGigRow => ({
  id: 'g', gig_id: 'gig1', direction: 'in', stage: 'paid', amount_settled: 100, paid_at: '2026-04-02',
  description: null, category: null, mileage: null, purchase_id: null, staff_assignment_id: null,
  external_entity_name: null, reference_number: null, counterparty: null,
  gig: { title: 'Spring Gala', start: '2026-04-01' }, ...o,
});
const scheduleC = [
  { code: '9', label: 'Car and truck expenses' }, { code: '11', label: 'Contract labor' },
  { code: '22', label: 'Supplies' }, { code: '27b', label: 'Other expenses (Part V)' },
];
const cats = [
  { name: 'Supplies', schedule_c_line: '22' },
  { name: 'Small audio parts', schedule_c_line: '27b' },
  { name: 'Reimbursable (not deducted)', schedule_c_line: null },
];

describe('Income report (#125)', () => {
  it('counts what was received in the year, by paid date, at the settled amount', () => {
    const r = buildIncomeReport([
      gigRow({ id: 'a', amount_settled: 1500, paid_at: '2026-04-02', counterparty: { name: 'Hotel Del' }, reference_number: 'INV-7' }),
      gigRow({ id: 'b', amount_settled: 250, paid_at: '2026-01-15' }),
      gigRow({ id: 'c', paid_at: '2025-12-31' }),              // last year
      gigRow({ id: 'd', stage: 'invoiced', paid_at: null }),    // not received
      gigRow({ id: 'e', direction: 'out' }),                    // money out
    ], 2026);
    expect(r.rows.map(x => x.id)).toEqual(['b', 'a']);
    expect(r.rows[1]).toMatchObject({ date: '2026-04-02', gig: 'Spring Gala', gigDate: '2026-04-01', from: 'Hotel Del', reference: 'INV-7', amount: 1500 });
    expect(r.total).toBe(1750);
  });
});

describe('Expenses report (#125)', () => {
  const lines = [
    line({ id: 'p1', category: 'Supplies', line_cost: 40.5 }),
    line({ id: 'p2', category: 'Small audio parts', purchase_date: null, parent: { purchase_date: '2026-06-01', vendor: 'Amazon' }, vendor: null, line_cost: null, item_cost: 5, quantity: 3 }),
    line({ id: 'p3', category: 'Audio', line_cost: 20 }),                                   // old value, not on the list
    line({ id: 'p4', category: 'Reimbursable (not deducted)', line_cost: 30 }),
    line({ id: 'p5', tax_treatment: 'depreciate', line_cost: 900 }),                        // an asset, not an expense
    line({ id: 'p6', purchase_date: '2025-12-30', line_cost: 99 }),                         // last year
  ];
  const gig = [
    gigRow({ id: 'm', direction: 'out', category: 'Car and truck expenses', mileage: 42, amount_settled: 30.45, paid_at: '2026-05-01' }),
    gigRow({ id: 's', direction: 'out', category: 'Contract labor', staff_assignment_id: 'sa', amount_settled: 300, paid_at: '2026-05-02', external_entity_name: 'Pat' }),
    gigRow({ id: 'x', direction: 'out', category: 'Other expenses', purchase_id: 'p1', amount_settled: 40.5 }),  // the line counts
    gigRow({ id: 'o', direction: 'out', stage: 'invoiced', category: 'Supplies', paid_at: null }),              // not paid
  ];
  const r = buildExpenseReport(lines, gig, cats, scheduleC, 2026);

  it('takes expensed lines by line date (else the invoice\'s) and paid gig costs not tied to a purchase', () => {
    expect(r.rows.map(x => x.id).sort()).toEqual(['m', 'p1', 'p2', 'p3', 'p4', 's']);
    expect(r.rows.find(x => x.id === 'p2')).toMatchObject({ date: '2026-06-01', payee: 'Amazon', amount: 15, line: '27b', source: 'Purchase' });
    expect(r.rows.find(x => x.id === 'm')).toMatchObject({ source: 'Gig', line: '9', miles: 42, gig: 'Spring Gala', amount: 30.45 });
    expect(r.rows.find(x => x.id === 's')).toMatchObject({ payee: 'Pat', line: '11' });
    expect(r.total).toBe(435.95);
  });

  it('groups by Schedule C line in line order, with unfiled categories last', () => {
    expect(r.byLine.map(g => g.line)).toEqual(['9', '11', '22', '27b', null]);
    expect(r.byLine[2]).toMatchObject({ label: 'Line 22: Supplies', total: 40.5 });
    const none = r.byLine[4];
    expect(none.label).toBe('No Schedule C line');
    expect(none.categories.map(c => c.category)).toEqual(['Audio', 'Reimbursable (not deducted)']);
  });

  it('flags a category that isn\'t on the list', () => {
    expect(r.needsCategory).toBe(1);
    expect(r.rows.find(x => x.id === 'p3')!.unlisted).toBe(true);
    expect(r.rows.find(x => x.id === 'p4')!.unlisted).toBe(false);
  });

  it('exports every row with its Schedule C line', () => {
    const rows = Papa.parse<string[]>(expensesCsv(r, scheduleC)).data;
    expect(rows[0]).toEqual(['Date paid', 'Source', 'Payee', 'Description', 'Category', 'Schedule C line', 'Line name', 'Gig', 'Miles', 'Amount']);
    expect(rows).toHaveLength(7);
    expect(rows.find(x => x[4] === 'Supplies')).toEqual(['2026-03-01', 'Purchase', 'Sweetwater', 'item', 'Supplies', '22', 'Supplies', '', '', '40.50']);
  });
});

describe('Assets report (#125)', () => {
  const asset = (o: Partial<NonNullable<ReportPurchaseLine['asset']>>) => ({
    id: 'a', manufacturer_model: 'Chauvet Intimidator Trio', category: 'Lighting', recovery_period: 7,
    retired_on: null, liquidation_amt: null, status: 'Active', ...o,
  });
  const lines = [
    line({ id: 'd1', tax_treatment: 'depreciate', item_cost: 3200, line_cost: 3200, asset_id: 'a1', asset: asset({ id: 'a1', manufacturer_model: 'Midas M32' , category: 'Audio' }) }),
    line({ id: 'd2', tax_treatment: 'depreciate', item_cost: 420, line_cost: 840, quantity: 2, asset_id: 'a2', asset: asset({ id: 'a2', recovery_period: null }) }),
    line({ id: 'd3', tax_treatment: 'depreciate', purchase_date: '2025-02-01', line_cost: 600, item_cost: 600, asset_id: 'a3',
      asset: asset({ id: 'a3', manufacturer_model: 'Sennheiser XSW IEM', retired_on: '2026-05-20', liquidation_amt: 350, status: 'Disposed' }) }),
    line({ id: 'e1', tax_treatment: 'expense', asset_id: 'a4', asset: asset({ id: 'a4' }) }),
  ];
  const r = buildAssetReport(lines, 2026);

  it('lists what was depreciated in the year, with cost, recovery period and the de minimis flag', () => {
    expect(r.rows.map(x => x.id)).toEqual(['d2', 'd1']);
    expect(r.rows.find(x => x.id === 'd1')).toMatchObject({ description: 'Midas M32', category: 'Audio', cost: 3200, recoveryPeriod: 7, deMinimis: false });
    expect(r.rows.find(x => x.id === 'd2')).toMatchObject({ quantity: 2, itemCost: 420, cost: 840, recoveryPeriod: null, deMinimis: true });
    expect(r.total).toBe(4040);
  });

  it('totals by recovery period, with the unchosen ones last, and counts what needs attention', () => {
    expect(r.byPeriod).toEqual([{ period: 7, count: 1, total: 3200 }, { period: null, count: 1, total: 840 }]);
    expect(r.missingPeriod).toBe(1);
    expect(r.deMinimis).toBe(1);
  });

  it('lists depreciated equipment disposed of in the year, whenever it was bought', () => {
    expect(r.disposals).toEqual([{ id: 'd3', assetId: 'a3', description: 'Sennheiser XSW IEM', bought: '2025-02-01', cost: 600, disposed: '2026-05-20', proceeds: 350, status: 'Disposed' }]);
    expect(buildAssetReport(lines, 2025).disposals).toEqual([]);
  });

  it('exports assets and disposals', () => {
    const a = Papa.parse<string[]>(assetsCsv(r)).data;
    expect(a[0]).toContain('Recovery period (years)');
    expect(a[2]).toEqual(['2026-03-01', 'Midas M32', 'Sweetwater', 'Audio', '1', '3200.00', '3200.00', '7', 'No']);
    const d = Papa.parse<string[]>(disposalsCsv(r)).data;
    expect(d[1]).toEqual(['Sennheiser XSW IEM', '2025-02-01', '600.00', '2026-05-20', '350.00', 'Disposed']);
  });
});

describe('CSV helpers', () => {
  it('income CSV has one row per payment', () => {
    const csv = incomeCsv(buildIncomeReport([gigRow({ amount_settled: 1500 })], 2026));
    expect(Papa.parse<string[]>(csv).data[1]).toEqual(['2026-04-02', 'Spring Gala', '2026-04-01', '', '', '', '1500.00']);
  });
  it('names the file after the organization, report and year', () => {
    expect(reportFilename('Act4 Audio, LLC', 'expenses', 2026)).toBe('act4-audio-llc-expenses-2026.csv');
  });
});
