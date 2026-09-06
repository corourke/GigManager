import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useOrganizationContactMutations } from './useOrganizationContacts';
import { usePersonMatches } from './usePersonMatches';
import PersonMatchResults from './PersonMatchResults';
import type { User, UserRole } from '../../utils/supabase/types';

interface AddPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName?: string;
  /** Omit to hide the "set as primary contact" option entirely (e.g. staffing contexts, where it doesn't apply). */
  hasPrimaryContact?: boolean;
  defaultRole?: UserRole;
  /** Called with the newly-created-or-linked person once the dialog succeeds — used when the caller (e.g. a picker) needs the result, not just a refreshed list. */
  onDone?: (person: { id: string; first_name: string; last_name: string }) => void;
}

const EMPTY = { firstName: '', lastName: '', email: '', phone: '', title: '' };

/**
 * One shared "add a person" dialog used everywhere GigManager creates a new
 * login-less contact/staff member or links an existing one to an
 * organization: the Organization Contacts tab, the Participants section
 * (via GigParticipantContactsList), the Team screen's "No Account" tab, and
 * the gig staffing picker (via UserSelector). Search is system-wide (the
 * same search_users_secure path the "Add Existing User" tab already uses) —
 * the whole point is to avoid creating a duplicate person who already
 * exists in a different organization, not just this one.
 */
export default function AddPersonDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  hasPrimaryContact,
  defaultRole = 'Viewer',
  onDone,
}: AddPersonDialogProps) {
  const { addContact, linkExisting } = useOrganizationContactMutations(organizationId);
  const [form, setForm] = useState(EMPTY);
  const [role, setRole] = useState<UserRole>(defaultRole);
  // Only meaningful when hasPrimaryContact is actually passed (the checkbox
  // is hidden otherwise) — default to "yes" only when there's no existing
  // primary contact to replace.
  const defaultIsPrimary = hasPrimaryContact === undefined ? false : !hasPrimaryContact;
  const [isPrimary, setIsPrimary] = useState(defaultIsPrimary);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const isPending = addContact.isPending || linkExisting.isPending;

  const reset = () => {
    setForm(EMPTY);
    setRole(defaultRole);
    setIsPrimary(defaultIsPrimary);
    setDebouncedSearch('');
  };

  // Live search-as-you-type against name (falling back to email once it looks
  // real) — system-wide, not scoped to this organization, so someone who
  // already exists elsewhere still turns up and can be linked in instead of
  // re-created.
  useEffect(() => {
    if (!open) return;
    const emailQuery = form.email.trim();
    const nameQuery = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    const search = emailQuery.length >= 3 ? emailQuery : nameQuery;
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [open, form.firstName, form.lastName, form.email]);

  const { data: matches = [], isFetching: isSearching, isError: matchesErrored, hasQuery } = usePersonMatches(debouncedSearch);

  const handleUseExisting = async (match: User) => {
    try {
      await linkExisting.mutateAsync({ userId: match.id, role, title: form.title.trim() || undefined, isPrimary });
      onDone?.({ id: match.id, first_name: match.first_name, last_name: match.last_name });
      onOpenChange(false);
      reset();
      toast.success(`${match.first_name} ${match.last_name} added`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add person');
    }
  };

  const handleCreate = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    try {
      const result = await addContact.mutateAsync({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        title: form.title.trim() || undefined,
        isPrimary,
        role,
      });
      onDone?.({ id: result.user_id, first_name: form.firstName.trim(), last_name: form.lastName.trim() });
      onOpenChange(false);
      reset();
      toast.success('Person added');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add person');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Person</DialogTitle>
          <DialogDescription>
            Add someone to {organizationName || 'this organization'} without sending them an invite — search first to
            avoid creating a duplicate of someone who already exists.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="addperson_first_name">First Name *</Label>
              <Input
                id="addperson_first_name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addperson_last_name">Last Name *</Label>
              <Input
                id="addperson_last_name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="addperson_email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="addperson_email"
                type="email"
                placeholder="Optional"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={isPending}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="addperson_phone">Phone</Label>
              <Input
                id="addperson_phone"
                placeholder="Optional"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addperson_title">Title</Label>
              <Input
                id="addperson_title"
                placeholder="Optional"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="addperson_role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
              <SelectTrigger id="addperson_role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Staff">Staff — can be assigned to gigs</SelectItem>
                <SelectItem value="Viewer">Viewer — read-only access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <PersonMatchResults
            matches={matches}
            isLoading={isSearching}
            isError={matchesErrored}
            hasQuery={hasQuery}
            onSelect={handleUseExisting}
            emptyHint="No existing match — this will add a new person."
          />

          {hasPrimaryContact !== undefined && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={isPrimary}
                onCheckedChange={(checked) => setIsPrimary(checked === true)}
                disabled={isPending}
              />
              Set as primary contact
              {hasPrimaryContact && isPrimary && (
                <span className="text-xs text-gray-500">(replaces the current primary contact)</span>
              )}
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isPending} className="bg-sky-500 hover:bg-sky-600 text-white">
            {addContact.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add New Person'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
