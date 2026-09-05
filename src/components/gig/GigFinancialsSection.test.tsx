import type { ReactElement } from 'react';
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GigFinancialsSection from './GigFinancialsSection';
import * as gigService from '../../services/gig.service';
import { useAutoSave } from '../../utils/hooks/useAutoSave';

// The component now uses TanStack Query, so renders need a QueryClientProvider.
// retry:false keeps tests deterministic and fast.
function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

// Mock the gig service
vi.mock('../../services/gig.service', () => ({
  getGigFinancials: vi.fn(),
  updateGigFinancials: vi.fn(),
  createGigFinancial: vi.fn(),
  deleteGigFinancial: vi.fn(),
  getGigProfitabilitySummary: vi.fn(),
}));

// Mock the useAutoSave hook. Default behavior is a no-op triggerSave, matching
// the pre-existing tests below (which don't exercise the real save path).
// Individual regression tests override this with mockImplementation to drive
// the component's real onSave/onSuccess callbacks deterministically, without
// depending on the hook's internal debounce timer.
vi.mock('../../utils/hooks/useAutoSave', () => ({
  useAutoSave: vi.fn(),
}));

// Mock the SaveStateIndicator component
vi.mock('./SaveStateIndicator', () => ({
  default: ({ state }: { state: string }) => <span data-testid="save-indicator">{state}</span>,
}));

