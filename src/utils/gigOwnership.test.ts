import { describe, it, expect } from 'vitest';
import { managesGigOwner, isInactiveOn, gigOwnerName, deleteGigBlockedReason } from './gigOwnership';

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

// #175 (Cameron 10-13): Delete stays in the menu, disabled with a plain reason when refused.
describe('deleteGigBlockedReason', () => {
  const claimedGig = (otherClaimed: boolean) => ({
    owner_organization_id: 'org-a',
    participants: [
      { organization_id: 'org-a', organization: { id: 'org-a', name: 'Org A', claimed: true } },
      { organization_id: 'org-v', organization: { id: 'org-v', name: 'Venue', claimed: false } },
      ...(otherClaimed ? [{ organization_id: 'org-b', organization: { id: 'org-b', name: 'Org B', claimed: true } }] : []),
    ],
  });

  it("is null for the owner's Admin with no children and no other claimed organization", () => {
    expect(deleteGigBlockedReason(claimedGig(false), 'org-a', 'Admin', 0)).toBeNull();
  });
  it("names the owner's Admins first", () => {
    expect(deleteGigBlockedReason(claimedGig(true), 'org-a', 'Manager', 2)).toBe("Only an Admin of the gig's owner organization can delete it.");
    expect(deleteGigBlockedReason(claimedGig(false), 'org-b', 'Admin', 0)).toBe("Only an Admin of the gig's owner organization can delete it.");
  });
  it('then child gigs', () => {
    expect(deleteGigBlockedReason(claimedGig(true), 'org-a', 'Admin', 1))
      .toBe('Delete gig is disabled as this gig has child gigs -- delete them first, or you can Cancel the gig instead.');
  });
  it("then other claimed organizations, in Cameron's words", () => {
    expect(deleteGigBlockedReason(claimedGig(true), 'org-a', 'Admin', 0))
      .toBe('Delete gig is disabled as there are other claimed organizations participating -- you can Cancel the gig instead.');
  });
});
