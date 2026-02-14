import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import {
  getGigsForOrganization,
  updateGig,
  duplicateGig,
  deleteGig,
} from '../services/gig.service';
import AppHeader from './AppHeader';
import { SmartDataTable, ColumnDef, RowAction } from './tables/SmartDataTable';
import { GigListEmptyState } from './gigs/GigListEmptyState';
import {
  Plus,
  Upload,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { Organization, User, UserRole, GigStatus, Gig } from '../utils/supabase/types';
import { GIG_STATUS_CONFIG, TAG_CONFIG, getTagColor } from '../utils/supabase/constants';
import { formatDateTimeDisplay } from '../utils/dateUtils';
import { PageHeader } from './ui/PageHeader';

interface GigListScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  onBack: () => void;
  onCreateGig: () => void;
  onViewGig: (gigId: string) => void;
  onEditGig: (gigId: string) => void;
  onNavigateToDashboard: () => void;
  onNavigateToGigs: () => void;
  onNavigateToAssets: () => void;
  onNavigateToImport?: () => void;
  onSwitchOrganization: () => void;
  onLogout: () => void;
  onEditProfile?: () => void;
}

const statusPillConfig: Record<string, { label: string; color: string }> = Object.fromEntries(
  Object.entries(GIG_STATUS_CONFIG).map(([key, cfg]) => [key, { label: cfg.label, color: cfg.color }])
);

const tagPillConfig: Record<string, { label: string; color: string }> = Object.fromEntries(
  Object.entries(TAG_CONFIG).map(([key, cfg]) => [key, { label: key, color: cfg.color }])
);

