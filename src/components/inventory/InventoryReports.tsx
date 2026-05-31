import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, Printer } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
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
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { LocationCombobox } from './LocationCombobox';
import { TrackingStatusBadge } from './TrackingStatusBadge';
import {
  getActiveGigsWithTracking,
  getManifestReport,
  getPackingListReport,
  getMaintenanceQueueReport,
  getInventoryConflictFlags,
} from '../../services/inventoryManagement.service';
import type {
  GigWithTracking,
  ManifestRow,
  PackingListRow,
  MaintenanceRow,
} from '../../services/inventoryManagement.service';

interface InventoryReportsProps {
  organizationId: string;
  organizationName: string;
}

function formatScanned(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    return format(new Date(isoString), 'MMM d, h:mm a');
  } catch {
    return isoString;
  }
}

function ConflictBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 cursor-default shrink-0">
          <AlertTriangle className="h-3 w-3" />
          Conflict
        </span>
      </TooltipTrigger>
      <TooltipContent>
        This kit is assigned to overlapping gigs
      </TooltipContent>
    </Tooltip>
  );
}

function PrintHeader({
  organizationName,
  reportTitle,
  subtitle,
}: {
  organizationName: string;
  reportTitle: string;
  subtitle?: string;
}) {
  return (
    <div className="print-only hidden mb-4">
      <div className="text-lg font-bold">{organizationName}</div>
      <div className="text-base font-semibold">{reportTitle}</div>
      {subtitle && <div className="text-sm text-gray-600">{subtitle}</div>}
      <div className="text-xs text-gray-500 mt-1">
        Generated {format(new Date(), 'PPPp')}
      </div>
    </div>
  );
}

