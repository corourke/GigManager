import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { findOrganizationPersonMatches, type OrganizationPersonMatch } from '../../services/organization.service';

/**
 * Debounced search for an existing person on an organization by name, email,
 * or phone — the caller is responsible for debouncing the raw input (see
 * AddTeamMemberDialog's userSearchQuery/debouncedQuery pattern) before
 * passing it in here. Disabled entirely when no search term is present, to
 * avoid firing a query on every keystroke of an unrelated field.
 *
 * A failed search (permission denied, RPC not found because a migration
 * hasn't been applied yet, network error, etc.) must never look like "no
 * match found" — that's indistinguishable from an actual duplicate check
 * that passed, and would let someone create a real duplicate believing
 * they'd already checked. So this surfaces failures via a toast and the
 * returned isError/error, instead of letting callers default data to []
 * and quietly treat a failure as a clean search.
 */
export function usePersonMatches(
  organizationId: string,
  params: { search?: string; email?: string; phone?: string },
) {
  const hasQuery = !!(params.search?.trim() || params.email?.trim() || params.phone?.trim());
  const query = useQuery<OrganizationPersonMatch[]>({
    queryKey: ['orgPersonMatches', organizationId, params.search, params.email, params.phone],
    queryFn: () => findOrganizationPersonMatches(organizationId, params),
    enabled: hasQuery && !!organizationId,
    retry: false,
  });

  useEffect(() => {
    if (query.isError) {
      toast.error((query.error as any)?.message || "Couldn't check for existing matches — try again before adding.");
    }
  }, [query.isError, query.error]);

  return { ...query, hasQuery };
}
