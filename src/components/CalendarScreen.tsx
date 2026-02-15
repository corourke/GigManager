import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isWithinInterval } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import AppHeader from './AppHeader';
import { PageHeader } from './ui/PageHeader';
import { CalendarFilters } from './CalendarFilters';
import {
  getGigsForOrganization,
} from '../services/gig.service';
import { Organization, User, UserRole, GigStatus, Gig } from '../utils/supabase/types';
import { GIG_STATUS_CONFIG } from '../utils/supabase/constants';
import { formatDateTimeDisplay } from '../utils/dateUtils';
import CalendarIntegrationSettings from './CalendarIntegrationSettings';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  onBack: () => void;
  onViewGig: (gigId: string) => void;
  onCreateGig: () => void;
  onNavigateToDashboard: () => void;
  onNavigateToGigs: () => void;
  onNavigateToAssets: () => void;
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

type ViewType = 'month' | 'week' | 'day';

export default function CalendarScreen({
  organization,
  user,
  userRole,
  onBack,
  onViewGig,
  onCreateGig,
  onNavigateToDashboard,
  onNavigateToGigs,
  onNavigateToAssets,
  onSwitchOrganization,
  onLogout,
  onEditProfile,
}: CalendarScreenProps) {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');

  // Filter states
  const [statusFilter, setStatusFilter] = useState<GigStatus | 'all'>('all');
  const [venueFilter, setVenueFilter] = useState<string>('all');
  const [actFilter, setActFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  useEffect(() => {
    loadGigs();
  }, [organization.id]);

  const loadGigs = async () => {
    try {
      setLoading(true);
      const gigsData = await getGigsForOrganization(organization.id);
      setGigs(gigsData);
    } catch (error) {
      console.error('Error loading gigs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGigs = useMemo(() => {
    return gigs.filter(gig => {
      // Status filter
      if (statusFilter !== 'all' && gig.status !== statusFilter) return false;

      // Venue filter
      if (venueFilter !== 'all' && gig.venue?.id !== venueFilter) return false;

      // Act filter
      if (actFilter !== 'all' && gig.act?.id !== actFilter) return false;

      // Staff filter - check if any staff assignment matches
      if (staffFilter !== 'all') {
        const hasMatchingStaff = gig.staff_slots?.some(slot =>
          slot.assignments?.some(assignment => assignment.user_id === staffFilter)
        );
        if (!hasMatchingStaff) return false;
      }

      // Date range filter
      if (dateFrom || dateTo) {
        const gigStart = new Date(gig.start);
        const gigEnd = new Date(gig.end);

        if (dateFrom && dateTo) {
          // Check if gig overlaps with the date range
          if (!isWithinInterval(gigStart, { start: dateFrom, end: dateTo }) &&
              !isWithinInterval(gigEnd, { start: dateFrom, end: dateTo }) &&
              !isWithinInterval(dateFrom, { start: gigStart, end: gigEnd }) &&
              !isWithinInterval(dateTo, { start: gigStart, end: gigEnd })) {
            return false;
          }
        } else if (dateFrom) {
          if (gigEnd < dateFrom) return false;
        } else if (dateTo) {
          if (gigStart > dateTo) return false;
        }
      }

      return true;
    });
  }, [gigs, statusFilter, venueFilter, actFilter, staffFilter, dateFrom, dateTo]);

  const hasActiveFilters = useMemo(() => {
    return statusFilter !== 'all' ||
           venueFilter !== 'all' ||
           actFilter !== 'all' ||
           staffFilter !== 'all' ||
           dateFrom !== undefined ||
           dateTo !== undefined;
  }, [statusFilter, venueFilter, actFilter, staffFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setStatusFilter('all');
    setVenueFilter('all');
    setActFilter('all');
    setStaffFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

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
    return {
      style: {
        backgroundColor: statusConfig?.color || '#6b7280',
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    const gig = event.resource;
    const statusConfig = GIG_STATUS_CONFIG[gig.status];

    return (
      <div className="p-1 cursor-pointer" onClick={() => onViewGig(gig.id)}>
        <div className="font-medium text-sm truncate">{gig.title}</div>
        <div className="text-xs opacity-90">
          {formatDateTimeDisplay(gig.start, gig.end, gig.timezone)}
        </div>
        {gig.venue && (
          <div className="text-xs opacity-75 truncate">{gig.venue.name}</div>
        )}
      </div>
    );
  };

  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    const newDate = new Date(currentDate);
    switch (action) {
      case 'PREV':
        if (view === 'month') newDate.setMonth(newDate.getMonth() - 1);
        else if (view === 'week') newDate.setDate(newDate.getDate() - 7);
        else newDate.setDate(newDate.getDate() - 1);
        break;
      case 'NEXT':
        if (view === 'month') newDate.setMonth(newDate.getMonth() + 1);
        else if (view === 'week') newDate.setDate(newDate.getDate() + 7);
        else newDate.setDate(newDate.getDate() + 1);
        break;
      case 'TODAY':
        newDate.setTime(new Date().getTime());
        break;
    }
    setCurrentDate(newDate);
  };

  const CustomToolbar = () => (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => handleNavigate('PREV')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleNavigate('TODAY')}>
          Today
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleNavigate('NEXT')}>
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {format(currentDate, view === 'month' ? 'MMMM yyyy' : view === 'week' ? "'Week of' MMM d, yyyy" : 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(date) => date && setCurrentDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-4">
        <Tabs value={view} onValueChange={(v) => setView(v as ViewType)}>
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="day">Day</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader
          organization={organization}
          user={user}
          userRole={userRole}
          onNavigateToDashboard={onNavigateToDashboard}
          onNavigateToGigs={onNavigateToGigs}
          onNavigateToAssets={onNavigateToAssets}
          onSwitchOrganization={onSwitchOrganization}
          onLogout={onLogout}
          onEditProfile={onEditProfile}
        />
        <div className="flex items-center justify-center h-64">
          <div>Loading calendar...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        organization={organization}
        user={user}
        userRole={userRole}
        onNavigateToDashboard={onNavigateToDashboard}
        onNavigateToGigs={onNavigateToGigs}
        onNavigateToAssets={onNavigateToAssets}
        onSwitchOrganization={onSwitchOrganization}
        onLogout={onLogout}
        onEditProfile={onEditProfile}
      />

      <div className="container mx-auto p-6">
        <PageHeader
          icon={CalendarIcon}
          title="Calendar"
          description="View and manage your gigs in calendar format"
          actions={
            <Button onClick={onCreateGig}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              Create Gig
            </Button>
          }
        />

        <CalendarFilters
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          venueFilter={venueFilter}
          setVenueFilter={setVenueFilter}
          actFilter={actFilter}
          setActFilter={setActFilter}
          staffFilter={staffFilter}
          setStaffFilter={setStaffFilter}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
          organizationId={organization.id}
        />

        <div className="mt-6">
          <CalendarIntegrationSettings
            userId={user.id}
            onSettingsChanged={() => {
              // Could refresh calendar data if needed
            }}
          />
        </div>

        <Card className="mt-6">
          <CustomToolbar />
          <div className="p-4">
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              view={view}
              onView={setView}
              date={currentDate}
              onNavigate={setCurrentDate}
              eventPropGetter={eventStyleGetter}
              components={{
                event: EventComponent,
              }}
              views={['month', 'week', 'day']}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}