import { describe, it, expect } from 'vitest';
import { managesGigOwner, isInactiveOn, gigOwnerName } from './gigOwnership';

// #175: every gig has an owner organization; status, owner, parent and Duplicate are its
// Admins' and Managers'. An organization can be Inactive on a gig (a flag on each of its roles).
const gig = {
  owner_organization_id: 'org-a',
  participants: [
    { organization_id: 'org-a', role: 'Production', inactive: false, organization: { id: 'org-a', name: 'Org A' } },
    { organization_id: 'org-b', role: 'Sound', inactive: true, organization: { id: 'org-b', name: 'Org B' } },
    { organization_id: 'org-b', role: 'Lighting', inactive: true, organization: { id: 'org-b', name: 'Org B' } },
    { organization_id: 'org-c', role: 'Act', organization: { id: 'org-c', name: 'Org C' } },
  ],
};

describe('managesGigOwner', () => {
  it("is true for the owner's Admins and Managers", () => {
    expect(managesGigOwner(gig, 'org-a', 'Admin')).toBe(true);
    expect(managesGigOwner(gig, 'org-a', 'Manager')).toBe(true);
  });
  it("is false for the owner's Staff and Viewers", () => {
    expect(managesGigOwner(gig, 'org-a', 'Staff')).toBe(false);
    expect(managesGigOwner(gig, 'org-a', 'Viewer')).toBe(false);
  });
  it("is false for another participant's Admin", () => {
    expect(managesGigOwner(gig, 'org-c', 'Admin')).toBe(false);
  });
  it('is false with no gig or organization', () => {
    expect(managesGigOwner(null, 'org-a', 'Admin')).toBe(false);
    expect(managesGigOwner(gig, undefined, 'Admin')).toBe(false);
  });
});

describe('isInactiveOn', () => {
  it('is true when the organization is Inactive on the gig', () => {
    expect(isInactiveOn(gig, 'org-b')).toBe(true);
  });
  it('is false for an active participant, one without the flag, or one not on the gig', () => {
    expect(isInactiveOn(gig, 'org-a')).toBe(false);
    expect(isInactiveOn(gig, 'org-c')).toBe(false);
    expect(isInactiveOn(gig, 'org-z')).toBe(false);
  });
});

describe('gigOwnerName', () => {
  it("names the owner organization from the gig's participants", () => {
    expect(gigOwnerName(gig)).toBe('Org A');
  });
  it('is empty when the owner is unknown', () => {
    expect(gigOwnerName({ owner_organization_id: 'org-x', participants: [] })).toBe('');
  });
});
