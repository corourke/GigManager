import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import GigFinancialsSection from './GigFinancialsSection';
import * as gigService from '../../services/gig.service';

// Mock the gig service
vi.mock('../../services/gig.service', () => ({
  getGigFinancials: vi.fn(),
  updateGigFinancials: vi.fn(),
  createGigFinancial: vi.fn(),
  deleteGigFinancial: vi.fn(),
  getGigProfitabilitySummary: vi.fn(),
}));

// Mock the useAutoSave hook
vi.mock('../../utils/hooks/useAutoSave', () => ({
  useAutoSave: () => ({
    saveState: 'saved',
    triggerSave: vi.fn(),
  }),
}));

// Mock the SaveStateIndicator component
vi.mock('./SaveStateIndicator', () => ({
  default: ({ state }: { state: string }) => <span data-testid="save-indicator">{state}</span>,
}));

describe('GigFinancialsSection', () => {
  const defaultProps = {
    gigId: 'test-gig-id',
    currentOrganizationId: 'test-org-id',
    userRole: 'Admin' as const,
  };

  const mockFinancials = [
    {
      id: 'fin-1',
      date: '2024-01-15',
      amount: 5000,
      type: 'Payment Received',
      category: 'Production',
      description: 'Initial payment',
      reference_number: 'INV-001',
      currency: 'USD',
    },
    {
      id: 'fin-2', 
      date: '2024-01-20',
      amount: 1200,
      type: 'Expense Incurred',
      category: 'Equipment',
      description: 'Camera rental',
      reference_number: 'EXP-002',
      currency: 'USD',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gigService.getGigFinancials).mockResolvedValue(mockFinancials);
    vi.mocked(gigService.updateGigFinancials).mockResolvedValue(undefined);
    vi.mocked(gigService.deleteGigFinancial).mockResolvedValue({ success: true });
    vi.mocked(gigService.getGigProfitabilitySummary).mockResolvedValue({
      contractAmount: 5000,
      received: 5000,
      outstandingRevenue: 0,
      actualCosts: 1200,
      projectedStaffCosts: 0,
      totalCosts: 1200,
      profit: 3800,
      margin: 76
    });
  });

  it('renders loading state initially', () => {
    render(<GigFinancialsSection {...defaultProps} />);
    expect(screen.getByText('Loading financials...')).toBeInTheDocument();
  });

  it('does not render for non-admin users', () => {
    const { container } = render(
      <GigFinancialsSection {...defaultProps} userRole="Manager" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders financial records in table format', async () => {
    render(<GigFinancialsSection {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Financials')).toBeInTheDocument();
    });

    // Check table headers (may appear multiple times due to grouping)
    expect(screen.getAllByText('Date')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Type')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Amount')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Description')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Actions')[0]).toBeInTheDocument();

    // Check financial records
    expect(screen.getAllByText(/Jan \d+, 2024/)).toHaveLength(2);
    expect(screen.getByText('Payment Received')).toBeInTheDocument();
    expect(screen.getAllByText('$5,000.00').length).toBeGreaterThan(0);
    expect(screen.getByText('Initial payment')).toBeInTheDocument();
    
    expect(screen.getByText('Expense Incurred')).toBeInTheDocument();
    expect(screen.getAllByText('$1,200.00').length).toBeGreaterThan(0);
    expect(screen.getByText('Camera rental')).toBeInTheDocument();
  });

  it('shows empty state when no financials exist', async () => {
    vi.mocked(gigService.getGigFinancials).mockResolvedValue([]);
    vi.mocked(gigService.getGigProfitabilitySummary).mockResolvedValue({
      contractAmount: 0,
      received: 0,
      outstandingRevenue: 0,
      actualCosts: 0,
      projectedStaffCosts: 0,
      totalCosts: 0,
      profit: 0,
      margin: 0
    });
    
    render(<GigFinancialsSection {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('No financial records yet')).toBeInTheDocument();
    });
  });

  it('opens modal when Add Record button is clicked', async () => {
    render(<GigFinancialsSection {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Financials')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Record'));
    
    await waitFor(() => {
      // Check for dialog header content
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Amount')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });
  });

  it('opens edit modal when edit button is clicked', async () => {
    render(<GigFinancialsSection {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Financials')).toBeInTheDocument();
    });

    const editButton = screen.getByTestId('edit-financial-0');
    
    if (editButton) {
      fireEvent.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Financial Record')).toBeInTheDocument();
      });
    }
  });

  it('calls deleteGigFinancial when delete button is clicked', async () => {
    render(<GigFinancialsSection {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Financials')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTestId('delete-financial-0');
    
    if (deleteButton) {
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(gigService.deleteGigFinancial).toHaveBeenCalled();
      });
    }
  });

  it('loads financials on mount for admin users', async () => {
    render(<GigFinancialsSection {...defaultProps} />);
    
    await waitFor(() => {
      expect(gigService.getGigFinancials).toHaveBeenCalledWith('test-gig-id', 'test-org-id');
    });
  });

  it('does not load financials for non-admin users', () => {
    render(<GigFinancialsSection {...defaultProps} userRole="Manager" />);
    expect(gigService.getGigFinancials).not.toHaveBeenCalled();
  });

  it('shows save state indicator', async () => {
    render(<GigFinancialsSection {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('save-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('save-indicator')).toHaveTextContent('saved');
    });
  });
});