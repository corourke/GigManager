import { useState, useMemo, useEffect, useCallback } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar as DatePicker } from './ui/calendar';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  getGigsForOrganization,
  updateGig,
  duplicateGig,
  deleteGig,
} from '../services/gig.service';
import AppHeader from './AppHeader';
import { SmartDataTable, ColumnDef, RowAction } from './tables/SmartDataTable';
import { GigListEmptyState } from './gigs/GigListEmptyState';
import { ConflictWarning } from './ConflictWarning';
import {
  Plus,
  Upload,
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Organization, User, UserRole, GigStatus, Gig } from '../utils/supabase/types';
import { GIG_STATUS_CONFIG, TAG_CONFIG } from '../utils/supabase/constants';
import { formatDateTimeDisplay, formatTimeDisplay } from '../utils/dateUtils';
import { PageHeader } from './ui/PageHeader';
import { checkAllConflicts, Conflict } from '../services/conflictDetection.service';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

type ViewMode = 'list' | 'calendar';
type CalendarViewType = 'month' | 'week';

interface GigListScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  initialViewMode?: ViewMode;
  onBack: () => void;
  onCreateGig: () => void;
  onViewGig: (gigId: string, fromCalendar?: boolean) => void;
  onEditGig: (gigId: string) => void;
  onNavigateToDashboard: () => void;
  onNavigateToGigs: () => void;
  onNavigateToAssets: () => void;
  onNavigateToImport?: () => void;
  onSwitchOrganization: () => void;
  onLogout: () => void;
  onEditProfile?: () => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Gig;
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
  initialViewMode = 'list',
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
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [futureOnly, setFutureOnly] = useState(false);

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarViewType>('month');

  const [conflicts, setConflicts] = useState<Conflict[]>([]);

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

      if (viewMode === 'calendar') {
        const allConflicts: Conflict[] = [];
        for (const gig of (data || [])) {
          const gigConflicts = await checkAllConflicts(gig.id, gig.start, gig.end);
          allConflicts.push(...gigConflicts.conflicts);
        }
        setConflicts(allConflicts);
      }
    } catch (err: any) {
      console.error('Error loading gigs:', err);
      setError(err.message || 'Failed to load gigs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'calendar' && gigs.length > 0 && conflicts.length === 0) {
      (async () => {
        const allConflicts: Conflict[] = [];
        for (const gig of gigs) {
          const gigConflicts = await checkAllConflicts(gig.id, gig.start, gig.end);
          allConflicts.push(...gigConflicts.conflicts);
        }
        setConflicts(allConflicts);
      })();
    }
  }, [viewMode]);

  const filteredGigs = useMemo(() => {
    if (!futureOnly) return gigs;
    const today = startOfDay(new Date());
    return gigs.filter(gig => new Date(gig.end || gig.start) >= today);
  }, [gigs, futureOnly]);

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

  const handleOverrideConflict = (conflictId: string) => {
    toast.success('Conflict override noted. This feature will be implemented in a future update.');
  };

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

  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return filteredGigs.map(gig => ({
      id: gig.id,
      title: gig.title,
      start: new Date(gig.start),
      end: new Date(gig.end),
      resource: gig,
    }));
  }, [filteredGigs]);

  const eventStyleGetter = (event: CalendarEvent) => {
    const statusConfig = GIG_STATUS_CONFIG[event.resource.status];
    const hasConflicts = conflicts.some(conflict => conflict.gig_id === event.resource.id);

    return {
      style: {
        backgroundColor: hasConflicts ? '#dc2626' : (statusConfig?.color || '#6b7280'),
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: hasConflicts ? '2px solid #991b1b' : '0px',
        display: 'block',
      },
    };
  };

  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    const gig = event.resource;

    const parts: string[] = [];
    const timeStr = formatTimeDisplay(gig.start, gig.timezone);
    if (timeStr) parts.push(timeStr);
    if (gig.act?.name) parts.push(gig.act.name);
    if (gig.venue?.name) parts.push(gig.venue.name);

    return (
      <div className="p-0.5 cursor-pointer text-xs leading-tight">
        <div className="font-medium truncate">{gig.title}</div>
        {parts.length > 0 && (
          <div className="opacity-85 truncate">{parts.join(' · ')}</div>
        )}
      </div>
    );
  };

  const handleCalendarNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    const newDate = new Date(calendarDate);
    switch (action) {
      case 'PREV':
        if (calendarView === 'month') newDate.setMonth(newDate.getMonth() - 1);
        else newDate.setDate(newDate.getDate() - 7);
        break;
      case 'NEXT':
        if (calendarView === 'month') newDate.setMonth(newDate.getMonth() + 1);
        else newDate.setDate(newDate.getDate() + 7);
        break;
      case 'TODAY':
        newDate.setTime(new Date().getTime());
        break;
    }
    setCalendarDate(newDate);
  };

  const handleDrillDown = (date: Date) => {
    setCalendarDate(date);
    setCalendarView('week');
  };

  const viewToggle = (
    <div className="flex items-center border rounded-lg overflow-hidden">
      <button
        onClick={() => setViewMode('list')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
          viewMode === 'list'
            ? 'bg-sky-500 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
      >
        <List className="w-4 h-4" />
        List
      </button>
      <button
        onClick={() => setViewMode('calendar')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
          viewMode === 'calendar'
            ? 'bg-sky-500 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
      >
        <Calendar className="w-4 h-4" />
        Calendar
      </button>
    </div>
  );

  const futureGigsToggle = (
    <Button
      variant={futureOnly ? 'default' : 'outline'}
      size="sm"
      onClick={() => setFutureOnly(!futureOnly)}
      className={futureOnly ? 'bg-sky-500 hover:bg-sky-600 text-white' : ''}
    >
      {futureOnly ? <ToggleRight className="w-4 h-4 mr-1.5" /> : <ToggleLeft className="w-4 h-4 mr-1.5" />}
      Future Gigs
    </Button>
  );

  const calendarToolbar = (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => handleCalendarNavigate('PREV')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleCalendarNavigate('TODAY')}>
          Today
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleCalendarNavigate('NEXT')}>
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {format(calendarDate, calendarView === 'month' ? 'MMMM yyyy' : "'Week of' MMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <DatePicker
              mode="single"
              selected={calendarDate}
              onSelect={(date) => date && setCalendarDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-2">
        <Tabs value={calendarView} onValueChange={(v) => setCalendarView(v as CalendarViewType)}>
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );

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
          title="Gigs"
          description={`Manage gigs for ${organization.name}`}
          actions={
            <>
              {viewToggle}
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
          ) : viewMode === 'list' ? (
            !isLoading && gigs.length === 0 ? (
              <GigListEmptyState
                hasActiveFilters={false}
                onClearFilters={() => {}}
                onCreateGig={onCreateGig}
                onNavigateToImport={onNavigateToImport}
              />
            ) : (
              <SmartDataTable
                tableId="gig-list"
                data={filteredGigs}
                columns={gigColumns}
                rowActions={rowActions}
                onRowUpdate={canEdit ? handleRowUpdate : undefined}
                onAddRowClick={canEdit ? onCreateGig : undefined}
                isLoading={isLoading}
                emptyMessage="No gigs found"
                toolbarLeft={futureGigsToggle}
              />
            )
          ) : (
            <>
              {conflicts.length > 0 && (
                <div className="mb-4">
                  <ConflictWarning
                    conflicts={conflicts}
                    onViewGig={(id) => onViewGig(id, true)}
                    onOverride={handleOverrideConflict}
                  />
                </div>
              )}

              <Card>
                {calendarToolbar}
                <div className="p-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-[600px]">
                      <div>Loading calendar...</div>
                    </div>
                  ) : (
                    <BigCalendar
                      localizer={localizer}
                      events={calendarEvents}
                      startAccessor="start"
                      endAccessor="end"
                      style={{ height: 600 }}
                      view={calendarView}
                      onView={(v) => setCalendarView(v as CalendarViewType)}
                      date={calendarDate}
                      onNavigate={setCalendarDate}
                      onSelectEvent={(event) => onViewGig(event.id, true)}
                      onDrillDown={handleDrillDown}
                      eventPropGetter={eventStyleGetter}
                      toolbar={false}
                      components={{
                        event: EventComponent,
                      }}
                      views={['month', 'week']}
                    />
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
