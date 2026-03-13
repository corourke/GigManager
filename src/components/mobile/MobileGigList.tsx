import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Search,
  MapPin,
  ChevronRight,
  Loader2,
  WifiOff,
  RefreshCw,
  Calendar,
  X,
  Filter,
  Plus,
  Music,
} from 'lucide-react';
import { format, parseISO, subDays, addDays } from 'date-fns';
import { getGigsForOrganization, createGig, updateGig } from '../../services/gig.service';
import { searchOrganizations } from '../../services/organization.service';
import { useAuth } from '../../contexts/AuthContext';
import { GIG_STATUS_CONFIG } from '../../utils/supabase/constants';
import { cn } from '../ui/utils';
import type { GigStatus } from '../../utils/supabase/types';
import { getAllTimezones } from '../../utils/timezones';
import { toast } from 'sonner';

interface MobileGigListProps {
  onViewGig: (gigId: string) => void;
}

const STATUS_TABS: { key: 'all' | GigStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Booked', label: 'Booked' },
  { key: 'Proposed', label: 'Proposed' },
  { key: 'DateHold', label: 'Hold' },
  { key: 'Completed', label: 'Done' },
  { key: 'Cancelled', label: 'Cancel' },
];

const GIG_STATUSES: { key: GigStatus; label: string }[] = [
  { key: 'DateHold', label: 'Date Hold' },
  { key: 'Proposed', label: 'Proposed' },
  { key: 'Booked', label: 'Booked' },
  { key: 'Completed', label: 'Completed' },
  { key: 'Cancelled', label: 'Cancelled' },
];

