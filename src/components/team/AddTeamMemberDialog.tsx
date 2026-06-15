import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Mail, Shield, Crown, User as UserIcon, Search, UserPlus, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import type { User, UserRole } from '../../utils/supabase/types';
import { useUserSearch, useTeamMutations } from './useTeamData';

interface AddTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  organizationName: string;
  /** Members already in the org — excluded from search results. */
  excludeUserIds: string[];
}

export default function AddTeamMemberDialog({
  open,
  onOpenChange,
  orgId,
  organizationName,
  excludeUserIds,
}: AddTeamMemberDialogProps) {
  const { addExistingUser, inviteUser } = useTeamMutations(orgId);

  // Existing-user search
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserRole, setSelectedUserRole] = useState<UserRole>('Staff');

  // Invite new user
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('Staff');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(userSearchQuery), 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  const { data: searchResults = [], isFetching: isSearching } = useUserSearch(
    debouncedQuery,
    excludeUserIds,
  );

  const resetExisting = () => {
    setSelectedUser(null);
    setUserSearchQuery('');
    setDebouncedQuery('');
    setSelectedUserRole('Staff');
  };
  const resetInvite = () => {
    setInviteFirstName('');
    setInviteLastName('');
    setInviteEmail('');
    setInviteRole('Staff');
  };

  const handleAddExistingUser = async () => {
    if (!selectedUser) {
      toast.error('Please select a user');
      return;
    }
    try {
      await addExistingUser.mutateAsync({ userId: selectedUser.id, role: selectedUserRole });
      onOpenChange(false);
      resetExisting();
      toast.success('User added to team');
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error(error.message || 'Failed to add user');
    }
  };

  const handleInviteNewUser = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    try {
      const result = await inviteUser.mutateAsync({
        email: inviteEmail,
        role: inviteRole,
        firstName: inviteFirstName || undefined,
        lastName: inviteLastName || undefined,
      });
      onOpenChange(false);
      const email = inviteEmail;
      resetInvite();
      toast.success(
        <div className="space-y-2">
          <p className="font-medium">{result.resend ? 'Invitation resent!' : 'Invitation sent!'}</p>
          <p className="text-sm text-gray-600">
            {result.resend
              ? `We've sent another invitation email to ${email}.`
              : `An email has been sent to ${email} with a link to join the organization.`}
            The user can now be assigned to gigs.
          </p>
        </div>,
        { duration: 5000 },
      );
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast.error(error.message || 'Failed to send invitation');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Add an existing user or invite someone new to {organizationName}.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="existing" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Existing User
            </TabsTrigger>
            <TabsTrigger value="invite">
              <Send className="w-4 h-4 mr-2" />
              Invite New User
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="user_search">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="user_search"
                  placeholder="Search by name or email..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {isSearching && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => setSelectedUser(result)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors ${
                        selectedUser?.id === result.id ? 'bg-sky-50 border-sky-200' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm">{result.first_name} {result.last_name}</p>
                          <p className="text-xs text-gray-500">{result.email}</p>
                        </div>
                        {selectedUser?.id === result.id && (
                          <Badge variant="outline" className="text-sky-600 border-sky-600">Selected</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {debouncedQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                <p className="text-sm text-gray-500 py-4 text-center">
                  No users found. Try a different search term or invite a new user.
                </p>
              )}
            </div>

            {selectedUser && (
              <div className="space-y-2">
                <Label htmlFor="selected_user_role">Role</Label>
                <Select value={selectedUserRole} onValueChange={(value) => setSelectedUserRole(value as UserRole)}>
                  <SelectTrigger id="selected_user_role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-600" />
                        Admin - Full access
                      </div>
                    </SelectItem>
                    <SelectItem value="Manager">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        Manager - Can manage gigs and team
                      </div>
                    </SelectItem>
                    <SelectItem value="Staff">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-gray-600" />
                        Staff - Can be assigned to gigs
                      </div>
                    </SelectItem>
                    <SelectItem value="Viewer">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-gray-500" />
                        Viewer - Read-only access
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  resetExisting();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddExistingUser}
                disabled={!selectedUser || addExistingUser.isPending}
                className="bg-sky-500 hover:bg-sky-600 text-white"
              >
                {addExistingUser.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add User'
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="invite" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> The user will be created immediately and can be assigned to gigs. In production, an invitation email will be sent to the user with a link to accept and set up their account.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invite_first_name">First Name</Label>
                  <Input
                    id="invite_first_name"
                    placeholder="John"
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite_last_name">Last Name</Label>
                  <Input
                    id="invite_last_name"
                    placeholder="Doe"
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite_email">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="invite_email"
                    type="email"
                    placeholder="john@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite_role">Role *</Label>
                <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as UserRole)}>
                  <SelectTrigger id="invite_role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-600" />
                        Admin - Full access
                      </div>
                    </SelectItem>
                    <SelectItem value="Manager">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        Manager - Can manage gigs and team
                      </div>
                    </SelectItem>
                    <SelectItem value="Staff">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-gray-600" />
                        Staff - Can be assigned to gigs
                      </div>
                    </SelectItem>
                    <SelectItem value="Viewer">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-gray-500" />
                        Viewer - Read-only access
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  resetInvite();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInviteNewUser}
                disabled={inviteUser.isPending}
                className="bg-sky-500 hover:bg-sky-600 text-white"
              >
                {inviteUser.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
