import type { ReactElement } from 'react';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TeamScreen from './TeamScreen';
import { makeUser, makeOrganization } from '../test/factories';

function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const { member } = vi.hoisted(() => ({
  member: {
    id: 'member-1',
    organization_id: 'org-1',
    user_id: 'user-2',
    role: 'Staff' as const,
    default_staff_role_id: null,
    created_at: '2026-01-01T00:00:00Z',
    user: {
      id: 'user-2',
      first_name: 'Jamie',
      last_name: 'Smith',
      email: 'jamie@example.com',
      avatar_url: null,
      timezone: null,
      user_status: 'active',
      last_sign_in_at: null,
    },
  },
}));

vi.mock('../services/organization.service', () => ({
  getOrganizationMembersWithAuth: vi.fn().mockResolvedValue([member]),
  getOrganizationInvitations: vi.fn().mockResolvedValue([]),
  getStaffRoles: vi.fn().mockResolvedValue([]),
  addExistingUserToOrganization: vi.fn(),
  inviteUserToOrganization: vi.fn(),
  updateMemberDetails: vi.fn(),
  removeMember: vi.fn(),
  cancelInvitation: vi.fn(),
  addOrganizationContact: vi.fn(),
  linkExistingPersonToOrganization: vi.fn(),
}));

vi.mock('../services/user.service', () => ({
  searchAllUsers: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/accessRequest.service', () => ({
  getOrgAccessRequests: vi.fn().mockResolvedValue([]),
  createAccessRequest: vi.fn(),
  decideAccessRequest: vi.fn(),
}));

const mockProps = {
  organization: makeOrganization({ name: 'Test Org' }),
  user: makeUser(),
  userRole: 'Admin' as const,
  onNavigateToGigs: vi.fn(),
  onSwitchOrganization: vi.fn(),
  onLogout: vi.fn(),
};

describe('TeamScreen', () => {
  it('opens the member when the name cell is clicked (#27)', async () => {
    const ue = userEvent.setup();
    const onViewMember = vi.fn();
    render(<TeamScreen {...mockProps} onViewMember={onViewMember} />);

    await waitFor(() => {
      expect(screen.getByText('Jamie Smith')).toBeInTheDocument();
    });

    await ue.click(screen.getByText('Jamie Smith'));

    expect(onViewMember).toHaveBeenCalledWith('member-1');
  });
});
