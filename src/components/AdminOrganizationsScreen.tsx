import { useState, useEffect } from 'react';
import { Edit2, Trash2, Users, Loader2, AlertCircle, Plus, Shield, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { 
  Organization, 
  OrganizationType 
} from '../utils/supabase/types';
import { 
  ORG_TYPE_CONFIG, 
  getOrgTypeColor 
} from '../utils/supabase/constants';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import AppHeader from './AppHeader';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
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

interface OrganizationWithMembers extends Organization {
  member_count?: number;
}

interface AdminOrganizationsScreenProps {
  user: User;
  onEditOrganization: (org: Organization) => void;
  onCreateOrganization: () => void;
  onBack: () => void;
  onLogout: () => void;
  onEditProfile: () => void;
}

export default function AdminOrganizationsScreen({
  user,
  onEditOrganization,
  onCreateOrganization,
  onBack,
  onLogout,
  onEditProfile,
}: AdminOrganizationsScreenProps) {
  const [organizations, setOrganizations] = useState<OrganizationWithMembers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOrgId, setDeleteOrgId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setError('Not authenticated. Please sign in again.');
        setIsLoading(false);
        return;
      }

      // Fetch all organizations
      const orgResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-de012ad4/organizations`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!orgResponse.ok) {
        const errorData = await orgResponse.json();
        throw new Error(errorData.error || 'Failed to load organizations');
      }

      const orgs = await orgResponse.json();

      // Fetch member counts for each organization
      const orgsWithCounts = await Promise.all(
        orgs.map(async (org: Organization) => {
          try {
            const membersResponse = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-de012ad4/organizations/${org.id}/members`,
              {
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                },
              }
            );

            if (membersResponse.ok) {
              const members = await membersResponse.json();
              return { ...org, member_count: members.length };
            }
            
            return { ...org, member_count: 0 };
          } catch {
            return { ...org, member_count: 0 };
          }
        })
      );

      setOrganizations(orgsWithCounts);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error loading organizations:', err);
      setError(err.message || 'Failed to load organizations');
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteOrgId) return;

    setIsDeleting(true);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Not authenticated. Please sign in again.');
        setIsDeleting(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-de012ad4/organizations/${deleteOrgId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete organization');
      }

      toast.success('Organization deleted successfully');
      setOrganizations(prev => prev.filter(org => org.id !== deleteOrgId));
      setDeleteOrgId(null);
      setIsDeleting(false);
    } catch (err: any) {
      console.error('Error deleting organization:', err);
      toast.error(err.message || 'Failed to delete organization');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader
          user={user}
          currentRoute="dashboard"
          onLogout={onLogout}
          onEditProfile={onEditProfile}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        user={user}
        currentRoute="dashboard"
        onLogout={onLogout}
        onEditProfile={onEditProfile}
      />

      {/* Admin Header Info */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-sky-500 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-gray-900">Admin: All Organizations</h1>
                <p className="text-sm text-gray-600">Manage all organizations in the system</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={onBack}
                variant="outline"
              >
                Back
              </Button>
              <Button
                onClick={onCreateOrganization}
                className="bg-sky-500 hover:bg-sky-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Organization
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {organizations.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-gray-900 mb-2">No Organizations Found</h3>
            <p className="text-gray-600 mb-6">Get started by creating your first organization</p>
            <Button
              onClick={onCreateOrganization}
              className="bg-sky-500 hover:bg-sky-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Organization
            </Button>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => {
                  const typeConfig = ORG_TYPE_CONFIG[org.type];
                  const TypeIcon = typeConfig.icon;
                  
                  return (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                            <TypeIcon className="w-4 h-4" />
                          </div>
                          <p className="text-gray-900">{org.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getOrgTypeColor(org.type)}>
                          {org.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">
                            {org.member_count ?? 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {org.city && org.state ? (
                          <span className="text-gray-900">
                            {org.city}, {org.state}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {org.phone ? (
                          <span className="text-gray-900">{org.phone}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditOrganization(org)}
                            title="Edit Organization"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteOrgId(org.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete Organization"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteOrgId} onOpenChange={(open) => !open && setDeleteOrgId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the organization
              and all associated data including members, gigs, and equipment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Organization'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}