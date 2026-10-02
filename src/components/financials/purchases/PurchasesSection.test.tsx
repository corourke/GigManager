import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PurchasesSection from './PurchasesSection';
import { getPurchases, scanInvoice } from '../../../services/purchase.service';
import { presetRange } from './purchaseFilters';

const today = presetRange('last-30').to;
const rows = [
  { id: 'h1', row_type: 'header', vendor: 'Sweetwater', purchase_date: today, total_inv_amount: 120 },
  { id: 'i1', row_type: 'item', parent_id: 'h1', vendor: 'Sweetwater', purchase_date: today, line_cost: 120 },
];

vi.mock('../../../services/purchase.service', () => ({
  getPurchases: vi.fn(async () => rows),
  scanInvoice: vi.fn(async () => ({ vendor: 'B&H Photo', items: [] })),
}));
vi.mock('../../../services/attachment.service', () => ({ getEntityAttachments: vi.fn(async () => []) }));
vi.mock('../../../services/gig.service', () => ({
  getGigOptionsForOrganization: vi.fn(async () => []),
  getPurchaseIdsWithLedgerEntry: vi.fn(async () => new Set()),
}));
vi.mock('./PurchaseDetailPanel', () => ({ default: () => null }));
// The purchase form: shows how it was opened, and Save / Cancel buttons.
vi.mock('../../ReviewScannedDataDialog', () => ({
  default: ({ layout, open, scannedData, file, cancelLabel, onSuccess, onOpenChange }: any) =>
    layout === 'page' && open ? (
      <div data-testid="purchase-form">
        <span>{scannedData ? `Review ${scannedData.vendor} from ${file?.name}` : 'Blank form'}</span>
        <button type="button" onClick={() => onSuccess('p-new')}>Save Purchase</button>
        <button type="button" onClick={() => onOpenChange(false)}>{cancelLabel}</button>
      </div>
    ) : null,
}));

const props = { organization: { id: 'org-1', name: 'Act4Audio' } as any, user: { id: 'u1' } as any };
const tab = (name: string) => screen.getByRole('tab', { name });

async function openAsAdmin() {
  render(<PurchasesSection {...props} userRole="Admin" />);
  await waitFor(() => expect(screen.getByText('Sweetwater')).toBeInTheDocument());
}

describe('Purchases tabs (10-01)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gives Admins and Managers Report, Add manually and Scan invoices; others just the report', async () => {
    const { unmount } = render(<PurchasesSection {...props} userRole="Manager" />);
    await waitFor(() => expect(screen.getByText('Sweetwater')).toBeInTheDocument());
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Report', 'Add manually', 'Scan invoices']);
    unmount();

    render(<PurchasesSection {...props} userRole="Viewer" />);
    await waitFor(() => expect(screen.getByText('Sweetwater')).toBeInTheDocument());
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('adding purchases leaves the report alone until you go back to it, then reloads it once', async () => {
    const user = userEvent.setup();
    await openAsAdmin();
    fireEvent.change(screen.getByPlaceholderText('Search vendor...'), { target: { value: 'sweet' } });
    expect(getPurchases).toHaveBeenCalledTimes(1);

    await user.click(tab('Add manually'));
    expect(screen.getByText('Blank form')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save Purchase' }));
    // The form clears for the next purchase; the report hasn't reloaded.
    expect(screen.getByText('Blank form')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save Purchase' }));
    expect(getPurchases).toHaveBeenCalledTimes(1);

    await user.click(tab('Report'));
    await waitFor(() => expect(getPurchases).toHaveBeenCalledTimes(2));
    // The report kept its filters.
    expect(screen.getByPlaceholderText('Search vendor...')).toHaveValue('sweet');

    // Back and forth without adding anything doesn't reload it again.
    await user.click(tab('Add manually'));
    await user.click(tab('Report'));
    expect(getPurchases).toHaveBeenCalledTimes(2);
  });

  it('scans a chosen invoice, shows it for review, and saving returns to the picker', async () => {
    const user = userEvent.setup();
    await openAsAdmin();
    await user.click(tab('Scan invoices'));
    const invoice = new File(['%PDF'], 'bh-invoice.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByTestId('scan-invoice-input'), invoice);

    expect(await screen.findByText('Review B&H Photo from bh-invoice.pdf')).toBeInTheDocument();
    expect(scanInvoice).toHaveBeenCalledWith(invoice, 'org-1');
    await user.click(screen.getByRole('button', { name: 'Save Purchase' }));
    expect(screen.getByRole('button', { name: /choose invoice/i })).toBeInTheDocument();

    await user.click(tab('Report'));
    await waitFor(() => expect(getPurchases).toHaveBeenCalledTimes(2));
  });

  it('discarding a scanned invoice saves nothing', async () => {
    const user = userEvent.setup();
    await openAsAdmin();
    await user.click(tab('Scan invoices'));
    await user.upload(screen.getByTestId('scan-invoice-input'), new File(['x'], 'r.png', { type: 'image/png' }));
    await user.click(await screen.findByRole('button', { name: 'Discard' }));
    expect(screen.getByRole('button', { name: /choose invoice/i })).toBeInTheDocument();
    await user.click(tab('Report'));
    expect(getPurchases).toHaveBeenCalledTimes(1);
  });
});
