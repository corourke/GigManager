import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
  trackPurchaseLineAsEquipment: vi.fn(async () => 'asset-new'),
}));
vi.mock('../services/taxYear.service', () => ({ getLockedTaxYears: vi.fn(async () => new Set<number>()) }));
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

// #128: CSV-imported lines carry a cost but no printed price. Opening such a
// purchase for edit recomputed every cost from the (missing) price, so saving
// wrote $0 costs and proposed $0 to the linked assets.
describe('ReviewScannedDataDialog editing a cost-only purchase (#128)', () => {
  const costOnly = {
    id: 'h1', vendor: 'IDJ Now', purchase_date: '2025-01-20', total_inv_amount: 131.58, description: 'Light bar, and carry bag',
    items: [
      { id: 'l1', row_type: 'item', description: 'Carry bag', quantity: 1, item_price: null, item_cost: 84.92, asset_id: null },
      { id: 'l2', row_type: 'asset', description: 'T-Bar', quantity: 1, item_price: null, item_cost: 46.66, asset_id: 'a2' },
    ],
    assets: [{ id: 'a2', description: 'T-Bar', quantity: 1, item_price: null, item_cost: 46.66 }],
    attachments: [],
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const svc = await import('../services/purchase.service');
    vi.mocked(svc.getPurchaseWithDetails).mockResolvedValue(costOnly as any);
  });

  const openForEdit = () =>
    render(
      <ReviewScannedDataDialog
        open onOpenChange={vi.fn()} onSuccess={vi.fn()} onUpdated={vi.fn()}
        organizationId="org-1" scannedData={null} file={null} editPurchaseId="h1"
      />,
    );

  it('keeps the stored line costs when saved without changes', async () => {
    const svc = await import('../services/purchase.service');
    openForEdit();
    await userEvent.click(await screen.findByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(svc.updatePurchase).toHaveBeenCalledWith('l2', expect.anything()));

    expect(svc.updatePurchase).toHaveBeenCalledWith('l1', expect.objectContaining({ item_cost: 84.92, line_cost: 84.92 }));
    expect(svc.updatePurchase).toHaveBeenCalledWith('l2', expect.objectContaining({ item_cost: 46.66, line_cost: 46.66 }));
    // the linked asset is compared against its stored cost, not $0
    expect(svc.computeAssetFieldChanges).toHaveBeenCalledWith(expect.objectContaining({ item_cost: 46.66 }), expect.anything());
  });

  it('scales the stored costs, not printed prices, when the invoice total changes', async () => {
    const svc = await import('../services/purchase.service');
    openForEdit();
    const total = await screen.findByDisplayValue('131.58');
    await userEvent.clear(total);
    await userEvent.type(total, '263.16');
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(svc.updatePurchase).toHaveBeenCalledWith('l2', expect.anything()));

    expect(svc.updatePurchase).toHaveBeenCalledWith('l1', expect.objectContaining({ item_cost: expect.closeTo(169.84, 2) }));
    expect(svc.updatePurchase).toHaveBeenCalledWith('l2', expect.objectContaining({ item_cost: expect.closeTo(93.32, 2) }));
  });

  it('shows the stored costs when it opens, with no mismatch against the total', async () => {
    openForEdit();
    expect(await screen.findByText('$84.92')).toBeInTheDocument();
    expect(screen.getByText('$46.66')).toBeInTheDocument();
  });
});


// #133: each line answers two separate questions — track as equipment, and
// expense or depreciate (pre-set from the per-item cost; the $200–$2,500 grey
// zone is the user's call).
describe('ReviewScannedDataDialog: tax treatment and equipment (#133)', () => {
  const threeLines = {
    vendor: 'Sweetwater', purchase_date: '2026-07-05', total_inv_amount: 3289,
    items: [
      { description: 'Cable', quantity: 1, item_price: 50, item_cost: 50, is_asset: false },
      { description: 'Console', quantity: 1, item_price: 3000, item_cost: 3000, is_asset: true },
      { description: 'Moving head', quantity: 1, item_price: 239, item_cost: 239, is_asset: true },
    ],
  };
  const tax = (desc: string) => within(screen.getByRole('group', { name: `Tax treatment: ${desc}` }));
  const pressed = (desc: string, label: string) => tax(desc).getByRole('button', { name: label }).getAttribute('aria-pressed');

  beforeEach(() => vi.clearAllMocks());

  const openNew = (data: any = threeLines) =>
    render(<ReviewScannedDataDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} organizationId="org-1" scannedData={data} file={null} />);

  it('pre-sets expense under $200 and depreciate over $2,500, and leaves the grey zone open', async () => {
    openNew();
    await screen.findByRole('group', { name: 'Tax treatment: Cable' });
    expect(pressed('Cable', 'Expense')).toBe('true');
    expect(pressed('Console', 'Depreciate')).toBe('true');
    expect(pressed('Moving head', 'Expense')).toBe('false');
    expect(pressed('Moving head', 'Depreciate')).toBe('false');
  });

  it('won\'t save until every grey-zone line has a treatment, then saves each line\'s choice', async () => {
    openNew();
    const save = await screen.findByRole('button', { name: 'Save Purchase' });
    expect(save).toBeDisabled();
    expect(screen.getByText(/Choose Expense or Depreciate for 1 item/)).toBeInTheDocument();

    await userEvent.click(tax('Moving head').getByRole('button', { name: 'Expense' }));
    expect(save).toBeEnabled();
    await userEvent.click(save);
    await waitFor(() => expect(createPurchaseTransaction).toHaveBeenCalled());

    const [, items, assets] = vi.mocked(createPurchaseTransaction).mock.calls[0];
    expect(items!.map((i: any) => i.tax_treatment)).toEqual(['expense', 'depreciate', 'expense']);
    // tracked as equipment is separate: the expensed moving head is still equipment
    expect(items!.map((i: any) => i.row_type)).toEqual(['item', 'asset', 'asset']);
    expect(assets).toHaveLength(2);
  });

  it('a depreciated line is always tracked as equipment', async () => {
    openNew({ ...threeLines, total_inv_amount: 400, items: [{ description: 'Amp', quantity: 1, item_price: 400, item_cost: 400, is_asset: false }] });
    const track = await screen.findByRole('checkbox', { name: 'Track Amp as equipment' });
    expect(track).not.toBeChecked();
    await userEvent.click(tax('Amp').getByRole('button', { name: 'Depreciate' }));
    expect(track).toBeChecked();
    expect(track).toBeDisabled();
  });

  it('explains the choice behind the (?)', async () => {
    openNew();
    await userEvent.click((await screen.findAllByRole('button', { name: 'About expense or depreciate' }))[0]);
    expect(await screen.findByText(/From \$200 to \$2500 is a grey zone/)).toBeInTheDocument();
  });
});

