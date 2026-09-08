import type { ReactElement } from 'react';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { makeUser, makeOrganization } from '../test/factories';
import * as accessRequestService from '../services/accessRequest.service';

// src/test/setup.ts globally no-ops NotificationBell for every other screen
// test that renders AppHeader — undo that here since this file exercises
// the real component.
vi.unmock('./NotificationBell');
const { default: NotificationBell } = await import('./NotificationBell');

function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

const mockUseAuth = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../services/accessRequest.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/accessRequest.service')>();
  return {
    ...actual,
    getMyAccessRequests: vi.fn().mockResolvedValue([]),
    getOrgAccessRequests: vi.fn().mockResolvedValue([]),
    getModeratorAccessRequests: vi.fn().mockResolvedValue([]),
    markAccessRequestSeen: vi.fn().mockResolvedValue(undefined),
  };
});

const org = makeOrganization({ id: 'org-1', name: 'Acme Productions' });

describe('NotificationBell (issue #33/#45)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(accessRequestService.getMyAccessRequests).mockResolvedValue([]);
    vi.mocked(accessRequestService.getOrgAccessRequests).mockResolvedValue([]);
    vi.mocked(accessRequestService.getModeratorAccessRequests).mockResolvedValue([]);
    mockUseAuth.mockReturnValue({
      user: makeUser(),
      organizations: [],
      selectOrganization: vi.fn(),
    });
  });

  it('shows no badge when there is nothing pending or unseen', async () => {
    render(<NotificationBell />);
    await waitFor(() => expect(accessRequestService.getMyAccessRequests).toHaveBeenCalled());
    expect(screen.queryByText(/\d/)).not.toBeInTheDocument();
  });

  it('badges an unseen outcome notice', async () => {
    vi.mocked(accessRequestService.getMyAccessRequests).mockResolvedValue([
      {
        id: 'req-1',
        organization_id: 'org-1',
        requester_id: 'user-1',
        requested_role: 'Admin',
        message: null,
        status: 'approved',
        handled_by: 'admin-1',
        handled_at: '2026-01-01T00:00:00Z',
        response_message: null,
        requester_seen_at: null,
        created_at: '2026-01-01T00:00:00Z',
        requester: { id: 'user-1', first_name: 'Test', last_name: 'User', email: 't@example.com', avatar_url: null },
        organization: { id: 'org-1', name: 'Acme Productions', claimed: true },
        handler: null,
      } as any,
    ]);

    render(<NotificationBell />);
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument());
  });

  it('badges a pending count for an org the user administers', async () => {
    mockUseAuth.mockReturnValue({
      user: makeUser(),
      organizations: [{ organization: org, role: 'Admin' }],
      selectOrganization: vi.fn(),
    });
    vi.mocked(accessRequestService.getOrgAccessRequests).mockResolvedValue([
      { id: 'req-2' } as any,
      { id: 'req-3' } as any,
    ]);

    render(<NotificationBell />);
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());
  });

  it('includes the moderator queue count for a platform moderator', async () => {
    mockUseAuth.mockReturnValue({
      user: makeUser({ platform_moderator: true }),
      organizations: [],
      selectOrganization: vi.fn(),
    });
    vi.mocked(accessRequestService.getModeratorAccessRequests).mockResolvedValue([{ id: 'req-4' } as any]);

    render(<NotificationBell />);
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument());
    // A non-moderator shouldn't trigger this query at all.
    expect(accessRequestService.getModeratorAccessRequests).toHaveBeenCalledTimes(1);
  });

  it('does not query the moderator queue for a non-moderator', async () => {
    render(<NotificationBell />);
    await waitFor(() => expect(accessRequestService.getMyAccessRequests).toHaveBeenCalled());
    expect(accessRequestService.getModeratorAccessRequests).not.toHaveBeenCalled();
  });
});
