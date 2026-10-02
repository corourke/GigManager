import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PurchasesSection from './PurchasesSection';
import { getPurchases } from '../../../services/purchase.service';
import {
  listScanQueue, enqueueInvoice, scanQueuedInvoice, removeFromScanQueue, discardQueuedInvoice,
} from '../../../services/purchaseScanQueue.service';
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
// The queue: rows in memory, ids q1, q2…; scanning returns a vendor named after the file.
let queueRows: any[] = [];
let nextId = 1;
vi.mock('../../../services/purchaseScanQueue.service', () => ({
  listScanQueue: vi.fn(async () => queueRows.map((r) => ({ ...r }))),
  enqueueInvoice: vi.fn(async (_org: string, file: File) => {
    const row = { id: `q${nextId++}`, attachment_id: `att-${file.name}`, file_name: file.name, status: 'queued', scanned_data: null, error: null, created_at: '', updated_at: new Date().toISOString() };
    queueRows.push(row);
    return { ...row };
  }),
  scanQueuedInvoice: vi.fn(),
  removeFromScanQueue: vi.fn(async (id: string) => { queueRows = queueRows.filter((r) => r.id !== id); }),
  discardQueuedInvoice: vi.fn(async (item: any) => { queueRows = queueRows.filter((r) => r.attachment_id !== item.attachment_id); }),
  getQueuedInvoiceFile: vi.fn(async (item: any) => new File(['x'], item.file_name)),
}));
// Like ai-scan: records the result on the row and returns it.
async function scanLikeTheServer(id: string) {
  const row = queueRows.find((r) => r.id === id);
  Object.assign(row, { status: 'ready', scanned_data: { vendor: `Vendor of ${row.file_name}`, items: [] } });
  return row.scanned_data;
}
vi.mock('../../../services/attachment.service', () => ({ getEntityAttachments: vi.fn(async () => []) }));
vi.mock('../../../services/gig.service', () => ({
  getGigOptionsForOrganization: vi.fn(async () => []),
  getPurchaseIdsWithLedgerEntry: vi.fn(async () => new Set()),
}));
vi.mock('./PurchaseDetailPanel', () => ({ default: () => null }));
// The purchase form: shows how it was opened, and Save / Cancel buttons.
vi.mock('../../ReviewScannedDataDialog', () => ({
  default: ({ layout, open, scannedData, file, attachmentId, cancelLabel, onSuccess, onOpenChange }: any) =>
    layout === 'page' && open ? (
      <div data-testid="purchase-form">
        <span>{scannedData ? `Review ${scannedData.vendor} from ${file?.name ?? '…'} (${attachmentId})` : 'Blank form'}</span>
        <button type="button" onClick={() => onSuccess('p-new')}>Save Purchase</button>
        <button type="button" onClick={() => onOpenChange(false)}>{cancelLabel}</button>
      </div>
    ) : null,
}));

const props = { organization: { id: 'org-1', name: 'Act4Audio' } as any, user: { id: 'u1' } as any };
// A tab's name may be followed by its count ("Scan invoices 3 to review").
const tab = (name: string) => screen.getByRole('tab', { name: new RegExp(`^${name}`) });

async function openAsAdmin() {
  render(<PurchasesSection {...props} userRole="Admin" />);
  await waitFor(() => expect(screen.getByText('Sweetwater')).toBeInTheDocument());
}

