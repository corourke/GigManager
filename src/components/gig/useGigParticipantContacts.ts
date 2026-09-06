import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import {
  getGigParticipantContacts,
  addGigParticipantContact,
  setGigParticipantContactPrimary,
  removeGigParticipantContact,
  createContactPerson,
  type GigParticipantContact,
} from '../../services/gigParticipantContacts.service';

export type { GigParticipantContact };

export function useGigParticipantContacts(gigId: string, organizationId: string) {
  return useQuery<GigParticipantContact[]>({
    queryKey: queryKeys.gigParticipantContacts(gigId, organizationId),
    queryFn: () => getGigParticipantContacts(gigId, organizationId),
    enabled: !!gigId && !!organizationId,
  });
}

export function useGigParticipantContactMutations(gigId: string, organizationId: string) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.gigParticipantContacts(gigId, organizationId) });

  const addContact = useMutation({
    mutationFn: (vars: { userId: string; isPrimary?: boolean; title?: string }) =>
      addGigParticipantContact(gigId, organizationId, vars),
    onSuccess: invalidate,
  });

  const setPrimary = useMutation({
    mutationFn: (vars: { userId: string; isPrimary: boolean }) =>
      setGigParticipantContactPrimary(gigId, organizationId, vars.userId, vars.isPrimary),
    onSuccess: invalidate,
  });

  const removeContact = useMutation({
    mutationFn: (userId: string) => removeGigParticipantContact(gigId, organizationId, userId),
    onSuccess: invalidate,
  });

  /** Creates a brand-new person, then links them as a contact on this gig — for the "no existing match" path. */
  const createAndAddContact = useMutation({
    mutationFn: async (vars: { firstName: string; lastName: string; email?: string; phone?: string; isPrimary?: boolean; title?: string }) => {
      const userId = await createContactPerson({
        firstName: vars.firstName,
        lastName: vars.lastName,
        email: vars.email,
        phone: vars.phone,
      });
      return addGigParticipantContact(gigId, organizationId, { userId, isPrimary: vars.isPrimary, title: vars.title });
    },
    onSuccess: invalidate,
  });

  return { addContact, setPrimary, removeContact, createAndAddContact };
}
