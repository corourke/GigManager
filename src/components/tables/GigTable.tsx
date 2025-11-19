import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Clock,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Skeleton } from '../ui/skeleton';
import EditableTableCell from './EditableTableCell';
import * as api from '../../utils/api';

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
  venue?: { id: string; name: string; type: string };
  act?: { id: string; name: string; type: string };
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

interface GigTableProps {
  gigs: Gig[];
  mode: 'list' | 'dashboard'; // Controls which columns and features to show
  showActions?: boolean;
  onGigUpdate?: (gigId: string, field: string, value: any) => Promise<void>;
  onGigClick?: (gigId: string) => void;
  onGigEdit?: (gigId: string) => void;
  onGigDuplicate?: (gigId: string) => void;
  onGigDelete?: (gigId: string) => void;
  loading?: boolean;
  emptyMessage?: string;
  onCreateGig?: () => void;
}

const SUGGESTED_TAGS = [
  'Concert',
  'Corporate Event',
  'Festival',
  'Theater',
  'Wedding',
  'Live Music',
  'Conference',
  'Private Event',
  'Outdoor',
  'Multi-Day',
  'Charity',
  'Gala',
  'Jazz',
  'Rock',
  'Classical',
  'Pop',
  'Electronic',
  'Folk',
  'Blues'
];

const STATUS_CONFIG: Record<GigStatus, { color: string }> = {
  DateHold: 'bg-gray-100 text-gray-800 border-gray-300',
  Proposed: 'bg-blue-100 text-blue-800 border-blue-300',
  Booked: 'bg-green-100 text-green-800 border-green-300',
  Completed: 'bg-purple-100 text-purple-800 border-purple-300',
  Cancelled: 'bg-red-100 text-red-800 border-red-300',
  Settled: 'bg-indigo-100 text-indigo-800 border-indigo-300',
};