function ManifestTab({
  organizationId,
  organizationName,
  gigs,
  conflictFlags,
}: {
  organizationId: string;
  organizationName: string;
  gigs: GigWithTracking[];
  conflictFlags: Set<string>;
}) {
  const [location, setLocation] = useState('');
  const [gigFilter, setGigFilter] = useState('all');
  const [rows, setRows] = useState<ManifestRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchManifest = useCallback(async () => {
    if (!location) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getManifestReport(organizationId, {
        location,
        gigId: gigFilter !== 'all' ? gigFilter : undefined,
      });
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId, location, gigFilter]);

  useEffect(() => {
    fetchManifest();
  }, [fetchManifest]);

  const rowsByKit = useMemo(() => {
    const map = new Map<string, ManifestRow[]>();
    for (const row of rows) {
      const kitKey = row.kit_id;
      const list = map.get(kitKey) ?? [];
      list.push(row);
      map.set(kitKey, list);
    }
    return map;
  }, [rows]);

  const gigTitle = gigs.find((g) => g.id === gigFilter)?.title;

  return (
    <div className="flex flex-col gap-4">
      <PrintHeader
        organizationName={organizationName}
        reportTitle="Truck Manifest"
        subtitle={[location, gigTitle].filter(Boolean).join(' — ')}
      />

      <div className="flex flex-wrap gap-3 items-end no-print">
        <div className="flex flex-col gap-1 min-w-[220px] flex-1">
          <label className="text-xs font-medium text-muted-foreground">
            Location <span className="text-red-500">*</span>
          </label>
          <LocationCombobox
            value={location}
            onChange={setLocation}
            organizationId={organizationId}
            placeholder="Select or enter location..."
          />
        </div>
        <div className="flex flex-col gap-1 min-w-[180px]">
          <label className="text-xs font-medium text-muted-foreground">Gig (optional)</label>
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
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={() => window.print()}
          disabled={!location || rows.length === 0}
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      {!location && (
        <div className="flex flex-col items-center justify-center py-12 gap-2 border rounded-md bg-muted/20 no-print">
          <p className="text-sm text-muted-foreground">Select a location above to generate the manifest.</p>
        </div>
      )}

      {location && loading && (
        <div className="flex items-center justify-center py-12 no-print">
          <span className="text-sm text-muted-foreground">Loading manifest...</span>
        </div>
      )}

      {location && !loading && (
        <div className="rounded-md border overflow-hidden">
          {rowsByKit.size === 0 ? (
            <div className="flex items-center justify-center py-10">
              <span className="text-sm text-muted-foreground">No items found at this location.</span>
            </div>
          ) : (
            Array.from(rowsByKit.entries()).map(([kitId, kitRows]) => {
              const kitName = kitRows[0]?.kit_name ?? '—';
              const hasConflict = conflictFlags.has(kitId);
              return (
                <div key={kitId}>
                  <div className="bg-muted/40 px-4 py-2 flex items-center gap-2 border-b">
                    <span className="font-medium text-sm">{kitName}</span>
                    {hasConflict && <ConflictBadge />}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset / Kit</TableHead>
                        <TableHead>Tag #</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Gig</TableHead>
                        <TableHead>Last Scanned</TableHead>
                        <TableHead>Scanned By</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kitRows.map((row, i) => (
                        <TableRow key={`${row.kit_id}-${row.asset_id ?? 'kit'}-${i}`}>
                          <TableCell className="font-medium">
                            {row.asset_name ?? row.kit_name ?? '—'}
                          </TableCell>
                          <TableCell>{row.tag_number ?? '—'}</TableCell>
                          <TableCell>
                            <TrackingStatusBadge status={row.status} />
                          </TableCell>
                          <TableCell>{row.gig_title ?? '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatScanned(row.scanned_at)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.scanned_by_name ?? '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.notes ?? '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function PackingListTab({
  organizationId,
  organizationName,
  gigs,
  conflictFlags,
}: {
  organizationId: string;
  organizationName: string;
  gigs: GigWithTracking[];
  conflictFlags: Set<string>;
}) {
  const [gigId, setGigId] = useState('');
  const [rows, setRows] = useState<PackingListRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPackingList = useCallback(async () => {
    if (!gigId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getPackingListReport(organizationId, gigId);
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId, gigId]);

  useEffect(() => {
    fetchPackingList();
  }, [fetchPackingList]);

  const rowsByKit = useMemo(() => {
    const map = new Map<string, PackingListRow[]>();
    for (const row of rows) {
      const list = map.get(row.kit_id) ?? [];
      list.push(row);
      map.set(row.kit_id, list);
    }
    return map;
  }, [rows]);

  const selectedGigTitle = gigs.find((g) => g.id === gigId)?.title;

  return (
    <div className="flex flex-col gap-4">
      <PrintHeader
        organizationName={organizationName}
        reportTitle="Packing List"
        subtitle={selectedGigTitle}
      />

      <div className="flex flex-wrap gap-3 items-end no-print">
        <div className="flex flex-col gap-1 min-w-[220px] flex-1">
          <label className="text-xs font-medium text-muted-foreground">
            Gig <span className="text-red-500">*</span>
          </label>
          <Select value={gigId} onValueChange={setGigId}>
            <SelectTrigger aria-label="Select gig">
              <SelectValue placeholder="Select a gig..." />
            </SelectTrigger>
            <SelectContent>
              {gigs.map((gig) => (
                <SelectItem key={gig.id} value={gig.id}>
                  {gig.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={() => window.print()}
          disabled={!gigId || rows.length === 0}
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      {!gigId && (
        <div className="flex flex-col items-center justify-center py-12 gap-2 border rounded-md bg-muted/20 no-print">
          <p className="text-sm text-muted-foreground">Select a gig above to generate the packing list.</p>
        </div>
      )}

      {gigId && loading && (
        <div className="flex items-center justify-center py-12 no-print">
          <span className="text-sm text-muted-foreground">Loading packing list...</span>
        </div>
      )}

      {gigId && !loading && (
        <div className="rounded-md border overflow-hidden">
          {rowsByKit.size === 0 ? (
            <div className="flex items-center justify-center py-10">
              <span className="text-sm text-muted-foreground">No kits assigned to this gig.</span>
            </div>
          ) : (
            Array.from(rowsByKit.entries()).map(([kitId, kitRows]) => {
              const kitName = kitRows[0]?.kit_name ?? '—';
              const isContainer = kitRows[0]?.is_container ?? false;
              const hasConflict = conflictFlags.has(kitId);
              return (
                <div key={kitId}>
                  <div className="bg-muted/40 px-4 py-2 flex items-center gap-2 border-b">
                    <span className="font-medium text-sm">{kitName}</span>
                    <span className="text-[10px] text-muted-foreground border rounded px-1.5 py-0.5">
                      {isContainer ? 'Container' : 'Logical'}
                    </span>
                    {hasConflict && <ConflictBadge />}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="print-only hidden w-8">✓</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Tag #</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Scanned</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Scanned By</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kitRows.map((row, i) => (
                        <TableRow key={`${row.kit_id}-${row.asset_id ?? 'kit'}-${i}`}>
                          <TableCell className="print-only hidden">
                            <span className="inline-block w-4 h-4 border border-gray-400 rounded-sm" />
                          </TableCell>
                          <TableCell className="font-medium">
                            {row.asset_name ?? row.kit_name ?? '—'}
                          </TableCell>
                          <TableCell>{row.tag_number ?? '—'}</TableCell>
                          <TableCell>
                            {row.status ? (
                              <TrackingStatusBadge status={row.status} />
                            ) : (
                              <span className="text-xs text-muted-foreground">Not scanned</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatScanned(row.scanned_at)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.location ?? '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.scanned_by_name ?? '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.notes ?? '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function MaintenanceQueueTab({
  organizationId,
  organizationName,
  conflictFlags,
}: {
  organizationId: string;
  organizationName: string;
  conflictFlags: Set<string>;
}) {
  const [rows, setRows] = useState<MaintenanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMaintenanceQueueReport(organizationId)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [organizationId]);

  return (
    <div className="flex flex-col gap-4">
      <PrintHeader organizationName={organizationName} reportTitle="Maintenance Queue" />

      {loading && (
        <div className="flex items-center justify-center py-12">
          <span className="text-sm text-muted-foreground">Loading maintenance queue...</span>
        </div>
      )}

      {!loading && (
        <>
          <div className="flex items-center justify-between no-print">
            <span className="text-sm text-muted-foreground">
              {rows.length} asset{rows.length !== 1 ? 's' : ''} flagged for maintenance
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.print()}
              disabled={rows.length === 0}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Name</TableHead>
                  <TableHead>Tag #</TableHead>
                  <TableHead>Kit</TableHead>
                  <TableHead>Last Gig</TableHead>
                  <TableHead>Condition Notes</TableHead>
                  <TableHead>Date Flagged</TableHead>
                  <TableHead>Flagged By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No assets currently flagged for maintenance.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const hasConflict = row.kit_id ? conflictFlags.has(row.kit_id) : false;
                    return (
                      <TableRow key={row.asset_id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2 flex-wrap">
                            {row.asset_name ?? '—'}
                            {hasConflict && <ConflictBadge />}
                          </div>
                        </TableCell>
                        <TableCell>{row.tag_number ?? '—'}</TableCell>
                        <TableCell>{row.kit_name ?? '—'}</TableCell>
                        <TableCell>{row.last_gig_title ?? '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                          {row.condition_notes ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatScanned(row.date_flagged)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.flagged_by_name ?? '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

export function InventoryReports({ organizationId, organizationName }: InventoryReportsProps) {
  const [gigs, setGigs] = useState<GigWithTracking[]>([]);
  const [conflictFlags, setConflictFlags] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      getActiveGigsWithTracking(organizationId),
      getInventoryConflictFlags(organizationId),
    ])
      .then(([gigsData, flags]) => {
        setGigs(gigsData);
        setConflictFlags(flags);
      })
      .catch(() => {});
  }, [organizationId]);

  return (
    <Tabs defaultValue="manifest">
      <TabsList className="no-print">
        <TabsTrigger value="manifest">Manifest</TabsTrigger>
        <TabsTrigger value="packing-list">Packing List</TabsTrigger>
        <TabsTrigger value="maintenance">Maintenance Queue</TabsTrigger>
      </TabsList>

      <TabsContent value="manifest" className="mt-4">
        <ManifestTab
          organizationId={organizationId}
          organizationName={organizationName}
          gigs={gigs}
          conflictFlags={conflictFlags}
        />
      </TabsContent>

      <TabsContent value="packing-list" className="mt-4">
        <PackingListTab
          organizationId={organizationId}
          organizationName={organizationName}
          gigs={gigs}
          conflictFlags={conflictFlags}
        />
      </TabsContent>

      <TabsContent value="maintenance" className="mt-4">
        <MaintenanceQueueTab
          organizationId={organizationId}
          organizationName={organizationName}
          conflictFlags={conflictFlags}
        />
      </TabsContent>
    </Tabs>
  );
}
