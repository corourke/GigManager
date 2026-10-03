import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewScannedDataDialog from './ReviewScannedDataDialog';
import { createPurchaseTransaction } from '../services/purchase.service';
import { linkAttachmentToEntity, uploadAttachment } from '../services/attachment.service';

vi.mock('../services/purchase.service', () => ({
  createPurchaseTransaction: vi.fn(async () => ({ id: 'p-new' })),
  getPurchaseWithDetails: vi.fn(),
  updatePurchase: vi.fn(),
  createPurchase: vi.fn(),
  deletePurchase: vi.fn(),
  computeAssetFieldChanges: vi.fn(() => []),
}));
vi.mock('../services/gig.service', () => ({ createGigFinancial: vi.fn(), getGigFinancials: vi.fn(async () => []), updateGigFinancial: vi.fn() }));
vi.mock('../services/attachment.service', () => ({
  uploadAttachment: vi.fn(async () => ({ id: 'att-uploaded' })),
  linkAttachmentToEntity: vi.fn(async () => ({})),
  getAttachmentUrl: vi.fn(),
}));
vi.mock('../services/asset.service', () => ({ updateAsset: vi.fn() }));

const scanned = {
  vendor: 'Amazon',
  purchase_date: '2026-07-05',
  total_inv_amount: 25,
  items: [{ description: 'Gaffer tape', quantity: 1, item_price: 25, item_cost: 25, category: 'Supplies', is_asset: false }],
};

describe('ReviewScannedDataDialog in a page (Scan invoices, 10-02)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saving a queued invoice links its file and reports success, without "cancelling" (which discards the invoice)', async () => {
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();
    render(
      <ReviewScannedDataDialog
        layout="page" open cancelLabel="Discard"
        onOpenChange={onOpenChange} onSuccess={onSuccess}
        organizationId="org-1" scannedData={scanned as any} file={null} attachmentId="att-queued"
      />,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Save Purchase' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('p-new'));
    expect(createPurchaseTransaction).toHaveBeenCalled();
    expect(linkAttachmentToEntity).toHaveBeenCalledWith('att-queued', 'purchase', 'p-new');
    expect(uploadAttachment).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('still closes as a dialog after saving', async () => {
    const onOpenChange = vi.fn();
    render(
      <ReviewScannedDataDialog
        open onOpenChange={onOpenChange} onSuccess={vi.fn()}
        organizationId="org-1" scannedData={scanned as any} file={null}
      />,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Save Purchase' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
