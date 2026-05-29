import { useState, useEffect, useMemo } from 'react';
import { Alert, AlertDescription } from '../ui/alert';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Organization, UserRole, GigStatus, GigAccountingSummary } from '../../utils/supabase/types';
import { getAllGigAccountingSummaries } from '../../services/gig.service';
import GigAccountingFilters from './GigAccountingFilters';
import GigAccountingSummaryBar from './GigAccountingSummaryBar';
import GigAccountingTable, { GigSection } from './GigAccountingTable';
import GigAccountingCardView from './GigAccountingCardView';

interface GigAccountingTabProps {
  organization: Organization;
  userRole?: UserRole;
  onNavigateToGigDetail?: (gigId: string) => void;
}

const DEFAULT_STATUS_FILTERS: GigStatus[] = ['Completed', 'Booked', 'Proposed', 'DateHold'];

export default function GigAccountingTab({
  organization,
  userRole,
  onNavigateToGigDetail,
}: GigAccountingTabProps) {
  const [summaries, setSummaries] = useState<GigAccountingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilters, setStatusFilters] = useState<GigStatus[]>(DEFAULT_STATUS_FILTERS);
  const [showSettled, setShowSettled] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getAllGigAccountingSummaries(organization.id)
      .then((data) => {
        if (!cancelled) {
          setSummaries(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load gig accounting data.');
          setIsLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [organization.id]);

  const handleQuickFilter = (key: string | null) => {
    setActiveQuickFilter(key);
    if (!key) return;

    const now = new Date();
    const year = now.getFullYear();

    switch (key) {
      case 'needs-attention':
        setStatusFilters(['Completed']);
        setShowSettled(false);
        setDateFrom('');
        setDateTo('');
        break;
      case 'upcoming':
        setStatusFilters(['Booked', 'Proposed', 'DateHold']);
        setShowSettled(false);
        setDateFrom('');
        setDateTo('');
        break;
      case 'this-year':
        setDateFrom(`${year}-01-01`);
        setDateTo(`${year}-12-31`);
        break;
      case 'unsettled-revenue':
        break;
      case 'payments-due':
        break;
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilters(DEFAULT_STATUS_FILTERS);
    setShowSettled(false);
    setDateFrom('');
    setDateTo('');
    setActiveQuickFilter(null);
  };

  const filteredSummaries = useMemo(() => {
    let result = summaries;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => s.gigTitle.toLowerCase().includes(q));
    }

    result = result.filter((s) => {
      if (s.gigStatus === 'Settled') return showSettled;
      return statusFilters.includes(s.gigStatus);
    });

    if (dateFrom) {
      result = result.filter((s) => s.gigStart >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((s) => s.gigStart <= dateTo);
    }

    if (activeQuickFilter === 'unsettled-revenue') {
      result = result.filter((s) => s.outstandingRevenue > 0);
    }
    if (activeQuickFilter === 'payments-due') {
      result = result.filter((s) => s.paymentsToMake > 0);
    }

    return result;
  }, [summaries, searchQuery, statusFilters, showSettled, dateFrom, dateTo, activeQuickFilter]);

  const sections = useMemo((): GigSection[] => {
    const now = new Date().toISOString();

    const needsAttention = filteredSummaries
      .filter((s) => s.gigStatus === 'Completed')
      .sort((a, b) => b.gigStart.localeCompare(a.gigStart));

    const upcoming = filteredSummaries
      .filter((s) => ['Booked', 'Proposed', 'DateHold'].includes(s.gigStatus) && s.gigStart > now)
      .sort((a, b) => b.gigStart.localeCompare(a.gigStart));

    const needsAttentionIds = new Set(needsAttention.map((s) => s.gigId));
    const upcomingIds = new Set(upcoming.map((s) => s.gigId));

    const pastSettled = filteredSummaries
      .filter((s) => !needsAttentionIds.has(s.gigId) && !upcomingIds.has(s.gigId))
      .sort((a, b) => b.gigStart.localeCompare(a.gigStart));

    return [
      {
        id: 'needs-attention',
        label: 'Needs Attention',
        gigs: needsAttention,
        defaultCollapsed: false,
      },
      {
        id: 'upcoming',
        label: 'Upcoming',
        gigs: upcoming,
        defaultCollapsed: false,
      },
      {
        id: 'past-settled',
        label: 'Past & Settled',
        gigs: pastSettled,
        defaultCollapsed: true,
      },
    ];
  }, [filteredSummaries]);

  if (userRole !== 'Admin') {
    return (
      <Alert>
        <AlertDescription>Financial data is restricted to Admins.</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-8 flex flex-col items-center gap-4">
        <Skeleton className="h-8 w-full max-w-sm" />
        <Skeleton className="h-4 w-full max-w-xs" />
        <Skeleton className="h-4 w-full max-w-xs" />
        <Skeleton className="h-64 w-full" />
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (summaries.length === 0) {
    return (
      <Card className="p-12 text-center text-gray-500">
        <p className="text-lg font-medium">No gigs found.</p>
        <p className="text-sm">Create your first gig to start tracking financials.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <GigAccountingFilters
        searchQuery={searchQuery}
        statusFilters={statusFilters}
        showSettled={showSettled}
        dateFrom={dateFrom}
        dateTo={dateTo}
        viewMode={viewMode}
        activeQuickFilter={activeQuickFilter}
        onSearchChange={setSearchQuery}
        onStatusFiltersChange={setStatusFilters}
        onShowSettledChange={setShowSettled}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onViewModeChange={setViewMode}
        onQuickFilter={handleQuickFilter}
        onClearFilters={handleClearFilters}
      />

      <GigAccountingSummaryBar summaries={filteredSummaries} />

      {viewMode === 'table' ? (
        <GigAccountingTable
          sections={sections}
          onNavigateToGigDetail={onNavigateToGigDetail}
          organizationId={organization.id}
        />
      ) : (
        <GigAccountingCardView
          sections={sections}
          onNavigateToGigDetail={onNavigateToGigDetail}
        />
      )}
    </div>
  );
}