export default function GigTable({
  gigs,
  mode,
  showActions = true,
  onGigUpdate,
  onGigClick,
  onGigEdit,
  onGigDuplicate,
  onGigDelete,
  loading = false,
  emptyMessage = 'No gigs found',
  onCreateGig,
}: GigTableProps) {

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (start: string, end: string) => {
    const startTime = new Date(start).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const endTime = new Date(end).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return `${startTime} - ${endTime}`;
  };

  const formatDateTime = (start: string, end: string) => {
    const date = formatDate(start);
    const time = formatTime(start, end);
    return `${date} ${time}`;
  };


  const openTimeDialog = (gig: Gig) => {
    // This would open a time editing dialog
    // For now, just log it
    console.log('Open time dialog for gig:', gig.id);
  };

  // Dashboard mode shows all columns but no inline editing, limited rows
  const displayGigs = mode === 'dashboard' ? gigs.slice(0, 5) : gigs;
  const showVenueActColumns = true; // Show in both modes
  const showTagsColumn = mode === 'list'; // Only show tags in list mode
  const enableInlineEditing = mode === 'list' && !!onGigUpdate;

  if (loading) {
    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {showActions && <TableHead className="w-12"></TableHead>}
              <TableHead>Title</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Status</TableHead>
              {showVenueActColumns && <TableHead>Venue</TableHead>}
              {showVenueActColumns && <TableHead>Act</TableHead>}
              {showTagsColumn && <TableHead>Tags</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                {showActions && <TableCell><Skeleton className="h-8 w-8" /></TableCell>}
                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                {showVenueActColumns && <TableCell><Skeleton className="h-5 w-32" /></TableCell>}
                {showVenueActColumns && <TableCell><Skeleton className="h-5 w-32" /></TableCell>}
                {showTagsColumn && <TableCell><Skeleton className="h-5 w-24" /></TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  }

  if (displayGigs.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-gray-900 mb-2">{emptyMessage}</h3>
          <p className="text-gray-600 mb-6">
            {mode === 'dashboard'
              ? 'Upcoming gigs will appear here'
              : 'Create your first gig to get started'}
          </p>
          {mode === 'list' && onCreateGig && (
            <Button onClick={onCreateGig} className="bg-sky-500 hover:bg-sky-600 text-white">
              <Edit className="w-4 h-4 mr-2" />
              Create First Gig
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <>
      {mode === 'list' && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {displayGigs.length} {displayGigs.length === 1 ? 'gig' : 'gigs'}
          </p>
          <p className="text-xs text-gray-500">
            Click any field to edit inline
          </p>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {showActions && <TableHead className="w-12"></TableHead>}
                <TableHead className="min-w-[200px] whitespace-normal">Title</TableHead>
                <TableHead className="min-w-[160px] whitespace-normal">Date & Time</TableHead>
                <TableHead className="min-w-[100px] whitespace-normal">Status</TableHead>
                {showVenueActColumns && <TableHead className="min-w-[120px] whitespace-normal">Venue</TableHead>}
                {showVenueActColumns && <TableHead className="min-w-[120px] whitespace-normal">Act</TableHead>}
                {showTagsColumn && <TableHead className="min-w-[150px] whitespace-normal">Tags</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayGigs.map((gig) => (
                <TableRow
                  key={gig.id}
                  className={(onGigClick || onGigEdit) ? 'cursor-pointer hover:bg-gray-50' : ''}
                  onClick={() => {
                    if (mode === 'dashboard' && onGigEdit) {
                      onGigEdit(gig.id);
                    } else if (onGigClick) {
                      onGigClick(gig.id);
                    }
                  }}
                >
                  {/* Actions Cell */}
                  {showActions && (
                    <TableCell onClick={(e) => mode === 'list' && e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {onGigEdit && (
                            <DropdownMenuItem onClick={() => onGigEdit(gig.id)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onGigDuplicate && (
                            <DropdownMenuItem onClick={() => onGigDuplicate(gig.id)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                          )}
                          {onGigDelete && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => onGigDelete(gig.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}

                  {/* Title Cell */}
                  <TableCell className="relative min-w-[200px] whitespace-normal" onClick={(e) => mode === 'list' && e.stopPropagation()}>
                    {enableInlineEditing ? (
                      <EditableTableCell
                        value={gig.title || ''}
                        field="title"
                        placeholder="Gig title"
                        onSave={(field, value) => onGigUpdate(gig.id, 'title', value)}
                      />
                    ) : (
                      <span className="text-sm text-gray-900">{gig.title || <span className="text-gray-400 italic">Untitled Gig</span>}</span>
                    )}
                  </TableCell>

                  {/* Date & Time Cell */}
                  <TableCell className="text-sm text-gray-700 min-w-[160px] whitespace-normal" onClick={(e) => mode === 'list' && e.stopPropagation()}>
                    {enableInlineEditing ? (
                      <button
                        onClick={() => onGigEdit?.(gig.id)}
                        className="hover:text-sky-600 hover:underline w-full text-left"
                      >
                        {formatDateTime(gig.start, gig.end)}
                      </button>
                    ) : (
                      formatDateTime(gig.start, gig.end)
                    )}
                  </TableCell>

                  {/* Status Cell */}
                  <TableCell className="text-sm text-gray-700 min-w-[100px] whitespace-normal" onClick={(e) => mode === 'list' && e.stopPropagation()}>
                    {enableInlineEditing ? (
                      <EditableTableCell
                        value={gig.status}
                        field="status"
                        type="select"
                        placeholder="Select status"
                        onSave={(field, value) => onGigUpdate(gig.id, 'status', value)}
                        selectOptions={[
                          { value: 'DateHold', label: 'Date Hold' },
                          { value: 'Proposed', label: 'Proposed' },
                          { value: 'Booked', label: 'Booked' },
                          { value: 'Completed', label: 'Completed' },
                          { value: 'Cancelled', label: 'Cancelled' },
                          { value: 'Settled', label: 'Settled' },
                        ]}
                      />
                    ) : (
                      <Badge variant="outline" className={STATUS_CONFIG[gig.status]}>
                        {gig.status}
                      </Badge>
                    )}
                  </TableCell>

                  {/* Venue Cell */}
                  {showVenueActColumns && (
                    <TableCell className="text-sm text-gray-700 min-w-[120px] whitespace-normal" onClick={(e) => mode === 'list' && e.stopPropagation()}>
                      {enableInlineEditing ? (
                        <EditableTableCell
                          value={gig.venue?.id || ''}
                          field="venue"
                          type="organization"
                          organizationType="Venue"
                          placeholder="Select venue"
                          onSave={(field, value) => onGigUpdate(gig.id, field, value)}
                        />
                      ) : (
                        gig.venue?.name || '-'
                      )}
                    </TableCell>
                  )}

                  {/* Act Cell */}
                  {showVenueActColumns && (
                    <TableCell className="text-sm text-gray-700 min-w-[120px] whitespace-normal" onClick={(e) => mode === 'list' && e.stopPropagation()}>
                      {enableInlineEditing ? (
                        <EditableTableCell
                          value={gig.act?.id || ''}
                          field="act"
                          type="organization"
                          organizationType="Act"
                          placeholder="Select act"
                          onSave={(field, value) => onGigUpdate(gig.id, field, value)}
                        />
                      ) : (
                        gig.act?.name || '-'
                      )}
                    </TableCell>
                  )}

                  {/* Tags Cell */}
                  {showTagsColumn && (
                    <TableCell className="relative min-w-[150px] whitespace-normal" onClick={(e) => mode === 'list' && e.stopPropagation()}>
                      {enableInlineEditing ? (
                        <EditableTableCell
                          value={gig.tags || []}
                          field="tags"
                          type="tags"
                          tagSuggestions={SUGGESTED_TAGS}
                          placeholder="Add tags..."
                          onSave={(field, value) => onGigUpdate(gig.id, 'tags', value)}
                        />
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {gig.tags?.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          )) || <span className="text-gray-400">-</span>}
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </>
  );
}
