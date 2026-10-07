import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
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
  createLedgerEntryForPurchaseLine: vi.fn(async () => ({ created: true, financial: {} })),
}));
vi.mock('../services/taxYear.service', () => ({ getLockedTaxYears: vi.fn(async () => new Set<number>()) }));
vi.mock('../services/gig.service', () => ({ createGigFinancial: vi.fn(), getGigFinancials: vi.fn(async () => []), updateGigFinancial: vi.fn() }));
vi.mock('../services/attachment.service', () => ({
  uploadAttachment: vi.fn(async () => ({ id: 'att-uploaded' })),
  linkAttachmentToEntity: vi.fn(async () => ({})),
  getAttachmentUrl: vi.fn(),
}));
vi.mock('../services/asset.service', () => ({ updateAsset: vi.fn() }));
vi.mock('../services/kit.service', () => ({
  getKitOptions: vi.fn(async () => [{ id: 'k1', name: 'Power Box' }, { id: 'k2', name: 'Lighting Rack' }]),
  addAssetToKits: vi.fn(async () => {}),
}));
vi.mock('../services/purchaseCategory.service', () => ({
  getTypeUsage: vi.fn(async () => [{ type: 'Cable, XLR', count: 7 }]),
  getExpenseCategories: vi.fn(async () => ['Small audio parts', 'Small lighting parts', 'Supplies', 'Software subscriptions'].map(name => ({ name, schedule_c_line: '27b' }))),
  getEquipmentCategories: vi.fn(async () => ['Audio', 'Lighting', 'Misc']),
  // Audio and Lighting imply 7 years; Misc has no default, so it is asked (#125).
  getEquipmentCategoryPeriods: vi.fn(async () => ({ audio: 7, lighting: 7, misc: null })),
}));

// The Equipment details pop-up, opened from a line's chip.
const chip = (desc: string) => screen.getByRole('button', { name: `Equipment details: ${desc}` });
async function setEquipment(desc: string, fields: { category?: string; newCategory?: string; type?: string; kit?: string; period?: string }) {
  await userEvent.click(chip(desc));
  const dialog = within(await screen.findByRole('dialog'));
  if (fields.category) await userEvent.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), fields.category);
  if (fields.newCategory) {
    await userEvent.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Add new category…');
    await userEvent.type(dialog.getByRole('textbox', { name: 'Category' }), fields.newCategory);
  }
  if (fields.type) await userEvent.type(dialog.getByRole('combobox', { name: 'Type' }), fields.type);
  if (fields.kit) {
    await userEvent.type(dialog.getByRole('textbox', { name: 'Search kits' }), fields.kit);
    await userEvent.click(await dialog.findByRole('option', { name: fields.kit }));
  }
  if (fields.period) await userEvent.selectOptions(dialog.getByRole('combobox', { name: 'Recovery period' }), fields.period);
  await userEvent.click(dialog.getByRole('button', { name: 'Done' }));
}

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
      { description: 'Console', quantity: 1, item_price: 3000, item_cost: 3000, is_asset: true, category: 'Audio' },
      { description: 'Moving head', quantity: 1, item_price: 239, item_cost: 239, is_asset: true, category: 'Lighting' },
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
    // tracked as equipment is separate: the expensed moving head is still equipment.
    // Lines are one type (10-07); `track` asks for the equipment record.
    expect(items!.map((i: any) => i.track)).toEqual([false, true, true]);
    expect(items!.map((i: any) => i.row_type)).toEqual(['line', 'line', 'line']);
    expect(assets).toHaveLength(2);
  });

  it('a depreciated line is always tracked as equipment', async () => {
    openNew({ ...threeLines, total_inv_amount: 400, items: [{ description: 'Amp', quantity: 1, item_price: 400, item_cost: 400, is_asset: false }] });
    const track = await screen.findByRole('switch', { name: 'Track Amp as equipment' });
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
    items: [{ id: 'l1', row_type: 'item', tax_treatment: 'expense', description: 'Stand', quantity: 1, item_price: 400, item_cost: 400, asset_id: null, category: 'Audio' }],
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

  it('a line tracked and depreciated while editing gets its category\'s recovery period once depreciated (#125)', async () => {
    const svc = await openEdit('2026-03-01');
    const assets = await import('../services/asset.service');
    await userEvent.click(tax().getByRole('button', { name: 'Depreciate' }));
    expect(chip('Stand')).toHaveTextContent('7-year');
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(assets.updateAsset).toHaveBeenCalledWith('asset-new', { recovery_period: 7 }));
    const depreciate = vi.mocked(svc.updatePurchase).mock.calls.findIndex(c => c[0] === 'l1');
    const period = vi.mocked(assets.updateAsset).mock.calls.findIndex(c => c[1]?.recovery_period === 7);
    expect(vi.mocked(svc.updatePurchase).mock.invocationCallOrder[depreciate])
      .toBeLessThan(vi.mocked(assets.updateAsset).mock.invocationCallOrder[period]);
  });

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

  it('can track an expensed line as equipment without changing its treatment, giving the equipment its own category', async () => {
    const svc = await openEdit('2026-03-01');
    const assets = await import('../services/asset.service');
    await userEvent.click(screen.getByRole('switch', { name: 'Track Stand as equipment' }));
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    expect(screen.getByText(/Choose an equipment category for 1 item/)).toBeInTheDocument();
    await setEquipment('Stand', { category: 'Lighting', type: 'Stand, Lighting', kit: 'Lighting Rack' });
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(svc.trackPurchaseLineAsEquipment).toHaveBeenCalledWith('l1'));
    expect(assets.updateAsset).toHaveBeenCalledWith('asset-new', { category: 'Lighting', type: 'Stand, Lighting', replacement_value: 400 });
    const kits = await import('../services/kit.service');
    expect(kits.addAssetToKits).toHaveBeenCalledWith('asset-new', ['k2'], 1);
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
    expect(screen.getByRole('combobox', { name: 'Expense category: Stand' })).toBeDisabled();
    await userEvent.click(screen.getByRole('switch', { name: 'Track Stand as equipment' }));
    // the equipment category isn't a tax field, so it can still be chosen
    await setEquipment('Stand', { category: 'Audio' });
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(svc.trackPurchaseLineAsEquipment).toHaveBeenCalledWith('l1'));
    expect(svc.updatePurchase).toHaveBeenCalledWith('l1', { description: 'Stand' });
    expect(svc.updatePurchase).toHaveBeenCalledWith('h1', expect.not.objectContaining({ total_inv_amount: expect.anything() }));
  });
});

