import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GigStaffSlotsSection from './GigStaffSlotsSection';

// UserSelector's quick-add affordance mounts an AddPersonDialog (closed by
// default) which uses react-query hooks regardless of its open state, so this
// needs a QueryClientProvider ancestor now, matching the app's real wiring
// (a single app-wide provider in src/main.tsx).
function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

vi.mock('../../services/gig.service', () => ({
  getGig: vi.fn().mockResolvedValue({
    staff_slots: [
      {
        id: 'slot-1',
        organization_id: 'current-org-id',
        role: 'Sound Engineer',
        count: 2,
        notes: 'Test slot notes',
        staff_assignments: [
          {
            id: 'assignment-1',
            user_id: 'user-1',
            user: { first_name: 'John', last_name: 'Doe' },
            status: 'Confirmed',
            rate: 50,
            fee: null,
            notes: 'Test assignment notes',
          },
        ],
      },
    ],
  }),
  updateGigStaffSlots: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ name: 'Sound Engineer' }, { name: 'Lighting Tech' }],
        error: null,
      }),
    })),
  })),
}));

describe('GigStaffSlotsSection', () => {
  const mockProps = {
    gigId: 'test-gig-id',
    currentOrganizationId: 'current-org-id',
    participantOrganizationIds: ['current-org-id', 'other-org-id'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without throwing errors', () => {
    expect(() => {
      render(<GigStaffSlotsSection {...mockProps} />);
    }).not.toThrow();
  });

  it('displays loading state initially', () => {
    render(<GigStaffSlotsSection {...mockProps} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders add staff slot button', async () => {
    render(<GigStaffSlotsSection {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Add Staff Slot')).toBeInTheDocument();
    });
  });

  it('does not render manual save button', async () => {
    render(<GigStaffSlotsSection {...mockProps} />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    });
  });

  it('shows an assignment row for a newly added staff slot without reloading (regression for #16)', async () => {
    render(<GigStaffSlotsSection {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Add Staff Slot')).toBeInTheDocument();
    });

    // The pre-existing slot from getGig() has one assignment, giving one
    // "Search for user..." field already on screen.
    const before = screen.getAllByPlaceholderText('Search for user...').length;

    fireEvent.click(screen.getByText('Add Staff Slot'));

    // A freshly-added slot defaults to Required: 1, so it should render
    // exactly one more assignment row right away — not zero, only fixed by
    // bumping Required or reloading.
    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('Search for user...')).toHaveLength(before + 1);
    });
  });
});