describe('Purchases tabs (10-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queueRows = [];
    nextId = 1;
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(scanQueuedInvoice).mockImplementation(scanLikeTheServer);
  });

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

  it('queues several invoices, scans them, and shows the next one as soon as one is saved', async () => {
    const user = userEvent.setup();
    await openAsAdmin();
    await user.click(tab('Scan invoices'));
    const files = ['a.pdf', 'b.pdf', 'c.pdf'].map((n) => new File(['%PDF'], n, { type: 'application/pdf' }));
    await user.upload(screen.getByTestId('scan-invoice-input'), files);

    expect(enqueueInvoice).toHaveBeenCalledTimes(3);
    // The oldest opens for review, with the file already uploaded (no second upload on save).
    expect(await screen.findByText('Review Vendor of a.pdf from a.pdf (att-a.pdf)')).toBeInTheDocument();
    await waitFor(() => expect(scanQueuedInvoice).toHaveBeenCalledTimes(3));
    expect(tab('Scan invoices')).toHaveTextContent('3');

    await user.click(screen.getByRole('button', { name: 'Save Purchase' }));
    expect(removeFromScanQueue).toHaveBeenCalledWith('q1');
    expect(screen.getByText(/Review Vendor of b\.pdf/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save Purchase' }));
    expect(screen.getByText(/Review Vendor of c\.pdf/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save Purchase' }));
    expect(screen.getByRole('button', { name: /add invoices/i })).toBeInTheDocument();
    expect(screen.queryByTestId('purchase-form')).not.toBeInTheDocument();

    await user.click(tab('Report'));
    await waitFor(() => expect(getPurchases).toHaveBeenCalledTimes(2));
  });

  it('scans at most two at a time', async () => {
    const user = userEvent.setup();
    const releases: Array<() => void> = [];
    vi.mocked(scanQueuedInvoice).mockImplementation((id: string) => new Promise((resolve) => {
      releases.push(() => {
        const row = queueRows.find((r) => r.id === id);
        Object.assign(row, { status: 'ready', scanned_data: { vendor: row.file_name, items: [] } });
        resolve(row.scanned_data);
      });
    }));
    await openAsAdmin();
    await user.click(tab('Scan invoices'));
    await user.upload(screen.getByTestId('scan-invoice-input'), ['1.pdf', '2.pdf', '3.pdf'].map((n) => new File(['x'], n)));
    await waitFor(() => expect(scanQueuedInvoice).toHaveBeenCalledTimes(2));
    expect(screen.getByText(/2 scanning · 1 waiting/)).toBeInTheDocument();
    releases[0]();
    await waitFor(() => expect(scanQueuedInvoice).toHaveBeenCalledTimes(3));
  });

  it('keeps unreviewed invoices: they are there, ready, when the page is opened again', async () => {
    queueRows = [{ id: 'q9', attachment_id: 'att-old', file_name: 'old.pdf', status: 'ready', scanned_data: { vendor: 'Sweetwater', items: [] }, error: null, created_at: '', updated_at: '' }];
    const user = userEvent.setup();
    await openAsAdmin();
    expect(listScanQueue).toHaveBeenCalledWith('org-1');
    expect(tab('Scan invoices')).toHaveTextContent('1');
    await user.click(tab('Scan invoices'));
    expect(await screen.findByText('Review Sweetwater from old.pdf (att-old)')).toBeInTheDocument();
    expect(scanQueuedInvoice).not.toHaveBeenCalled();
  });

  it('shows why a scan failed and can retry it', async () => {
    vi.mocked(scanQueuedInvoice).mockImplementationOnce(async (id: string) => {
      Object.assign(queueRows.find((r) => r.id === id), { status: 'failed', error: 'Scan limit reached (60/hour). Try again later.' });
      throw new Error('Scan limit reached (60/hour). Try again later.');
    });
    const user = userEvent.setup();
    await openAsAdmin();
    await user.click(tab('Scan invoices'));
    await user.upload(screen.getByTestId('scan-invoice-input'), new File(['x'], 'r.png', { type: 'image/png' }));
    expect(await screen.findByText(/Failed: Scan limit reached/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/Review Vendor of r\.png/)).toBeInTheDocument();
  });

  it('discarding an invoice deletes it without saving a purchase', async () => {
    const user = userEvent.setup();
    await openAsAdmin();
    await user.click(tab('Scan invoices'));
    await user.upload(screen.getByTestId('scan-invoice-input'), new File(['x'], 'r.png', { type: 'image/png' }));
    await user.click(await screen.findByRole('button', { name: 'Discard' }));
    expect(discardQueuedInvoice).toHaveBeenCalledWith(expect.objectContaining({ attachment_id: 'att-r.png' }));
    expect(screen.queryByTestId('purchase-form')).not.toBeInTheDocument();
    await user.click(tab('Report'));
    expect(getPurchases).toHaveBeenCalledTimes(1);
  });
});
