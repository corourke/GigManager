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
  const [editingCell, setEditingCell] = useState<{
    gigId: string;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [savingCell, setSavingCell] = useState<{
    gigId: string;
    field: string;
  } | null>(null);
  const [cellError, setCellError] = useState<{
    gigId: string;
    field: string;
    message: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

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

  const startEditing = (gigId: string, field: string, currentValue: any) => {
    setEditingCell({ gigId, field });
    setEditValue(currentValue);
    setCellError(null);

    // Focus input after state update
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 0);
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue(null);
    setCellError(null);
  };

  const saveEdit = async (gigId: string, field: string, value: any) => {
    if (!onGigUpdate) return;

    setSavingCell({ gigId, field });
    setCellError(null);

    try {
      await onGigUpdate(gigId, field, value);
      cancelEditing();
    } catch (error: any) {
      setCellError({
        gigId,
        field,
        message: error.message || 'Failed to save',
      });
    } finally {
      setSavingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, gigId: string, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit(gigId, field, editValue);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  const openTimeDialog = (gig: Gig) => {
    // This would open a time editing dialog
    // For now, just log it
    console.log('Open time dialog for gig:', gig.id);
  };

  // Dashboard mode shows only essential columns and limited rows
  const displayGigs = mode === 'dashboard' ? gigs.slice(0, 5) : gigs;
  const showVenueActColumns = mode === 'list';
  const showTagsColumn = mode === 'list';

  if (loading) {
    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {showActions && <TableHead className="w-12"></TableHead>}
              <TableHead>Title</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
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
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-28" /></TableCell>
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
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                {showVenueActColumns && <TableHead>Venue</TableHead>}
                {showVenueActColumns && <TableHead>Act</TableHead>}
                {showTagsColumn && <TableHead>Tags</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayGigs.map((gig) => (
                <TableRow
                  key={gig.id}
                  className={`${editingCell?.gigId === gig.id ? 'bg-sky-50' : ''} ${
                    onGigClick ? 'cursor-pointer hover:bg-gray-50' : ''
                  }`}
                  onClick={() => onGigClick?.(gig.id)}
                >
                  {/* Actions Cell */}
                  {showActions && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                  <TableCell className="relative" onClick={(e) => e.stopPropagation()}>
                    {onGigUpdate ? (
                      <EditableTableCell
                        value={gig.title}
                        field="title"
                        placeholder="Gig title"
                        onSave={(field, value) => saveEdit(gig.id, field, value)}
                        disabled={savingCell?.gigId === gig.id}
                      />
                    ) : (
                      <span className="text-sm text-gray-900">{gig.title}</span>
                    )}
                  </TableCell>

                  {/* Date Cell */}
                  <TableCell className="relative" onClick={(e) => e.stopPropagation()}>
                    {editingCell?.gigId === gig.id && editingCell?.field === 'date' ? (
                      <div className="relative">
                        <Popover open={true} onOpenChange={(open) => !open && cancelEditing()}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full h-8 justify-start text-left text-sm"
                            >
                              <CalendarIcon className="w-4 h-4 mr-2" />
                              {editValue ? format(new Date(editValue), 'MMM dd, yyyy') : formatDate(gig.start)}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start" side="bottom">
                            <Calendar
                              mode="single"
                              selected={editValue ? new Date(editValue) : new Date(gig.start)}
                              onSelect={(date) => {
                                if (date) {
                                  const isoDate = format(date, 'yyyy-MM-dd');
                                  saveEdit(gig.id, 'date', isoDate);
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {onGigUpdate ? (
                          <button
                            onClick={() => startEditing(gig.id, 'date', format(new Date(gig.start), 'yyyy-MM-dd'))}
                            className="text-gray-700 hover:bg-gray-100 px-2 py-1 rounded text-left w-full"
                          >
                            {formatDate(gig.start)}
                          </button>
                        ) : (
                          <span className="text-sm text-gray-700">{formatDate(gig.start)}</span>
                        )}
                        {savingCell?.gigId === gig.id && savingCell?.field === 'date' && (
                          <Loader2 className="w-3 h-3 animate-spin text-sky-500" />
                        )}
                      </div>
                    )}
                  </TableCell>

                  {/* Time Cell */}
                  <TableCell className="relative" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openTimeDialog(gig)}
                        className="text-gray-700 hover:bg-gray-100 px-2 py-1 rounded text-left flex items-center gap-2 w-full"
                      >
                        <Clock className="w-4 h-4 text-gray-400" />
                        {formatTime(gig.start, gig.end)}
                      </button>
                      {savingCell?.gigId === gig.id && savingCell?.field === 'time' && (
                        <Loader2 className="w-3 h-3 animate-spin text-sky-500" />
                      )}
                    </div>
                  </TableCell>

                  {/* Status Cell */}
                  <TableCell className="relative" onClick={(e) => e.stopPropagation()}>
                    {editingCell?.gigId === gig.id && editingCell?.field === 'status' ? (
                      <Select
                        value={editValue || gig.status}
                        onValueChange={(value) => {
                          setEditValue(value);
                          saveEdit(gig.id, 'status', value);
                        }}
                        open={true}
                        onOpenChange={(open) => !open && cancelEditing()}
                      >
                        <SelectTrigger className="h-8 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(STATUS_CONFIG).map((status) => (
                            <SelectItem key={status} value={status}>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status as GigStatus].color}`} />
                                {status}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2">
                        {onGigUpdate ? (
                          <button
                            onClick={() => startEditing(gig.id, 'status', gig.status)}
                            className="hover:opacity-80 w-full text-left"
                          >
                            <Badge variant="outline" className={STATUS_CONFIG[gig.status]}>
                              {gig.status}
                            </Badge>
                          </button>
                        ) : (
                          <Badge variant="outline" className={STATUS_CONFIG[gig.status]}>
                            {gig.status}
                          </Badge>
                        )}
                        {savingCell?.gigId === gig.id && savingCell?.field === 'status' && (
                          <Loader2 className="w-3 h-3 animate-spin text-sky-500" />
                        )}
                      </div>
                    )}
                  </TableCell>

                  {/* Venue Cell */}
                  {showVenueActColumns && (
                    <TableCell className="relative" onClick={(e) => e.stopPropagation()}>
                      {onGigUpdate ? (
                        <EditableTableCell
                          value={gig.venue?.name || ''}
                          field="venue"
                          placeholder="Venue name"
                          onSave={(field, value) => saveEdit(gig.id, field, value)}
                          disabled={savingCell?.gigId === gig.id}
                        />
                      ) : (
                        <span className="text-sm text-gray-700">{gig.venue?.name || '-'}</span>
                      )}
                    </TableCell>
                  )}

                  {/* Act Cell */}
                  {showVenueActColumns && (
                    <TableCell className="relative" onClick={(e) => e.stopPropagation()}>
                      {onGigUpdate ? (
                        <EditableTableCell
                          value={gig.act?.name || ''}
                          field="act"
                          placeholder="Act name"
                          onSave={(field, value) => saveEdit(gig.id, field, value)}
                          disabled={savingCell?.gigId === gig.id}
                        />
                      ) : (
                        <span className="text-sm text-gray-700">{gig.act?.name || '-'}</span>
                      )}
                    </TableCell>
                  )}

                  {/* Tags Cell */}
                  {showTagsColumn && (
                    <TableCell className="relative" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-1">
                        {gig.tags?.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        )) || <span className="text-gray-400">-</span>}
                      </div>
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
