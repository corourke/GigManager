import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import {
  getOrganizationContacts,
  addOrganizationContact,
  updateOrganizationContact,
  setOrganizationPrimaryContact,
  unsetOrganizationPrimaryContact,
  removeOrganizationContact,
} from '../../services/organization.service';
import type { User } from '../../utils/supabase/types';

export interface OrganizationContact {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  contact_title: string | null;
  is_primary_contact: boolean;
  created_at: string;
  user: Pick<User, 'id' | 'first_name' | 'last_name' | 'email' | 'phone' | 'user_status'>;
}

export function useOrganizationContacts(orgId: string) {
  return useQuery<OrganizationContact[]>({
    queryKey: queryKeys.orgContacts(orgId),
    queryFn: () => getOrganizationContacts(orgId) as Promise<OrganizationContact[]>,
  });
}

export interface AddContactVars {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  title?: string;
  isPrimary?: boolean;
}

/** Mutations for the Contacts section on OrganizationScreen. */
export function useOrganizationContactMutations(orgId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.orgContacts(orgId) });

  const addContact = useMutation({
    mutationFn: (vars: AddContactVars) => addOrganizationContact(orgId, vars),
    onSuccess: invalidate,
  });

  const updateContact = useMutation({
    mutationFn: (vars: {
      memberId: string;
      updates: { title?: string; firstName: string; lastName: string; phone?: string };
    }) => updateOrganizationContact(vars.memberId, vars.updates),
    onSuccess: invalidate,
  });

  const setPrimary = useMutation({
    mutationFn: (memberId: string) => setOrganizationPrimaryContact(memberId),
    onSuccess: invalidate,
  });

  const unsetPrimary = useMutation({
    mutationFn: (memberId: string) => unsetOrganizationPrimaryContact(memberId),
    onSuccess: invalidate,
  });

  const removeContact = useMutation({
    mutationFn: (memberId: string) => removeOrganizationContact(memberId),
    onSuccess: invalidate,
  });

  return { addContact, updateContact, setPrimary, unsetPrimary, removeContact };
}
