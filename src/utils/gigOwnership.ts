import type { UserRole } from './supabase/constants';
import { canManage } from './permissions';

/**
 * Gig ownership at the UI layer (#175). Every gig has an owner organization; its Admins
 * and Managers alone change the status, owner and parent, and duplicate it. An
 * organization can be Inactive on a gig: a flag on each of its roles there. These mirror
 * the database rules so the UI doesn't offer what would be refused.
 */
interface GigLike {
  owner_organization_id?: string | null;
  participants?: Array<{
    organization_id?: string | null;
    inactive?: boolean | null;
    organization?: { id?: string; name?: string; claimed?: boolean | null } | null;
  }> | null;
}

/** The user works as an Admin or Manager of the gig's owner organization. */
export function managesGigOwner(
  gig: GigLike | null | undefined,
  organizationId: string | null | undefined,
  role: UserRole | null | undefined,
): boolean {
  return !!gig?.owner_organization_id && gig.owner_organization_id === organizationId && canManage(role);
}

/** The organization is on the gig and marked Inactive there. */
export function isInactiveOn(gig: GigLike | null | undefined, organizationId: string | null | undefined): boolean {
  if (!organizationId) return false;
  return (gig?.participants ?? []).some(
    (p) => (p.organization_id ?? p.organization?.id) === organizationId && !!p.inactive,
  );
}

/** The owner organization's name, from the gig's participants ('' if it isn't among them). */
export function gigOwnerName(gig: GigLike | null | undefined): string {
  const owner = (gig?.participants ?? []).find(
    (p) => (p.organization_id ?? p.organization?.id) === gig?.owner_organization_id,
  );
  return owner?.organization?.name ?? '';
}

/**
 * Why deleting the gig would be refused, or null (#175; Cameron 10-13). Mirrors the gigs
 * DELETE rule: an Admin of the owner, no child gigs, no other claimed organization on it.
 */
export function deleteGigBlockedReason(
  gig: GigLike | null | undefined,
  organizationId: string | null | undefined,
  role: UserRole | null | undefined,
  childGigCount: number,
): string | null {
  if (!gig?.owner_organization_id || gig.owner_organization_id !== organizationId || role !== 'Admin') {
    return "Only an Admin of the gig's owner organization can delete it.";
  }
  if (childGigCount > 0) {
    return 'Delete gig is disabled as this gig has child gigs -- delete them first, or you can Cancel the gig instead.';
  }
  const othersClaimed = (gig.participants ?? []).some((p) =>
    (p.organization_id ?? p.organization?.id) !== gig.owner_organization_id && !!p.organization?.claimed);
  if (othersClaimed) {
    return 'Delete gig is disabled as there are other claimed organizations participating -- you can Cancel the gig instead.';
  }
  return null;
}

/**
 * What Inactive means, in Cameron's terms (10-13): the organization is being removed from the
 * gig. Its financial records and notes are kept so sunk costs and agreements can be settled;
 * its staff and equipment are released first, and it can't change anything else.
 */
export function inactiveBannerText(orgName: string): string {
  return `${orgName} is Inactive on this gig: it is being removed. Its financial records and notes are kept; everything else is read-only.`;
}

export function markInactiveConfirmText(orgName: string): string {
  return `Mark ${orgName} Inactive? It's being removed from the gig: its financial records and notes are kept ` +
    `so sunk costs and agreements can be settled, but it can't change anything else. Release its staff and equipment first.`;
}

/**
 * After the database refuses a removal: offer Mark Inactive only when it says to (the
 * organization has financial records, and nothing to release first) and the organization
 * isn't Inactive already.
 */
export function offersMarkInactive(refusal: string, alreadyInactive: boolean): boolean {
  return !alreadyInactive && /Mark it Inactive instead/.test(refusal);
}
