import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GigParticipantsSection from './GigParticipantsSection';
import { updateGigParticipants } from '../../services/gig.service';

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

// Radix Select doesn't open in jsdom; a native <select> lets tests pick a role.
vi.mock('../ui/select', () => ({
  Select: ({ value, onValueChange, disabled, children }: any) => (
    <select aria-label="Role" value={value} disabled={disabled} onChange={(e) => onValueChange(e.target.value)}>
      <option value="">Role</option>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

vi.mock('../../services/organization.service', () => ({
  getOrganizationContacts: vi.fn().mockResolvedValue([]),
}));

// The real OrganizationSelector debounces a network search; stub it with a
// single button that reports a fixed pick, so tests can select an
// organization for a newly-added row deterministically and synchronously.
// Once a selection is made (selectedOrganization is set), just show its name,
// mirroring the real component's compact "selected" display closely enough
// for assertions that look for the organization name on screen.
vi.mock('../OrganizationSelector', () => ({
  default: ({ onSelect, selectedOrganization }: { onSelect: (org: any) => void; selectedOrganization: any }) =>
    selectedOrganization ? (
      <span>{selectedOrganization.name}</span>
    ) : (
      <button
        type="button"
        onClick={() => onSelect({ id: 'org-2', name: 'New Org', roles: ['Production'] })}
      >
        Mock Select Org
      </button>
    ),
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

  it('shows the "More actions" menu for a newly added participant without reloading (regression for #28)', async () => {
    render(<GigParticipantsSection {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Org')).toBeInTheDocument();
    });

    const before = screen.getAllByTitle('More actions').length;

    fireEvent.click(screen.getByText('Add Participant'));

    // The newly added row renders the (mocked) OrganizationSelector until an
    // organization is picked for it.
    fireEvent.click(await screen.findByText('Mock Select Org'));

    // Picking an organization goes through setValue(), which the fields[]
    // snapshot from useFieldArray does not pick up — only the reactive
    // watch()-derived form values do. The "More actions" menu (and the
    // contact list behind it) should appear right away, not after a reload.
    await waitFor(() => {
      expect(screen.getAllByTitle('More actions')).toHaveLength(before + 1);
    });
  });

  it('reuses the database ids from the first autosave, so later autosaves update rows instead of re-creating them (#69)', async () => {
    const dbIds: Record<string, string> = {
      'current-org-id': '22222222-2222-4222-8222-222222222222',
      'org-2': '33333333-3333-4333-8333-333333333333',
    };
    vi.mocked(updateGigParticipants).mockImplementation(async (_gigId, participants) => ({
      success: true,
      ids: participants.map((p) => p.id ?? dbIds[p.organization_id]),
    }));

    render(<GigParticipantsSection {...mockProps} />);
    await waitFor(() => expect(screen.getByText('Test Org')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Add Participant'));
    fireEvent.click(await screen.findByText('Mock Select Org'));
    const roleSelects = screen.getAllByLabelText('Role');
    fireEvent.change(roleSelects[roleSelects.length - 1], { target: { value: 'Venue' } });

    // First autosave: the new row (and the current-org placeholder) have no database id yet.
    await waitFor(() => expect(updateGigParticipants).toHaveBeenCalledTimes(1), { timeout: 3000 });
    const first = vi.mocked(updateGigParticipants).mock.calls[0][1];
    expect(first.find((p) => p.organization_id === 'org-2')?.id).toBeUndefined();
    // History is logged against the org the user is working as (#103).
    expect(vi.mocked(updateGigParticipants).mock.calls[0][2]).toEqual({
      organization_id: 'current-org-id',
      actor_org_name: 'Current Org',
    });

    // A later edit to the same row (marking it as client) triggers another autosave.
    const stars = screen.getAllByTitle('Mark as client');
    fireEvent.click(stars[stars.length - 1]);

    await waitFor(() => expect(updateGigParticipants).toHaveBeenCalledTimes(2), { timeout: 3000 });
    const second = vi.mocked(updateGigParticipants).mock.calls[1][1];
    expect(second.find((p) => p.organization_id === 'org-2')?.id).toBe(dbIds['org-2']);
    expect(second.find((p) => p.organization_id === 'current-org-id')?.id).toBe(dbIds['current-org-id']);
  });
});