describe('ReviewScannedDataDialog: categories (10-06)', () => {
  const invoice = {
    vendor: 'Sweetwater', purchase_date: '2026-07-05', total_inv_amount: 3050,
    items: [
      { description: 'Cable', quantity: 1, item_price: 50, item_cost: 50, is_asset: false, category: 'Audio' },
      { description: 'Console', quantity: 1, item_price: 3000, item_cost: 3000, is_asset: true, category: 'Audio' },
    ],
  };
  const select = (name: string) => screen.getByRole('combobox', { name }) as HTMLSelectElement;

  beforeEach(() => vi.clearAllMocks());
  const openNew = async (data: any = invoice) => {
    render(<ReviewScannedDataDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} organizationId="org-1" scannedData={data} file={null} />);
    // the lists have loaded
    const cats = await import('../services/purchaseCategory.service');
    await waitFor(() => expect(cats.getEquipmentCategories).toHaveBeenCalled());
    await screen.findAllByRole('group', { name: /^Tax treatment/ });
  };

  it('an expensed line picks from the expense categories, with the scanned category mapped to its heading', async () => {
    await openNew();
    expect(select('Expense category: Cable').value).toBe('Small audio parts');
    expect(screen.queryByRole('button', { name: 'Equipment details: Cable' })).not.toBeInTheDocument();
  });

  it('a depreciated line has one category: its equipment category', async () => {
    await openNew();
    expect(chip('Console')).toHaveTextContent('Audio');
    expect(screen.queryByRole('combobox', { name: 'Expense category: Console' })).not.toBeInTheDocument();
  });

  it('the equipment switch is labelled and, when on, asks for an equipment category too', async () => {
    await openNew();
    const sw = screen.getByRole('switch', { name: 'Track Cable as equipment' });
    expect(sw).toHaveTextContent('Equipment');
    expect(sw).not.toBeChecked();
    await userEvent.click(sw);
    expect(sw).toBeChecked();
    expect(chip('Cable')).toHaveTextContent('Audio');
    expect(select('Expense category: Cable').value).toBe('Small audio parts');
  });

  it('saves the expense category on the line and the equipment category on its asset', async () => {
    await openNew();
    await userEvent.click(screen.getByRole('switch', { name: 'Track Cable as equipment' }));
    await setEquipment('Cable', { category: 'Misc' });
    await userEvent.selectOptions(select('Expense category: Cable'), 'Supplies');
    await userEvent.click(screen.getByRole('button', { name: 'Save Purchase' }));
    await waitFor(() => expect(createPurchaseTransaction).toHaveBeenCalled());
    const [, items, assets] = vi.mocked(createPurchaseTransaction).mock.calls[0];
    expect(items!.map((i: any) => i.category)).toEqual(['Supplies', 'Audio']);
    expect(assets!.map((a: any) => a.category)).toEqual(['Misc', 'Audio']);
  });

  it('switching to Depreciate moves the equipment category onto the line, and back', async () => {
    await openNew({ ...invoice, total_inv_amount: 450, items: [{ description: 'Amp', quantity: 1, item_price: 450, item_cost: 450, is_asset: true, category: 'Audio' }] });
    const tax = within(screen.getByRole('group', { name: 'Tax treatment: Amp' }));
    await userEvent.click(tax.getByRole('button', { name: 'Depreciate' }));
    expect(chip('Amp')).toHaveTextContent('Audio');
    await userEvent.click(tax.getByRole('button', { name: 'Expense' }));
    expect(select('Expense category: Amp').value).toBe('Small audio parts');
    expect(chip('Amp')).toHaveTextContent('Audio');
  });

  describe('recovery period (#125)', () => {
    it('a depreciated line takes its category\'s period and saves it on the equipment', async () => {
      await openNew();
      expect(chip('Console')).toHaveTextContent('7-year');
      expect(chip('Console')).not.toHaveTextContent('Choose a recovery period');
      await userEvent.click(screen.getByRole('button', { name: 'Save Purchase' }));
      await waitFor(() => expect(createPurchaseTransaction).toHaveBeenCalled());
      const [, , assets] = vi.mocked(createPurchaseTransaction).mock.calls[0];
      expect(assets![0].recovery_period).toBe(7);
    });

    it('asks when the category has no default, and won\'t save until it is answered', async () => {
      await openNew({ ...invoice, total_inv_amount: 3000, items: [{ description: 'Hazer', quantity: 1, item_price: 3000, item_cost: 3000, is_asset: true, category: 'Misc' }] });
      expect(chip('Hazer')).toHaveTextContent('Choose a recovery period');
      expect(screen.getByText(/Choose a recovery period for 1 depreciated item/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save Purchase' })).toBeDisabled();
      await setEquipment('Hazer', { period: '5' });
      expect(chip('Hazer')).toHaveTextContent('5-year');
      await userEvent.click(screen.getByRole('button', { name: 'Save Purchase' }));
      await waitFor(() => expect(createPurchaseTransaction).toHaveBeenCalled());
      const [, , assets] = vi.mocked(createPurchaseTransaction).mock.calls[0];
      expect(assets![0].recovery_period).toBe(5);
    });

    it('an expensed line has none', async () => {
      await openNew();
      await userEvent.click(screen.getByRole('switch', { name: 'Track Cable as equipment' }));
      expect(chip('Cable')).not.toHaveTextContent('-year');
      await userEvent.click(screen.getByRole('button', { name: 'Save Purchase' }));
      await waitFor(() => expect(createPurchaseTransaction).toHaveBeenCalled());
      const [, , assets] = vi.mocked(createPurchaseTransaction).mock.calls[0];
      expect(assets![0].recovery_period).toBeUndefined();
    });
  });

  it('can add a new equipment category', async () => {
    await openNew({ ...invoice, total_inv_amount: 3000, items: [{ description: 'Switcher', quantity: 1, item_price: 3000, item_cost: 3000, is_asset: true }] });
    expect(chip('Switcher')).toHaveTextContent('Choose an equipment category');
    await setEquipment('Switcher', { newCategory: 'Video', period: '7' });
    expect(chip('Switcher')).toHaveTextContent('Video');
    await userEvent.click(screen.getByRole('button', { name: 'Save Purchase' }));
    await waitFor(() => expect(createPurchaseTransaction).toHaveBeenCalled());
    const [, items, assets] = vi.mocked(createPurchaseTransaction).mock.calls[0];
    expect(items![0].category).toBe('Video');
    expect(assets![0].category).toBe('Video');
  });

  it('keeps a saved category that is not on the list', async () => {
    const svc = await import('../services/purchase.service');
    vi.mocked(svc.getPurchaseWithDetails).mockResolvedValue({
      id: 'h1', vendor: 'V', purchase_date: '2026-03-01', total_inv_amount: 20, description: '',
      items: [{ id: 'l1', row_type: 'item', tax_treatment: 'expense', description: 'Pens', quantity: 1, item_price: 20, item_cost: 20, asset_id: null, category: 'Office' }],
      assets: [], attachments: [],
    } as any);
    render(<ReviewScannedDataDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} onUpdated={vi.fn()} organizationId="org-1" scannedData={null} file={null} editPurchaseId="h1" />);
    await screen.findByRole('option', { name: 'Supplies' });
    expect(select('Expense category: Pens').value).toBe('Office');
    expect(screen.getByRole('option', { name: 'Office (not on the list)' })).toBeInTheDocument();
  });

  it('a line added while editing is written as row_type line (10-07)', async () => {
    const svc = await import('../services/purchase.service');
    vi.mocked(svc.getPurchaseWithDetails).mockResolvedValue({
      id: 'h1', vendor: 'V', purchase_date: '2026-03-01', total_inv_amount: 20, description: '',
      items: [{ id: 'l1', row_type: 'line', tax_treatment: 'expense', description: 'Pens', quantity: 1, item_price: 20, item_cost: 20, asset_id: null, category: 'Supplies' }],
      assets: [], attachments: [],
    } as any);
    vi.mocked(svc.createPurchase).mockResolvedValue({ id: 'l2' } as any);
    render(<ReviewScannedDataDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} onUpdated={vi.fn()} organizationId="org-1" scannedData={null} file={null} editPurchaseId="h1" />);
    await screen.findByRole('option', { name: 'Supplies' });
    await userEvent.click(screen.getByRole('button', { name: /Add Item/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(svc.createPurchase).toHaveBeenCalled());
    expect(vi.mocked(svc.createPurchase).mock.calls[0][0]).toEqual(expect.objectContaining({ row_type: 'line' }));
  });

  it('an existing expensed line already tracked shows its equipment\'s category', async () => {
    const svc = await import('../services/purchase.service');
    vi.mocked(svc.getPurchaseWithDetails).mockResolvedValue({
      id: 'h1', vendor: 'V', purchase_date: '2026-03-01', total_inv_amount: 20, description: '',
      items: [{ id: 'l1', row_type: 'asset', tax_treatment: 'expense', description: 'Clamp', quantity: 1, item_price: 20, item_cost: 20, asset_id: 'a1', category: 'Small lighting parts' }],
      assets: [{ id: 'a1', category: 'Lighting', item_cost: 20, quantity: 1 }], attachments: [],
    } as any);
    render(<ReviewScannedDataDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} onUpdated={vi.fn()} organizationId="org-1" scannedData={null} file={null} editPurchaseId="h1" />);
    await screen.findByRole('option', { name: 'Supplies' });
    expect(select('Expense category: Clamp').value).toBe('Small lighting parts');
    expect(chip('Clamp')).toHaveTextContent('Lighting');
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(svc.computeAssetFieldChanges).toHaveBeenCalled());
    expect(svc.computeAssetFieldChanges).toHaveBeenCalledWith(expect.objectContaining({ category: 'Lighting' }), expect.anything());
  });
});

