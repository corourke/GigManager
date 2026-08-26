import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Mail, Pencil, Phone, Star, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { useOrganizationContacts, useOrganizationContactMutations, type OrganizationContact } from '../organization/useOrganizationContacts';
import AddOrganizationContactDialog from '../organization/AddOrganizationContactDialog';
import EditOrganizationContactDialog from '../organization/EditOrganizationContactDialog';

interface GigParticipantContactsListProps {
  organizationId: string;
  organizationName: string;
  addDialogOpen: boolean;
  onAddDialogOpenChange: (open: boolean) => void;
}

/**
 * Contacts for one gig participant, always visible under its row (no click
 * required) — edit/remove/set-primary right here, so managing a venue or
 * client's contacts never requires leaving the gig. The "add" dialog is
 * rendered here (it needs hasPrimaryContact from this component's own
 * query) but its open state is controlled by the parent's "More actions"
 * menu rather than an inline button, to keep each row compact.
 */
export default function GigParticipantContactsList({
  organizationId,
  organizationName,
  addDialogOpen,
  onAddDialogOpenChange,
}: GigParticipantContactsListProps) {
  const { data: contacts = [], isLoading } = useOrganizationContacts(organizationId);
  const { setPrimary, unsetPrimary, removeContact } = useOrganizationContactMutations(organizationId);

  const [editingContact, setEditingContact] = useState<OrganizationContact | null>(null);
  const [removingContact, setRemovingContact] = useState<OrganizationContact | null>(null);

  const hasPrimaryContact = contacts.some((c) => c.is_primary_contact);

  const handleTogglePrimary = async (contact: OrganizationContact) => {
    try {
      if (contact.is_primary_contact) {
        await unsetPrimary.mutateAsync(contact.id);
      } else {
        await setPrimary.mutateAsync(contact.id);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update primary contact');
    }
  };

  const handleRemove = async () => {
    if (!removingContact) return;
    try {
      await removeContact.mutateAsync(removingContact.id);
      toast.success('Contact removed');
      setRemovingContact(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove contact');
    }
  };

  if (isLoading) {
    return (
      <div className="pl-5 py-1">
        <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <>
      {contacts.length > 0 && (
        <div className="pl-5 pr-1">
          {contacts.map((contact) => (
            <div key={contact.id} className="group flex items-center justify-between gap-2 py-0.5 text-xs">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleTogglePrimary(contact)}
                  disabled={setPrimary.isPending || unsetPrimary.isPending}
                  title={contact.is_primary_contact ? 'Click to unset primary contact' : 'Set as primary contact'}
                  className="shrink-0 cursor-pointer"
                >
                  <Star
                    className={`w-3 h-3 ${
                      contact.is_primary_contact ? 'fill-amber-400 text-amber-500' : 'text-gray-300'
                    }`}
                  />
                </button>
                <span className="text-gray-600">
                  {contact.user.first_name} {contact.user.last_name}
                  {contact.contact_title && <span className="text-gray-400"> — {contact.contact_title}</span>}
                </span>
                {contact.user.phone && (
                  <a
                    href={`tel:${contact.user.phone}`}
                    className="flex items-center gap-0.5 text-gray-400 hover:text-sky-600"
                  >
                    <Phone className="w-2.5 h-2.5" />
                    {contact.user.phone}
                  </a>
                )}
                {contact.user.email && (
                  <a
                    href={`mailto:${contact.user.email}`}
                    className="flex items-center gap-0.5 text-gray-400 hover:text-sky-600"
                  >
                    <Mail className="w-2.5 h-2.5" />
                    {contact.user.email}
                  </a>
                )}
              </div>
              <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => setEditingContact(contact)} title="Edit contact">
                  <Pencil className="w-3 h-3 text-gray-400 hover:text-gray-700" />
                </button>
                <button type="button" onClick={() => setRemovingContact(contact)} title="Remove contact">
                  <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddOrganizationContactDialog
        open={addDialogOpen}
        onOpenChange={onAddDialogOpenChange}
        orgId={organizationId}
        organizationName={organizationName}
        hasPrimaryContact={hasPrimaryContact}
      />

      <EditOrganizationContactDialog
        open={editingContact !== null}
        onOpenChange={(open) => { if (!open) setEditingContact(null); }}
        orgId={organizationId}
        contact={editingContact}
      />

      <AlertDialog open={removingContact !== null} onOpenChange={(open) => { if (!open) setRemovingContact(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove contact?</AlertDialogTitle>
            <AlertDialogDescription>
              {removingContact && `${removingContact.user.first_name} ${removingContact.user.last_name} will no longer be listed as a contact for ${organizationName}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