export default function GigListScreen({
  organization,
  user,
  userRole,
  onBack,
  onCreateGig,
  onViewGig,
  onEditGig,
  onNavigateToDashboard,
  onNavigateToGigs,
  onNavigateToAssets,
  onNavigateToImport,
  onSwitchOrganization,
  onLogout,
  onEditProfile,
}: GigListScreenProps) {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canEdit = userRole === 'Admin' || userRole === 'Manager';

  useEffect(() => {
    loadGigs();
  }, [organization.id]);

  const loadGigs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getGigsForOrganization(organization.id);
      setGigs(data || []);
    } catch (err: any) {
      console.error('Error loading gigs:', err);
      setError(err.message || 'Failed to load gigs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGigDuplicate = async (gigId: string) => {
    try {
      await duplicateGig(gigId);
      toast.success('Gig duplicated successfully');
      loadGigs();
    } catch (err: any) {
      console.error('Error duplicating gig:', err);
      toast.error(err.message || 'Failed to duplicate gig');
    }
  };

  const handleGigDelete = async (gigId: string) => {
    if (!confirm('Are you sure you want to delete this gig?')) return;

    const gigToDelete = gigs.find(g => g.id === gigId);
    if (gigToDelete) {
      setGigs(prev => prev.filter(g => g.id !== gigId));
    }

    try {
      await deleteGig(gigId);
      toast.success('Gig deleted successfully');
    } catch (err: any) {
      console.error('Error deleting gig:', err);
      toast.error(err.message || 'Failed to delete gig');
      if (gigToDelete) {
        setGigs(prev => [...prev, gigToDelete]);
      }
    }
  };

  const handleRowUpdate = useCallback(async (id: string, updates: Partial<Gig>) => {
    const gig = gigs.find(g => g.id === id);
    if (!gig) return;

    setGigs(prev => prev.map(g => (g.id === id ? { ...g, ...updates } : g)));

    try {
      await updateGig(id, updates);
    } catch (err: any) {
      setGigs(prev => prev.map(g => (g.id === id ? gig : g)));
      console.error('Error updating gig:', err);
      toast.error(err.message || 'Failed to update gig');
    }
  }, [gigs]);

  const gigColumns = useMemo<ColumnDef<Gig>[]>(() => [
    {
      id: 'title',
      header: 'Title',
      accessor: 'title',
      sortable: true,
      filterable: true,
      required: true,
      editable: canEdit,
      type: 'text',
      className: 'w-[25%]',
      render: (val) => (
        <span className="font-medium text-gray-900">
          {val || <span className="text-gray-400 italic">Untitled Gig</span>}
        </span>
      ),
    },
    {
      id: 'start',
      header: 'Start',
      accessor: 'start',
      sortable: true,
      required: true,
      editable: canEdit,
      type: 'datetime',
      timezone: (row) => row.timezone,
      className: 'w-[14%]',
      render: (_, row) => (
        <span className="text-sm text-gray-700">
          {formatDateTimeDisplay(row.start, row.end, row.timezone)}
        </span>
      ),
    },
    {
      id: 'end',
      header: 'End',
      accessor: 'end',
      sortable: true,
      optional: true,
      editable: canEdit,
      type: 'datetime',
      timezone: (row) => row.timezone,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      sortable: true,
      filterable: true,
      required: true,
      editable: canEdit,
      type: 'pill',
      pillConfig: statusPillConfig,
      className: 'w-[12%]',
    },
    {
      id: 'venue',
      header: 'Venue',
      accessor: (row) => row.venue?.name || '',
      sortable: true,
      filterable: true,
      render: (val) => val ? (
        <Badge variant="outline" className="truncate bg-gray-100 text-gray-800 border-gray-200">
          {val}
        </Badge>
      ) : (
        <span className="text-gray-400 italic">—</span>
      ),
    },
    {
      id: 'act',
      header: 'Act',
      accessor: (row) => row.act?.name || '',
      sortable: true,
      filterable: true,
      render: (val) => val ? (
        <Badge variant="outline" className="truncate bg-gray-100 text-gray-800 border-gray-200">
          {val}
        </Badge>
      ) : (
        <span className="text-gray-400 italic">—</span>
      ),
    },
    {
      id: 'tags',
      header: 'Tags',
      accessor: 'tags',
      filterable: true,
      editable: canEdit,
      type: 'multi-pill',
      pillConfig: tagPillConfig,
      className: 'w-[18%]',
    },
    {
      id: 'notes',
      header: 'Notes',
      accessor: 'notes',
      filterable: true,
      optional: true,
      editable: canEdit,
      type: 'text',
      render: (val) => (
        <span className="text-sm text-gray-600 line-clamp-2">{val || '—'}</span>
      ),
    },
  ], [canEdit]);

  const rowActions = useMemo<RowAction<Gig>[]>(() => [
    {
      id: 'view',
      label: 'View',
      onClick: (row) => onViewGig(row.id),
    },
    {
      id: 'edit',
      label: 'Edit',
      onClick: (row) => onEditGig(row.id),
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      onClick: (row) => handleGigDuplicate(row.id),
    },
    {
      id: 'delete',
      label: 'Delete',
      onClick: (row) => handleGigDelete(row.id),
    },
  ], [onViewGig, onEditGig]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        organization={organization}
        user={user}
        userRole={userRole}
        currentRoute="gig-list"
        onSwitchOrganization={onSwitchOrganization}
        onEditProfile={onEditProfile}
        onLogout={onLogout}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          icon={Calendar}
          title="Events"
          description={`Manage events and gigs for ${organization.name}`}
          actions={
            <>
              <Button
                onClick={onCreateGig}
                className="bg-sky-500 hover:bg-sky-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Gig
              </Button>
              {onNavigateToImport && (
                <Button
                  onClick={onNavigateToImport}
                  variant="outline"
                  className="border-sky-500 text-sky-600 hover:bg-sky-50"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
              )}
            </>
          }
        />

        <div className="py-6">
          {error ? (
            <Card className="p-12 text-center">
              <div className="text-red-500 mb-4 font-semibold">Error loading gigs</div>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={loadGigs} variant="outline">
                Try Again
              </Button>
            </Card>
          ) : !isLoading && gigs.length === 0 ? (
            <GigListEmptyState
              hasActiveFilters={false}
              onClearFilters={() => {}}
              onCreateGig={onCreateGig}
              onNavigateToImport={onNavigateToImport}
            />
          ) : (
            <SmartDataTable
              tableId="gig-list"
              data={gigs}
              columns={gigColumns}
              rowActions={rowActions}
              onRowUpdate={canEdit ? handleRowUpdate : undefined}
              onAddRowClick={canEdit ? onCreateGig : undefined}
              isLoading={isLoading}
              emptyMessage="No gigs found"
            />
          )}
        </div>
      </div>
    </div>
  );
}
