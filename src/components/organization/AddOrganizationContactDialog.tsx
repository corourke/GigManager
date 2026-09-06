import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
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

interface AddOrganizationContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  organizationName: string;
  hasPrimaryContact: boolean;
}

const EMPTY = { firstName: '', lastName: '', email: '', phone: '', title: '' };

export default function AddOrganizationContactDialog({
  open,
  onOpenChange,
  orgId,
  organizationName,
  hasPrimaryContact,
}: AddOrganizationContactDialogProps) {
  const { addContact, linkExisting } = useOrganizationContactMutations(orgId);
  const [form, setForm] = useState(EMPTY);
  const [isPrimary, setIsPrimary] = useState(!hasPrimaryContact);
  const [debouncedQuery, setDebouncedQuery] = useState({ search: '', email: '', phone: '' });

  const isPending = addContact.isPending || linkExisting.isPending;

  const reset = () => {
    setForm(EMPTY);
    setIsPrimary(!hasPrimaryContact);
    setDebouncedQuery({ search: '', email: '', phone: '' });
  };

  // Debounce the duplicate/existing-member check against name, email, and
  // phone as the form is filled in — cheap enough to run live rather than
  // waiting for save, so the user can pick an existing person before typing
  // out a whole new-person form for someone already on this org.
  useEffect(() => {
    const search = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    const timer = setTimeout(() => {
      setDebouncedQuery({ search: search.length >= 2 ? search : '', email: form.email.trim(), phone: form.phone.trim() });
    }, 300);
    return () => clearTimeout(timer);
  }, [form.firstName, form.lastName, form.email, form.phone]);

  const { data: matches = [], isFetching: isSearching, hasQuery } = usePersonMatches(orgId, debouncedQuery);

  const handleUseExisting = async (match: OrganizationPersonMatch) => {
    try {
      await linkExisting.mutateAsync({ userId: match.user_id, title: form.title.trim() || undefined, isPrimary });
      onOpenChange(false);
      reset();
      toast.success(`${match.first_name} ${match.last_name} added as a contact`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add contact');
    }
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    try {
      await addContact.mutateAsync({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        title: form.title.trim() || undefined,
        isPrimary,
      });
      onOpenChange(false);
      reset();
      toast.success('Contact added');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add contact');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>
            Add a person to call or email at {organizationName}. Contacts don't get a GigWrangler
            login — for a real team member, use Team instead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_first_name">First Name *</Label>
              <Input
                id="contact_first_name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_last_name">Last Name *</Label>
              <Input
                id="contact_last_name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="contact_email"
                type="email"
                placeholder="jane@venue.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={isPending}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Phone</Label>
              <Input
                id="contact_phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_title">Title</Label>
              <Input
                id="contact_title"
                placeholder="Venue Manager"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                disabled={isPending}
              />
            </div>
          </div>

          <PersonMatchResults
            matches={matches}
            isLoading={isSearching}
            hasQuery={hasQuery}
            onSelect={handleUseExisting}
            emptyHint="No existing match on this organization — this will create a new contact."
          />

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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-sky-500 hover:bg-sky-600 text-white"
          >
            {addContact.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add New Contact'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
