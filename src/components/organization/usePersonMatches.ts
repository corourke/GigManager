import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { searchPeople } from '../../services/user.service';
import type { PersonMatch } from '../../utils/supabase/types';

/**
 * Debounced, system-wide search for an existing person by name, email or
 * phone (any one is enough) — the same search_people path the Team screen's
 * "Add Existing User" tab uses. Deliberately NOT scoped to one organization's members:
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
export function usePersonMatches(search: string, extra: { email?: string; phone?: string } = {}) {
  const email = extra.email?.trim() ?? '';
  const phone = extra.phone?.trim() ?? '';
  const hasQuery = search.trim().length >= 2 || email.length >= 3 || phone.replace(/\D/g, '').length >= 7;
  const query = useQuery<PersonMatch[]>({
    queryKey: ['personSearch', search, email, phone],
    queryFn: () => searchPeople(search, { email, phone }),
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
