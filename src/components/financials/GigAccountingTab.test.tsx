import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import GigAccountingTab from './GigAccountingTab';
import * as gigService from '../../services/gig.service';
import { GigAccountingSummary } from '../../utils/supabase/types';
import { makeOrganization } from '../../test/factories';

vi.mock('../../services/gig.service', () => ({
  getAllGigAccountingSummaries: vi.fn(),
  getGigFinancials: vi.fn().mockResolvedValue([]),
}));

vi.mock('./GigAccountingRowDetail', () => ({
  default: () => <tr><td>Detail</td></tr>,
}));

const makeOrg = (id = 'org-1') => makeOrganization({ id, name: 'Test Org' });

const now = new Date();
const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

const makeSummary = (overrides: Partial<GigAccountingSummary> = {}): GigAccountingSummary => ({
  gigId: 'gig-1',
  gigTitle: 'Test Gig',
  gigStatus: 'Completed',
  gigStart: pastDate,
  gigEnd: pastDate,
  contractAmount: 5000,
  received: 3000,
  outstandingRevenue: 2000,
  actualCosts: 1000,
  expectedStaffCosts: 500,
  expectedSubContractCosts: 0,
  totalCosts: 1500,
  paymentsToMake: 0,
  profit: 3500,
  margin: 70,
  paymentHealth: 'revenue-outstanding',
  ...overrides,
});

const defaultSummaries: GigAccountingSummary[] = [
  makeSummary({
    gigId: 'gig-completed-1',
    gigTitle: 'Completed Gig 1',
    gigStatus: 'Completed',
    gigStart: pastDate,
    gigEnd: pastDate,
    outstandingRevenue: 2000,
    paymentsToMake: 0,
    paymentHealth: 'revenue-outstanding',
  }),
  makeSummary({
    gigId: 'gig-completed-2',
    gigTitle: 'Completed Gig 2',
    gigStatus: 'Completed',
    gigStart: pastDate,
    gigEnd: pastDate,
    outstandingRevenue: 0,
    paymentsToMake: 0,
    paymentHealth: 'all-clear',
  }),
  makeSummary({
    gigId: 'gig-upcoming-1',
    gigTitle: 'Upcoming Gig 1',
    gigStatus: 'Booked',
    gigStart: futureDate,
    gigEnd: futureDate,
    outstandingRevenue: 0,
    paymentsToMake: 0,
    paymentHealth: 'all-clear',
  }),
  makeSummary({
    gigId: 'gig-settled-1',
    gigTitle: 'Settled Gig 1',
    gigStatus: 'Settled',
    gigStart: pastDate,
    gigEnd: pastDate,
    outstandingRevenue: 0,
    paymentsToMake: 0,
    paymentHealth: 'all-clear',
  }),
];

