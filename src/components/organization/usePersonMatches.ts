import { useQuery } from '@tanstack/react-query';
import { findOrganizationPersonMatches, type OrganizationPersonMatch } from '../../services/organization.service';

/**
 * Debounced search for an existing person on an organization by name, email,
 * or phone — the caller is responsible for debouncing the raw input (see
 * AddTeamMemberDialog's userSearchQuery/debouncedQuery pattern) before
 * passing it in here. Disabled entirely when no search term is present, to
 * avoid firing a query on every keystroke of an unrelated field.
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
  });
  return { ...query, hasQuery };
}
