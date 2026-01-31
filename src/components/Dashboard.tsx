import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import AppHeader from './AppHeader';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Package,
  Loader2,
} from 'lucide-react';
import { Organization, User, UserRole } from '../utils/supabase/types';
import { USER_ROLE_CONFIG, GIG_STATUS_CONFIG } from '../utils/supabase/constants';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { createClient } from '../utils/supabase/client';
import GigTable, { type Gig } from './tables/GigTable';

interface DashboardProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  onBackToSelection: () => void;
  onLogout: () => void;
  onNavigateToGigs?: () => void;
  onNavigateToDashboard?: () => void;
  onNavigateToTeam?: () => void;
  onNavigateToAssets?: () => void;
  onNavigateToKits?: () => void;
  onEditProfile?: () => void;
  onNavigateToGigEdit?: (gigId: string) => void;
}

interface DashboardStats {
  gigsByStatus: {
    DateHold: number;
    Proposed: number;
    Booked: number;
    Completed: number;
    Cancelled: number;
    Settled: number;
  };
  assetValues: {
    totalAssetValue: number;
    totalInsuredValue: number;
    totalRentalValue: number;
  };
  revenue: {
    thisMonth: number;
    lastMonth: number;
    thisYear: number;
  };
  upcomingGigs: Array<{
    id: string;
    title: string;
    start: string;
    end?: string;
    timezone?: string;
    status: string;
    act: string;
    venue: string;
    staffing: {
      unfilledSlots: number;
      unconfirmedAssignments: number;
      rejectedAssignments: number;
      confirmedAssignments: number;
    };
  }>;
}

export default function Dashboard({
  organization,
  user,
  userRole,
  onBackToSelection,
  onLogout,
  onNavigateToGigs,
  onNavigateToDashboard,
  onNavigateToTeam,
  onNavigateToAssets,
  onNavigateToKits,
  onEditProfile,
  onNavigateToGigEdit,
}: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Dashboard mounted/updated:', {
      organizationId: organization.id,
      organizationName: organization.name,
      userId: user.id,
      userRole: userRole,
    });
    fetchDashboardStats();
  }, [organization.id]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('Dashboard: No active session found');
        setError('Not authenticated. Please sign in again.');
        setLoading(false);
        return;
      }

      console.log('Dashboard: Making API call for organization:', organization.id, organization.name);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-de012ad4/organizations/${organization.id}/dashboard`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Dashboard: API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Dashboard API error:', {
          status: response.status,
          error: errorData,
          organizationId: organization.id,
        });
        
        if (response.status === 401) {
          setError('Session expired. Please sign in again.');
        } else if (response.status === 403) {
          setError('You do not have permission to view this organization\'s dashboard.');
        } else {
          setError(errorData.error || 'Failed to fetch dashboard stats');
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Dashboard: API response data:', data);
      setStats(data);
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        organization={organization}
        user={user}
        userRole={userRole}
        currentRoute="dashboard"
        onNavigateToDashboard={onNavigateToDashboard}
        onNavigateToGigs={onNavigateToGigs}
        onNavigateToTeam={onNavigateToTeam}
        onNavigateToAssets={onNavigateToAssets}
        onSwitchOrganization={onBackToSelection}
        onEditProfile={onEditProfile}
        onLogout={onLogout}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-gray-900 mb-2">Welcome back, {user.first_name}!</h1>
          <p className="text-gray-600">Here's what's happening with {organization.name}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <Button onClick={fetchDashboardStats} variant="outline" size="sm" className="mt-2">
              Retry
            </Button>
          </div>
        ) : stats ? (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow p-[16px]"
                onClick={onNavigateToGigs}
              >
                <div className="flex items-center justify-between mb-[4px] mt-[0px] mr-[0px] ml-[0px]">
                  <p className="text-sm text-gray-600 font-bold">Gigs</p>
                  <Calendar className="w-5 h-5 text-sky-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs text-gray-500">{GIG_STATUS_CONFIG.Booked.label}</p>
                    <p className="text-gray-900">{stats.gigsByStatus.Booked}</p>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs text-gray-500">{GIG_STATUS_CONFIG.Proposed.label}</p>
                    <p className="text-gray-900">{stats.gigsByStatus.Proposed}</p>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs text-gray-500">{GIG_STATUS_CONFIG.DateHold.label}</p>
                    <p className="text-gray-900">{stats.gigsByStatus.DateHold}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={onNavigateToAssets}>
                <div className="flex items-center justify-between mb-[4px] mt-[0px] mr-[0px] ml-[0px]">
                  <p className="text-sm text-gray-600 font-bold">Equipment</p>
                  <Package className="w-5 h-5 text-purple-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs text-gray-500">Total Value</p>
                    <p className="text-gray-900">{formatCurrency(stats.assetValues.totalAssetValue)}</p>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs text-gray-500">Insured</p>
                    <p className="text-gray-900">{formatCurrency(stats.assetValues.totalInsuredValue)}</p>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs text-gray-500">Rental Value</p>
                    <p className="text-gray-900">{formatCurrency(stats.assetValues.totalRentalValue)}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-[4px] mt-[0px] mr-[0px] ml-[0px]">
                  <p className="text-sm text-gray-600 font-bold">Revenue</p>
                  <LayoutDashboard className="w-5 h-5 text-amber-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs text-gray-500">This Month</p>
                    <p className="text-gray-900">{formatCurrency(stats.revenue.thisMonth)}</p>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs text-gray-500">Last Month</p>
                    <p className="text-gray-900">{formatCurrency(stats.revenue.lastMonth)}</p>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs text-gray-500">This Year</p>
                    <p className="text-gray-900">{formatCurrency(stats.revenue.thisYear)}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-[4px] mt-[0px] mr-[0px] ml-[0px]">
                  <p className="text-sm text-gray-600 font-bold">Status Summary</p>
                  <Users className="w-5 h-5 text-green-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs text-gray-500">{GIG_STATUS_CONFIG.Completed.label}</p>
                    <p className="text-gray-900">{stats.gigsByStatus.Completed}</p>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs text-gray-500">{GIG_STATUS_CONFIG.Settled.label}</p>
                    <p className="text-gray-900">{stats.gigsByStatus.Settled}</p>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs text-gray-500">{GIG_STATUS_CONFIG.Cancelled.label}</p>
                    <p className="text-gray-900">{stats.gigsByStatus.Cancelled}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Main Dashboard Content */}
            <div className="grid grid-cols-1 gap-6">
              {/* Upcoming Events */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-900">Upcoming Gigs (Next 30 Days)</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onNavigateToGigs}
                    className="text-sky-600 hover:text-sky-700 hover:bg-sky-50 border-sky-200"
                  >
                    View All Gigs
                  </Button>
                </div>
                {stats.upcomingGigs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No upcoming gigs in the next 30 days</p>
                  </div>
                ) : (
                  <GigTable
                    gigs={stats.upcomingGigs.map(g => ({
                      id: g.id,
                      title: g.title,
                      start: g.start,
                      end: g.end || g.start, // Use actual end time if available
                      timezone: g.timezone || 'America/Los_Angeles', // Use gig timezone or default
                      status: g.status as any,
                      tags: [],
                      venue: g.venue ? { id: '', name: g.venue, type: 'Venue' } as any : undefined,
                      act: g.act ? { id: '', name: g.act, type: 'Act' } as any : undefined,
                      created_at: g.start,
                      updated_at: g.start,
                    }))}
                    mode="dashboard"
                    showActions={false}
                    onGigEdit={onNavigateToGigEdit}
                    emptyMessage="No upcoming gigs in the next 30 days"
                  />
                )}
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}