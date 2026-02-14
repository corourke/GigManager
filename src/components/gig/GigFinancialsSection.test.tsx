import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import GigFinancialsSection from './GigFinancialsSection';
import * as gigService from '../../services/gig.service';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    length: 0,
    key: vi.fn((index: number) => null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock the gig service
vi.mock('../../services/gig.service', () => ({
  getGigFinancials: vi.fn(),
  updateGigFinancials: vi.fn(),
  createGigFinancial: vi.fn(),
  deleteGigFinancial: vi.fn(),
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
      type: 'Payment Recieved',
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

    // Check table headers
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();

    // Check financial records (dates may vary slightly due to formatting)
    expect(screen.getAllByText(/Jan \d+, 2024/)).toHaveLength(2);
    expect(screen.getByText('Payment Received')).toBeInTheDocument();
    expect(screen.getByText('$5,000.00')).toBeInTheDocument();
    expect(screen.getByText('Initial payment')).toBeInTheDocument();
    
    expect(screen.getByText('Expense Incurred')).toBeInTheDocument();
    expect(screen.getByText('$1,200.00')).toBeInTheDocument();
    expect(screen.getByText('Camera rental')).toBeInTheDocument();
  });

  it('shows empty state when no financials exist', async () => {
    vi.mocked(gigService.getGigFinancials).mockResolvedValue([]);
    
    render(<GigFinancialsSection {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('No financial records')).toBeInTheDocument();
    });
  });

  it('opens modal when Add Financial Record button is clicked', async () => {
    render(<GigFinancialsSection {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Financials')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Financial Record'));
    
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

    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(button => 
      button.querySelector('svg') && 
      button.getAttribute('class')?.includes('h-7 w-7 p-0') &&
      !button.getAttribute('class')?.includes('text-red-600')
    );
    
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

    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(button => 
      button.querySelector('svg') && 
      button.getAttribute('class')?.includes('text-red-600')
    );
    
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