// #130 / #133 step 3: a receipt scanned on a gig links its expensed lines to the gig,
// one money-out row each. The purchase itself, and depreciated equipment, are not the gig's.
describe('ReviewScannedDataDialog: Upload Receipt on a gig (#130)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('links each expensed line to the gig, never the purchase or depreciated equipment', async () => {
    const svc = await import('../services/purchase.service');
    const gigs = await import('../services/gig.service');
    const lines = [
      { id: 'l-tape', row_type: 'item', tax_treatment: 'expense', description: 'Tape', line_cost: 50 },
      { id: 'l-console', row_type: 'asset', tax_treatment: 'depreciate', description: 'Console', line_cost: 3000 },
    ];
    vi.mocked(svc.getPurchaseWithDetails).mockResolvedValue({ id: 'p-new', items: lines } as any);
    render(
      <ReviewScannedDataDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} organizationId="org-1" gigId="g1" file={null}
        scannedData={{ vendor: 'Sweetwater', purchase_date: '2026-07-05', total_inv_amount: 3050, items: [
          { description: 'Tape', quantity: 1, item_price: 50, item_cost: 50, is_asset: false, category: 'Supplies' },
          { description: 'Console', quantity: 1, item_price: 3000, item_cost: 3000, is_asset: true, category: 'Audio' },
        ] } as any} />,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Save Purchase' }));
    await waitFor(() => expect(svc.createLedgerEntryForPurchaseLine).toHaveBeenCalled());

    const [header] = vi.mocked(createPurchaseTransaction).mock.calls[0];
    expect(header).not.toHaveProperty('gig_id');
    expect(svc.updatePurchase).toHaveBeenCalledTimes(1);
    expect(svc.updatePurchase).toHaveBeenCalledWith('l-tape', { gig_id: 'g1' });
    expect(svc.createLedgerEntryForPurchaseLine).toHaveBeenCalledTimes(1);
    expect(svc.createLedgerEntryForPurchaseLine).toHaveBeenCalledWith(expect.objectContaining({ id: 'l-tape' }), 'g1', 'org-1');
    expect(gigs.createGigFinancial).not.toHaveBeenCalled();
  });
});

