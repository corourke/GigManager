import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Clock,
  Edit,
  Copy,
  Trash2,
  Eye,
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
import * as api from '../../services/gig.service';
import { GigStatus, Gig } from '../../utils/supabase/types';
import { GIG_STATUS_CONFIG } from '../../utils/supabase/constants';
import { formatDateDisplay, formatDateTimeDisplay } from '../../utils/dateUtils';

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

  const formatDateTime = (start: string, end: string, timezone?: string) => {
    return formatDateTimeDisplay(start, end, timezone);
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
            <Table className="border-collapse table-fixed w-full">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[250px] whitespace-nowrap border">Title</TableHead>
                {enableInlineEditing ? (
                  <>
                    <TableHead className="w-[180px] whitespace-nowrap border">Start</TableHead>
                    <TableHead className="w-[180px] whitespace-nowrap border">End</TableHead>
                  </>
                ) : (
                  <TableHead className="w-[200px] whitespace-nowrap border">Date & Time</TableHead>
                )}
                <TableHead className="w-[120px] whitespace-nowrap border">Status</TableHead>
                {showVenueActColumns && <TableHead className="w-[180px] whitespace-nowrap border">Venue</TableHead>}
                {showVenueActColumns && <TableHead className="w-[180px] whitespace-nowrap border">Act</TableHead>}
                {showTagsColumn && <TableHead className="w-[220px] whitespace-nowrap border">Tags</TableHead>}
                {showActions && <TableHead className="w-[160px] text-right border">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayGigs.map((gig) => (
                <TableRow
                  key={gig.id}
                  className={(onGigClick || onGigEdit) ? 'hover:bg-gray-50' : ''}
                  onClick={() => {
                    if (mode === 'dashboard' && onGigEdit) {
                      onGigEdit(gig.id);
                    } else if (onGigClick) {
                      onGigClick(gig.id);
                    }
                  }}
                >
                  {/* Title Cell */}
                  <TableCell className={`relative min-w-[200px] whitespace-normal border ${enableInlineEditing ? 'p-0' : 'p-2'}`} onClick={(e) => mode === 'list' && e.stopPropagation()}>
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

                  {/* Date & Time Cell(s) */}
                  {enableInlineEditing ? (
                    <>
                      <TableCell className="relative min-w-[180px] whitespace-normal border p-0" onClick={(e) => e.stopPropagation()}>
                        <EditableTableCell
                          value={gig.start}
                          field="start"
                          type="datetime-local"
                          timezone={gig.timezone}
                          placeholder="Start time"
                          onSave={(field, value) => onGigUpdate(gig.id, 'start', value)}
                        />
                      </TableCell>
                      <TableCell className="relative min-w-[180px] whitespace-normal border p-0" onClick={(e) => e.stopPropagation()}>
                        <EditableTableCell
                          value={gig.end}
                          field="end"
                          type="datetime-local"
                          timezone={gig.timezone}
                          placeholder="End time"
                          onSave={(field, value) => onGigUpdate(gig.id, 'end', value)}
                        />
                      </TableCell>
                    </>
                  ) : (
                    <TableCell className="text-sm text-gray-700 min-w-[160px] whitespace-normal border p-2" onClick={(e) => mode === 'list' && e.stopPropagation()}>
                      {formatDateTime(gig.start, gig.end, gig.timezone)}
                    </TableCell>
                  )}

                  {/* Status Cell */}
                  <TableCell className={`text-sm text-gray-700 min-w-[100px] whitespace-normal border ${enableInlineEditing ? 'p-0' : 'p-2'}`} onClick={(e) => mode === 'list' && e.stopPropagation()}>
                    {enableInlineEditing ? (
                      <EditableTableCell
                        value={gig.status}
                        field="status"
                        type="select"
                        placeholder="Select status"
                        onSave={(field, value) => onGigUpdate(gig.id, 'status', value)}
                        selectOptions={Object.entries(GIG_STATUS_CONFIG).map(([value, config]) => ({
                          value,
                          label: config.label,
                        }))}
                      />
                    ) : (
                      <Badge variant="outline" className={GIG_STATUS_CONFIG[gig.status].color}>
                        {GIG_STATUS_CONFIG[gig.status].label}
                      </Badge>
                    )}
                  </TableCell>

                  {/* Venue Cell */}
                  {showVenueActColumns && (
                    <TableCell className={`text-sm text-gray-700 min-w-[120px] whitespace-normal border ${enableInlineEditing ? 'p-0' : 'p-2'}`} onClick={(e) => mode === 'list' && e.stopPropagation()}>
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
                    <TableCell className={`text-sm text-gray-700 min-w-[120px] whitespace-normal border ${enableInlineEditing ? 'p-0' : 'p-2'}`} onClick={(e) => mode === 'list' && e.stopPropagation()}>
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
                    <TableCell className={`relative min-w-[150px] whitespace-normal border ${enableInlineEditing ? 'p-0' : 'p-2'}`} onClick={(e) => mode === 'list' && e.stopPropagation()}>
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

                  {/* Actions Cell */}
                  {showActions && (
                    <TableCell className="text-right border p-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {onGigClick && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-500 hover:text-sky-600"
                          onClick={() => onGigClick(gig.id)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {onGigEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-500 hover:text-sky-600"
                          onClick={() => onGigEdit(gig.id)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {onGigDuplicate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-500 hover:text-sky-600"
                          onClick={() => onGigDuplicate(gig.id)}
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      {onGigDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                          onClick={() => onGigDelete(gig.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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
