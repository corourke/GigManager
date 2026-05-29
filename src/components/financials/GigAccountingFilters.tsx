import { Search, TableIcon, LayoutGrid, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { GigStatus } from '../../utils/supabase/types';

interface GigAccountingFiltersProps {
  searchQuery: string;
  statusFilters: GigStatus[];
  showSettled: boolean;
  dateFrom: string;
  dateTo: string;
  viewMode: 'table' | 'card';
  activeQuickFilter: string | null;
  onSearchChange: (v: string) => void;
  onStatusFiltersChange: (v: GigStatus[]) => void;
  onShowSettledChange: (v: boolean) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onViewModeChange: (v: 'table' | 'card') => void;
  onQuickFilter: (key: string | null) => void;
  onClearFilters: () => void;
}

const ALL_STATUSES: GigStatus[] = ['Completed', 'Booked', 'Proposed', 'DateHold', 'Settled', 'Cancelled'];
const STATUS_LABELS: Record<GigStatus, string> = {
  Completed: 'Completed',
  Booked: 'Booked',
  Proposed: 'Proposed',
  DateHold: 'Date Hold',
  Settled: 'Settled',
  Cancelled: 'Cancelled',
};

const DEFAULT_STATUS_FILTERS: GigStatus[] = ['Completed', 'Booked', 'Proposed', 'DateHold'];

const QUICK_FILTERS: { key: string; label: string }[] = [
  { key: 'needs-attention', label: 'Needs Attention' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'this-year', label: 'This Year' },
  { key: 'unsettled-revenue', label: 'Unsettled Revenue' },
  { key: 'payments-due', label: 'Payments Due' },
];

function isNonDefault(
  searchQuery: string,
  statusFilters: GigStatus[],
  showSettled: boolean,
  dateFrom: string,
  dateTo: string,
  activeQuickFilter: string | null
): boolean {
  if (searchQuery) return true;
  if (dateFrom || dateTo) return true;
  if (showSettled) return true;
  if (activeQuickFilter) return true;
  if (statusFilters.length !== DEFAULT_STATUS_FILTERS.length) return true;
  const sorted = [...statusFilters].sort();
  const defaultSorted = [...DEFAULT_STATUS_FILTERS].sort();
  return sorted.some((s, i) => s !== defaultSorted[i]);
}

function toggleStatus(current: GigStatus[], status: GigStatus): GigStatus[] {
  return current.includes(status)
    ? current.filter((s) => s !== status)
    : [...current, status];
}

export default function GigAccountingFilters({
  searchQuery,
  statusFilters,
  showSettled,
  dateFrom,
  dateTo,
  viewMode,
  activeQuickFilter,
  onSearchChange,
  onStatusFiltersChange,
  onShowSettledChange,
  onDateFromChange,
  onDateToChange,
  onViewModeChange,
  onQuickFilter,
  onClearFilters,
}: GigAccountingFiltersProps) {
  const hasNonDefault = isNonDefault(searchQuery, statusFilters, showSettled, dateFrom, dateTo, activeQuickFilter);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="gig-search" className="text-xs">Gig Name</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              id="gig-search"
              placeholder="Search gigs..."
              className="pl-9 h-9 text-sm"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        <div className="min-w-[260px]">
          <Label className="text-xs">Status</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {ALL_STATUSES.map((status) => {
              const active = statusFilters.includes(status);
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    onStatusFiltersChange(toggleStatus(statusFilters, status));
                    if (activeQuickFilter) onQuickFilter(null);
                  }}
                  className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {STATUS_LABELS[status]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-36">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            className="h-9 text-sm"
            value={dateFrom}
            onChange={(e) => {
              onDateFromChange(e.target.value);
              if (activeQuickFilter === 'this-year') onQuickFilter(null);
            }}
          />
        </div>

        <div className="w-36">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            className="h-9 text-sm"
            value={dateTo}
            onChange={(e) => {
              onDateToChange(e.target.value);
              if (activeQuickFilter === 'this-year') onQuickFilter(null);
            }}
          />
        </div>

        <div className="flex items-end gap-2 pb-0">
          <Button
            variant="outline"
            size="sm"
            className={`h-9 text-xs ${showSettled ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800 hover:text-white' : ''}`}
            onClick={() => onShowSettledChange(!showSettled)}
          >
            Show Settled
          </Button>

          <div className="flex border border-gray-200 rounded-md overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              className={`h-9 w-9 p-0 rounded-none ${viewMode === 'table' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}
              onClick={() => onViewModeChange('table')}
              title="Table view"
            >
              <TableIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-9 w-9 p-0 rounded-none ${viewMode === 'card' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}
              onClick={() => onViewModeChange('card')}
              title="Card view"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>

          {hasNonDefault && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs text-gray-500 hover:text-gray-700"
              onClick={onClearFilters}
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map(({ key, label }) => {
          const isActive = activeQuickFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onQuickFilter(isActive ? null : key)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:text-gray-800'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
