import type { ReactElement } from 'react';
import { render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OrganizationContactsSection from './OrganizationContactsSection';
import * as organizationService from '../../services/organization.service';
import * as userService from '../../services/user.service';

function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../services/user.service', () => ({
  searchAllUsers: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/gigParticipantContacts.service', () => ({
  addGigParticipantContact: vi.fn(),
  createContactPerson: vi.fn(),
}));

vi.mock('../../services/organization.service', () => ({
  getOrganizationContacts: vi.fn(),
  addOrganizationContact: vi.fn(),
  linkExistingPersonToOrganization: vi.fn(),
  updateOrganizationContact: vi.fn(),
  setOrganizationPrimaryContact: vi.fn(),
  unsetOrganizationPrimaryContact: vi.fn(),
  removeOrganizationContact: vi.fn(),
}));

const defaultProps = {
  organizationId: 'org-1',
  organizationName: 'Acme Productions',
  canManage: true,
};

describe('OrganizationContactsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userService.searchAllUsers).mockResolvedValue([]);
  });

  it('lists every organization member, grouped by whether they have a login (regression: no longer filtered out)', async () => {
    vi.mocked(organizationService.getOrganizationContacts).mockResolvedValue([
      // A real, active-status team member with no special flag -- this used
      // to be filtered out of the old "Contacts" list entirely.
      { id: 'm1', organization_id: 'org-1', user_id: 'u1', role: 'Staff', contact_title: null, is_primary_contact: false, created_at: '2026-01-01', user: { id: 'u1', first_name: 'Sam', last_name: 'Roadie', email: 'sam@example.com', phone: null, user_status: 'active' } },
      // A login-less rolodex contact.
      { id: 'm2', organization_id: 'org-1', user_id: 'u2', role: 'Viewer', contact_title: 'Venue Manager', is_primary_contact: true, created_at: '2026-01-02', user: { id: 'u2', first_name: 'Jane', last_name: 'Doe', email: null, phone: '555-1234', user_status: 'contact' } },
    ] as any);

    render(<OrganizationContactsSection {...defaultProps} />);

    await waitFor(() => expect(screen.getByText('Sam Roadie')).toBeInTheDocument());
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();

    // Group headings render as <h3>; the Card's own overall title ("Contacts")
    // renders as <h4>, so scope by heading level to avoid the ambiguous match.
    const teamHeading = screen.getByRole('heading', { name: 'Team Members', level: 3 });
    const teamGroup = teamHeading.closest('div')!.parentElement as HTMLElement;
    expect(within(teamGroup).getByText('Sam Roadie')).toBeInTheDocument();
    expect(within(teamGroup).queryByText('Jane Doe')).not.toBeInTheDocument();

    const contactsHeading = screen.getByRole('heading', { name: 'Contacts', level: 3 });
    const contactsGroup = contactsHeading.closest('div')!.parentElement as HTMLElement;
    expect(within(contactsGroup).getByText('Jane Doe')).toBeInTheDocument();
    expect(within(contactsGroup).queryByText('Sam Roadie')).not.toBeInTheDocument();
  });

  it('only renders the group that has members', async () => {
    vi.mocked(organizationService.getOrganizationContacts).mockResolvedValue([
      { id: 'm2', organization_id: 'org-1', user_id: 'u2', role: 'Viewer', contact_title: null, is_primary_contact: false, created_at: '2026-01-02', user: { id: 'u2', first_name: 'Jane', last_name: 'Doe', email: null, phone: null, user_status: 'contact' } },
    ] as any);

    render(<OrganizationContactsSection {...defaultProps} />);

    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Team Members', level: 3 })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Contacts', level: 3 })).toBeInTheDocument();
  });
});
