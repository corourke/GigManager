import { describe, it, expect } from 'vitest';
import {
  parseBearer,
  isRoleAllowed,
  orgsIntersect,
  requireGigCreateOrgId,
  emailDomainMatches,
  canDecideAccessRequest,
  shouldClaimOrgOnApproval,
} from './authz';

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

describe('emailDomainMatches (issue #33 point 7 — self-join Staff option)', () => {
  it('matches a domain in a comma-separated list, case-insensitively', () => {
    expect(emailDomainMatches('user@Example.com', 'example.com, other.org')).toBe(true);
    expect(emailDomainMatches('user@other.org', 'example.com,other.org')).toBe(true);
  });
  it('ignores surrounding whitespace in the allowed_domains list', () => {
    expect(emailDomainMatches('user@example.com', ' example.com , other.org ')).toBe(true);
  });
  it('rejects a domain not in the list', () => {
    expect(emailDomainMatches('user@gmail.com', 'example.com,other.org')).toBe(false);
  });
  it('rejects when either input is missing or malformed', () => {
    expect(emailDomainMatches(null, 'example.com')).toBe(false);
    expect(emailDomainMatches('user@example.com', null)).toBe(false);
    expect(emailDomainMatches('user@example.com', '')).toBe(false);
    expect(emailDomainMatches('not-an-email', 'example.com')).toBe(false);
  });
});

describe('canDecideAccessRequest (issue #33, point 6)', () => {
  it('lets a platform moderator decide while the org is unclaimed', () => {
    expect(canDecideAccessRequest(false, true, null)).toBe(true);
    expect(canDecideAccessRequest(false, true, undefined)).toBe(true);
  });
  it('does not let a moderator decide once the org has an Admin', () => {
    expect(canDecideAccessRequest(true, true, null)).toBe(false);
  });
  it('lets that org\'s own Admin decide regardless of claimed status', () => {
    expect(canDecideAccessRequest(true, false, 'Admin')).toBe(true);
    expect(canDecideAccessRequest(false, false, 'Admin')).toBe(true);
  });
  it('rejects a Manager or Viewer of the org, and a non-moderator non-Admin outsider', () => {
    expect(canDecideAccessRequest(true, false, 'Manager')).toBe(false);
    expect(canDecideAccessRequest(false, false, 'Viewer')).toBe(false);
    expect(canDecideAccessRequest(false, false, null)).toBe(false);
  });
});

describe('shouldClaimOrgOnApproval (issue #33 bootstrap case)', () => {
  it('claims an unclaimed org when the approved role is Admin', () => {
    expect(shouldClaimOrgOnApproval(false, 'Admin')).toBe(true);
  });
  it('does not claim for a Manager approval', () => {
    expect(shouldClaimOrgOnApproval(false, 'Manager')).toBe(false);
  });
  it('does not re-claim an already-claimed org (e.g. approving a second Admin)', () => {
    expect(shouldClaimOrgOnApproval(true, 'Admin')).toBe(false);
  });
});
