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
import { cn } from '../ui/utils';
import EditableTableCell from './EditableTableCell';
import * as api from '../../services/gig.service';
import { GigStatus, Gig } from '../../utils/supabase/types';
import { GIG_STATUS_CONFIG, ORG_TYPE_CONFIG } from '../../utils/supabase/constants';
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
  const [editingCell, setEditingCell] = useState<{ id: string, field: string } | null>(null);

  const handleEditingChange = React.useCallback((gigId: string, field: string, isEditing: boolean) => {
    setEditingCell(isEditing ? { id: gigId, field } : null);
  }, []);

  const formatDateTime = (start: string, end: string, timezone?: string) => {
    return formatDateTimeDisplay(start, end, timezone);
  };

  const openTimeDialog = (gig: Gig) => {
    // This would open a time editing dialog
    // For now, just log it
    console.log('Open time dialog for gig:', gig.id);
  };

  const getTableCellClass = (gigId: string, field: string, baseClass: string = '') => {
    const isEditing = editingCell?.id === gigId && editingCell?.field === field;
    return cn(
      "relative p-0 overflow-visible transition-colors",
      isEditing ? "z-20 border-0" : "border border-gray-200",
      baseClass
    );
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
                <TableHead className="w-[200px] whitespace-nowrap border overflow-hidden">Title</TableHead>
                {enableInlineEditing ? (
                  <>
                    <TableHead className="w-[160px] whitespace-nowrap border overflow-hidden">Start</TableHead>
                    <TableHead className="w-[160px] whitespace-nowrap border overflow-hidden">End</TableHead>
                  </>
                ) : (
                  <TableHead className="w-[180px] whitespace-nowrap border overflow-hidden">Date & Time</TableHead>
                )}
                <TableHead className="w-[110px] whitespace-nowrap border overflow-hidden">Status</TableHead>
                {showVenueActColumns && <TableHead className="w-[160px] whitespace-nowrap border overflow-hidden">Venue</TableHead>}
                {showVenueActColumns && <TableHead className="w-[160px] whitespace-nowrap border overflow-hidden">Act</TableHead>}
                {showTagsColumn && <TableHead className="w-[200px] whitespace-nowrap border overflow-hidden">Tags</TableHead>}
                {showActions && <TableHead className="w-[140px] text-right border overflow-hidden">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayGigs.map((gig) => (
                <TableRow
                  key={gig.id}
                  className={cn(
                    (onGigClick || onGigEdit) ? 'hover:bg-gray-50' : '',
                    "border-none"
                  )}
                  onClick={() => {
                    if (mode === 'dashboard' && onGigEdit) {
                      onGigEdit(gig.id);
                    } else if (onGigClick) {
                      onGigClick(gig.id);
                    }
                  }}
                >
                  {/* Title Cell */}
                  <TableCell className={getTableCellClass(gig.id, 'title', 'w-[200px]')} onClick={(e) => mode === 'list' && e.stopPropagation()}>
                    {enableInlineEditing ? (
                      <EditableTableCell
                        value={gig.title || ''}
                        field="title"
                        placeholder="Gig title"
                        onSave={(f, v) => onGigUpdate(gig.id, f, v)}
                        onEditingChange={(isEditing) => handleEditingChange(gig.id, 'title', isEditing)}
                      />
                    ) : (
                      <div className="px-2 py-1.5 truncate text-sm text-gray-900">
                        {gig.title || <span className="text-gray-400 italic">Untitled Gig</span>}
                      </div>
                    )}
                  </TableCell>

                  {/* Date & Time Cell(s) */}
                  {enableInlineEditing ? (
                    <>
                      <TableCell className={getTableCellClass(gig.id, 'start', 'w-[160px]')} onClick={(e) => e.stopPropagation()}>
                        <EditableTableCell
                          value={gig.start}
                          field="start"
                          type="datetime-local"
                          timezone={gig.timezone}
                          placeholder="Start time"
                          onSave={(f, v) => onGigUpdate(gig.id, f, v)}
                          onEditingChange={(isEditing) => handleEditingChange(gig.id, 'start', isEditing)}
                        />
                      </TableCell>
                      <TableCell className={getTableCellClass(gig.id, 'end', 'w-[160px]')} onClick={(e) => e.stopPropagation()}>
                        <EditableTableCell
                          value={gig.end}
                          field="end"
                          type="datetime-local"
                          timezone={gig.timezone}
                          placeholder="End time"
                          onSave={(f, v) => onGigUpdate(gig.id, f, v)}
                          onEditingChange={(isEditing) => handleEditingChange(gig.id, 'end', isEditing)}
                        />
                      </TableCell>
                    </>
                  ) : (
                    <TableCell className={getTableCellClass(gig.id, 'datetime', 'w-[180px]')} onClick={(e) => mode === 'list' && e.stopPropagation()}>
                      <div className="px-2 py-1.5 truncate text-sm text-gray-700">
                        {formatDateTime(gig.start, gig.end, gig.timezone)}
                      </div>
                    </TableCell>
                  )}

                  {/* Status Cell */}
                  <TableCell className={getTableCellClass(gig.id, 'status', 'w-[110px]')} onClick={(e) => mode === 'list' && e.stopPropagation()}>
                    {enableInlineEditing ? (
                      <EditableTableCell
                        value={gig.status}
                        field="status"
                        type="select"
                        placeholder="Select status"
                        onSave={(f, v) => onGigUpdate(gig.id, f, v)}
                        onEditingChange={(isEditing) => handleEditingChange(gig.id, 'status', isEditing)}
                        selectOptions={Object.entries(GIG_STATUS_CONFIG).map(([value, config]) => ({
                          value,
                          label: config.label,
                        }))}
                      />
                    ) : (
                      <div className="px-2 py-1.5">
                        <Badge variant="outline" className="truncate bg-gray-100 text-gray-800 border-gray-200">
                          {GIG_STATUS_CONFIG[gig.status].label}
                        </Badge>
                      </div>
                    )}
                  </TableCell>

                  {/* Venue Cell */}
                  {showVenueActColumns && (
                    <TableCell className={getTableCellClass(gig.id, 'venue', 'w-[160px]')} onClick={(e) => mode === 'list' && e.stopPropagation()}>
                      {enableInlineEditing ? (
                        <EditableTableCell
                          value={gig.venue?.id || ''}
                          field="venue"
                          type="organization"
                          organizationType="Venue"
                          placeholder="Select venue"
                          onSave={(f, v) => onGigUpdate(gig.id, f, v)}
                          onEditingChange={(isEditing) => handleEditingChange(gig.id, 'venue', isEditing)}
                        />
                      ) : (
                        <div className="px-2 py-1.5">
                          {gig.venue ? (
                            <Badge variant="outline" className="truncate bg-gray-100 text-gray-800 border-gray-200">
                              {gig.venue.name}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 italic px-1">-</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                  )}

                  {/* Act Cell */}
                  {showVenueActColumns && (
                    <TableCell className={getTableCellClass(gig.id, 'act', 'w-[160px]')} onClick={(e) => mode === 'list' && e.stopPropagation()}>
                      {enableInlineEditing ? (
                        <EditableTableCell
                          value={gig.act?.id || ''}
                          field="act"
                          type="organization"
                          organizationType="Act"
                          placeholder="Select act"
                          onSave={(f, v) => onGigUpdate(gig.id, f, v)}
                          onEditingChange={(isEditing) => handleEditingChange(gig.id, 'act', isEditing)}
                        />
                      ) : (
                        <div className="px-2 py-1.5">
                          {gig.act ? (
                            <Badge variant="outline" className="truncate bg-gray-100 text-gray-800 border-gray-200">
                              {gig.act.name}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 italic px-1">-</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                  )}

                  {/* Tags Cell */}
                  {showTagsColumn && (
                    <TableCell className={getTableCellClass(gig.id, 'tags', 'w-[200px]')} onClick={(e) => mode === 'list' && e.stopPropagation()}>
                      {enableInlineEditing ? (
                        <EditableTableCell
                          value={gig.tags || []}
                          field="tags"
                          type="tags"
                          tagSuggestions={SUGGESTED_TAGS}
                          placeholder="Add tags..."
                          onSave={(f, v) => onGigUpdate(gig.id, f, v)}
                          onEditingChange={(isEditing) => handleEditingChange(gig.id, 'tags', isEditing)}
                        />
                      ) : (
                        <div className="px-2 py-1.5 truncate flex flex-wrap gap-1">
                          {gig.tags?.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200 text-[10px] h-4 py-0">
                              {tag}
                            </Badge>
                          )) || <span className="text-gray-400">-</span>}
                        </div>
                      )}
                    </TableCell>
                  )}

                  {/* Actions Cell */}
                  {showActions && (
                    <TableCell className="w-[140px] text-right border p-1 overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
