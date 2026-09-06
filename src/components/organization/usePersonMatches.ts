import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { searchAllUsers } from '../../services/user.service';
import type { User } from '../../utils/supabase/types';

/**
 * Debounced, system-wide search for an existing person by name or email —
 * the same search_users_secure path the Team screen's "Add Existing User"
 * tab already uses. Deliberately NOT scoped to one organization's members:
 * the point is to avoid creating duplicate people anywhere in the system,
 * so someone who's only a member of a different organization must still
 * turn up here (they then get linked into the current org instead of
 * re-created). The caller debounces the raw input before passing it in.
 *
 * A failed search (network error, etc.) must never look like "no match
 * found" — that's indistinguishable from an actual duplicate check that
 * passed, and would let someone create a real duplicate believing they'd
 * already checked. So this surfaces failures via a toast and the returned
 * isError/error, instead of letting callers default data to [] and quietly
 * treat a failure as a clean search.
 */
export function usePersonMatches(search: string) {
  const hasQuery = search.trim().length >= 2;
  const query = useQuery<User[]>({
    queryKey: ['personSearch', search],
    queryFn: () => searchAllUsers(search),
    enabled: hasQuery,
    retry: false,
  });

  useEffect(() => {
    if (query.isError) {
      toast.error((query.error as any)?.message || "Couldn't check for existing matches — try again before adding.");
    }
  }, [query.isError, query.error]);

  return { ...query, hasQuery };
}
