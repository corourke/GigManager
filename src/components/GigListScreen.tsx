import { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { createClient } from '../utils/supabase/client';
import * as api from '../utils/api';
import AppHeader from './AppHeader';
import GigTable from './tables/GigTable';
import { useRealtimeList } from '../utils/hooks/useRealtimeList';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Skeleton } from './ui/skeleton';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import {
  Search,
  Plus,
  ChevronLeft,
  MoreVertical,
  Calendar as CalendarIcon,
  Filter,
  X,
  ExternalLink,
  Loader2,
  AlertCircle,
  Clock,
  Edit,
  Copy,
  Trash2,
} from 'lucide-react';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format, parse } from 'date-fns';
import { toast } from 'sonner@2.0.3';
import type { Organization, User, UserRole } from '../App';

export type GigStatus = 'DateHold' | 'Proposed' | 'Booked' | 'Completed' | 'Cancelled' | 'Settled';

export interface Gig {
  id: string;
  organization_id?: string;
  title: string;
  start: string; // ISO DateTime string
  end: string; // ISO DateTime string
  timezone: string;
  status: GigStatus;
  tags: string[];
  notes?: string;
  amount_paid?: number;
  // Participants (from gig_participants table)
  venue?: Organization; // Organization with role 'Venue'
  act?: Organization; // Organization with role 'Act'
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

interface GigListScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  onBack: () => void;
  onCreateGig: () => void;
  onViewGig: (gigId: string) => void;
  onNavigateToDashboard: () => void;
  onNavigateToGigs: () => void;
  onNavigateToAssets: () => void;
  onSwitchOrganization: () => void;
  onLogout: () => void;
  useMockData?: boolean;
}

type EditingCell = {
  gigId: string;
  field: 'title' | 'date' | 'status' | 'venue' | 'act' | 'tags';
} | null;

interface CellError {
  gigId: string;
  field: string;
  message: string;
}

// Mock organizations for venue/act selection
const MOCK_VENUES: Organization[] = [
  { id: 'v1', name: 'Central Park Amphitheater', type: 'Venue', city: 'Los Angeles', state: 'CA', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'v2', name: 'Grand Ballroom Hotel', type: 'Venue', city: 'New York', state: 'NY', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'v3', name: 'Lakeside Garden Venue', type: 'Venue', city: 'Chicago', state: 'IL', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'v4', name: 'The Blue Note Jazz Club', type: 'Venue', city: 'New York', state: 'NY', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'v5', name: 'Metropolitan Center', type: 'Venue', city: 'Chicago', state: 'IL', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'v6', name: 'Red Rocks Amphitheatre', type: 'Venue', city: 'Morrison', state: 'CO', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'v7', name: 'Radio City Music Hall', type: 'Venue', city: 'New York', state: 'NY', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'v8', name: 'The Greek Theatre', type: 'Venue', city: 'Los Angeles', state: 'CA', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'v9', name: 'The Fillmore', type: 'Venue', city: 'San Francisco', state: 'CA', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'v10', name: 'House of Blues', type: 'Venue', city: 'Boston', state: 'MA', created_at: '2024-01-01', updated_at: '2024-01-01' },
];

const MOCK_ACTS: Organization[] = [
  { id: 'a1', name: 'The Midnight Riders', type: 'Act', city: 'Nashville', state: 'TN', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'a2', name: 'Sarah Johnson Quartet', type: 'Act', city: 'New York', state: 'NY', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'a3', name: 'Electric Dreams Band', type: 'Act', city: 'Los Angeles', state: 'CA', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'a4', name: 'Jazz Collective', type: 'Act', city: 'Chicago', state: 'IL', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'a5', name: 'The Acoustic Sessions', type: 'Act', city: 'Austin', state: 'TX', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'a6', name: 'Symphony Orchestra', type: 'Act', city: 'Boston', state: 'MA', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'a7', name: 'Rock Revolution', type: 'Act', city: 'Seattle', state: 'WA', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'a8', name: 'Country Roads Trio', type: 'Act', city: 'Nashville', state: 'TN', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'a9', name: 'The Blues Brothers Tribute', type: 'Act', city: 'Chicago', state: 'IL', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'a10', name: 'Classical Ensemble', type: 'Act', city: 'Philadelphia', state: 'PA', created_at: '2024-01-01', updated_at: '2024-01-01' },
];