export default function MobileGigList({ onViewGig }: MobileGigListProps) {
  const { selectedOrganization } = useAuth();
  const [gigs, setGigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<'all' | GigStatus>('all');
  const [dateFilter, setDateFilter] = useState<'upcoming' | 'all'>('upcoming');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusMenuGigId, setStatusMenuGigId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    const handleStatusChange = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  useEffect(() => {
    if (selectedOrganization?.id) {
      loadGigs();
    }
  }, [selectedOrganization?.id]);

  const loadGigs = async () => {
    if (!selectedOrganization?.id) return;
    setLoading(true);
    try {
      const data = await getGigsForOrganization(selectedOrganization.id);
      setGigs(data || []);
    } catch (error) {
      console.error('Failed to load gigs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (gigId: string, newStatus: GigStatus) => {
    setUpdatingStatus(gigId);
    try {
      await updateGig(gigId, { status: newStatus });
      toast.success(`Status updated to ${GIG_STATUS_CONFIG[newStatus].label}`);
      await loadGigs();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(null);
      setStatusMenuGigId(null);
    }
  };

  const handleGigCreated = useCallback(() => {
    setShowCreateModal(false);
    loadGigs();
  }, [selectedOrganization?.id]);

  const filteredGigs = useMemo(() => {
    let result = gigs;

    if (dateFilter === 'upcoming') {
      const yesterday = subDays(new Date(), 1);
      const weekAhead = addDays(new Date(), 7);
      result = result.filter((g) => {
        const start = new Date(g.start);
        return start >= yesterday && start <= weekAhead;
      });
    }

    if (activeStatus !== 'all') {
      result = result.filter((g) => g.status === activeStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((g) => {
        const venue = g.participants?.find((p: any) => p.role === 'Venue')?.organization;
        const act = g.participants?.find((p: any) => p.role === 'Act')?.organization;
        return (
          g.title?.toLowerCase().includes(q) ||
          venue?.name?.toLowerCase().includes(q) ||
          act?.name?.toLowerCase().includes(q) ||
          g.tags?.some((t: string) => t.toLowerCase().includes(q))
        );
      });
    }

    return result.sort((a: any, b: any) => new Date(b.start).getTime() - new Date(a.start).getTime());
  }, [gigs, activeStatus, searchQuery, dateFilter]);

  const upcomingGigs = useMemo(() => {
    const now = new Date();
    return filteredGigs.filter((g) => new Date(g.start) >= now);
  }, [filteredGigs]);

  const pastGigs = useMemo(() => {
    const now = new Date();
    return filteredGigs.filter((g) => new Date(g.start) < now);
  }, [filteredGigs]);

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Gigs</h1>
            <p className="text-xs text-muted-foreground">
              {dateFilter === 'upcoming' ? 'Next 7 days' : 'All dates'} · {filteredGigs.length} gigs
            </p>
          </div>
          <div className="flex items-center gap-1">
            {isOffline && (
              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200">
                <WifiOff className="w-3 h-3" />
                <span className="text-[10px]">Offline</span>
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(true)} className="h-9 w-9">
              <Plus className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={loadGigs} disabled={loading} className="h-9 w-9">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="px-4 pb-2 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search gigs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-9 text-sm bg-muted/50 rounded-lg border-0 outline-none focus:ring-2 focus:ring-sky-500/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={() => setDateFilter(dateFilter === 'upcoming' ? 'all' : 'upcoming')}
            className={cn(
              'flex items-center gap-1 px-4 h-9 rounded-md text-[10px] font-medium border shrink-0 transition-colors',
              dateFilter === 'all'
                ? 'bg-sky-500 text-white border-sky-500'
                : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
            )}
          >
            <Filter className="w-3 h-3" />
            {dateFilter === 'upcoming' ? '7d' : 'All'}
          </button>
        </div>

        <div className="px-4 pt-1 pb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveStatus(tab.key)}
              className={cn(
                'px-3 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors border',
                activeStatus === tab.key
                  ? 'bg-sky-500 text-white border-sky-500'
                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-6 pb-12">
        {loading && gigs.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
          </div>
        ) : filteredGigs.length === 0 ? (
          <Card className="p-8 text-center bg-muted/30 border-dashed">
            <p className="text-muted-foreground text-sm">
              {searchQuery ? 'No gigs match your search.' : 'No gigs found.'}
            </p>
          </Card>
        ) : (
          <>
            {upcomingGigs.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                  Upcoming ({upcomingGigs.length})
                </h2>
                <div className="grid gap-2">
                  {upcomingGigs.map((gig) => (
                    <GigListCard
                      key={gig.id}
                      gig={gig}
                      onViewGig={onViewGig}
                      statusMenuOpen={statusMenuGigId === gig.id}
                      onToggleStatusMenu={(id) => setStatusMenuGigId(statusMenuGigId === id ? null : id)}
                      onStatusChange={handleStatusChange}
                      updatingStatus={updatingStatus}
                    />
                  ))}
                </div>
              </div>
            )}
            {pastGigs.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                  Past ({pastGigs.length})
                </h2>
                <div className="grid gap-2">
                  {pastGigs.map((gig) => (
                    <GigListCard
                      key={gig.id}
                      gig={gig}
                      onViewGig={onViewGig}
                      isPast
                      statusMenuOpen={statusMenuGigId === gig.id}
                      onToggleStatusMenu={(id) => setStatusMenuGigId(statusMenuGigId === id ? null : id)}
                      onStatusChange={handleStatusChange}
                      updatingStatus={updatingStatus}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showCreateModal && selectedOrganization && (
        <QuickCreateGigModal
          organizationId={selectedOrganization.id}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleGigCreated}
        />
      )}
    </div>
  );
}

function GigListCard({
  gig,
  onViewGig,
  isPast,
  statusMenuOpen,
  onToggleStatusMenu,
  onStatusChange,
  updatingStatus,
}: {
  gig: any;
  onViewGig: (id: string) => void;
  isPast?: boolean;
  statusMenuOpen: boolean;
  onToggleStatusMenu: (id: string) => void;
  onStatusChange: (gigId: string, status: GigStatus) => void;
  updatingStatus: string | null;
}) {
  const startTime = parseISO(gig.start);
  const venue = gig.participants?.find((p: any) => p.role === 'Venue')?.organization;
  const acts = gig.participants?.filter((p: any) => p.role === 'Act') || [];
  const actLabel = acts.length > 1 ? 'Multiple' : acts[0]?.organization?.name;
  const statusConfig = GIG_STATUS_CONFIG[gig.status as keyof typeof GIG_STATUS_CONFIG];

  return (
    <Card
      className={cn(
        'overflow-hidden border-l-4 active:bg-muted/50 transition-colors shadow-sm',
        isPast ? 'border-l-gray-300 opacity-75' : 'border-l-sky-500'
      )}
      style={{ gap: 0 }}
    >
      <CardContent className="px-3 py-2" style={{ paddingBottom: '8px' }} onClick={() => onViewGig(gig.id)}>
        <div className="flex justify-between items-start gap-2 cursor-pointer">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight truncate">{gig.title}</p>
            <div className="flex items-center gap-1.5 mt-0.5 text-sky-700">
              <Calendar className="w-3 h-3 shrink-0" />
              <span className="text-[11px] font-medium">
                {format(startTime, 'EEE, MMM d · h:mm a')}
              </span>
            </div>
            {venue && (
              <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="text-[11px] line-clamp-1">{venue.name}</span>
              </div>
            )}
            {actLabel && (
              <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
                <Music className="w-3 h-3 shrink-0" />
                <span className="text-[11px] line-clamp-1">{actLabel}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStatusMenu(gig.id);
              }}
              className="flex items-center"
            >
              <span
                className={cn('inline-flex items-center rounded border px-1.5 py-0.5 font-medium cursor-pointer', statusConfig?.color)}
                style={{ fontSize: '11px', lineHeight: '1' }}
              >
                {statusConfig?.label || gig.status}
              </span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
      {statusMenuOpen && (
        <div className="border-t border-border/50 px-3 py-2 bg-muted/30">
          <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Change status:</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(GIG_STATUS_CONFIG).map(([key, conf]) => (
              <button
                key={key}
                disabled={gig.status === key || updatingStatus === gig.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(gig.id, key as GigStatus);
                }}
                className={cn(
                  'px-2 py-0.5 rounded font-medium border transition-colors',
                  gig.status === key
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer hover:opacity-80',
                  conf.color
                )}
                style={{ fontSize: '11px' }}
              >
                {updatingStatus === gig.id ? '...' : conf.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function QuickCreateGigModal({
  organizationId,
  onClose,
  onCreated,
}: {
  organizationId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('19:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('22:00');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [status, setStatus] = useState<GigStatus>('DateHold');
  const [notes, setNotes] = useState('');
  const [venueId, setVenueId] = useState('');
  const [actId, setActId] = useState('');
  const [venues, setVenues] = useState<any[]>([]);
  const [acts, setActs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const timezones = useMemo(() => getAllTimezones(), []);

  useEffect(() => {
    searchOrganizations({ type: 'Venue' as any }).then(setVenues).catch(() => {});
    searchOrganizations({ type: 'Act' as any }).then(setActs).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate) return;

    setSaving(true);
    try {
      const start = `${startDate}T${startTime}:00`;
      const end = endDate ? `${endDate}T${endTime}:00` : `${startDate}T${endTime}:00`;
      const participants: any[] = [];
      participants.push({ organization_id: organizationId, role: 'Production' });
      if (venueId) participants.push({ organization_id: venueId, role: 'Venue' });
      if (actId) participants.push({ organization_id: actId, role: 'Act' });

      await createGig({
        title: title.trim(),
        start,
        end,
        timezone,
        status,
        notes: notes.trim() || undefined,
        primary_organization_id: organizationId,
        participants,
      });
      toast.success('Gig created');
      onCreated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create gig');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-background rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background px-4 py-3 border-b border-border/50 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-base font-bold">Quick Create Gig</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-muted/50 rounded-lg border-0 outline-none focus:ring-2 focus:ring-sky-500/30 mt-1"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value); }}
                className="w-full h-10 px-3 text-sm bg-muted/50 rounded-lg border-0 outline-none focus:ring-2 focus:ring-sky-500/30 mt-1"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-muted/50 rounded-lg border-0 outline-none focus:ring-2 focus:ring-sky-500/30 mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-muted/50 rounded-lg border-0 outline-none focus:ring-2 focus:ring-sky-500/30 mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-muted/50 rounded-lg border-0 outline-none focus:ring-2 focus:ring-sky-500/30 mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-muted/50 rounded-lg border-0 outline-none focus:ring-2 focus:ring-sky-500/30 mt-1"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as GigStatus)}
              className="w-full h-10 px-3 text-sm bg-muted/50 rounded-lg border-0 outline-none focus:ring-2 focus:ring-sky-500/30 mt-1"
            >
              {GIG_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase">Venue</label>
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-muted/50 rounded-lg border-0 outline-none focus:ring-2 focus:ring-sky-500/30 mt-1"
            >
              <option value="">None</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase">Act</label>
            <select
              value={actId}
              onChange={(e) => setActId(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-muted/50 rounded-lg border-0 outline-none focus:ring-2 focus:ring-sky-500/30 mt-1"
            >
              <option value="">None</option>
              {acts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-muted/50 rounded-lg border-0 outline-none focus:ring-2 focus:ring-sky-500/30 mt-1 resize-none"
            />
          </div>
          <div className="pt-2 pb-4">
            <Button type="submit" className="w-full h-11" disabled={saving || !title.trim() || !startDate}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Gig
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
