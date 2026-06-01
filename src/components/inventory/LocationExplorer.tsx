import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { MapPin, Filter } from 'lucide-react';
import { LocationCombobox } from './LocationCombobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Label } from '../ui/label';
import { cn } from '../ui/utils';
import {
  getItemsByLocation,
  getActiveGigsWithTracking,
} from '../../services/inventoryManagement.service';
import type { LocationItem, GigWithTracking } from '../../services/inventoryManagement.service';
import { SCANNING_MODES } from '../../config/inventoryWorkflow';
import { TRACKING_STATUS_CONFIG } from '../../utils/supabase/constants';

interface LocationExplorerProps {
  organizationId: string;
}

const UNIQUE_STATUSES = Array.from(new Set(SCANNING_MODES.map(m => m.resultingStatus)));

function formatLastScanned(isoString: string): string {
  try {
    return format(new Date(isoString), 'MMM d, h:mm a');
  } catch {
    return isoString;
  }
}

export function LocationExplorer({ organizationId }: LocationExplorerProps) {
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(UNIQUE_STATUSES);
  const [gigFilter, setGigFilter] = useState('all');
  const [items, setItems] = useState<LocationItem[]>([]);
  const [gigs, setGigs] = useState<GigWithTracking[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    getActiveGigsWithTracking(organizationId)
      .then(setGigs)
      .catch(() => setGigs([]));
  }, [organizationId]);

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };

  const hasFilters = !!(locationFilter || selectedStatuses.length > 0 || gigFilter !== 'all');

  const fetchItems = useCallback(async () => {
    if (!locationFilter && selectedStatuses.length === 0 && gigFilter === 'all') {
      setItems([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const results = await getItemsByLocation(organizationId, {
        location: locationFilter || undefined,
        status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        gigId: gigFilter !== 'all' ? gigFilter : undefined,
      });
      setItems(results);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId, locationFilter, selectedStatuses, gigFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, Record<string, LocationItem[]>> = {};
    
    for (const item of items) {
      const status = item.status;
      const location = item.location || 'Unknown Location';
      
      if (!groups[status]) groups[status] = {};
      if (!groups[status][location]) groups[status][location] = [];
      
      groups[status][location].push(item);
    }
    
    return groups;
  }, [items]);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 border-b pb-2">
          <Filter className="h-4 w-4" />
          Location Explorer Filters
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</Label>
            <LocationCombobox
              value={locationFilter}
              onChange={setLocationFilter}
              organizationId={organizationId}
              placeholder="Filter by location..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gig</Label>
            <Select value={gigFilter} onValueChange={setGigFilter}>
              <SelectTrigger aria-label="Filter by gig">
                <SelectValue placeholder="All gigs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All gigs</SelectItem>
                {gigs.map((gig) => (
                  <SelectItem key={gig.id} value={gig.id}>
                    {gig.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status Filter</Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {UNIQUE_STATUSES.map((status) => {
                const isActive = selectedStatuses.includes(status);
                const config = TRACKING_STATUS_CONFIG[status as keyof typeof TRACKING_STATUS_CONFIG];
                return (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={cn(
                      'text-xs font-medium px-3 py-1.5 rounded-full border transition-all',
                      isActive
                        ? config?.color ?? 'border-border bg-muted/40 text-muted-foreground'
                        : 'border-dashed border-muted-foreground/30 text-muted-foreground/50 bg-transparent hover:border-muted-foreground/50 hover:text-muted-foreground/70'
                    )}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {!hasFilters && !hasSearched && (
        <div className="flex flex-col items-center justify-center py-12 gap-2 border rounded-md bg-muted/20">
          <MapPin className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Apply filters above to explore items by status and location.</p>
        </div>
      )}

      {hasFilters && loading && (
        <div className="flex items-center justify-center py-12" data-testid="loading-spinner">
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      )}

      {hasFilters && !loading && (
        <div className="flex flex-col gap-8">
          {Object.keys(groupedItems).length === 0 ? (
            <div className="text-center text-muted-foreground py-12 border rounded-md bg-muted/5">
              No items found matching the selected filters.
            </div>
          ) : (
            Object.entries(groupedItems).sort().map(([status, locations]) => (
              <div key={status} className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-gray-900">{status}</h2>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                
                {Object.entries(locations).sort().map(([location, locationItems]) => (
                  <div key={location} className="flex flex-col gap-2 pl-4 border-l-2 border-primary/20">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {location}
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full ml-1">
                        {locationItems.length} items
                      </span>
                    </div>

                    <div className="rounded-md border bg-white overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="w-[200px]">Kit Name</TableHead>
                            <TableHead>Asset Name</TableHead>
                            <TableHead className="w-[120px]">Tag #</TableHead>
                            <TableHead className="w-[200px]">Gig</TableHead>
                            <TableHead className="w-[160px]">Last Scanned</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {locationItems.map((item, index) => (
                            <TableRow key={`${item.kit_id}-${item.asset_id ?? 'kit'}-${index}`}>
                              <TableCell className="font-medium">{item.kit_name ?? '—'}</TableCell>
                              <TableCell>{item.asset_name ?? '—'}</TableCell>
                              <TableCell className="font-mono text-xs">{item.tag_number ?? '—'}</TableCell>
                              <TableCell className="text-sm">{item.gig_title ?? '—'}</TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                {formatLastScanned(item.scanned_at)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