// Mock AttachmentManager so the per-row receipts modal doesn't hit the network;
// echo back the entityId it was mounted with so tests can assert it's the real
// gig_financials id (not a react-hook-form synthetic key).
vi.mock('../AttachmentManager', () => ({
  default: ({ entityType, entityId, allowUpload }: { entityType: string; entityId: string; allowUpload?: boolean }) => (
    <div
      data-testid="attachment-manager"
      data-entity-type={entityType}
      data-entity-id={entityId}
      data-allow-upload={String(!!allowUpload)}
    />
  ),
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
    vi.mocked(useAutoSave).mockReturnValue({
      saveState: 'saved',
      error: null,
      triggerSave: vi.fn(),
      flush: vi.fn(),
      flushAsync: vi.fn(),
    });
    vi.mocked(gigService.getGigFinancials).mockResolvedValue(mockFinancials as unknown as Awaited<ReturnType<typeof gigService.getGigFinancials>>);
    vi.mocked(gigService.updateGigFinancials).mockResolvedValue({ success: true });
    vi.mocked(gigService.deleteGigFinancial).mockResolvedValue({ success: true });
    vi.mocked(gigService.getGigProfitabilitySummary).mockResolvedValue({
      contractAmount: 5000,
      received: 5000,
      outstandingRevenue: 0,
      actualCosts: 1200,
      projectedStaffCosts: 0,
      expectedSubContractCosts: 0,
      totalCosts: 1200,
      profit: 3800,
      margin: 76
    });
  });

  it('renders loading state initially', () => {
    render(<GigFinancialsSection {...defaultProps} />);
    expect(screen.getByText('Loading financials...')).toBeInTheDocument();
  });

  it('does not render for non-admin/manager users', () => {
    const { container } = render(
      <GigFinancialsSection {...defaultProps} userRole="Staff" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders for manager users', async () => {
    render(<GigFinancialsSection {...defaultProps} userRole="Manager" />);
    await waitFor(() => {
      expect(screen.getByText('Financials')).toBeInTheDocument();
    });
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
      expectedSubContractCosts: 0,
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

    fireEvent.click(screen.getByText('Edit Financials'));
    await waitFor(() => {
      expect(screen.getByText('Other')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Other'));
    
    await waitFor(() => {
      // Check for dialog header content
      expect(screen.getByRole('heading', { name: 'Add Financial Record' })).toBeInTheDocument();
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

    fireEvent.click(screen.getByText('Edit Financials'));
    await waitFor(() => {
      expect(screen.getByTestId('edit-financial-0')).toBeInTheDocument();
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

    fireEvent.click(screen.getByText('Edit Financials'));
    await waitFor(() => {
      expect(screen.getByTestId('delete-financial-0')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('delete-financial-0'));

    await waitFor(() => {
      expect(gigService.deleteGigFinancial).toHaveBeenCalled();
    });
    // Regression: must be the real gig_financials id, not a react-hook-form
    // synthetic row key (keyName). A wrong id here -> silent "0 rows" -> the
    // "Failed to delete financial record" toast.
    expect(gigService.deleteGigFinancial).toHaveBeenCalledWith('fin-1');
  });

  it('mounts the per-row attachments manager with the real gig_financials id', async () => {
    render(<GigFinancialsSection {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Camera rental')).toBeInTheDocument();
    });

    // The paperclip button carries the row's title in its accessible name via title attr;
    // grab the first row's attach button by its title text.
    const attachButtons = screen.getAllByTitle(/attach a receipt or document|attachment\(s\)/i);
    fireEvent.click(attachButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('attachment-manager')).toBeInTheDocument();
    });
    const mgr = screen.getByTestId('attachment-manager');
    expect(mgr).toHaveAttribute('data-entity-type', 'gig_financial');
    // Regression: real id, not an RHF key — otherwise uploads link to a phantom
    // entity and the count badge never appears.
    expect(['fin-1', 'fin-2']).toContain(mgr.getAttribute('data-entity-id'));
    // Upload allowed for an Admin without entering edit mode.
    expect(mgr).toHaveAttribute('data-allow-upload', 'true');
  });

  it('loads financials on mount for admin users', async () => {
    render(<GigFinancialsSection {...defaultProps} />);
    
    await waitFor(() => {
      expect(gigService.getGigFinancials).toHaveBeenCalledWith('test-gig-id', 'test-org-id');
    });
  });

  it('loads financials on mount for manager users', async () => {
    render(<GigFinancialsSection {...defaultProps} userRole="Manager" />);
    
    await waitFor(() => {
      expect(gigService.getGigFinancials).toHaveBeenCalledWith('test-gig-id', 'test-org-id');
    });
  });

  it('does not load financials for unauthorized users', () => {
    render(<GigFinancialsSection {...defaultProps} userRole="Staff" />);
    expect(gigService.getGigFinancials).not.toHaveBeenCalled();
  });

  it('shows save state indicator', async () => {
    render(<GigFinancialsSection {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('save-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('save-indicator')).toHaveTextContent('saved');
    });
  });

  describe('gig view refresh after editing a financial record (issue #8)', () => {
    // Mirrors the app's real QueryClient config (src/lib/queryClient.ts):
    // a 30s staleTime is exactly what let a remounted view keep serving
    // pre-edit data when the mutation only refetched the summary query.
    function makeProdLikeQueryClient() {
      return new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      });
    }

    function renderWithClient(queryClient: QueryClient) {
      return rtlRender(
        <QueryClientProvider client={queryClient}>
          <GigFinancialsSection {...defaultProps} />
        </QueryClientProvider>
      );
    }

    it('shows the edited amount after the section remounts (e.g. a tab switch)', async () => {
      // Drive the component's real onSave/onSuccess synchronously, bypassing
      // the debounce timer, so the test exercises the actual save path
      // instead of the no-op default mock.
      vi.mocked(useAutoSave).mockImplementation(({ onSave, onSuccess }: any) => ({
        saveState: 'saved',
        error: null,
        triggerSave: (data: any) => {
          void onSave(data).then(() => onSuccess?.(data));
        },
        flush: vi.fn(),
        flushAsync: vi.fn(),
      }));

      const updatedFinancials = [
        { ...mockFinancials[0], amount: 9999 },
        mockFinancials[1],
      ];
      vi.mocked(gigService.getGigFinancials)
        .mockResolvedValueOnce(mockFinancials as any)
        .mockResolvedValue(updatedFinancials as any);

      const queryClient = makeProdLikeQueryClient();

      // "Initial payment" (fin-1's description) is unique text, unlike the amount which
      // also appears in the summary panel — use it to scope assertions to the actual row.
      const getRow = () => screen.getByText('Initial payment').closest('tr') as HTMLElement;

      const first = renderWithClient(queryClient);
      await waitFor(() => expect(getRow()).toHaveTextContent('$5,000.00'));

      fireEvent.click(screen.getByText('Edit Financials'));
      await waitFor(() => expect(screen.getByTestId('edit-financial-0')).toBeInTheDocument());
      fireEvent.click(screen.getByTestId('edit-financial-0'));
      await waitFor(() => expect(screen.getByText('Edit Financial Record')).toBeInTheDocument());

      fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '9999' } });
      fireEvent.click(screen.getByText('Update Financial Record'));

      await waitFor(() => expect(gigService.updateGigFinancials).toHaveBeenCalled());
      // Regression: useFieldArray's `fields` (what the table renders from) only resyncs on a
      // plain reset, which the pre-fix handleSaveSuccess skipped via `keepValues: true` — so
      // even this same mounted instance kept showing the pre-edit amount until something else
      // (e.g. a remount) forced a real reset.
      await waitFor(() => expect(getRow()).toHaveTextContent('$9,999.00'));

      // Simulate leaving and returning to the Gig View (e.g. a tab switch unmounts this section).
      first.unmount();
      renderWithClient(queryClient);

      // Regression: without invalidating the financials query cache on save, this remount
      // would serve the stale pre-edit $5,000.00 from the still-fresh (staleTime: 30s) cache.
      await waitFor(() => expect(getRow()).toHaveTextContent('$9,999.00'));
      expect(getRow()).not.toHaveTextContent('$5,000.00');
    });

    it('does not let a concurrent background refresh clobber an in-progress dirty edit', async () => {
      // Default no-op triggerSave (from beforeEach): the edit becomes dirty (isDirty: true)
      // but autosave never fires, simulating a pending edit still within its debounce window
      // (or blocked on a slow save elsewhere) when a concurrent, unrelated change lands.
      const queryClient = makeProdLikeQueryClient();

      const externallyUpdatedFinancials = [
        { ...mockFinancials[0], amount: 7777 },
        mockFinancials[1],
      ];
      vi.mocked(gigService.getGigFinancials)
        .mockResolvedValueOnce(mockFinancials as any)
        .mockResolvedValue(externallyUpdatedFinancials as any);

      const getRow = () => screen.getByText('Initial payment').closest('tr') as HTMLElement;

      renderWithClient(queryClient);
      await waitFor(() => expect(getRow()).toHaveTextContent('$5,000.00'));

      fireEvent.click(screen.getByText('Edit Financials'));
      await waitFor(() => expect(screen.getByTestId('edit-financial-0')).toBeInTheDocument());
      fireEvent.click(screen.getByTestId('edit-financial-0'));
      await waitFor(() => expect(screen.getByText('Edit Financial Record')).toBeInTheDocument());

      fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '9999' } });
      fireEvent.click(screen.getByText('Update Financial Record'));

      // A background event (e.g. another user editing the same gig, or staff finalization
      // elsewhere) refetches the financials query while this row is a dirty, unsaved edit.
      window.dispatchEvent(new CustomEvent('gig-financials-updated', { detail: { gigId: 'test-gig-id' } }));
      await waitFor(() => expect(gigService.getGigFinancials).toHaveBeenCalledTimes(2));

      // Regression: without the isDirty guard, the sync effect would apply the freshly
      // refetched external data ($7,777) over the in-progress local edit, discarding it.
      expect(getRow()).not.toHaveTextContent('$7,777.00');
      expect(getRow()).toHaveTextContent('$5,000.00');
    });
  });
});