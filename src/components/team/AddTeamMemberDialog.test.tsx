import type { ReactElement } from 'react';
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import AddTeamMemberDialog from './AddTeamMemberDialog';
import * as organizationService from '../../services/organization.service';
import * as userService from '../../services/user.service';

function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../services/user.service', () => ({
  searchAllUsers: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/organization.service', () => ({
  // Used by useTeamData's useTeamMutations — not exercised by these tests,
  // but must exist so the hook's useMutation() calls don't reference undefined.
  addExistingUserToOrganization: vi.fn(),
  inviteUserToOrganization: vi.fn(),
  updateMemberDetails: vi.fn(),
  removeMember: vi.fn(),
  cancelInvitation: vi.fn(),
  // Exercised by the new "No Account" tab.
  addOrganizationContact: vi.fn(),
  linkExistingPersonToOrganization: vi.fn(),
}));

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  orgId: 'org-1',
  organizationName: 'Acme Productions',
  excludeUserIds: [],
};

describe('AddTeamMemberDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userService.searchAllUsers).mockResolvedValue([]);
  });

  it('renders all three tabs, including the new quick-add tab', () => {
    render(<AddTeamMemberDialog {...defaultProps} />);
    expect(screen.getByText('Existing User')).toBeInTheDocument();
    expect(screen.getByText('Invite New')).toBeInTheDocument();
    expect(screen.getByText('No Account')).toBeInTheDocument();
  });

  it('quick-adds a person without an account and without requiring email (issue #5)', async () => {
    vi.mocked(organizationService.addOrganizationContact).mockResolvedValue({ user_id: 'u1', member: {} } as any);
    render(<AddTeamMemberDialog {...defaultProps} />);

    fireEvent.mouseDown(screen.getByText('No Account'));
    fireEvent.change(screen.getByLabelText('First Name *'), { target: { value: 'Sam' } });
    fireEvent.change(screen.getByLabelText('Last Name *'), { target: { value: 'Roadie' } });
    fireEvent.click(screen.getByText('Add to Team'));

    await waitFor(() => expect(organizationService.addOrganizationContact).toHaveBeenCalledWith('org-1', {
      firstName: 'Sam',
      lastName: 'Roadie',
      email: undefined,
      phone: undefined,
      role: 'Staff',
    }));
  });

  it('requires a name before quick-adding', async () => {
    render(<AddTeamMemberDialog {...defaultProps} />);

    fireEvent.mouseDown(screen.getByText('No Account'));
    fireEvent.click(screen.getByText('Add to Team'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('First and last name are required'));
    expect(organizationService.addOrganizationContact).not.toHaveBeenCalled();
  });

  it('searches system-wide (not scoped to this org) so a match on another org still surfaces', async () => {
    // Regression: this used to call a per-organization RPC that missed people who
    // are only members of a DIFFERENT organization — the same searchAllUsers path
    // the Existing User tab already uses must find them too.
    vi.mocked(userService.searchAllUsers).mockResolvedValue([
      { id: 'existing-1', first_name: 'Cameron', last_name: 'Orourke', email: 'cam@example.com', phone: null } as any,
    ]);
    vi.mocked(organizationService.linkExistingPersonToOrganization).mockResolvedValue({ user_id: 'existing-1', member: {} } as any);

    render(<AddTeamMemberDialog {...defaultProps} />);

    fireEvent.mouseDown(screen.getByText('No Account'));
    fireEvent.change(screen.getByLabelText('First Name *'), { target: { value: 'Cam' } });

    await waitFor(() => expect(userService.searchAllUsers).toHaveBeenCalledWith('Cam'));
    await waitFor(() => expect(screen.getByText(/Found a possible match/)).toBeInTheDocument());
    fireEvent.click(screen.getByText('Use this person'));

    await waitFor(() => expect(organizationService.linkExistingPersonToOrganization).toHaveBeenCalledWith('org-1', {
      userId: 'existing-1',
      role: 'Staff',
    }));
    expect(organizationService.addOrganizationContact).not.toHaveBeenCalled();
  });
});
