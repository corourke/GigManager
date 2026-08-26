import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GigParticipantsSection from './GigParticipantsSection';

// GigParticipantContactsList (rendered per participant row) uses TanStack
// Query, so renders need a QueryClientProvider. retry:false keeps tests
// deterministic and fast.
function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

vi.mock('../../services/gig.service', () => ({
  getGig: vi.fn().mockResolvedValue({
    participants: [
      {
        id: 'participant-1',
        organization_id: 'org-1',
        organization_name: 'Test Org',
        role: 'Production',
        notes: 'Test notes',
        is_client: false,
      },
    ],
  }),
  updateGigParticipants: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../services/organization.service', () => ({
  getOrganizationContacts: vi.fn().mockResolvedValue([]),
}));

describe('GigParticipantsSection', () => {
  const mockProps = {
    gigId: 'test-gig-id',
    currentOrganizationId: 'current-org-id',
    currentOrganizationName: 'Current Org',
    currentOrganizationRole: 'Production' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without throwing errors', () => {
    expect(() => {
      render(<GigParticipantsSection {...mockProps} />);
    }).not.toThrow();
  });

  it('displays loading state initially', () => {
    render(<GigParticipantsSection {...mockProps} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('loads and displays participants', async () => {
    render(<GigParticipantsSection {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Org')).toBeInTheDocument();
    });
  });

  it('renders add participant button', async () => {
    render(<GigParticipantsSection {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Add Participant')).toBeInTheDocument();
    });
  });

  it('does not render manual save button', async () => {
    render(<GigParticipantsSection {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    });
  });
});