describe('ReviewScannedDataDialog: equipment details pop-up (10-06)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('new equipment saves its Type and kits, and the chip shows them', async () => {
    render(<ReviewScannedDataDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} organizationId="org-1" file={null}
      scannedData={{ vendor: 'Amazon', purchase_date: '2026-06-14', total_inv_amount: 27.31, items: [
        { description: 'PowerCON breakout box', quantity: 1, item_price: 69.99, item_cost: 27.31, is_asset: true, category: 'Power' },
      ] } as any} />);
    await setEquipment('PowerCON breakout box', { type: 'Distribution, PowerCon Breakout', kit: 'Power Box' });
    expect(chip('PowerCON breakout box')).toHaveTextContent('Power › Distribution, PowerCon Breakout');
    expect(chip('PowerCON breakout box')).toHaveTextContent('Power Box');
    await userEvent.click(screen.getByRole('button', { name: 'Save Purchase' }));
    await waitFor(() => expect(createPurchaseTransaction).toHaveBeenCalled());
    const [, , assets] = vi.mocked(createPurchaseTransaction).mock.calls[0];
    expect(assets![0]).toEqual(expect.objectContaining({ category: 'Power', type: 'Distribution, PowerCon Breakout', kit_ids: ['k1'] }));
    expect(assets![0]).not.toHaveProperty('equipment_type');
  });

  // 10-07 (Cameron): the switch sat before the expense dropdown and the chip
  // after it, so the two halves of one control were split apart.
  it('the Equipment switch sits after the expense category, joined to its details', async () => {
    render(<ReviewScannedDataDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} organizationId="org-1" file={null}
      scannedData={{ vendor: 'Amazon', purchase_date: '2026-06-14', total_inv_amount: 100, items: [
        { description: 'Wireless DMX', quantity: 1, item_price: 100, item_cost: 100, is_asset: true, category: 'Lighting' },
        { description: 'Wall station', quantity: 1, item_price: 0, item_cost: 0, is_asset: false },
      ] } as any} />);
    const expense = screen.getByRole('combobox', { name: 'Expense category: Wireless DMX' });
    const toggle = screen.getByRole('switch', { name: 'Track Wireless DMX as equipment' });
    const details = chip('Wireless DMX');
    expect(expense.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // One control: the switch and its details share a group, and the details name the category.
    const group = screen.getByRole('group', { name: 'Equipment: Wireless DMX' });
    expect(group).toContainElement(toggle);
    expect(group).toContainElement(details);
    expect(within(group).queryByText('Equipment')).toBeNull();
    expect(details).toHaveTextContent('Lighting');
    // Off: the switch shows the plain label and there are no details to open.
    const offGroup = screen.getByRole('group', { name: 'Equipment: Wall station' });
    expect(within(offGroup).getByText('Equipment')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Equipment details: Wall station' })).toBeNull();
    // Turned on without a category, the details ask for one.
    await userEvent.click(screen.getByRole('switch', { name: 'Track Wall station as equipment' }));
    expect(chip('Wall station')).toHaveTextContent('Choose an equipment category');
  });

  it('editing an existing record\'s type proposes the change, and its kits stay on its own page', async () => {
    const svc = await import('../services/purchase.service');
    vi.mocked(svc.getPurchaseWithDetails).mockResolvedValue({
      id: 'h1', vendor: 'V', purchase_date: '2026-03-01', total_inv_amount: 20, description: '',
      items: [{ id: 'l1', row_type: 'asset', tax_treatment: 'expense', description: 'Clamp', quantity: 1, item_price: 20, item_cost: 20, asset_id: 'a1', category: 'Small lighting parts' }],
      assets: [{ id: 'a1', category: 'Lighting', type: 'Clamp', item_cost: 20, quantity: 1 }], attachments: [],
    } as any);
    render(<ReviewScannedDataDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} onUpdated={vi.fn()} organizationId="org-1" scannedData={null} file={null} editPurchaseId="h1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Equipment details: Clamp' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText(/Manage its kits on the equipment page/)).toBeInTheDocument();
    const type = dialog.getByRole('combobox', { name: 'Type' });
    await userEvent.clear(type);
    await userEvent.type(type, 'Clamp, Truss');
    await userEvent.click(dialog.getByRole('button', { name: 'Done' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(await screen.findByText('Confirm linked record updates')).toBeInTheDocument();
    expect(screen.getByText('Clamp, Truss')).toBeInTheDocument();
  });
});

// #131 (Cameron's answers, 10-07)
describe('ReviewScannedDataDialog: purchase data fixes (#131)', () => {
  beforeEach(() => vi.clearAllMocks());

  const editing = async (over: Record<string, any> = {}) => {
    const svc = await import('../services/purchase.service');
    vi.mocked(svc.getPurchaseWithDetails).mockResolvedValue({
      id: 'h1', vendor: 'V', purchase_date: '2026-03-01', total_inv_amount: 21.6, description: '',
      items: [{ id: 'l1', row_type: 'line', tax_treatment: 'expense', description: 'Tape', quantity: 1, item_price: 20, item_cost: 21.6,
                line_cost: 21.6, asset_id: null, category: 'Supplies', purchase_date: '2026-03-01', gig_id: over.gig_id ?? null }],
      assets: [], attachments: [],
    } as any);
    render(<ReviewScannedDataDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} onUpdated={vi.fn()} organizationId="org-1" scannedData={null} file={null} editPurchaseId="h1" />);
    await screen.findByRole('option', { name: 'Supplies' });
    return svc;
  };

  it('changing the purchase date moves its lines to the new date', async () => {
    const svc = await editing();
    fireEvent.change(screen.getByDisplayValue('2026-03-01'), { target: { value: '2026-03-05' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(svc.updatePurchase).toHaveBeenCalledWith('l1', expect.anything()));
    expect(svc.updatePurchase).toHaveBeenCalledWith('l1', expect.objectContaining({ purchase_date: '2026-03-05' }));
  });

  it('a line\'s gig expense follows the line cost, amount and settled amount', async () => {
    const gigs = await import('../services/gig.service');
    vi.mocked(gigs.getGigFinancials).mockResolvedValueOnce([
      { id: 'f1', purchase_id: 'l1', amount: 20, amount_settled: 20, stage: 'paid' },
    ] as any);
    await editing({ gig_id: 'g1' });
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await userEvent.click(await screen.findByRole('button', { name: /Confirm & Save/ }));
    await waitFor(() => expect(gigs.updateGigFinancial).toHaveBeenCalled());
    expect(gigs.updateGigFinancial).toHaveBeenCalledWith('f1', { amount: 21.6, amount_settled: 21.6 });
  });

  it('new equipment keeps the scanned manufacturer and model, or falls back to the description', async () => {
    render(<ReviewScannedDataDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} organizationId="org-1" file={null}
      scannedData={{ vendor: 'Sweetwater', purchase_date: '2026-06-14', total_inv_amount: 200, items: [
        { description: 'Shure SM58 vocal mic with clip and bag', manufacturer_model: 'Shure SM58', quantity: 1, item_price: 100, item_cost: 100, is_asset: true, category: 'Audio' },
        { description: 'XLR cable 25ft', quantity: 1, item_price: 100, item_cost: 100, is_asset: true, category: 'Audio' },
      ] } as any} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Save Purchase' }));
    await waitFor(() => expect(createPurchaseTransaction).toHaveBeenCalled());
    const [, , assets] = vi.mocked(createPurchaseTransaction).mock.calls[0];
    expect(assets!.map((a: any) => a.manufacturer_model)).toEqual(['Shure SM58', 'XLR cable 25ft']);
    expect(assets![0].description).toBe('Shure SM58 vocal mic with clip and bag');
  });
});
