import { useState } from 'react';
import { toast } from 'sonner';
import { Contact, Loader2, Mail, Phone, Plus, Pencil, Star, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
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
import { useOrganizationContacts, useOrganizationContactMutations, type OrganizationContact } from './useOrganizationContacts';
import AddOrganizationContactDialog from './AddOrganizationContactDialog';
import EditOrganizationContactDialog from './EditOrganizationContactDialog';

interface OrganizationContactsSectionProps {
  organizationId: string;
  organizationName: string;
  canManage: boolean;
}

export default function OrganizationContactsSection({
  organizationId,
  organizationName,
  canManage,
}: OrganizationContactsSectionProps) {
  const { data: contacts = [], isLoading } = useOrganizationContacts(organizationId);
  const { setPrimary, unsetPrimary, removeContact } = useOrganizationContactMutations(organizationId);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<OrganizationContact | null>(null);
  const [removingContact, setRemovingContact] = useState<OrganizationContact | null>(null);

  const hasPrimaryContact = contacts.some((c) => c.is_primary_contact);

  const handleTogglePrimary = async (contact: OrganizationContact) => {
    try {
      if (contact.is_primary_contact) {
        await unsetPrimary.mutateAsync(contact.id);
      } else {
        await setPrimary.mutateAsync(contact.id);
        toast.success(`${contact.user.first_name} ${contact.user.last_name} is now the primary contact`);
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

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Contact className="w-5 h-5 text-gray-600" />
              <CardTitle>Contacts</CardTitle>
            </div>
            {canManage && (
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Contact
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
            </div>
          ) : contacts.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              No contacts yet. Add someone to call or email at this organization.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    {canManage && <TableHead className="w-[100px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => canManage && handleTogglePrimary(contact)}
                          disabled={!canManage || setPrimary.isPending || unsetPrimary.isPending}
                          title={!canManage ? undefined : contact.is_primary_contact ? 'Click to unset primary contact' : 'Set as primary contact'}
                          className={canManage ? 'cursor-pointer' : 'cursor-default'}
                        >
                          <Star
                            className={`w-4 h-4 ${
                              contact.is_primary_contact
                                ? 'fill-amber-400 text-amber-500'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900">
                            {contact.user.first_name} {contact.user.last_name}
                          </span>
                          {contact.user.user_status !== 'contact' && (
                            <Badge variant="outline" className="text-[10px]">Team member</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{contact.contact_title || '—'}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {contact.user.email ? (
                          <a href={`mailto:${contact.user.email}`} className="flex items-center gap-1 hover:text-sky-600">
                            <Mail className="w-3 h-3" />
                            {contact.user.email}
                          </a>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {contact.user.phone ? (
                          <a href={`tel:${contact.user.phone}`} className="flex items-center gap-1 hover:text-sky-600">
                            <Phone className="w-3 h-3" />
                            {contact.user.phone}
                          </a>
                        ) : '—'}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingContact(contact)}
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setRemovingContact(contact)}
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddOrganizationContactDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
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
