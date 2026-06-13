import type { DbUser, DbOrganization } from '../utils/supabase/types';

/**
 * Test factories producing fully-valid rows matching the generated database
 * types. Use overrides for the fields a test cares about.
 */

export function makeUser(overrides: Partial<DbUser> = {}): DbUser {
  return {
    id: 'user-1',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    phone: null,
    avatar_url: null,
    address_line1: null,
    address_line2: null,
    city: null,
    state: null,
    postal_code: null,
    country: null,
    role_hint: null,
    timezone: null,
    user_status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeOrganization(overrides: Partial<DbOrganization> = {}): DbOrganization {
  return {
    id: 'org-1',
    name: 'Test Organization',
    roles: ['Production'],
    url: null,
    phone_number: null,
    address_line1: null,
    address_line2: null,
    city: null,
    state: null,
    postal_code: null,
    country: null,
    description: null,
    allowed_domains: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}
