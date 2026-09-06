import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
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
import type { OrganizationPersonMatch } from '../../services/organization.service';
import type { UserRole } from '../../utils/supabase/types';

interface QuickAddPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName?: string;
  /** Called with the newly-created-or-linked person once the dialog succeeds. */
  onDone: (person: { id: string; first_name: string; last_name: string }) => void;
}

const EMPTY = { firstName: '', lastName: '', phone: '' };

/**
 * Standalone "add someone without a login" dialog for contexts that need a
 * modal rather than an inline tab (e.g. triggered from inside a UserSelector
 * popover, where there isn't room for a full form). Shares the same
 * search-first, pick-existing-or-create-new mechanics as
 * AddOrganizationContactDialog and AddTeamMemberDialog's quick-add tab.
 */
export default function QuickAddPersonDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  onDone,
}: QuickAddPersonDialogProps) {
  const { addContact, linkExisting } = useOrganizationContactMutations(organizationId);
  const [form, setForm] = useState(EMPTY);
  const [role, setRole] = useState<UserRole>('Staff');
  const [debouncedQuery, setDebouncedQuery] = useState({ search: '', phone: '' });

  const isPending = addContact.isPending || linkExisting.isPending;

  const reset = () => {
    setForm(EMPTY);
    setRole('Staff');
    setDebouncedQuery({ search: '', phone: '' });
  };

  useEffect(() => {
    if (!open) return;
    const search = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    const timer = setTimeout(() => {
      setDebouncedQuery({ search: search.length >= 2 ? search : '', phone: form.phone.trim() });
    }, 300);
    return () => clearTimeout(timer);
  }, [open, form.firstName, form.lastName, form.phone]);

  const { data: matches = [], isFetching: isSearching, hasQuery } = usePersonMatches(organizationId, debouncedQuery);

  const handleUseExisting = async (match: OrganizationPersonMatch) => {
    try {
      await linkExisting.mutateAsync({ userId: match.user_id, role });
      onDone({ id: match.user_id, first_name: match.first_name, last_name: match.last_name });
      onOpenChange(false);
      reset();
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
        phone: form.phone.trim() || undefined,
        role,
      });
      onDone({ id: result.user_id, first_name: form.firstName.trim(), last_name: form.lastName.trim() });
      onOpenChange(false);
      reset();
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
            Add someone to {organizationName || 'this organization'} without sending them an invite — they can be assigned to gigs right away.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quickadd_first_name">First Name *</Label>
              <Input
                id="quickadd_first_name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quickadd_last_name">Last Name *</Label>
              <Input
                id="quickadd_last_name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quickadd_phone">Phone</Label>
              <Input
                id="quickadd_phone"
                placeholder="Optional"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quickadd_role">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <SelectTrigger id="quickadd_role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Staff">Staff</SelectItem>
                  <SelectItem value="Viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <PersonMatchResults
            matches={matches}
            isLoading={isSearching}
            hasQuery={hasQuery}
            onSelect={handleUseExisting}
            emptyHint="No existing match — this will add a new person."
          />
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
              'Add Person'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
