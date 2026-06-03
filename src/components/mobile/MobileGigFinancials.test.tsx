import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import MobileGigFinancials from './MobileGigFinancials';
import * as gigService from '../../services/gig.service';

vi.mock('../../services/gig.service', () => ({
  getGigFinancials: vi.fn(),
  getGigProfitabilitySummary: vi.fn(),
}));

// Mock QuickActionButtons to simplify testing
vi.mock('../gig/QuickActionButtons', () => ({
  default: ({ onSuccess }: any) => (
    <div data-testid="quick-actions">
      <button onClick={onSuccess}>Add Mock Record</button>
    </div>
  ),
}));

describe('MobileGigFinancials', () => {
  const defaultProps = {
    gigId: 'test-gig-id',
    organizationId: 'test-org-id',
    userRole: 'Admin' as const,
    isEditing: false,
    gigStartDate: '2026-01-01',
  };

  const mockFinancials = [
    {
      id: 'fin-1',
      date: '2026-01-01',
      amount: 100,
      type: 'Agreement Revenue',
      description: 'Test Agreement',
    },
  ];

  const mockSummary = {
    contractAmount: 1000,
    received: 100,
    totalCosts: 50,
    profit: 950,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (gigService.getGigFinancials as any).mockResolvedValue(mockFinancials);
    (gigService.getGigProfitabilitySummary as any).mockResolvedValue(mockSummary);
  });

  it('renders nothing if user is not Admin or Manager', () => {
    render(<MobileGigFinancials {...defaultProps} userRole="Staff" />);
    expect(screen.queryByText('Contract')).not.toBeInTheDocument();
  });

  it('renders summary tiles for Admin', async () => {
    render(<MobileGigFinancials {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Revenue')).toBeInTheDocument();
      expect(screen.getByText('$1,000.00')).toBeInTheDocument();
      expect(screen.getByText('Costs')).toBeInTheDocument();
      expect(screen.getByText('$50.00')).toBeInTheDocument();
      expect(screen.getByText('Profit')).toBeInTheDocument();
      expect(screen.getByText('$950.00')).toBeInTheDocument();
    });
  });

  it('renders summary tiles for Manager', async () => {
    render(<MobileGigFinancials {...defaultProps} userRole="Manager" />);
    
    await waitFor(() => {
      expect(screen.getByText('Revenue')).toBeInTheDocument();
    });
  });

  it('shows quick action buttons only when isEditing is true', async () => {
    const { rerender } = render(<MobileGigFinancials {...defaultProps} isEditing={false} />);
    expect(screen.queryByTestId('quick-actions')).not.toBeInTheDocument();

    rerender(<MobileGigFinancials {...defaultProps} isEditing={true} />);
    expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
  });

  it('opens transactions modal when tiles are clicked', async () => {
    render(<MobileGigFinancials {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Revenue')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/View \d+ Transaction/));
    
    await waitFor(() => {
      expect(screen.getByText(/Transactions \(1\)/)).toBeInTheDocument();
      expect(screen.getByText('Test Agreement')).toBeInTheDocument();
    });
  });

  it('shows transaction detail when a transaction is clicked', async () => {
    render(<MobileGigFinancials {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Revenue')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/View \d+ Transaction/));
    
    await waitFor(() => {
      expect(screen.getByText('Test Agreement')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Test Agreement'));

    await waitFor(() => {
      expect(screen.getByText('Transaction Detail')).toBeInTheDocument();
      expect(screen.getByText('Agreement Revenue')).toBeInTheDocument();
    });
  });
});
