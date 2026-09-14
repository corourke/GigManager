import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrganizationScreen from './OrganizationScreen';

vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'token' } } }),
    },
    functions: {
      invoke: vi.fn().mockRejectedValue(new Error('Google Places API error: 400')),
    },
    rpc: vi.fn().mockResolvedValue({ data: null }),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    })),
  })),
}));

const mockProps = {
  onOrganizationCreated: vi.fn(),
  onCancel: vi.fn(),
  userId: 'user-1',
};

describe('OrganizationScreen — business search failure', () => {
  // Issue #29: a failed Google Places search used to surface the raw
  // "Google Places API error: 400" string to the user via a toast, and fell
  // into the same UI branch as "no results found". It must now render a
  // distinct, friendly error state with the manual-entry fallback front and
  // center.
  it('shows a friendly message and manual-entry fallback instead of the raw API error', async () => {
    const user = userEvent.setup();
    render(<OrganizationScreen {...mockProps} />);

    await user.type(screen.getByPlaceholderText('Search for your business name...'), 'Acme Co');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByText("Couldn't reach business search")).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Fill in manually instead' })).toBeInTheDocument();

    expect(screen.queryByText(/Google Places API error/)).not.toBeInTheDocument();
    expect(screen.queryByText('No results found')).not.toBeInTheDocument();
  });
});