describe('GigAccountingTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows access-denied alert for non-Admin userRole', async () => {
    vi.mocked(gigService.getAllGigAccountingSummaries).mockResolvedValue([]);
    render(
      <GigAccountingTab
        organization={makeOrg()}
        userRole="Staff"
        onNavigateToGigDetail={vi.fn()}
      />
    );
    expect(screen.getByText('Financial data is restricted to Admins.')).toBeInTheDocument();
  });

  it('shows access-denied alert when userRole is undefined', () => {
    vi.mocked(gigService.getAllGigAccountingSummaries).mockResolvedValue([]);
    render(
      <GigAccountingTab
        organization={makeOrg()}
        onNavigateToGigDetail={vi.fn()}
      />
    );
    expect(screen.getByText('Financial data is restricted to Admins.')).toBeInTheDocument();
  });

  it('shows loading skeleton while fetching', () => {
    vi.mocked(gigService.getAllGigAccountingSummaries).mockReturnValue(new Promise(() => {}));
    render(
      <GigAccountingTab
        organization={makeOrg()}
        userRole="Admin"
        onNavigateToGigDetail={vi.fn()}
      />
    );
    const skeletons = document.querySelectorAll('[class*="skeleton"], [data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders three collapsible sections with correct gig counts', async () => {
    vi.mocked(gigService.getAllGigAccountingSummaries).mockResolvedValue(defaultSummaries);
    render(
      <GigAccountingTab
        organization={makeOrg()}
        userRole="Admin"
        onNavigateToGigDetail={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Needs Attention').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Upcoming').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Past & Settled')).toBeInTheDocument();
    });

    expect(screen.getByText('Completed Gig 1')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Gig 1')).toBeInTheDocument();
  });

  it('quick filter "Needs Attention" shows only Completed gigs', async () => {
    vi.mocked(gigService.getAllGigAccountingSummaries).mockResolvedValue(defaultSummaries);
    render(
      <GigAccountingTab
        organization={makeOrg()}
        userRole="Admin"
        onNavigateToGigDetail={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Upcoming Gig 1')).toBeInTheDocument();
    });

    const chips = screen.getAllByText('Needs Attention');
    const chip = chips.find((el) => el.closest('button')?.classList.contains('rounded-full'));
    if (chip) {
      fireEvent.click(chip.closest('button')!);
    } else {
      const roundedChips = document.querySelectorAll('button.rounded-full');
      const needsAttentionBtn = Array.from(roundedChips).find((b) => b.textContent === 'Needs Attention');
      if (needsAttentionBtn) fireEvent.click(needsAttentionBtn);
    }

    await waitFor(() => {
      expect(screen.queryByText('Upcoming Gig 1')).not.toBeInTheDocument();
    });
  });

  it('summary bar totals match the visible filtered gigs', async () => {
    const singleSummary = [
      makeSummary({
        gigId: 'gig-1',
        gigTitle: 'Solo Gig',
        gigStatus: 'Completed',
        gigStart: pastDate,
        gigEnd: pastDate,
        contractAmount: 10000,
        received: 6000,
        outstandingRevenue: 4000,
        totalCosts: 3000,
        paymentsToMake: 500,
        profit: 7000,
        paymentHealth: 'both',
      }),
    ];
    vi.mocked(gigService.getAllGigAccountingSummaries).mockResolvedValue(singleSummary);
    render(
      <GigAccountingTab
        organization={makeOrg()}
        userRole="Admin"
        onNavigateToGigDetail={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Solo Gig')).toBeInTheDocument();
    });

    expect(screen.getAllByText('$10,000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$7,000').length).toBeGreaterThanOrEqual(1);
  });

  it('clicking a row calls onNavigateToGigDetail with correct gigId', async () => {
    const onNavigateToGigDetail = vi.fn();
    vi.mocked(gigService.getAllGigAccountingSummaries).mockResolvedValue([
      makeSummary({
        gigId: 'gig-nav-test',
        gigTitle: 'Navigation Test Gig',
        gigStatus: 'Completed',
        gigStart: pastDate,
        gigEnd: pastDate,
      }),
    ]);
    render(
      <GigAccountingTab
        organization={makeOrg()}
        userRole="Admin"
        onNavigateToGigDetail={onNavigateToGigDetail}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Navigation Test Gig')).toBeInTheDocument();
    });

    const gigRow = screen.getByText('Navigation Test Gig').closest('tr');
    if (gigRow) {
      fireEvent.click(gigRow);
    }

    expect(onNavigateToGigDetail).toHaveBeenCalledWith('gig-nav-test');
  });

  it('shows empty state when org has no gigs', async () => {
    vi.mocked(gigService.getAllGigAccountingSummaries).mockResolvedValue([]);
    render(
      <GigAccountingTab
        organization={makeOrg()}
        userRole="Admin"
        onNavigateToGigDetail={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No gigs found.')).toBeInTheDocument();
    });
  });

  it('shows error state when service fails', async () => {
    vi.mocked(gigService.getAllGigAccountingSummaries).mockRejectedValue(new Error('Network error'));
    render(
      <GigAccountingTab
        organization={makeOrg()}
        userRole="Admin"
        onNavigateToGigDetail={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});
