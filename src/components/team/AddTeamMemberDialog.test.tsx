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
  // Exercised by the new "Add Without an Account" tab.
  addOrganizationContact: vi.fn(),
  linkExistingPersonToOrganization: vi.fn(),
  findOrganizationPersonMatches: vi.fn(),
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
    vi.mocked(organizationService.findOrganizationPersonMatches).mockResolvedValue([]);
    vi.mocked(userService.searchAllUsers).mockResolvedValue([]);
  });

  it('renders all three tabs, including the new quick-add tab', () => {
    render(<AddTeamMemberDialog {...defaultProps} />);
    expect(screen.getByText('Add Existing User')).toBeInTheDocument();
    expect(screen.getByText('Invite New User')).toBeInTheDocument();
    expect(screen.getByText('Add Without an Account')).toBeInTheDocument();
  });

  it('quick-adds a person without an account and without requiring email (issue #5)', async () => {
    vi.mocked(organizationService.addOrganizationContact).mockResolvedValue({ user_id: 'u1', member: {} } as any);
    render(<AddTeamMemberDialog {...defaultProps} />);

    fireEvent.mouseDown(screen.getByText('Add Without an Account'));
    fireEvent.change(screen.getByLabelText('First Name *'), { target: { value: 'Sam' } });
    fireEvent.change(screen.getByLabelText('Last Name *'), { target: { value: 'Roadie' } });
    fireEvent.click(screen.getByText('Add to Team'));

    await waitFor(() => expect(organizationService.addOrganizationContact).toHaveBeenCalledWith('org-1', {
      firstName: 'Sam',
      lastName: 'Roadie',
      phone: undefined,
      role: 'Staff',
    }));
  });

  it('requires a name before quick-adding', async () => {
    render(<AddTeamMemberDialog {...defaultProps} />);

    fireEvent.mouseDown(screen.getByText('Add Without an Account'));
    fireEvent.click(screen.getByText('Add to Team'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('First and last name are required'));
    expect(organizationService.addOrganizationContact).not.toHaveBeenCalled();
  });

  it('offers an existing match and links them instead of creating a duplicate', async () => {
    vi.mocked(organizationService.findOrganizationPersonMatches).mockResolvedValue([{
      member_id: 'm1',
      user_id: 'existing-1',
      first_name: 'Sam',
      last_name: 'Roadie',
      email: null,
      phone: null,
      role: 'Staff',
      contact_title: null,
      user_status: 'contact',
    }]);
    vi.mocked(organizationService.linkExistingPersonToOrganization).mockResolvedValue({ user_id: 'existing-1', member: {} } as any);

    render(<AddTeamMemberDialog {...defaultProps} />);

    fireEvent.mouseDown(screen.getByText('Add Without an Account'));
    fireEvent.change(screen.getByLabelText('First Name *'), { target: { value: 'Sam' } });
    fireEvent.change(screen.getByLabelText('Last Name *'), { target: { value: 'Roadie' } });

    await waitFor(() => expect(screen.getByText(/Found a possible match/)).toBeInTheDocument());
    fireEvent.click(screen.getByText('Use this person'));

    await waitFor(() => expect(organizationService.linkExistingPersonToOrganization).toHaveBeenCalledWith('org-1', {
      userId: 'existing-1',
      role: 'Staff',
    }));
    expect(organizationService.addOrganizationContact).not.toHaveBeenCalled();
  });
});
