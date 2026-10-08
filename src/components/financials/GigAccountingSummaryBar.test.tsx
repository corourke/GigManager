import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import GigAccountingSummaryBar from './GigAccountingSummaryBar';
import type { GigAccountingSummary } from '../../utils/supabase/types';

const gig = (overrides: Partial<GigAccountingSummary>): GigAccountingSummary => ({
  gigId: 'g', gigTitle: 'Gig', gigStatus: 'Completed', gigStart: '2026-09-01T02:00:00Z', gigEnd: '2026-09-01T06:00:00Z',
  contractAmount: 0, received: 0, outstandingRevenue: 0, dueRevenue: 0,
  actualCosts: 0, expectedStaffCosts: 0, expectedSubContractCosts: 0, totalCosts: 0,
  paymentsToMake: 0, paymentsDue: 0, profit: 0, margin: 0, paymentHealth: 'all-clear',
  moneyInBadge: { label: 'Payment due', tone: 'attention' },
  ...overrides,
});

const card = (label: string) => screen.getByText(label).parentElement!;

describe('GigAccountingSummaryBar (Cameron, 10-08)', () => {
  const gigs = [
    gig({ gigId: 'played', gigStatus: 'Completed', contractAmount: 5000, received: 3000, outstandingRevenue: 2000 }),
    gig({ gigId: 'settled', gigStatus: 'Settled', contractAmount: 1000, received: 900, outstandingRevenue: 100 }),
    gig({ gigId: 'upcoming', gigStatus: 'Booked', contractAmount: 4000, received: 1000, outstandingRevenue: 3000 }),
  ];

  it('labels committed money in "Booked"', () => {
    render(<GigAccountingSummaryBar summaries={gigs} />);
    expect(screen.queryByText('Expected')).not.toBeInTheDocument();
    expect(card('Booked')).toHaveTextContent('$10,000');
  });

  it('counts "Owed to you" only on completed gigs, not ones that haven\'t happened yet', () => {
    render(<GigAccountingSummaryBar summaries={gigs} />);
    expect(card('Owed to you')).toHaveTextContent('$2,100');
  });
});
