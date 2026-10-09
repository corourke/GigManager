import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotReturnedSection from './NotReturnedSection';
import { getGigReturns, writeOffPieces, undoWriteOff, markReturned } from '../../services/writeOff.service';
import { getLockedTaxYears } from '../../services/taxYear.service';

vi.mock('../../services/writeOff.service', () => ({
  getGigReturns: vi.fn(), writeOffPieces: vi.fn(), undoWriteOff: vi.fn(), markReturned: vi.fn(),
}));
vi.mock('../../services/taxYear.service', () => ({ getLockedTaxYears: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const rec = (id: string, over: Record<string, unknown> = {}) => ({
  id, manufacturer_model: 'x', tag_number: null, serial_number: null, quantity: 1, status: 'Active', retired_on: null, ...over,
});
const k12 = { record: rec('k12', { manufacturer_model: 'QSC K12.2', tag_number: 'DSL-0101' }), kitId: 'pa', kitName: 'Main PA', quantity: 1, status: 'On Site', location: null };
const cables = { record: rec('cables', { manufacturer_model: 'XLR Cable, 50 ft', quantity: 10 }), kitId: 'foh', kitName: 'FOH', quantity: 4, status: 'Not Returned', location: null };
const gone = { record: rec('gone', { manufacturer_model: 'PD-20', tag_number: 'T-9', status: 'Missing', retired_on: '2026-10-09' }), quantity: 1, note: 'lost at load-out' };
const past = '2026-10-01T23:00:00Z';
const future = '2099-01-01T23:00:00Z';

// #185 (Cameron, 10-09): the gig's "Not returned" list. Admins and Managers can mark pieces
// Returned or Missing, and undo a write-off unless its tax year is locked; Staff only see it.
describe('NotReturnedSection (#185)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getGigReturns).mockResolvedValue({ notReturned: [k12, cables], writtenOff: [gone] } as any);
    vi.mocked(getLockedTaxYears).mockResolvedValue(new Set());
    vi.mocked(writeOffPieces).mockResolvedValue('m');
    vi.mocked(undoWriteOff).mockResolvedValue('gone');
    vi.mocked(markReturned).mockResolvedValue();
  });

  it('after the gig, lists what is still out, kit by kit, and what was written off', async () => {
    render(<NotReturnedSection organizationId="org-1" gigId="gig-1" gigEnd={past} canEdit />);
    const k12Row = (await screen.findByText('QSC K12.2 (#DSL-0101)')).closest('li')!;
    expect(k12Row).toHaveTextContent('Main PA');
    const cableRow = screen.getByText('XLR Cable, 50 ft').closest('li')!;
    expect(cableRow).toHaveTextContent('4 not returned');
    expect(cableRow).toHaveTextContent('FOH');
    const goneRow = screen.getByText('PD-20 (#T-9)').closest('li')!;
    expect(goneRow).toHaveTextContent('1 missing');
    expect(goneRow).toHaveTextContent('lost at load-out');
  });

  it('before the gig ends, only pieces already left behind are listed', async () => {
    render(<NotReturnedSection organizationId="org-1" gigId="gig-1" gigEnd={future} canEdit />);
    expect(await screen.findByText('XLR Cable, 50 ft')).toBeInTheDocument();
    expect(screen.queryByText('QSC K12.2 (#DSL-0101)')).not.toBeInTheDocument();
  });

  it('Returned writes a return for that kit\'s pieces', async () => {
    const ue = userEvent.setup();
    render(<NotReturnedSection organizationId="org-1" gigId="gig-1" gigEnd={past} canEdit />);
    const row = (await screen.findByText('XLR Cable, 50 ft')).closest('li')!;
    await ue.click(within(row).getByRole('button', { name: 'Returned' }));
    expect(markReturned).toHaveBeenCalledWith({ organizationId: 'org-1', gigId: 'gig-1', kitId: 'foh', assetId: 'cables', quantity: 4 });
    await waitFor(() => expect(getGigReturns).toHaveBeenCalledTimes(2));
  });

  it('Mark missing on a lot asks how many; the rest stay out', async () => {
    const ue = userEvent.setup();
    render(<NotReturnedSection organizationId="org-1" gigId="gig-1" gigEnd={past} canEdit />);
    const row = (await screen.findByText('XLR Cable, 50 ft')).closest('li')!;
    await ue.click(within(row).getByRole('button', { name: 'Mark missing' }));
    const count = within(row).getByRole('spinbutton', { name: 'How many are missing' });
    await ue.clear(count);
    await ue.type(count, '1');
    await ue.click(within(row).getByRole('button', { name: 'Write off' }));
    expect(writeOffPieces).toHaveBeenCalledWith({ assetId: 'cables', quantity: 1, gigId: 'gig-1', kitId: 'foh', stillOut: 3 });
  });

  it('after a write-off the row closes its form; the rest of a lot are still listed with their actions', async () => {
    const ue = userEvent.setup();
    render(<NotReturnedSection organizationId="org-1" gigId="gig-1" gigEnd={past} canEdit />);
    const row = () => screen.getByText(/XLR Cable/).closest('li')!;
    await screen.findByText(/XLR Cable/);
    await ue.click(within(row()).getByRole('button', { name: 'Mark missing' }));
    await ue.click(within(row()).getByRole('button', { name: 'Write off' }));
    await waitFor(() => expect(within(row()).queryByRole('button', { name: 'Write off' })).not.toBeInTheDocument());
    expect(within(row()).getByRole('button', { name: 'Mark missing' })).toBeInTheDocument();
  });

  it('Mark missing on a unit writes off that one unit', async () => {
    const ue = userEvent.setup();
    render(<NotReturnedSection organizationId="org-1" gigId="gig-1" gigEnd={past} canEdit />);
    const row = (await screen.findByText('QSC K12.2 (#DSL-0101)')).closest('li')!;
    await ue.click(within(row).getByRole('button', { name: 'Mark missing' }));
    await ue.click(within(row).getByRole('button', { name: 'Write off' }));
    expect(writeOffPieces).toHaveBeenCalledWith({ assetId: 'k12', quantity: 1, gigId: 'gig-1', kitId: 'pa', stillOut: 0 });
  });

  it('Undo brings a write-off back', async () => {
    const ue = userEvent.setup();
    render(<NotReturnedSection organizationId="org-1" gigId="gig-1" gigEnd={past} canEdit />);
    const row = (await screen.findByText('PD-20 (#T-9)')).closest('li')!;
    await ue.click(within(row).getByRole('button', { name: 'Undo' }));
    expect(undoWriteOff).toHaveBeenCalledWith('gone');
  });

  it('Undo is off, with a note, once the write-off\'s tax year is locked', async () => {
    vi.mocked(getLockedTaxYears).mockResolvedValue(new Set([2026]));
    render(<NotReturnedSection organizationId="org-1" gigId="gig-1" gigEnd={past} canEdit />);
    const row = (await screen.findByText('PD-20 (#T-9)')).closest('li')!;
    await waitFor(() => expect(within(row).getByRole('button', { name: 'Undo' })).toBeDisabled());
    expect(row).toHaveTextContent('2026 is locked');
  });

  it('Staff see the list without actions', async () => {
    render(<NotReturnedSection organizationId="org-1" gigId="gig-1" gigEnd={past} canEdit={false} />);
    expect(await screen.findByText('XLR Cable, 50 ft')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Returned' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark missing' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });

  it('shows nothing when everything came back', async () => {
    vi.mocked(getGigReturns).mockResolvedValue({ notReturned: [], writtenOff: [] });
    const { container } = render(<NotReturnedSection organizationId="org-1" gigId="gig-1" gigEnd={past} canEdit />);
    await waitFor(() => expect(getGigReturns).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
