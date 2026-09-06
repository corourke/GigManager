import type { ReactElement } from 'react';
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import AddOrganizationContactDialog from './AddOrganizationContactDialog';
import * as organizationService from '../../services/organization.service';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

vi.mock('../../services/organization.service', () => ({
  addOrganizationContact: vi.fn(),
  linkExistingPersonToOrganization: vi.fn(),
  findOrganizationPersonMatches: vi.fn(),
}));

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  orgId: 'org-1',
  organizationName: 'The Venue',
  hasPrimaryContact: false,
};

describe('AddOrganizationContactDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(organizationService.findOrganizationPersonMatches).mockResolvedValue([]);
  });

  it('does not require an email to add a new contact (issue #5)', async () => {
    vi.mocked(organizationService.addOrganizationContact).mockResolvedValue({ user_id: 'u1', member: {} } as any);
    render(<AddOrganizationContactDialog {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('First Name *'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText('Last Name *'), { target: { value: 'Doe' } });
    fireEvent.click(screen.getByText('Add New Contact'));

    await waitFor(() => expect(organizationService.addOrganizationContact).toHaveBeenCalledWith('org-1', {
      firstName: 'Jane',
      lastName: 'Doe',
      email: undefined,
      phone: undefined,
      title: undefined,
      isPrimary: true,
    }));
  });

  it('blocks submit when name is missing, without requiring email', async () => {
    render(<AddOrganizationContactDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('Add New Contact'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('First and last name are required'));
    expect(organizationService.addOrganizationContact).not.toHaveBeenCalled();
  });

  it('surfaces an existing match and lets the user link them instead of creating a new person', async () => {
    vi.mocked(organizationService.findOrganizationPersonMatches).mockImplementation(async (_orgId, query) => {
      if (query.search === 'Jane Doe') {
        return [{
          member_id: 'm1',
          user_id: 'existing-user-1',
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane@example.com',
          phone: null,
          role: 'Viewer',
          contact_title: null,
          user_status: 'contact',
        }];
      }
      return [];
    });
    vi.mocked(organizationService.linkExistingPersonToOrganization).mockResolvedValue({ user_id: 'existing-user-1', member: {} } as any);

    render(<AddOrganizationContactDialog {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('First Name *'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText('Last Name *'), { target: { value: 'Doe' } });

    await waitFor(() => expect(screen.getByText(/Found a possible match/)).toBeInTheDocument());
    fireEvent.click(screen.getByText('Use this person'));

    await waitFor(() => expect(organizationService.linkExistingPersonToOrganization).toHaveBeenCalledWith('org-1', {
      userId: 'existing-user-1',
      title: undefined,
      isPrimary: true,
    }));
    // Picking an existing person must never also create a duplicate.
    expect(organizationService.addOrganizationContact).not.toHaveBeenCalled();
  });

  it('creates a new contact anyway when the user ignores a suggested match', async () => {
    vi.mocked(organizationService.findOrganizationPersonMatches).mockResolvedValue([{
      member_id: 'm1',
      user_id: 'existing-user-1',
      first_name: 'Jane',
      last_name: 'Doe',
      email: null,
      phone: null,
      role: 'Viewer',
      contact_title: null,
      user_status: 'contact',
    }]);
    vi.mocked(organizationService.addOrganizationContact).mockResolvedValue({ user_id: 'new-user-1', member: {} } as any);

    render(<AddOrganizationContactDialog {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('First Name *'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText('Last Name *'), { target: { value: 'Doe' } });

    await waitFor(() => expect(screen.getByText(/Found a possible match/)).toBeInTheDocument());

    // Explicitly choosing to create a new one anyway, despite the suggestion.
    fireEvent.click(screen.getByText('Add New Contact'));

    await waitFor(() => expect(organizationService.addOrganizationContact).toHaveBeenCalled());
    expect(organizationService.linkExistingPersonToOrganization).not.toHaveBeenCalled();
  });
});
