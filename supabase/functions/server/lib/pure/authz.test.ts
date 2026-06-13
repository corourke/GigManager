import { describe, it, expect } from 'vitest';
import { parseBearer, isRoleAllowed, orgsIntersect, requireGigCreateOrgId } from './authz';

describe('parseBearer', () => {
  it('extracts the token from a Bearer header', () => {
    expect(parseBearer('Bearer abc123')).toBe('abc123');
  });
  it('returns null for missing, empty, or malformed headers', () => {
    expect(parseBearer(null)).toBeNull();
    expect(parseBearer(undefined)).toBeNull();
    expect(parseBearer('')).toBeNull();
    expect(parseBearer('Bearer')).toBeNull();
    expect(parseBearer('Bearer ')).toBeNull();
  });
});

describe('isRoleAllowed', () => {
  it('permits any role when no allow-list is given (any-member)', () => {
    expect(isRoleAllowed('Viewer')).toBe(true);
    expect(isRoleAllowed('Staff', [])).toBe(true);
  });
  it('enforces the allow-list when provided', () => {
    expect(isRoleAllowed('Admin', ['Admin', 'Manager'])).toBe(true);
    expect(isRoleAllowed('Manager', ['Admin', 'Manager'])).toBe(true);
    expect(isRoleAllowed('Staff', ['Admin', 'Manager'])).toBe(false);
    expect(isRoleAllowed('Viewer', ['Admin', 'Manager'])).toBe(false);
  });
  it('rejects a null/undefined role', () => {
    expect(isRoleAllowed(null, ['Admin'])).toBe(false);
    expect(isRoleAllowed(undefined)).toBe(false);
  });
});

describe('orgsIntersect (gig access model)', () => {
  it('grants access when the caller shares a participant org', () => {
    expect(orgsIntersect(['org-a', 'org-b'], ['org-b', 'org-c'])).toBe(true);
  });
  it('denies access when there is no shared org (the cross-tenant case)', () => {
    expect(orgsIntersect(['org-a'], ['org-b', 'org-c'])).toBe(false);
  });
  it('denies when either side is empty', () => {
    expect(orgsIntersect([], ['org-a'])).toBe(false);
    expect(orgsIntersect(['org-a'], [])).toBe(false);
  });

  // Q-D fix (inventory #32): the calendar sync-gig-all-users route now gates on
  // this intersection. A caller who shares no org with the gig is denied.
  it('Q-D: a non-participant cannot pass the calendar-sync access check', () => {
    const callerOrgs = ['org-outsider'];
    const gigParticipantOrgs = ['org-venue', 'org-act'];
    expect(orgsIntersect(callerOrgs, gigParticipantOrgs)).toBe(false);
  });
});

describe('requireGigCreateOrgId (Q-C fix, inventory #21)', () => {
  it('rejects gig creation when primary_organization_id is absent', () => {
    // This is the previously-broken contract: the legacy handler created the
    // gig with no permission check when the field was omitted.
    expect(requireGigCreateOrgId({}).ok).toBe(false);
    expect(requireGigCreateOrgId({ primary_organization_id: null }).ok).toBe(false);
    expect(requireGigCreateOrgId(null).ok).toBe(false);
  });

  it('resolves the org id to authorize against when present', () => {
    const result = requireGigCreateOrgId({ primary_organization_id: 'org-1' });
    expect(result).toEqual({ ok: true, orgId: 'org-1' });
  });
});
