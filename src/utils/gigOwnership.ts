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
    organization?: { id?: string; name?: string } | null;
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
