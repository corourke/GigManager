import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { 
  getOrganizationMembersWithAuth, 
  updateMemberDetails, 
  removeMember,
  addExistingUserToOrganization,
  inviteUserToOrganization,
  getOrganizationInvitations,
  cancelInvitation,
  getStaffRoles
} from '../services/organization.service';
import { searchAllUsers } from '../services/user.service';
import { createClient } from '../utils/supabase/client';
import { 
  Users, 
  Plus, 
  Trash2, 
  Loader2,
  Mail,
  Shield,
  Crown,
  User as UserIcon,
  Pencil as Edit,
  Search,
  UserPlus,
  Send,
  X,
  Clock,
  Eye
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import AppHeader from './AppHeader';
import { 
  User, 
  Organization, 
  UserRole,
  OrganizationMemberWithUser as OrganizationMember,
  InvitationWithInviter as Invitation
} from '../utils/supabase/types';
import { format } from 'date-fns';
import UserProfileForm, { UserProfileFormData } from './UserProfileForm';

interface TeamScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  onNavigateToDashboard?: () => void;
  onNavigateToGigs: () => void;
  onNavigateToTeam?: () => void;
  onNavigateToAssets?: () => void;
  onViewMember?: (memberId: string) => void;
  onSwitchOrganization: () => void;
  onEditProfile?: () => void;
  onLogout: () => void;
}

