import { useState, useMemo, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { 
  getGigsForOrganization, 
  duplicateGig, 
  deleteGig 
} from '../services/gig.service';
import AppHeader from './AppHeader';
import GigTable from './tables/GigTable';
import { GigListFilters } from './gigs/GigListFilters';
import { GigListEmptyState } from './gigs/GigListEmptyState';
import {
  Plus,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Organization, User, UserRole, GigStatus, Gig } from '../utils/supabase/types';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GigStatus | 'All'>('All');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const canEdit = userRole === 'Admin' || userRole === 'Manager';

  // Load gigs on mount
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

  const handleGigClick = (gigId: string) => {
    onViewGig(gigId);
  };

  const handleGigEdit = (gigId: string) => {
    onEditGig(gigId);
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
      setGigs(prevGigs => prevGigs.filter(g => g.id !== gigId));
    }

    try {
      await deleteGig(gigId);
      toast.success('Gig deleted successfully');
      loadGigs();
    } catch (err: any) {
      console.error('Error deleting gig:', err);
      toast.error(err.message || 'Failed to delete gig');
      if (gigToDelete) {
        setGigs(prevGigs => [...prevGigs, gigToDelete].sort((a, b) => {
          const dateA = new Date(a.start).getTime();
          const dateB = new Date(b.start).getTime();
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        }));
      }
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'All' || dateFrom || dateTo;

  // Filter and sort gigs
  const filteredGigs = gigs.filter((gig) => {
    if (searchQuery && !gig.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter !== 'All' && gig.status !== statusFilter) return false;
    if (dateFrom || dateTo) {
      const gigDate = new Date(gig.start);
      if (dateFrom && gigDate < dateFrom) return false;
      if (dateTo && gigDate > dateTo) return false;
    }
    return true;
  }).sort((a, b) => {
    const dateA = new Date(a.start).getTime();
    const dateB = new Date(b.start).getTime();
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

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

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gigs</h1>
            </div>
            <div className="flex gap-2">
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
            </div>
          </div>
        </div>
      </div>

      <GigListFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        onClearFilters={handleClearFilters}
        hasActiveFilters={!!hasActiveFilters}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error ? (
          <Card className="p-12 text-center">
            <div className="text-red-500 mb-4 font-semibold">Error loading gigs</div>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={loadGigs} variant="outline">
              Try Again
            </Button>
          </Card>
        ) : isLoading ? (
          <GigTable
            gigs={[]}
            mode="list"
            showActions={true}
            loading={true}
            emptyMessage="Loading gigs..."
          />
        ) : filteredGigs.length === 0 ? (
          <GigListEmptyState
            hasActiveFilters={!!hasActiveFilters}
            onClearFilters={handleClearFilters}
            onCreateGig={onCreateGig}
            onNavigateToImport={onNavigateToImport}
          />
        ) : (
          <GigTable
            gigs={filteredGigs}
            mode="list"
            showActions={true}
            onGigClick={handleGigClick}
            onGigEdit={handleGigEdit}
            onGigDuplicate={handleGigDuplicate}
            onGigDelete={handleGigDelete}
            loading={false}
            emptyMessage="No gigs found"
          />
        )}
      </div>
    </div>
  );
}