describe('ReviewScannedDataDialog: editing tax treatment and equipment (#133)', () => {
  const purchase = (date: string) => ({
    id: 'h1', vendor: 'Sweetwater', purchase_date: date, total_inv_amount: 400, description: 'Stands',
    items: [{ id: 'l1', row_type: 'item', tax_treatment: 'expense', description: 'Stand', quantity: 1, item_price: 400, item_cost: 400, asset_id: null }],
    assets: [], attachments: [],
  });
  const tax = () => within(screen.getByRole('group', { name: 'Tax treatment: Stand' }));

  beforeEach(() => vi.clearAllMocks());

  const openEdit = async (date: string, opts: { locked?: number[]; ledger?: boolean } = {}) => {
    const svc = await import('../services/purchase.service');
    vi.mocked(svc.getPurchaseWithDetails).mockResolvedValue({ ...purchase(date), gig_id: opts.ledger ? 'g1' : null, items: purchase(date).items.map(i => ({ ...i, gig_id: opts.ledger ? 'g1' : null })) } as any);
    const gigs = await import('../services/gig.service');
    vi.mocked(gigs.getGigFinancials).mockResolvedValue(opts.ledger ? [{ id: 'f1', purchase_id: 'l1', amount: 400 }] as any : []);
    const years = await import('../services/taxYear.service');
    vi.mocked(years.getLockedTaxYears).mockResolvedValue(new Set(opts.locked ?? []));
    render(<ReviewScannedDataDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} onUpdated={vi.fn()} organizationId="org-1" scannedData={null} file={null} editPurchaseId="h1" />);
    await screen.findByRole('group', { name: 'Tax treatment: Stand' });
    return svc;
  };

  it('tracks an expensed line as equipment and then depreciates it, in that order', async () => {
    const svc = await openEdit('2026-03-01');
    expect(tax().getByRole('button', { name: 'Expense' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(tax().getByRole('button', { name: 'Depreciate' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(svc.updatePurchase).toHaveBeenCalledWith('l1', expect.objectContaining({ tax_treatment: 'depreciate' })));
    expect(svc.trackPurchaseLineAsEquipment).toHaveBeenCalledWith('l1');
    const trackOrder = vi.mocked(svc.trackPurchaseLineAsEquipment).mock.invocationCallOrder[0];
    const lineUpdate = vi.mocked(svc.updatePurchase).mock.calls.findIndex(c => c[0] === 'l1');
    expect(trackOrder).toBeLessThan(vi.mocked(svc.updatePurchase).mock.invocationCallOrder[lineUpdate]);
  });

  it('can track an expensed line as equipment without changing its treatment', async () => {
    const svc = await openEdit('2026-03-01');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Track Stand as equipment' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(svc.trackPurchaseLineAsEquipment).toHaveBeenCalledWith('l1'));
    expect(svc.updatePurchase).toHaveBeenCalledWith('l1', expect.objectContaining({ tax_treatment: 'expense' }));
  });

  it('won\'t depreciate a line that is a gig expense', async () => {
    await openEdit('2026-03-01', { ledger: true });
    expect(tax().getByRole('button', { name: 'Depreciate' })).toBeDisabled();
  });

  it('a purchase in a filed year only lets descriptions change, and equipment be tracked', async () => {
    const svc = await openEdit('2025-02-14', { locked: [2025] });
    expect(screen.getByText(/2025 tax year is filed/)).toBeInTheDocument();
    expect(tax().getByRole('button', { name: 'Depreciate' })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Track Stand as equipment' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(svc.trackPurchaseLineAsEquipment).toHaveBeenCalledWith('l1'));
    expect(svc.updatePurchase).toHaveBeenCalledWith('l1', { description: 'Stand' });
    expect(svc.updatePurchase).toHaveBeenCalledWith('h1', expect.not.objectContaining({ total_inv_amount: expect.anything() }));
  });
});