export default function TeamScreen({
  organization,
  user,
  userRole,
  onNavigateToDashboard,
  onNavigateToGigs,
  onNavigateToTeam,
  onNavigateToAssets,
  onViewMember,
  onSwitchOrganization,
  onEditProfile,
  onLogout,
}: TeamScreenProps) {
  // Memoize filters to prevent infinite re-renders
  const memberFilters = useMemo(() => ({ organization_id: organization.id }), [organization.id]);

  // Organization members data
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  const refreshMembers = async () => {
    try {
      setMembersLoading(true);
      setMembersError(null);
      const memberData = await getOrganizationMembersWithAuth(organization.id);
      setMembers(memberData);
    } catch (err: any) {
      setMembersError(err.message || 'Failed to load members');
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    refreshMembers();

    // Set up real-time subscription
    const supabase = createClient();
    
    const channel = supabase
      .channel(`org_members_${organization.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_members',
          filter: `organization_id=eq.${organization.id}`,
        },
        () => {
          refreshMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization.id]);

  // Create a map of staff roles for easy lookup
  const staffRoleMap = useMemo(() => {
    const map = new Map<string, string>();
    staffRoles.forEach(role => map.set(role.id, role.name));
    return map;
  }, [staffRoles]);

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invitationsTableExists, setInvitationsTableExists] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<OrganizationMember | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<OrganizationMember | null>(null);
  const [invitationToCancel, setInvitationToCancel] = useState<Invitation | null>(null);
  
  // Add member - existing user
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserRole, setSelectedUserRole] = useState<UserRole>('Staff');
  
  // Add member - invite new
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('Staff');
  
  // Edit member form
  const [editForm, setEditForm] = useState<UserProfileFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    avatar_url: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    role: 'Staff' as UserRole,
    default_staff_role_id: '',
  });

  // Staff roles
  const [staffRoles, setStaffRoles] = useState<Array<{ id: string; name: string }>>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const canManageTeam = userRole === 'Admin' || userRole === 'Manager';

  useEffect(() => {
    loadInvitationsAndRoles();
  }, [organization.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearchQuery.trim().length >= 2) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  const loadInvitationsAndRoles = async () => {
    setIsLoading(true);
    try {
      const [invitationsData, staffRolesData] = await Promise.all([
        getOrganizationInvitations(organization.id),
        getStaffRoles(),
      ]);
      setStaffRoles(staffRolesData);
      // Filter to only pending invitations, and handle empty array gracefully
      if (Array.isArray(invitationsData)) {
        setInvitations(invitationsData.filter((inv: Invitation) => inv.status === 'pending'));
        setInvitationsTableExists(true);
      } else {
        setInvitations([]);
        setInvitationsTableExists(false);
      }
    } catch (error: any) {
      console.error('Error loading invitations and roles:', error);
      toast.error(error.message || 'Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async () => {
    setIsSearching(true);
    try {
      const results = await searchAllUsers(userSearchQuery);
      // Filter out users who are already members
      const memberUserIds = members.map(m => m.user.id);
      const filteredResults = results.filter(u => !memberUserIds.includes(u.id));
      setSearchResults(filteredResults);
    } catch (error: any) {
      console.error('Error searching users:', error);
      toast.error(error.message || 'Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddExistingUser = async () => {
    if (!selectedUser) {
      toast.error('Please select a user');
      return;
    }

    setIsSubmitting(true);
    try {
      await addExistingUserToOrganization(organization.id, selectedUser.id, selectedUserRole);
      // Reload members list
      await refreshMembers();
      
      setShowAddDialog(false);
      setSelectedUser(null);
      setUserSearchQuery('');
      setSearchResults([]);
      setSelectedUserRole('Staff');
      toast.success('User added to team');
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error(error.message || 'Failed to add user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteNewUser = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await inviteUserToOrganization(
        organization.id, 
        inviteEmail, 
        inviteRole,
        inviteFirstName || undefined,
        inviteLastName || undefined
      );
      
      // Add invitation to list
      setInvitations([...invitations, result.invitation]);

      // Reload members to show the new pending user
      await refreshMembers();
      
      setShowAddDialog(false);
      setInviteFirstName('');
      setInviteLastName('');
      setInviteEmail('');
      setInviteRole('Staff');
      
      // Show success message
      toast.success(
        <div className="space-y-2">
          <p className="font-medium">Invitation sent!</p>
          <p className="text-sm text-gray-600">
            An email has been sent to {inviteEmail} with a link to join the organization.
            The user can now be assigned to gigs.
          </p>
        </div>,
        { duration: 5000 }
      );
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditMember = async () => {
    if (!memberToEdit) return;

    if (!editForm.first_name.trim() || !editForm.last_name.trim() || !editForm.email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Don't allow role changes for current user
      const updateData = memberToEdit.user.id === user.id
        ? { ...editForm, role: undefined, default_staff_role_id: undefined }
        : editForm;

      await updateMemberDetails(organization.id, memberToEdit.id, updateData);
      // Reload members list
      await refreshMembers();
      
      setShowEditDialog(false);
      setMemberToEdit(null);
      toast.success('Member updated successfully');
    } catch (error: any) {
      console.error('Error updating member:', error);
      toast.error(error.message || 'Failed to update member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setIsRemoving(true);
    try {
      await removeMember(organization.id, memberToRemove.id);
      // Reload members list
      await refreshMembers();
      
      setMemberToRemove(null);
      toast.success('Member removed');
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error(error.message || 'Failed to remove member');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleCancelInvitation = async () => {
    if (!invitationToCancel) return;

    setIsSubmitting(true);
    try {
      await cancelInvitation(invitationToCancel.id);
      setInvitations(invitations.filter(inv => inv.id !== invitationToCancel.id));
      setInvitationToCancel(null);
      toast.success('Invitation cancelled');
    } catch (error: any) {
      console.error('Error cancelling invitation:', error);
      toast.error(error.message || 'Failed to cancel invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (member: OrganizationMember) => {
    setMemberToEdit(member);
    setEditForm({
      first_name: member.user.first_name,
      last_name: member.user.last_name,
      email: member.user.email,
      phone: member.user.phone || '',
      avatar_url: member.user.avatar_url || '',
      address_line1: member.user.address_line1 || '',
      address_line2: member.user.address_line2 || '',
      city: member.user.city || '',
      state: member.user.state || '',
      postal_code: member.user.postal_code || '',
      country: member.user.country || '',
      role: member.role as UserRole,
      default_staff_role_id: member.default_staff_role_id || '',
    });
    setShowEditDialog(true);
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'Admin':
        return <Crown className="w-4 h-4 text-amber-600" />;
      case 'Manager':
        return <Shield className="w-4 h-4 text-blue-600" />;
      default:
        return <UserIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'Admin':
        return 'bg-amber-100 text-amber-800';
      case 'Manager':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        user={user}
        organization={organization}
        userRole={userRole}
        currentRoute="team"
        onNavigateToDashboard={onNavigateToDashboard}
        onNavigateToGigs={onNavigateToGigs}
        onNavigateToTeam={onNavigateToTeam}
        onNavigateToAssets={onNavigateToAssets}
        onSwitchOrganization={onSwitchOrganization}
        onEditProfile={onEditProfile}
        onLogout={onLogout}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-gray-700" />
            <div>
              <h1 className="text-gray-900">Team</h1>
              <p className="text-sm text-gray-600">
                Manage members of {organization.name}
              </p>
            </div>
          </div>
          
          {canManageTeam && (
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-sky-500 hover:bg-sky-600 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Team Member
            </Button>
          )}
        </div>

        {/* Migration Notice Banner */}
        {canManageTeam && !invitationsTableExists && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-yellow-100 p-2 rounded-lg">
                <Mail className="w-5 h-5 text-yellow-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-900 mb-1">
                  Invitation Feature Setup Required
                </h3>
                <p className="text-sm text-yellow-800 mb-2">
                  To enable the "Invite New User" feature, you need to apply a database migration. 
                  You can still add existing users to your organization.
                </p>
                <p className="text-xs text-yellow-700">
                  See <code className="bg-yellow-100 px-1.5 py-0.5 rounded">APPLY_INVITATIONS_TABLE.md</code> for instructions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Members Table */}
        <Card className="p-4 mb-4">
          <h2 className="mb-3 text-gray-900">Active Members</h2>
          {membersError ? (
            <div className="text-center py-12">
              <div className="text-red-500 mb-4">Error loading team members</div>
              <p className="text-gray-600 mb-4">{membersError}</p>
              <Button onClick={refreshMembers} variant="outline">
                Try Again
              </Button>
            </div>
          ) : isLoading || membersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No team members yet</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Login</TableHead>
                    {canManageTeam && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const isCurrentUser = member.user?.id === user.id;
                    const memberName = `${member.user.first_name} ${member.user.last_name}`.trim();
                    
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {memberName || 'Unknown'}
                            {isCurrentUser && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{member.user.email}</TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {member.default_staff_role_id 
                              ? staffRoleMap.get(member.default_staff_role_id) || 'None'
                              : 'None'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(member.role as UserRole)}>
                            <div className="flex items-center gap-1">
                              {getRoleIcon(member.role as UserRole)}
                              {member.role}
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {member.user.user_status === 'pending' ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          ) : (
                            <div className="text-sm text-gray-600">
                              {member.user.last_sign_in_at 
                                ? format(new Date(member.user.last_sign_in_at), 'MMM d, h:mm a')
                                : 'Never'}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-500 hover:text-sky-600"
                              onClick={() => onViewMember?.(member.id)}
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {canManageTeam && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-500 hover:text-sky-600"
                                onClick={() => openEditDialog(member)}
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {canManageTeam && !isCurrentUser && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                                onClick={() => setMemberToRemove(member)}
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Pending Invitations */}
        {canManageTeam && invitations.length > 0 && (
          <Card className="p-6">
            <h2 className="mb-4 text-gray-900">Pending Invitations</h2>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Invited By</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {invitation.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(invitation.role as UserRole)}>
                          {invitation.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invitation.invited_by_user ? (
                          `${invitation.invited_by_user.first_name} ${invitation.invited_by_user.last_name}`
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInvitationToCancel(invitation)}
                          className="text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>

      {/* Add Team Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add an existing user or invite someone new to {organization.name}.
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
                
                {userSearchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    No users found. Try a different search term or invite a new user.
                  </p>
                )}
              </div>
              
              {selectedUser && (
                <div className="space-y-2">
                  <Label htmlFor="selected_user_role">Role</Label>
                  <Select 
                    value={selectedUserRole} 
                    onValueChange={(value) => setSelectedUserRole(value as UserRole)}
                  >
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
                    setShowAddDialog(false);
                    setSelectedUser(null);
                    setUserSearchQuery('');
                    setSearchResults([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddExistingUser}
                  disabled={!selectedUser || isSubmitting}
                  className="bg-sky-500 hover:bg-sky-600 text-white"
                >
                  {isSubmitting ? (
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
                  <Select 
                    value={inviteRole} 
                    onValueChange={(value) => setInviteRole(value as UserRole)}
                  >
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
                    setShowAddDialog(false);
                    setInviteFirstName('');
                    setInviteLastName('');
                    setInviteEmail('');
                    setInviteRole('Staff');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInviteNewUser}
                  disabled={isSubmitting}
                  className="bg-sky-500 hover:bg-sky-600 text-white"
                >
                  {isSubmitting ? (
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

      {/* Edit Member Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update member information for {memberToEdit?.user.first_name} {memberToEdit?.user.last_name}.
            </DialogDescription>
          </DialogHeader>
          
          <UserProfileForm
            formData={editForm}
            onChange={(field, value) => setEditForm({ ...editForm, [field]: value })}
            disabled={isSubmitting}
            emailReadOnly={true}
            showRole={memberToEdit ? memberToEdit.user.id !== user.id : true}
            showDefaultStaffRole={memberToEdit ? memberToEdit.user.id !== user.id : true}
            staffRoles={staffRoles}
            requiredFields={['first_name', 'last_name', 'email']}
          />
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setMemberToEdit(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditMember}
              disabled={isSubmitting}
              className="bg-sky-500 hover:bg-sky-600 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong>
                {memberToRemove ? `${memberToRemove.user.first_name} ${memberToRemove.user.last_name}` : ''}
              </strong>{' '}
              from {organization.name}? They will lose access to all organization data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToRemove(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemoving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Member'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invitation Confirmation */}
      <AlertDialog open={!!invitationToCancel} onOpenChange={() => setInvitationToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the invitation to{' '}
              <strong>{invitationToCancel?.email}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInvitationToCancel(null)}>
              No, Keep It
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelInvitation}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}