// Mock data
const MOCK_GIGS_DATA: Gig[] = [
  {
    id: '1',
    title: 'Summer Music Festival 2025',
    start: '2025-07-15T14:00:00',
    end: '2025-07-15T23:00:00',
    timezone: 'America/Los_Angeles',
    status: 'Booked',
    tags: ['Festival', 'Outdoor', 'Multi-Day'],
    amount_paid: 25000,
    venue: MOCK_VENUES[0],
    act: MOCK_ACTS[0],
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: '2',
    title: 'Corporate Holiday Gala',
    start: '2025-12-18T18:00:00',
    end: '2025-12-18T22:00:00',
    timezone: 'America/New_York',
    status: 'Proposed',
    tags: ['Corporate Event', 'Holiday'],
    venue: MOCK_VENUES[1],
    created_at: '2025-01-20T14:30:00Z',
    updated_at: '2025-01-20T14:30:00Z',
  },
  {
    id: '3',
    title: 'Spring Wedding Reception',
    start: '2025-05-10T17:00:00',
    end: '2025-05-11T01:00:00', // Crosses midnight
    timezone: 'America/Chicago',
    status: 'Booked',
    tags: ['Wedding', 'Private Event'],
    amount_paid: 8500,
    venue: MOCK_VENUES[2],
    created_at: '2025-02-01T09:15:00Z',
    updated_at: '2025-02-01T09:15:00Z',
  },
  {
    id: '4',
    title: 'Tech Conference 2025',
    start: '2025-11-05T08:00:00',
    end: '2025-11-05T18:00:00',
    timezone: 'America/Los_Angeles',
    status: 'DateHold',
    tags: ['Conference', 'Corporate Event'],
    created_at: '2025-01-25T16:00:00Z',
    updated_at: '2025-01-25T16:00:00Z',
  },
  {
    id: '5',
    title: 'Jazz Night at The Blue Note',
    start: '2025-03-22T20:00:00',
    end: '2025-03-22T23:30:00',
    timezone: 'America/New_York',
    status: 'Completed',
    tags: ['Concert', 'Jazz'],
    amount_paid: 3500,
    venue: MOCK_VENUES[3],
    act: MOCK_ACTS[1],
    created_at: '2025-01-10T11:00:00Z',
    updated_at: '2025-03-23T10:00:00Z',
  },
  {
    id: '6',
    title: 'Charity Fundraiser Gala',
    start: '2025-10-15T18:30:00',
    end: '2025-10-15T23:00:00',
    timezone: 'America/Chicago',
    status: 'Settled',
    tags: ['Charity', 'Gala', 'Formal'],
    amount_paid: 15000,
    venue: MOCK_VENUES[4],
    created_at: '2025-08-01T13:00:00Z',
    updated_at: '2025-10-16T09:00:00Z',
  },
  {
    id: '7',
    title: 'Outdoor Concert Series - Week 1',
    start: '2025-06-07T19:00:00',
    end: '2025-06-07T22:00:00',
    timezone: 'America/Denver',
    status: 'Booked',
    tags: ['Concert', 'Series', 'Outdoor'],
    venue: MOCK_VENUES[5],
    created_at: '2025-01-28T10:30:00Z',
    updated_at: '2025-01-28T10:30:00Z',
  },
  {
    id: '8',
    title: 'Theater Production - Opening Night',
    start: '2025-04-12T19:30:00',
    end: '2025-04-12T22:00:00',
    timezone: 'America/New_York',
    status: 'Cancelled',
    tags: ['Theater', 'Live Performance'],
    created_at: '2025-01-05T14:00:00Z',
    updated_at: '2025-03-20T16:00:00Z',
  },
];

