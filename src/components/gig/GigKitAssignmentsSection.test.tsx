import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import GigKitAssignmentsSection from './GigKitAssignmentsSection';

vi.mock('../../utils/api', () => ({
  getGigKits: vi.fn().mockResolvedValue([
    {
      id: 'assignment-1',
      kit_id: 'kit-1',
      kit: {
        id: 'kit-1',
        name: 'Test Kit',
        tag_number: 'TK-001',
        category: 'Sound',
        rental_value: '500',
        organization_id: 'current-org-id',
      },
      notes: '',
      assigned_at: '2024-01-15T10:00:00',
    },
  ]),
  getKits: vi.fn().mockResolvedValue([
    {
      id: 'kit-1',
      name: 'Test Kit',
      tag_number: 'TK-001',
      category: 'Sound',
      rental_value: '500',
      organization_id: 'current-org-id',
    },
    {
      id: 'kit-2',
      name: 'Another Kit',
      tag_number: 'TK-002',
      category: 'Lighting',
      rental_value: '300',
      organization_id: 'current-org-id',
    },
  ]),
  assignKitToGig: vi.fn().mockResolvedValue({}),
  removeKitFromGig: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    })),
  })),
}));

describe('GigKitAssignmentsSection', () => {
  const mockProps = {
    gigId: 'test-gig-id',
    currentOrganizationId: 'current-org-id',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without throwing errors', () => {
    expect(() => {
      render(<GigKitAssignmentsSection {...mockProps} />);
    }).not.toThrow();
  });

  it('displays loading state initially', () => {
    render(<GigKitAssignmentsSection {...mockProps} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders kit selector', async () => {
    render(<GigKitAssignmentsSection {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Select kit to assign...')).toBeInTheDocument();
    });
  });

  it('does not render manual save button', async () => {
    render(<GigKitAssignmentsSection {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    });
  });
});
