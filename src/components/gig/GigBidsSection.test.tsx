import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import GigBidsSection from './GigBidsSection';

vi.mock('../../services/gig.service', () => ({
  getGig: vi.fn().mockResolvedValue({}),
  createGigBid: vi.fn().mockResolvedValue({ id: 'new-bid-id' }),
  updateGigBid: vi.fn().mockResolvedValue({}),
  deleteGigBid: vi.fn().mockResolvedValue({}),
  getGigBids: vi.fn().mockResolvedValue([
    {
      id: 'bid-1',
      date_given: '2024-01-15',
      amount: 5000,
      result: 'Accepted',
      notes: 'Test bid notes',
    },
  ]),
}));

vi.mock('../../utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user' } } },
        error: null,
      }),
    },
  })),
}));

describe('GigBidsSection', () => {
  const mockProps = {
    gigId: 'test-gig-id',
    currentOrganizationId: 'current-org-id',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without throwing errors', () => {
    expect(() => {
      render(<GigBidsSection {...mockProps} />);
    }).not.toThrow();
  });

  it('displays loading state initially', () => {
    render(<GigBidsSection {...mockProps} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders add bid button', async () => {
    render(<GigBidsSection {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Add Bid')).toBeInTheDocument();
    });
  });

  it('does not render manual save button', async () => {
    render(<GigBidsSection {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    });
  });
});
