import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GigStaffSlotsSection from './GigStaffSlotsSection';
import { getGig, updateGigStaffSlots } from '../../services/gig.service';

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

// Radix Select doesn't open in jsdom; a native <select> lets tests pick a role.
vi.mock('../ui/select', () => ({
  Select: ({ value, onValueChange, disabled, children }: any) => (
    <select value={value ?? ''} disabled={disabled} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <option value="">{placeholder ?? ''}</option>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, disabled, children }: any) => <option value={value} disabled={disabled}>{children}</option>,
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

  it('asks before deleting a staff slot, naming its assigned people (#171)', async () => {
    render(<GigStaffSlotsSection {...mockProps} />);

    const deleteButton = await screen.findByRole('button', { name: 'Delete staff slot' });
    const rows = screen.getAllByPlaceholderText('Search for user...').length;
    fireEvent.click(deleteButton);

    // The slot is still there until the deletion is confirmed.
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Delete staff slot?');
    expect(dialog).toHaveTextContent('Sound Engineer');
    expect(dialog).toHaveTextContent('John Doe');
    expect(screen.getAllByPlaceholderText('Search for user...')).toHaveLength(rows);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getAllByPlaceholderText('Search for user...')).toHaveLength(rows);

    fireEvent.click(screen.getByRole('button', { name: 'Delete staff slot' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => {
      expect(screen.queryAllByPlaceholderText('Search for user...')).toHaveLength(0);
    });
  });
});

describe('GigStaffSlotsSection deletes only rows it loaded (#92)', () => {
  const SLOT_A = '11111111-1111-4111-8111-111111111111';
  const ASG_A = '22222222-2222-4222-8222-222222222222';
  const SLOT_B = '33333333-3333-4333-8333-333333333333';
  const ASG_B = '44444444-4444-4444-8444-444444444444';
  const NEW_SLOT = '55555555-5555-4555-8555-555555555555';
  const mockProps = {
    gigId: 'test-gig-id',
    currentOrganizationId: 'current-org-id',
    participantOrganizationIds: ['current-org-id'],
  };
  const slot = (id: string, role: string, assignmentId: string, userId: string) => ({
    id, organization_id: 'current-org-id', role, count: 1, notes: '',
    staff_assignments: [{ id: assignmentId, user_id: userId, user: { first_name: userId, last_name: '' }, status: 'Confirmed', rate: 50, fee: null, notes: '' }],
  });
  const calls = () => vi.mocked(updateGigStaffSlots).mock.calls;
  const removeSlotButtons = (container: HTMLElement) =>
    [...container.querySelectorAll('.lucide-trash-2')].map((svg) => svg.closest('button')!) as HTMLElement[];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getGig).mockResolvedValue({
      staff_slots: [slot(SLOT_A, 'Sound Engineer', ASG_A, 'user-a'), slot(SLOT_B, 'Lighting Tech', ASG_B, 'user-b')],
    } as any);
    vi.mocked(updateGigStaffSlots).mockImplementation(async (_gigId, slots) => ({
      success: true,
      slotIds: slots.map((s) => s.id ?? NEW_SLOT),
      assignmentIds: slots.map((s) => (s.assignments ?? []).map((a) => a.id)),
    }));
  });

  it('passes the slots and assignments it loaded, so a removed one is deleted and rows added elsewhere are not', async () => {
    const { container } = render(<GigStaffSlotsSection {...mockProps} />);
    await waitFor(() => expect(removeSlotButtons(container)).toHaveLength(2));

    fireEvent.click(removeSlotButtons(container)[1]);

    await waitFor(() => expect(updateGigStaffSlots).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(calls()[0][1].map((s) => s.id)).toEqual([SLOT_A]);
    expect([...calls()[0][3]!].sort()).toEqual([SLOT_A, ASG_A, SLOT_B, ASG_B].sort());
  });

  it('deletes a slot it added on an earlier save once the user removes it', async () => {
    const { container } = render(<GigStaffSlotsSection {...mockProps} />);
    await waitFor(() => expect(removeSlotButtons(container)).toHaveLength(2));
    await waitFor(() => expect(screen.getAllByRole('option', { name: 'Lighting Tech' }).length).toBeGreaterThan(0));

    fireEvent.click(screen.getByText('Add Staff Slot'));
    const roleSelects = await waitFor(() => {
      const found = screen.getAllByRole('combobox').filter((s) => (s as HTMLSelectElement).options[0]?.text === 'Select role');
      expect(found).toHaveLength(3);
      return found;
    });
    fireEvent.change(roleSelects[2], { target: { value: 'Lighting Tech' } });
    await waitFor(() => expect(updateGigStaffSlots).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(calls()[0][1][2].id).toBeUndefined();

    fireEvent.click(removeSlotButtons(container)[2]);

    await waitFor(() => expect(calls().at(-1)![1].map((s) => s.id)).toEqual([SLOT_A, SLOT_B]), { timeout: 3000 });
    expect(calls().at(-1)![3]).toContain(NEW_SLOT);
  });
});