const STATUS_CONFIG: Record<GigStatus, { color: string; label: string }> = {
  'DateHold': { color: 'bg-gray-100 text-gray-700 border-gray-300', label: 'Date Hold' },
  'Proposed': { color: 'bg-blue-100 text-blue-700 border-blue-300', label: 'Proposed' },
  'Booked': { color: 'bg-green-100 text-green-700 border-green-300', label: 'Booked' },
  'Completed': { color: 'bg-purple-100 text-purple-700 border-purple-300', label: 'Completed' },
  'Cancelled': { color: 'bg-red-100 text-red-700 border-red-300', label: 'Cancelled' },
  'Settled': { color: 'bg-emerald-100 text-emerald-700 border-emerald-300', label: 'Settled' },
};

const ALL_TAGS = ['Festival', 'Concert', 'Corporate Event', 'Wedding', 'Theater', 'Conference', 'Charity', 'Gala', 'Outdoor', 'Multi-Day', 'Series', 'Private Event', 'Jazz', 'Formal', 'Live Performance', 'Holiday'];

export default function GigListScreen({
  organization,
  user,
  userRole,
  onBack,
  onCreateGig,
  onViewGig,
  onNavigateToDashboard,
  onNavigateToGigs,
  onNavigateToAssets,
  onSwitchOrganization,
  onLogout,
  useMockData = false,
}: GigListScreenProps) {
  // TODO: Implement real-time for gigs (complex due to organization filtering via participants)
  // For now, load gigs on mount and refresh manually
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [venues, setVenues] = useState<Organization[]>(MOCK_VENUES);
  const [acts, setActs] = useState<Organization[]>(MOCK_ACTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GigStatus | 'All'>('All');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Handlers for GigTable component
  const handleGigUpdate = async (gigId: string, field: string, value: any) => {
    // Store original state for rollback on error
    const originalGigs = [...gigs];
    const gigIndex = gigs.findIndex(g => g.id === gigId);
    const originalGig = gigIndex >= 0 ? { ...gigs[gigIndex] } : null;

    try {
      // Handle venue and act updates using specialized API functions
      // These require full refresh because they affect participant relationships
      if (field === 'venue') {
        await api.updateGigVenue(gigId, value || null);
        toast.success('Venue updated successfully');
        // Reload for venue/act to get updated participant data
        loadGigs();
        return;
      } else if (field === 'act') {
        await api.updateGigAct(gigId, value || null);
        toast.success('Act updated successfully');
        // Reload for venue/act to get updated participant data
        loadGigs();
        return;
      }

      // For other fields, update optimistically
      let processedValue = value;

      // Handle date field - convert to full ISO datetime string
      if (field === 'start' && typeof value === 'string') {
        // Find the existing gig to get the time part
        const existingGig = gigs.find(g => g.id === gigId);
        if (existingGig) {
          const existingDate = new Date(existingGig.start);
          const newDate = new Date(value);
          // Preserve the time from the existing date
          newDate.setHours(existingDate.getHours(), existingDate.getMinutes(), existingDate.getSeconds());
          processedValue = newDate.toISOString();
        } else {
          // Fallback: assume start of day
          processedValue = new Date(value + 'T00:00:00').toISOString();
        }
      }

      // Optimistically update local state
      if (gigIndex >= 0) {
        setGigs(prevGigs => {
          const updatedGigs = [...prevGigs];
          updatedGigs[gigIndex] = {
            ...updatedGigs[gigIndex],
            [field]: processedValue,
          };
          return updatedGigs;
        });
      }

      // Make API call
      await api.updateGig(gigId, { [field]: processedValue });
      toast.success(`${field} updated successfully`);
    } catch (error: any) {
      console.error(`Error updating gig ${field}:`, error);
      // Rollback optimistic update on error
      if (originalGig) {
        setGigs(originalGigs);
      }
      toast.error(`Failed to update ${field}`);
      throw error;
    }
  };

  const handleGigClick = (gigId: string) => {
    onViewGig(gigId);
  };

  const handleGigEdit = (gigId: string) => {
    onViewGig(gigId); // Navigate to edit view
  };

  const handleGigDuplicate = async (gigId: string) => {
    try {
      await api.duplicateGig(gigId);
      toast.success('Gig duplicated successfully');
    } catch (error: any) {
      console.error('Error duplicating gig:', error);
      toast.error(error.message || 'Failed to duplicate gig');
    }
  };

  const handleGigDelete = async (gigId: string) => {
    if (!confirm('Are you sure you want to delete this gig?')) return;

    try {
      await api.deleteGig(gigId);
      toast.success('Gig deleted successfully');
    } catch (error: any) {
      console.error('Error deleting gig:', error);
      toast.error(error.message || 'Failed to delete gig');
    }
  };

  // Load gigs on mount
  useEffect(() => {
    loadGigs();
  }, [organization.id]);

  const loadGigs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getGigs(organization.id);
      setGigs(data || []);
    } catch (error: any) {
      console.error('Error loading gigs:', error);
      setError(error.message || 'Failed to load gigs');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter gigs based on current filters
  const filteredGigs = gigs.filter((gig) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!gig.title?.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'All' && gig.status !== statusFilter) {
      return false;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      const gigDate = new Date(gig.start);
      if (dateFrom && gigDate < dateFrom) return false;
      if (dateTo && gigDate > dateTo) return false;
    }

    return true;
  }).sort((a, b) => {
    const dateA = new Date(a.start);
    const dateB = new Date(b.start);
    return sortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
  });

  // Inline editing state
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [savingCell, setSavingCell] = useState<{ gigId: string; field: string } | null>(null);
  const [cellError, setCellError] = useState<CellError | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Time editing dialog
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [timeDialogGig, setTimeDialogGig] = useState<Gig | null>(null);
  const [tempStartTime, setTempStartTime] = useState('');
  const [tempEndTime, setTempEndTime] = useState('');

  // Venue/Act search
  const [venueSearch, setVenueSearch] = useState('');
  const [actSearch, setActSearch] = useState('');

  // Load initial data

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);


  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'All' || dateFrom || dateTo;

  const formatDate = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return format(date, 'MMM dd, yyyy');
  };

  const formatTime = (startDateTime: string, endDateTime: string) => {
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
  };

  // Start editing a cell
  const startEditing = (gigId: string, field: EditingCell['field'], currentValue: any) => {
    setEditingCell({ gigId, field });
    setEditValue(currentValue);
    setCellError(null);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue(null);
    setCellError(null);
    setVenueSearch('');
    setActSearch('');
  };

  // Validate and save changes
  const saveEdit = async (gigId: string, field: string, newValue: any) => {
    // Validation
    if (field === 'title') {
      if (!newValue || newValue.trim().length === 0) {
        setCellError({ gigId, field, message: 'Title is required' });
        return;
      }
      if (newValue.trim().length > 200) {
        setCellError({ gigId, field, message: 'Title must be 200 characters or less' });
        return;
      }
    }

    // Clear editing state
    setEditingCell(null);
    setEditValue(null);
    setCellError(null);
    setVenueSearch('');
    setActSearch('');

    // Optimistic update
    const previousGigs = [...gigs];
    const updatedGigs = gigs.map(gig => {
      if (gig.id === gigId) {
        if (field === 'title') return { ...gig, title: newValue };
        if (field === 'date') {
          // Update start datetime with new date, keeping the time
          const currentStart = new Date(gig.start);
          const newDate = new Date(newValue);
          newDate.setHours(currentStart.getHours(), currentStart.getMinutes());
          
          const currentEnd = new Date(gig.end);
          const duration = currentEnd.getTime() - currentStart.getTime();
          const newEnd = new Date(newDate.getTime() + duration);
          
          return { ...gig, start: newDate.toISOString(), end: newEnd.toISOString() };
        }
        if (field === 'status') return { ...gig, status: newValue };
        if (field === 'venue') return { ...gig, venue: newValue };
        if (field === 'act') return { ...gig, act: newValue };
        if (field === 'tags') return { ...gig, tags: newValue };
      }
      return gig;
    });
    setGigs(updatedGigs);

    // Show saving state
    setSavingCell({ gigId, field });

    if (useMockData) {
      // Simulate API call for mock data
      setTimeout(() => {
        setSavingCell(null);
        toast.success('Changes saved successfully');
      }, 800);
    } else {
      // Real API call
      try {
        const updateData: any = {};
        
        if (field === 'title') updateData.title = newValue;
        if (field === 'date') {
          // Find the updated gig from our optimistic update to get the new start/end
          const updatedGig = updatedGigs.find(g => g.id === gigId);
          if (updatedGig) {
            updateData.start = updatedGig.start;
            updateData.end = updatedGig.end;
          }
        }
        if (field === 'status') updateData.status = newValue;
        if (field === 'venue') {
          // Update venue through participants
          const gig = gigs.find(g => g.id === gigId);
          if (gig) {
            const participants = gig.participants || [];
            const otherParticipants = participants
              .filter(p => p.role !== 'Venue')
              .map(p => ({ id: p.id, organization_id: p.organization_id, role: p.role, notes: p.notes }));
            
            if (newValue?.id) {
              // Check if there's already a Venue participant with a different org
              const existingVenue = participants.find(p => p.role === 'Venue');
              if (existingVenue) {
                // Update existing venue participant
                updateData.participants = [
                  ...otherParticipants, 
                  { id: existingVenue.id, organization_id: newValue.id, role: 'Venue' }
                ];
              } else {
                // Add new venue participant
                updateData.participants = [
                  ...otherParticipants, 
                  { organization_id: newValue.id, role: 'Venue' }
                ];
              }
            } else {
              // Remove venue
              updateData.participants = otherParticipants;
            }
          }
        }
        if (field === 'act') {
          // Update act through participants
          const gig = gigs.find(g => g.id === gigId);
          if (gig) {
            const participants = gig.participants || [];
            const otherParticipants = participants
              .filter(p => p.role !== 'Act')
              .map(p => ({ id: p.id, organization_id: p.organization_id, role: p.role, notes: p.notes }));
            
            if (newValue?.id) {
              // Check if there's already an Act participant with a different org
              const existingAct = participants.find(p => p.role === 'Act');
              if (existingAct) {
                // Update existing act participant
                updateData.participants = [
                  ...otherParticipants, 
                  { id: existingAct.id, organization_id: newValue.id, role: 'Act' }
                ];
              } else {
                // Add new act participant
                updateData.participants = [
                  ...otherParticipants, 
                  { organization_id: newValue.id, role: 'Act' }
                ];
              }
            } else {
              // Remove act
              updateData.participants = otherParticipants;
            }
          }
        }
        if (field === 'tags') updateData.tags = newValue;

        await api.updateGig(gigId, updateData);
        
        // Real-time subscription will update the UI
        setSavingCell(null);
        toast.success('Changes saved successfully');
      } catch (error: any) {
        // Rollback on error
        setGigs(previousGigs);
        console.error('Error saving changes:', error);
        toast.error('Failed to save changes: ' + (error.message || 'Unknown error'));
        setSavingCell(null);
      }
    }
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent, gigId: string, field: EditingCell['field']) => {
    if (e.key === 'Escape') {
      cancelEditing();
    } else if (e.key === 'Enter' && field === 'title') {
      e.preventDefault();
      saveEdit(gigId, field, editValue);
    }
  };

  // Open time dialog
  const openTimeDialog = (gig: Gig) => {
    setTimeDialogGig(gig);
    setTempStartTime(gig.start_time);
    setTempEndTime(gig.end_time);
    setTimeDialogOpen(true);
  };

  // Save time from dialog
  const saveTimeDialog = () => {
    if (!timeDialogGig) return;
    
    if (tempEndTime <= tempStartTime) {
      toast.error('End time must be after start time');
      return;
    }

    const previousGigs = [...gigs];
    const updatedGigs = gigs.map(gig => 
      gig.id === timeDialogGig.id 
        ? { ...gig, start_time: tempStartTime, end_time: tempEndTime }
        : gig
    );
    setGigs(updatedGigs);
    setSavingCell({ gigId: timeDialogGig.id, field: 'time' });
    setTimeDialogOpen(false);

    // Simulate API call
    setTimeout(() => {
      if (Math.random() < 0.05) {
        setGigs(previousGigs);
        toast.error('Failed to save time changes.');
        setSavingCell(null);
        return;
      }
      setSavingCell(null);
      toast.success('Time updated successfully');
    }, 800);
  };

  // Filter venues by search
  const filteredVenues = useMemo(() => {
    if (!venueSearch.trim()) return MOCK_VENUES.slice(0, 10);
    return MOCK_VENUES.filter(v => 
      v.name.toLowerCase().includes(venueSearch.toLowerCase())
    ).slice(0, 10);
  }, [venueSearch]);

  // Filter acts by search
  const filteredActs = useMemo(() => {
    if (!actSearch.trim()) return MOCK_ACTS.slice(0, 10);
    return MOCK_ACTS.filter(a => 
      a.name.toLowerCase().includes(actSearch.toLowerCase())
    ).slice(0, 10);
  }, [actSearch]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <AppHeader
        organization={organization}
        user={user}
        userRole={userRole}
        currentRoute="gig-list"
        onNavigateToDashboard={onNavigateToDashboard}
        onNavigateToGigs={onNavigateToGigs}
        onNavigateToAssets={onNavigateToAssets}
        onSwitchOrganization={onSwitchOrganization}
        onLogout={onLogout}
      />

      {/* Page Title and Actions Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-gray-900">Gigs</h1>
            </div>
            <Button
              onClick={onCreateGig}
              className="bg-sky-500 hover:bg-sky-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Gig
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search gigs by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as GigStatus | 'All')}>
              <SelectTrigger className="w-full lg:w-48">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="All Statuses" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                {Object.keys(STATUS_CONFIG).map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full lg:w-auto justify-start">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {dateFrom && dateTo
                    ? `${format(dateFrom, 'MMM dd')} - ${format(dateTo, 'MMM dd')}`
                    : dateFrom
                    ? `From ${format(dateFrom, 'MMM dd')}`
                    : dateTo
                    ? `Until ${format(dateTo, 'MMM dd')}`
                    : 'Date Range'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 border-b">
                  <p className="text-sm">Select date range</p>
                </div>
                <div className="flex gap-2 p-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-2">From</p>
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-2">To</p>
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </div>
                </div>
                <div className="p-3 border-t flex justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDateFrom(undefined);
                      setDateTo(undefined);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Sort */}
            <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Sort by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Oldest First</SelectItem>
                <SelectItem value="desc">Newest First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-3">
              <p className="text-sm text-gray-600">Active filters:</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-7 text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error ? (
          <Card className="p-12 text-center">
            <div className="text-red-500 mb-4">Error loading gigs</div>
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
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-gray-900 mb-2">
                {hasActiveFilters ? 'No gigs found' : 'No gigs yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {hasActiveFilters
                  ? 'Try adjusting your filters or search query'
                  : 'Create your first gig to get started'}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button onClick={onCreateGig} className="bg-sky-500 hover:bg-sky-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Gig
                </Button>
              )}
            </div>
          </Card>
        ) : (
                        <GigTable
                          gigs={filteredGigs}
                          mode="list"
                          showActions={true}
                          onGigUpdate={handleGigUpdate}
                          onGigClick={handleGigClick}
                          onGigEdit={handleGigEdit}
                          onGigDuplicate={handleGigDuplicate}
                          onGigDelete={handleGigDelete}
                          loading={false}
                          emptyMessage="No gigs found"
                        />
        )}
      </div>
      {/* Time Edit Dialog */}
      <Dialog open={timeDialogOpen} onOpenChange={setTimeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Time</DialogTitle>
            <DialogDescription>
              Update the start and end times for {timeDialogGig?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={tempStartTime}
                onChange={(e) => setTempStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={tempEndTime}
                onChange={(e) => setTempEndTime(e.target.value)}
              />
            </div>
            {tempEndTime && tempStartTime && tempEndTime <= tempStartTime && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                End time must be after start time
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTimeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={saveTimeDialog}
              disabled={!tempStartTime || !tempEndTime || tempEndTime <= tempStartTime}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
