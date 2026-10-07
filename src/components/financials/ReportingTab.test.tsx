import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportingTab from './ReportingTab';

const downloadCsv = vi.fn();
vi.mock('../../utils/taxReports', async (orig) => ({ ...(await orig<any>()), downloadCsv: (...a: any[]) => downloadCsv(...a) }));
vi.mock('../../services/taxYear.service', () => ({ getLockedTaxYears: vi.fn(async () => new Set([2025])) }));

const asset = { id: 'a1', manufacturer_model: 'Midas M32', category: 'Audio', recovery_period: null, retired_on: null, liquidation_amt: null, status: 'Active' };
vi.mock('../../services/taxReport.service', () => ({
  getTaxReportData: vi.fn(async () => ({
    lines: [
      { id: 'p1', purchase_date: '2026-03-01', vendor: 'Sweetwater', description: 'Gaff tape', category: 'Supplies', quantity: 1, item_cost: 40, line_cost: 40,
        tax_treatment: 'expense', asset_id: null, parent: null, asset: null },
      { id: 'p2', purchase_date: '2026-03-02', vendor: 'Sweetwater', description: 'Console', category: 'Audio', quantity: 1, item_cost: 3200, line_cost: 3200,
        tax_treatment: 'depreciate', asset_id: 'a1', parent: null, asset },
      { id: 'p3', purchase_date: '2025-05-01', vendor: 'Amazon', description: 'Old cable', category: 'Supplies', quantity: 1, item_cost: 9, line_cost: 9,
        tax_treatment: 'expense', asset_id: null, parent: null, asset: null },
    ],
    gigRows: [
      { id: 'g1', gig_id: 'x', direction: 'in', stage: 'paid', amount_settled: 1500, paid_at: '2026-04-02', description: 'Balance', category: null,
        mileage: null, purchase_id: null, staff_assignment_id: null, external_entity_name: null, reference_number: 'INV-7',
        counterparty: { name: 'Hotel Del' }, gig: { title: 'Spring Gala', start: '2026-04-01' } },
    ],
    categories: [{ name: 'Supplies', schedule_c_line: '22' }],
    scheduleC: [{ code: '22', label: 'Supplies' }],
  })),
}));

describe('ReportingTab (#125)', () => {
  beforeEach(() => vi.clearAllMocks());
  const year = String(new Date().getFullYear());

  const open = async (onEditAsset = vi.fn()) => {
    render(<ReportingTab organizationId="org-1" organizationName="Act4 Audio" onEditAsset={onEditAsset} />);
    await screen.findByRole('group', { name: 'Report' });
    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Tax year' }), '2026');
    return onEditAsset;
  };

  it('offers every year with data, and this year', async () => {
    await open();
    const years = within(screen.getByRole('combobox', { name: 'Tax year' })).getAllByRole('option').map(o => o.textContent);
    expect(years).toEqual(expect.arrayContaining(['2026', '2025', year]));
  });

  it('shows income received in the year and downloads it as CSV', async () => {
    await open();
    const table = await screen.findByRole('table', { name: 'Income' });
    expect(within(table).getByText('Spring Gala')).toBeInTheDocument();
    expect(within(table).getByText('Hotel Del')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Download CSV/ }));
    expect(downloadCsv).toHaveBeenCalledWith(expect.stringContaining('Spring Gala'), 'act4-audio-income-2026.csv');
  });

  it('shows expenses by Schedule C line, then every expense', async () => {
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Expenses' }));
    expect(within(screen.getByRole('table', { name: 'Expenses by Schedule C line' })).getByText('Line 22: Supplies')).toBeInTheDocument();
    const all = screen.getByRole('table', { name: 'Expenses' });
    expect(within(all).getByText('Gaff tape')).toBeInTheDocument();
    expect(within(all).queryByText('Console')).not.toBeInTheDocument();
    expect(within(all).queryByText('Old cable')).not.toBeInTheDocument();
  });

  it('shows the year\'s depreciated equipment and asks for a missing recovery period', async () => {
    const onEditAsset = await open();
    await userEvent.click(screen.getByRole('button', { name: 'Assets' }));
    expect(within(screen.getByRole('table', { name: 'Assets' })).getByText('Midas M32')).toBeInTheDocument();
    expect(screen.getByText('Need a recovery period')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Choose a recovery period: Midas M32' }));
    expect(onEditAsset).toHaveBeenCalledWith('a1');
    await userEvent.click(screen.getByRole('button', { name: /Download CSV/ }));
    expect(downloadCsv).toHaveBeenCalledWith(expect.stringContaining('Midas M32'), 'act4-audio-assets-2026.csv');
  });

  it('marks a filed year', async () => {
    await open();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Tax year' }), '2025');
    expect(screen.getByText('2025 is filed')).toBeInTheDocument();
  });
});
