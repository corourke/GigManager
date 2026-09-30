import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCompleteUserData } from './user.service';
import { createClient } from '../utils/supabase/client';

vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

describe('getCompleteUserData (#94)', () => {
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockReturnValue({ rpc });
  });

  it('throws when the RPC fails, instead of reporting a user with no profile', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } });
    await expect(getCompleteUserData('user-1')).rejects.toMatchObject({ message: 'Failed to fetch' });
  });

  it('throws when the request itself rejects', async () => {
    rpc.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(getCompleteUserData('user-1')).rejects.toThrow('Failed to fetch');
  });

  it('returns a null profile for a genuinely new user', async () => {
    rpc.mockResolvedValue({ data: { profile: null, organizations: [] }, error: null });
    await expect(getCompleteUserData('user-1')).resolves.toEqual({ profile: null, organizations: [] });
  });

  it('maps the profile and memberships', async () => {
    const organization = { id: 'org-1', name: 'Org One' };
    rpc.mockResolvedValue({
      data: {
        profile: { id: 'user-1' },
        organizations: [{ user_id: 'user-1', organization_id: 'org-1', role: 'Admin', created_at: '2026-01-01', organization }],
      },
      error: null,
    });
    const result = await getCompleteUserData('user-1');
    expect(result.profile).toEqual({ id: 'user-1' });
    expect(result.organizations).toEqual([
      { user_id: 'user-1', organization_id: 'org-1', role: 'Admin', joined_at: '2026-01-01', organization },
    ]);
  });
});
