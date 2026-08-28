import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import GigKitAssignmentsSection from './GigKitAssignmentsSection';
import { getGigKits } from '../../services/gig.service';
import { getKitsFlattenedSummary } from '../../services/kit.service';
import { checkEquipmentConflicts } from '../../services/conflictDetection.service';

vi.mock('../../services/gig.service', () => ({
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
  updateGigKitAssignments: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../services/kit.service', () => ({
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
  getKitsFlattenedSummary: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock('../../services/conflictDetection.service', () => ({
  checkEquipmentConflicts: vi.fn().mockResolvedValue({ conflicts: [], warnings: [] }),
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

describe('GigKitAssignmentsSection', () => {
  const mockProps = {
    gigId: 'test-gig-id',
    currentOrganizationId: 'current-org-id',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getGigKits).mockResolvedValue([
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
    ] as any);
    vi.mocked(getKitsFlattenedSummary).mockResolvedValue(new Map());
    vi.mocked(checkEquipmentConflicts).mockResolvedValue({ conflicts: [], warnings: [] });
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

  // Regression: previously there was no indication anywhere in the gig
  // editor that two assigned kits share the same physical equipment.
  it('flags two assigned kits that share a physical asset', async () => {
    vi.mocked(getGigKits).mockResolvedValue([
      {
        id: 'assignment-1', kit_id: 'kit-1', notes: '', assigned_at: '2024-01-15T10:00:00',
        kit: { id: 'kit-1', name: 'Mic Case', tag_number: 'TK-001', category: 'Sound', rental_value: '500', organization_id: 'current-org-id' },
      },
      {
        id: 'assignment-2', kit_id: 'kit-2', notes: '', assigned_at: '2024-01-15T10:00:00',
        kit: { id: 'kit-2', name: 'Vocal Rig', tag_number: 'TK-002', category: 'Sound', rental_value: '300', organization_id: 'current-org-id' },
      },
    ] as any);
    vi.mocked(getKitsFlattenedSummary).mockResolvedValue(new Map([
      ['kit-1', { totalValue: 0, totalItems: 1, assetIds: new Set(['asset-sm58']) }],
      ['kit-2', { totalValue: 0, totalItems: 1, assetIds: new Set(['asset-sm58']) }],
    ]));

    render(<GigKitAssignmentsSection {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Overlapping equipment')).toBeInTheDocument();
    });
    expect(screen.getByText('Mic Case')).toBeInTheDocument();
    expect(screen.getByText('Vocal Rig')).toBeInTheDocument();
  });

  it('does not flag kits with no shared assets', async () => {
    vi.mocked(getGigKits).mockResolvedValue([
      {
        id: 'assignment-1', kit_id: 'kit-1', notes: '', assigned_at: '2024-01-15T10:00:00',
        kit: { id: 'kit-1', name: 'Mic Case', tag_number: 'TK-001', category: 'Sound', rental_value: '500', organization_id: 'current-org-id' },
      },
      {
        id: 'assignment-2', kit_id: 'kit-2', notes: '', assigned_at: '2024-01-15T10:00:00',
        kit: { id: 'kit-2', name: 'Lighting Rig', tag_number: 'TK-002', category: 'Lighting', rental_value: '300', organization_id: 'current-org-id' },
      },
    ] as any);
    vi.mocked(getKitsFlattenedSummary).mockResolvedValue(new Map([
      ['kit-1', { totalValue: 0, totalItems: 1, assetIds: new Set(['asset-sm58']) }],
      ['kit-2', { totalValue: 0, totalItems: 1, assetIds: new Set(['asset-par-can']) }],
    ]));

    render(<GigKitAssignmentsSection {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Mic Case')).toBeInTheDocument();
    });
    expect(screen.queryByText('Overlapping equipment')).not.toBeInTheDocument();
  });

  // Regression: cross-gig equipment conflicts were only ever surfaced on a
  // separate read-only gig detail screen, checked once on mount — never in
  // the editor where kits are actually assigned.
  it('shows a cross-gig equipment conflict once gig dates are known', async () => {
    vi.mocked(checkEquipmentConflicts).mockResolvedValue({
      conflicts: [{
        level: 'conflict',
        type: 'equipment',
        gig_id: 'other-gig',
        gig_title: 'Other Show',
        start: '2024-02-01T00:00:00Z',
        end: '2024-02-01T04:00:00Z',
        details: { conflicting_kits: [{ kit_id: 'kit-1', kit_name: 'Test Kit' }] },
      }],
      warnings: [],
    });

    render(<GigKitAssignmentsSection {...mockProps} gigStart="2024-02-01T00:00:00Z" gigEnd="2024-02-01T04:00:00Z" />);

    await waitFor(() => {
      expect(checkEquipmentConflicts).toHaveBeenCalledWith('test-gig-id', '2024-02-01T00:00:00Z', '2024-02-01T04:00:00Z', undefined);
    });
    await waitFor(() => {
      expect(screen.getByText(/Other Show/)).toBeInTheDocument();
    });
  });

  it('does not check for cross-gig conflicts when gig dates are not yet known', async () => {
    render(<GigKitAssignmentsSection {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Select kit to assign...')).toBeInTheDocument();
    });
    expect(checkEquipmentConflicts).not.toHaveBeenCalled();
  });
});
