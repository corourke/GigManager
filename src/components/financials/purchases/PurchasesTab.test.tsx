import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import PurchasesTab from './PurchasesTab';
import { presetRange } from './purchaseFilters';

const recent = presetRange('last-30').to; // today
const old = '2024-02-10';

const rows = [
  { id: 'h1', row_type: 'header', vendor: 'Sweetwater', purchase_date: recent, total_inv_amount: 120 },
  { id: 'i1', row_type: 'item', parent_id: 'h1', vendor: 'Sweetwater', purchase_date: recent, line_cost: 120, description: 'Cables' },
  { id: 'h2', row_type: 'header', vendor: 'Guitar Center', purchase_date: old, total_inv_amount: 900 },
  { id: 'i2', row_type: 'item', parent_id: 'h2', vendor: 'Guitar Center', purchase_date: old, line_cost: 900, asset_id: 'a1', description: 'Mixer' },
];

vi.mock('../../../services/purchase.service', () => ({
  getPurchases: vi.fn(async () => rows),
  reclassifyExpenseAsAsset: vi.fn(),
  scanInvoice: vi.fn(),
  deletePurchase: vi.fn(),
  updatePurchase: vi.fn(),
  reconcileLedgerForLineGigChange: vi.fn(),
  createLedgerEntryForPurchaseLine: vi.fn(),
  removeLedgerEntriesForPurchaseLine: vi.fn(),
  purchaseLineLedgerAmount: vi.fn(),
  assignGigToPurchaseChildren: vi.fn(),
}));
vi.mock('../../../services/attachment.service', () => ({
  getEntityAttachments: vi.fn(async () => []),
  uploadAttachment: vi.fn(),
  linkAttachmentToEntity: vi.fn(),
}));
vi.mock('../../../services/gig.service', () => ({
  getGigOptionsForOrganization: vi.fn(async () => []),
  getGigFinancialsByPurchaseId: vi.fn(async () => []),
  getPurchaseIdsWithLedgerEntry: vi.fn(async () => new Set()),
}));
vi.mock('./PurchaseDetailPanel', () => ({ default: () => null }));
vi.mock('../../ReviewScannedDataDialog', () => ({ default: () => null }));

const props = {
  organization: { id: 'org-1', name: 'Act4Audio' } as any,
  user: { id: 'u1' } as any,
  userRole: 'Admin' as const,
};

const totals = () => screen.getByTestId('purchase-totals');

describe('Purchases report (10-01)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens on the last 30 days, with filtered and all-time totals', async () => {
    render(<PurchasesTab {...props} />);
    await waitFor(() => expect(screen.getByText('Sweetwater')).toBeInTheDocument());
    expect(screen.queryByText('Guitar Center')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(totals()).getByText('$120.00')).toBeInTheDocument();
    const allTime = screen.getByTestId('purchase-totals-all-time');
    expect(within(allTime).getByText('$1,020.00')).toBeInTheDocument();
    expect(within(allTime).getByText('1 asset · 1 expense')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clear all filters/i })).not.toBeInTheDocument();
  });

  it('switches period with a preset, and Clear all filters goes back to the last 30 days', async () => {
    render(<PurchasesTab {...props} />);
    await waitFor(() => expect(screen.getByText('Sweetwater')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'All time' }));
    expect(screen.getByText('Guitar Center')).toBeInTheDocument();
    expect(within(totals()).getAllByText('$1,020.00').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText('Search vendor...'), { target: { value: 'guitar' } });
    expect(screen.queryByText('Sweetwater')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clear all filters/i }));
    expect(screen.getByPlaceholderText('Search vendor...')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Sweetwater')).toBeInTheDocument();
    expect(screen.queryByText('Guitar Center')).not.toBeInTheDocument();
  });

  it('typing a date by hand clears the preset', async () => {
    render(<PurchasesTab {...props} />);
    await waitFor(() => expect(screen.getByText('Sweetwater')).toBeInTheDocument());
    const [from] = screen.getAllByDisplayValue(presetRange('last-30').from);
    fireEvent.change(from, { target: { value: '2024-01-01' } });
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Guitar Center')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear all filters/i })).toBeInTheDocument();
  });

  it('offers to show all time when nothing falls in the period', async () => {
    const { getPurchases } = await import('../../../services/purchase.service');
    vi.mocked(getPurchases).mockResolvedValueOnce(rows.slice(2) as any);
    render(<PurchasesTab {...props} />);
    await waitFor(() => expect(screen.getByText('No purchases found')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Show all time' }));
    expect(screen.getByText('Guitar Center')).toBeInTheDocument();
  });
});
