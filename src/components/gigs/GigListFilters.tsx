import { Search, Filter, Calendar as CalendarIcon, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { GigStatus } from '../../utils/supabase/types';
import { GIG_STATUS_CONFIG } from '../../utils/supabase/constants';

interface GigListFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: GigStatus | 'All';
  setStatusFilter: (status: GigStatus | 'All') => void;
  dateFrom: Date | undefined;
  setDateFrom: (date: Date | undefined) => void;
  dateTo: Date | undefined;
  setDateTo: (date: Date | undefined) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function GigListFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  sortOrder,
  setSortOrder,
  onClearFilters,
  hasActiveFilters,
}: GigListFiltersProps) {
  return (
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
              {Object.entries(GIG_STATUS_CONFIG).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
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
              onClick={onClearFilters}
              className="h-7 text-xs"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
