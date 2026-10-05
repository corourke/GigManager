import type { ReactElement } from 'react';
import { render as rtlRender, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GigFinancialsSection from './GigFinancialsSection';
import * as gigService from '../../services/gig.service';

// The component uses TanStack Query, so renders need a QueryClientProvider.
function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

vi.mock('../../services/gig.service', () => ({
  getGigFinancials: vi.fn(),
  createGigFinancial: vi.fn(),
  updateGigFinancial: vi.fn(),
  recordGigFinancialPayment: vi.fn(),
  deleteGigFinancial: vi.fn(),
  getGigProfitabilitySummary: vi.fn(),
}));

// Echo back the entityId the attachments manager was mounted with.
vi.mock('../AttachmentManager', () => ({
  default: ({ entityType, entityId }: { entityType: string; entityId: string }) => (
    <div data-testid="attachment-manager" data-entity-type={entityType} data-entity-id={entityId} />
  ),
}));

vi.mock('../OrganizationSelector', () => ({ default: () => <div data-testid="org-selector" /> }));

const base = {
  gig_id: 'test-gig-id',
  organization_id: 'test-org-id',
  currency: 'USD',
  due_date: null,
  paid_at: null,
  amount_settled: null,
  category: null,
  counterparty_id: null,
  external_entity_name: null,
  reference_number: null,
  notes: null,
  purchase_id: null,
  staff_assignment_id: null,
  created_at: '2026-07-22T00:00:00Z',
  attachment_count: 0,
};

// St. Raymond Festival after conversion: the fee is accepted and unpaid, the
// costs are paid.
const stRaymond = [
  { ...base, id: 'fee', direction: 'in', stage: 'accepted', amount: 1000, date: '2026-07-22', description: 'Performance fee' },
  {
    ...base, id: 'hand', direction: 'out', stage: 'paid', amount: 200, amount_settled: 200, date: '2026-10-04',
    paid_at: '2026-10-03T00:00:00Z', description: 'Labor: Stage Hand', category: 'Contract labor', staff_assignment_id: 'a1',
  },
  {
    ...base, id: 'fuel', direction: 'out', stage: 'paid', amount: 1.5, amount_settled: 1.5, date: '2026-10-04',
    paid_at: '2026-10-04T00:00:00Z', description: 'Fuel for van', category: 'Travel',
  },
];

const summary = {
  expectedIn: 1000, receivedIn: 0, outstandingIn: 1000, dueIn: 1000,
  expectedOut: 201.5, paidOut: 201.5, outstandingOut: 0, dueOut: 0, net: 798.5,
  projectedStaffCosts: 0, totalCosts: 201.5, profit: 798.5, margin: 79.85,
};

describe('GigFinancialsSection', () => {
  const defaultProps = {
    gigId: 'test-gig-id',
    currentOrganizationId: 'test-org-id',
    userRole: 'Admin' as const,
    gigStartDate: '2026-10-03',
    gigEnd: '2026-10-03T23:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gigService.getGigFinancials).mockResolvedValue(stRaymond as any);
    vi.mocked(gigService.getGigProfitabilitySummary).mockResolvedValue(summary as any);
    vi.mocked(gigService.deleteGigFinancial).mockResolvedValue({ success: true });
    vi.mocked(gigService.recordGigFinancialPayment).mockResolvedValue({ paid: {} as any, remainder: null });
    vi.mocked(gigService.createGigFinancial).mockResolvedValue({ id: 'new' } as any);
    vi.mocked(gigService.updateGigFinancial).mockResolvedValue({ id: 'fee' } as any);
  });

  it('renders loading state initially', () => {
    render(<GigFinancialsSection {...defaultProps} />);
    expect(screen.getByText('Loading financials...')).toBeInTheDocument();
  });

  it('does not render for non-admin/manager users', () => {
    const { container } = render(<GigFinancialsSection {...defaultProps} userRole="Staff" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows money in as a card with its stage, and money out as a table', async () => {
    render(<GigFinancialsSection {...defaultProps} />);
    const card = await screen.findByTestId('money-in-fee');
    expect(within(card).getByText('Performance fee')).toBeInTheDocument();
    expect(within(card).getByText('$1,000.00')).toBeInTheDocument();
    expect(within(card).getByRole('list', { name: 'Stage: Accepted' })).toBeInTheDocument();
    expect(within(card).getByText('The gig is over and no payment is recorded yet.')).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(within(table).getByText('Labor: Stage Hand')).toBeInTheDocument();
    expect(within(table).getByText('Staff')).toBeInTheDocument();
    expect(within(table).getByText('Paid Oct 3')).toBeInTheDocument();
    expect(within(table).getByText('Paid Oct 4')).toBeInTheDocument();
  });

  it('shows the gig badge and the owed tile as due', async () => {
    render(<GigFinancialsSection {...defaultProps} />);
    expect(await screen.findByText('Payment due')).toBeInTheDocument();
    expect(screen.getByText('Owed to you')).toBeInTheDocument();
    expect(screen.getByText('$1,000.00 due now')).toBeInTheDocument();
  });

  it('does not call a fee due before the gig is over', async () => {
    vi.mocked(gigService.getGigProfitabilitySummary).mockResolvedValue({ ...summary, dueIn: 0 } as any);
    render(<GigFinancialsSection {...defaultProps} gigEnd="2099-10-03T23:00:00Z" />);
    await screen.findByTestId('money-in-fee');
    expect(screen.queryByText('Payment due')).not.toBeInTheDocument();
    expect(await screen.findByText('Not yet due')).toBeInTheDocument();
  });

  it('displays the stored calendar date, not a day earlier, in timezones behind UTC', async () => {
    // Regression test for #25: date-only values must not roll back a day west of UTC.
    const originalTZ = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';
    try {
      render(<GigFinancialsSection {...defaultProps} />);
      const card = await screen.findByTestId('money-in-fee');
      expect(within(card).getByText('Jul 22, 2026')).toBeInTheDocument();
      expect(screen.queryByText('Jul 21, 2026')).not.toBeInTheDocument();
    } finally {
      process.env.TZ = originalTZ;
    }
  });

  it('shows empty states when no financials exist', async () => {
    vi.mocked(gigService.getGigFinancials).mockResolvedValue([]);
    render(<GigFinancialsSection {...defaultProps} />);
    expect(await screen.findByText('No money in recorded yet.')).toBeInTheDocument();
    expect(screen.getByText('No money out recorded yet.')).toBeInTheDocument();
  });

  it('follows the page edit mode and shows no toggle of its own when `editing` is given', async () => {
    const viewing = render(<GigFinancialsSection {...defaultProps} editing={false} />);
    await screen.findByTestId('money-in-fee');
    expect(screen.queryByText('Edit Financials')).not.toBeInTheDocument();
    expect(screen.queryByText('Record payment')).not.toBeInTheDocument();

    viewing.unmount();
    render(<GigFinancialsSection {...defaultProps} editing />);
    expect(await screen.findByText('Record payment')).toBeInTheDocument();
    expect(screen.queryByText('Done Editing')).not.toBeInTheDocument();
  });

  it('records a partial payment as a split', async () => {
    render(<GigFinancialsSection {...defaultProps} editing />);
    fireEvent.click(await screen.findByText('Record payment'));

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Amount received'), { target: { value: '600' } });
    expect(within(dialog).getByText(/What is the other \$400\.00\?/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Date received'), { target: { value: '2026-10-05' } });
    fireEvent.click(within(dialog).getByText('Save payment'));

    await waitFor(() => {
      expect(gigService.recordGigFinancialPayment).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'fee' }),
        expect.objectContaining({ amount: 600, paid_at: '2026-10-05', remainder: 'split' }),
      );
    });
  });

  it('moves a fee to its next stage', async () => {
    render(<GigFinancialsSection {...defaultProps} editing />);
    fireEvent.click(await screen.findByText('Mark contract sent'));
    await waitFor(() => expect(gigService.updateGigFinancial).toHaveBeenCalledWith('fee', { stage: 'contract_sent' }));
  });

  it('mounts the attachments manager with the real gig_financials id', async () => {
    render(<GigFinancialsSection {...defaultProps} editing />);
    const card = await screen.findByTestId('money-in-fee');
    fireEvent.click(within(card).getByRole('button', { name: 'Attach a receipt or document' }));
    const manager = await screen.findByTestId('attachment-manager');
    expect(manager).toHaveAttribute('data-entity-type', 'gig_financial');
    expect(manager).toHaveAttribute('data-entity-id', 'fee');
  });

  it('removes a row from its menu', async () => {
    const user = userEvent.setup();
    render(<GigFinancialsSection {...defaultProps} editing />);
    await screen.findByTestId('money-in-fee');
    await user.click(screen.getByRole('button', { name: 'Actions for Fuel for van' }));
    await user.click(await screen.findByRole('menuitem', { name: /Remove/ }));
    await waitFor(() => expect(gigService.deleteGigFinancial).toHaveBeenCalledWith('fuel'));
  });

  it('adds a bid request as money out with no amount', async () => {
    render(<GigFinancialsSection {...defaultProps} editing />);
    fireEvent.click(await screen.findByText('Request a bid'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Add money out')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Description'), { target: { value: 'Lighting rig' } });
    fireEvent.click(within(dialog).getByText('Save'));

    await waitFor(() => {
      expect(gigService.createGigFinancial).toHaveBeenCalledWith(expect.objectContaining({
        gig_id: 'test-gig-id',
        organization_id: 'test-org-id',
        direction: 'out',
        stage: 'requested',
        amount: null,
        description: 'Lighting rig',
        date: '2026-10-03',
      }));
    });
  });

  it('keeps the add dialog open and shows the error when the save fails (issue #71)', async () => {
    vi.mocked(gigService.createGigFinancial).mockRejectedValue(new Error('invalid input value for enum fin_category: ""'));
    render(<GigFinancialsSection {...defaultProps} editing />);
    fireEvent.click(await screen.findByText('Other'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Agreed amount'), { target: { value: '500' } });
    fireEvent.click(within(dialog).getByText('Save'));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('invalid input value for enum fin_category');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // a blank category goes as null, not ''
    expect(gigService.createGigFinancial).toHaveBeenCalledWith(expect.objectContaining({ category: null }));
  });
});
