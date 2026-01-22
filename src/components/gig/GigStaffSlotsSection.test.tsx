import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import GigStaffSlotsSection from './GigStaffSlotsSection';

vi.mock('../../utils/api', () => ({
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

  it('renders save button', async () => {
    render(<GigStaffSlotsSection {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
  });
});
