import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '../ui/card';
import {
  Barcode,
  ChevronDown,
  CheckCircle2,
  Circle,
  Search,
  AlertTriangle,
  ChevronUp,
  FileText,
  Wrench,
} from 'lucide-react';
import { SCANNING_MODES, ScanningMode } from '../../config/inventoryWorkflow';
import { packingListService } from '../../services/mobile/packingList.service';
import { inventoryTrackingService } from '../../services/mobile/inventoryTracking.service';
import { idbStore } from '../../utils/idb/store';
import { MobileBarcodeScanner } from './MobileBarcodeScanner';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { cn } from '../ui/utils';
import { useAuth } from '../../contexts/AuthContext';

interface MobileInventoryModeProps {
  gigId: string | null;
  onSelectGig: (gigId: string) => void;
}

type TrackingRecord = {
  id?: string;
  gig_id: string;
  kit_id: string;
  asset_id: string | null;
  status: string;
  scanned_at: string;
  scanned_by: string;
  notes?: string | null;
  created_at?: string;
  scanned_by_user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null;
};

type NoteDialogState = {
  open: boolean;
  kitId?: string;
  assetId?: string;
  itemName?: string;
  note: string;
  lastScannedAt?: string;
  lastScannedBy?: string;
  maintenanceRequired: boolean;
  assetStatus?: string | null;
};

const getTrackingStatusBadgeClasses = (status?: string | null) => {
  switch (status) {
    case 'Checked Out':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'In Transit':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'On Site':
      return 'border-violet-200 bg-violet-50 text-violet-700';
    case 'In Warehouse':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    default:
      return 'border-border bg-muted/40 text-muted-foreground';
  }
};

const TrackingStatusBadge = ({ status }: { status?: string | null }) => (
  <Badge
    variant="outline"
    className={cn('text-[10px] py-0 h-4 px-1.5 font-normal border', getTrackingStatusBadgeClasses(status))}
  >
    {status || 'Not tracked'}
  </Badge>
);

const getLatestTrackingRecordForItem = (tracking: TrackingRecord[] = [], kitId: string, assetId?: string) => {
  return inventoryTrackingService.getLatestTrackingRecord(tracking, kitId, assetId) as TrackingRecord | null;
};

const getDisplayedTrackingRecord = (tracking: TrackingRecord[] = [], kitId: string, assetId?: string) => {
  if (!assetId) {
    return getLatestTrackingRecordForItem(tracking, kitId);
  }

  return getLatestTrackingRecordForItem(tracking, kitId, assetId) || getLatestTrackingRecordForItem(tracking, kitId);
};

const formatScannedBy = (trackingRecord?: TrackingRecord | null) => {
  if (!trackingRecord) {
    return '—';
  }

  const user = trackingRecord.scanned_by_user;
  if (user) {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    return fullName || user.email || trackingRecord.scanned_by;
  }

  return trackingRecord.scanned_by || '—';
};

const formatScannedAt = (value?: string) => {
  if (!value) {
    return '—';
  }

  try {
    return format(new Date(value), 'MMM d, yyyy h:mm a');
  } catch {
    return value;
  }
};

export default function MobileInventoryMode({ gigId }: MobileInventoryModeProps) {
  const { user, selectedOrganization } = useAuth();
  const [selectedMode, setSelectedMode] = useState<ScanningMode>(SCANNING_MODES[0]);
  const [packingList, setPackingList] = useState<any>(null);
  const [gigTitle, setGigTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedKits, setExpandedKits] = useState<Set<string>>(new Set());
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [noteDialog, setNoteDialog] = useState<NoteDialogState>({ open: false, note: '', maintenanceRequired: false });

  const refreshPackingList = useCallback(async (id: string) => {
    const updated = await idbStore.getPackingList(id);
    if (updated) {
      setPackingList(updated);
      if (updated.gig_title) {
        setGigTitle(updated.gig_title);
      }
    }
  }, []);

  useEffect(() => {
    if (gigId) {
      void loadPackingList(gigId);
      void loadGigTitle(gigId);
    }
  }, [gigId]);

  useEffect(() => {
    if (!packingList?.kits?.length) {
      return;
    }

    setExpandedKits((current) => {
      if (current.size > 0) {
        return current;
      }

      const defaults = packingList.kits
        .filter((assignment: any) => assignment.kit && assignment.kit.is_container === false)
        .map((assignment: any) => assignment.kit.id);

      return new Set(defaults);
    });
  }, [packingList]);

  const loadGigTitle = async (id: string) => {
    try {
      const gigs = await idbStore.getGigs();
      const gig = gigs.find((candidate: any) => candidate.id === id);
      if (gig) {
        setGigTitle(gig.title);
        return;
      }

      const cached = await idbStore.getPackingList(id);
      if (cached?.gig_title) {
        setGigTitle(cached.gig_title);
      }
    } catch {
    }
  };

  const loadPackingList = async (id: string) => {
    setLoading(true);
    try {
      const cached = await idbStore.getPackingList(id);
      if (cached) {
        setPackingList(cached);
      }

      if (navigator.onLine) {
        const fresh = await packingListService.fetchGigPackingList(id);
        setPackingList(fresh);
        if (fresh?.gig_title) {
          setGigTitle(fresh.gig_title);
        }
      }
    } catch (error) {
      console.error('Failed to load packing list:', error);
      toast.error('Failed to load packing list');
    } finally {
      setLoading(false);
    }
  };

  const toggleKit = (kitId: string) => {
    setExpandedKits((current) => {
      const next = new Set(current);
      if (next.has(kitId)) {
        next.delete(kitId);
      } else {
        next.add(kitId);
      }
      return next;
    });
  };

  const openNoteDialog = useCallback((params: {
    kitId: string;
    itemName: string;
    trackingRecord?: TrackingRecord | null;
    asset?: any;
    assetId?: string;
  }) => {
    const { kitId, itemName, trackingRecord, asset, assetId } = params;

    setNoteDialog({
      open: true,
      kitId,
      assetId,
      itemName,
      note: trackingRecord?.notes || '',
      lastScannedAt: trackingRecord?.scanned_at,
      lastScannedBy: formatScannedBy(trackingRecord),
      maintenanceRequired: asset?.status === 'Maintenance',
      assetStatus: asset?.status || null,
    });
  }, []);

  const closeNoteDialog = () => {
    setNoteDialog({ open: false, note: '', maintenanceRequired: false });
  };

  const handleManualToggle = useCallback(async (kitId: string, assetId?: string) => {
    if (!gigId || !packingList || !selectedOrganization || !user) {
      return;
    }

    const trackingRecord = getDisplayedTrackingRecord(packingList.tracking || [], kitId, assetId);
    const isCheckedInCurrentMode = trackingRecord?.status === selectedMode.resultingStatus;

    if (isCheckedInCurrentMode) {
      await inventoryTrackingService.clearTracking({ gigId, kitId, assetId });
      await refreshPackingList(gigId);
      toast('Item unchecked');
      return;
    }

    await inventoryTrackingService.submitScan({
      gigId,
      kitId,
      assetId,
      status: selectedMode.resultingStatus,
      organizationId: selectedOrganization.id,
      scannedBy: user.id,
    });

    await refreshPackingList(gigId);
    toast.success('Item checked');
  }, [gigId, packingList, refreshPackingList, selectedMode, selectedOrganization, user]);

  const handleSaveNote = useCallback(async () => {
    if (!gigId || !selectedOrganization || !user || !noteDialog.kitId) {
      return;
    }

    await inventoryTrackingService.updateLatestNote({
      gigId,
      kitId: noteDialog.kitId,
      assetId: noteDialog.assetId,
      notes: noteDialog.note,
      organizationId: selectedOrganization.id,
      scannedBy: user.id,
      fallbackStatus: selectedMode.resultingStatus,
    });

    if (noteDialog.assetId) {
      const wantsMaintenance = noteDialog.maintenanceRequired;
      const isMaintenance = noteDialog.assetStatus === 'Maintenance';

      if (wantsMaintenance && !isMaintenance) {
        await inventoryTrackingService.updateAssetStatus({
          gigId,
          kitId: noteDialog.kitId,
          assetId: noteDialog.assetId,
          status: 'Maintenance',
        });
      } else if (!wantsMaintenance && isMaintenance) {
        await inventoryTrackingService.updateAssetStatus({
          gigId,
          kitId: noteDialog.kitId,
          assetId: noteDialog.assetId,
          status: 'Active',
        });
      }
    }

    await refreshPackingList(gigId);
    closeNoteDialog();
    toast.success(noteDialog.note.trim() ? 'Note saved' : 'Note cleared');
  }, [gigId, noteDialog, refreshPackingList, selectedMode, selectedOrganization, user]);

  const matchTagLocally = useCallback((tagNumber: string) => {
    if (!packingList?.kits) return null;
    const tag = tagNumber.trim();

    for (const assignment of packingList.kits) {
      const kit = assignment.kit;
      if (!kit) continue;

      if (kit.tag_number === tag) {
        return { type: 'kit' as const, kitId: kit.id, assetId: undefined, label: kit.name || 'Kit' };
      }

      for (const assetAssignment of (kit.assets || [])) {
        const asset = assetAssignment.asset || {};
        const assetId = assetAssignment.asset_id || asset.id || assetAssignment.id;
        if (asset.tag_number === tag) {
          return {
            type: 'asset' as const,
            kitId: kit.id,
            assetId,
            label: asset.manufacturer_model || asset.name || asset.description || 'Asset',
          };
        }
      }
    }
    return null;
  }, [packingList]);

  const handleScan = async (tagNumber: string) => {
    if (!gigId || !packingList || !selectedOrganization || !user) {
      return;
    }

    setScannerError(null);

    try {
      const match = matchTagLocally(tagNumber);

      if (!match) {
        setScannerError(`No item found with tag: ${tagNumber}`);
        return;
      }

      await inventoryTrackingService.submitScan({
        gigId,
        kitId: match.kitId,
        assetId: match.assetId,
        status: selectedMode.resultingStatus,
        organizationId: selectedOrganization.id,
        scannedBy: user.id,
      });

      await refreshPackingList(gigId);
      toast.success(`Scanned: ${match.label}`);
    } catch (error) {
      console.error('Scan processing failed:', error);
      setScannerError('Failed to process scan. Please try again.');
    }
  };

  const stats = useMemo(() => {
    if (!packingList?.kits) {
      return { total: 0, scanned: 0 };
    }

    let total = 0;
    let scanned = 0;

    packingList.kits.forEach((assignment: any) => {
      const kit = assignment.kit;
      if (!kit) {
        return;
      }

      total += 1;
      if (getDisplayedTrackingRecord(packingList.tracking || [], kit.id)?.status === selectedMode.resultingStatus) {
        scanned += 1;
      }

      (kit.assets || []).forEach((assetAssignment: any) => {
        const asset = assetAssignment.asset || assetAssignment;
        const assetId = assetAssignment.asset_id || asset.id || assetAssignment.id;
        total += 1;
        if (getDisplayedTrackingRecord(packingList.tracking || [], kit.id, assetId)?.status === selectedMode.resultingStatus) {
          scanned += 1;
        }
      });
    });

    return { total, scanned };
  }, [packingList, selectedMode]);

  const filteredKits = useMemo(() => {
    if (!packingList?.kits) {
      return [];
    }

    if (!searchQuery.trim()) {
      return packingList.kits;
    }

    const query = searchQuery.toLowerCase();
    return packingList.kits.filter((assignment: any) => {
      const kit = assignment.kit;
      if (!kit) {
        return false;
      }

      if (kit.name?.toLowerCase().includes(query)) return true;
      if (kit.tag_number?.toLowerCase().includes(query)) return true;

      return (kit.assets || []).some((assetAssignment: any) => {
        const asset = assetAssignment.asset || assetAssignment;
        return (
          asset.name?.toLowerCase().includes(query) ||
          asset.manufacturer_model?.toLowerCase().includes(query) ||
          asset.description?.toLowerCase().includes(query) ||
          asset.tag_number?.toLowerCase().includes(query)
        );
      });
    });
  }, [packingList, searchQuery]);

  if (!gigId) {
    return (
      <div className="p-4 pt-8 text-center space-y-4">
        <div className="bg-muted/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
          <Barcode className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold">No Gig Selected</h2>
        <p className="text-muted-foreground">Select a gig from the dashboard to start scanning.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col">
        <div className="sticky top-0 z-40 border-b border-border shadow-sm" style={{ backgroundColor: 'var(--background)', opacity: 0.97 }}>
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">Inventory Mode</h1>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-medium truncate" style={{ color: '#0284c7' }}>{gigTitle || 'Select a gig'}</span>
                <span>·</span>
                <span>{stats.scanned} / {stats.total} scanned</span>
              </div>
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-lg active:scale-95 transition-transform"
              style={{ backgroundColor: '#0284c7', color: '#ffffff' }}
              onClick={() => setIsScannerOpen(true)}
            >
              <Barcode className="w-4 h-4" />
              Scan
            </button>
          </div>

          <div className="px-4 pb-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {SCANNING_MODES.map((mode) => {
              const isSelected = selectedMode.id === mode.id;
              return (
                <button
                  key={mode.id}
                  className="rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all active:scale-95 border"
                  style={
                    isSelected
                      ? { backgroundColor: '#0284c7', color: '#ffffff', borderColor: '#0284c7' }
                      : { backgroundColor: 'transparent', color: 'inherit', borderColor: 'var(--border)' }
                  }
                  onClick={() => setSelectedMode(mode)}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 p-4 space-y-4 pb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search items..."
              className="w-full bg-muted/50 border-none rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-sky-500 transition-all"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((value) => (
                <div key={value} className="h-24 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filteredKits.length === 0 ? (
            <Card className="p-8 text-center bg-muted/20 border-dashed">
              <p className="text-muted-foreground">
                {searchQuery ? 'No matching items found.' : 'No items on this packing list.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredKits.map((assignment: any) => {
                const kit = assignment.kit;
                if (!kit) {
                  return null;
                }

                const kitTracking = getDisplayedTrackingRecord(packingList?.tracking || [], kit.id);
                const isKitChecked = kitTracking?.status === selectedMode.resultingStatus;
                const isExpanded = expandedKits.has(kit.id);
                const hasNoTag = !kit.tag_number;

                return (
                  <div key={kit.id} className="space-y-1">
                    <Card className={cn('transition-all active:scale-[0.98]', isKitChecked ? 'border-emerald-200 bg-emerald-50/30' : 'border-border')}>
                      <CardContent className="p-0 [&:last-child]:pb-0">
                        <div className="flex items-stretch min-h-[64px]">
                          <button
                            className="w-10 flex items-center justify-center shrink-0 active:bg-muted/50 transition-colors"
                            onClick={() => handleManualToggle(kit.id)}
                          >
                            <div className={cn('w-6 h-6 rounded-full flex items-center justify-center', isKitChecked ? 'bg-emerald-100 text-emerald-600' : 'bg-muted text-muted-foreground')}>
                              {isKitChecked ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                            </div>
                          </button>
                          <div className="flex-1 min-w-0 px-0 py-3 pr-2 cursor-pointer" onClick={() => toggleKit(kit.id)}>
                            <h3 className="font-bold text-sm leading-tight truncate">{kit.name}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5 font-normal">Kit</Badge>
                              <TrackingStatusBadge status={kitTracking?.status} />
                              {hasNoTag ? (
                                <Badge variant="destructive" className="text-[10px] py-0 h-4 px-1.5 font-normal gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  No Tag
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground font-mono">{kit.tag_number}</span>
                              )}
                            </div>
                            {kitTracking?.notes ? (
                              <p className="mt-1 text-[11px] text-muted-foreground leading-snug truncate">Note: {kitTracking.notes}</p>
                            ) : null}
                          </div>
                          <div className="flex items-stretch shrink-0 border-l border-border/50">
                            <button
                              aria-label={`Edit note for ${kit.name}`}
                              className="px-3 text-[11px] font-medium text-sky-700 active:bg-sky-50 transition-colors"
                              onClick={(event) => {
                                event.stopPropagation();
                                openNoteDialog({
                                  kitId: kit.id,
                                  itemName: kit.name,
                                  trackingRecord: getLatestTrackingRecordForItem(packingList?.tracking || [], kit.id),
                                });
                              }}
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              className="w-12 flex items-center justify-center active:bg-muted/50 transition-colors"
                              onClick={() => toggleKit(kit.id)}
                            >
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {isExpanded ? (
                      <div className="ml-10 pl-4 pt-1 space-y-1.5">
                        {(kit.assets || []).map((assetAssignment: any) => {
                          const asset = assetAssignment.asset || {};
                          const assetId = assetAssignment.asset_id || asset.id || assetAssignment.id;
                          const assetName = asset.manufacturer_model || asset.name || asset.description || asset.category || assetAssignment.notes || 'Unnamed Asset';
                          const assetTag = asset.tag_number;
                          const assetTracking = getDisplayedTrackingRecord(packingList?.tracking || [], kit.id, assetId);
                          const latestExactAssetTracking = getLatestTrackingRecordForItem(packingList?.tracking || [], kit.id, assetId);
                          const isAssetChecked = assetTracking?.status === selectedMode.resultingStatus;
                          const assetNoTag = !assetTag;

                          return (
                            <div key={assetId} className={cn('flex items-stretch rounded-lg border text-sm transition-all', isAssetChecked ? 'bg-emerald-50/50 border-emerald-100' : 'bg-muted/20 border-border/50')}>
                              <button
                                className="w-10 flex items-center justify-center shrink-0 active:scale-90 transition-transform"
                                onClick={() => handleManualToggle(kit.id, assetId)}
                              >
                                <div className={cn(isAssetChecked ? 'text-emerald-500' : 'text-muted-foreground')}>
                                  {isAssetChecked ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                </div>
                              </button>
                              <div className="flex-1 min-w-0 py-2.5 pr-2.5">
                                <p className="font-medium leading-tight truncate">{assetName}</p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-[10px] text-muted-foreground">Qty: {assetAssignment.quantity}</span>
                                  <TrackingStatusBadge status={assetTracking?.status} />
                                  {asset?.status === 'Maintenance' ? (
                                    <Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5 font-normal border-orange-200 bg-orange-50 text-orange-700 gap-1">
                                      <Wrench className="w-3 h-3" />
                                      Maintenance
                                    </Badge>
                                  ) : null}
                                  {assetNoTag ? (
                                    <span className="text-[10px] text-destructive flex items-center gap-1 font-medium">
                                      <AlertTriangle className="w-2.5 h-2.5" /> No Tag
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground font-mono">{assetTag}</span>
                                  )}
                                </div>
                                {latestExactAssetTracking?.notes ? (
                                  <p className="mt-1 text-[11px] text-muted-foreground leading-snug truncate">Note: {latestExactAssetTracking.notes}</p>
                                ) : null}
                              </div>
                              <button
                                aria-label={`Edit note for ${assetName}`}
                                className="px-3 text-[11px] font-medium text-sky-700 border-l border-border/50 active:bg-sky-50 transition-colors"
                                onClick={() => openNoteDialog({
                                  kitId: kit.id,
                                  assetId,
                                  itemName: assetName,
                                  trackingRecord: latestExactAssetTracking,
                                  asset,
                                })}
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <MobileBarcodeScanner
          isScanning={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScan={handleScan}
          statusMessage={`Mode: ${selectedMode.label}`}
          error={scannerError}
        />
      </div>

      <Dialog open={noteDialog.open} onOpenChange={(open) => (!open ? closeNoteDialog() : undefined)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{noteDialog.itemName || 'Item note'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inventory-note">Notes on item condition</Label>
              <Textarea
                id="inventory-note"
                value={noteDialog.note}
                onChange={(event) => setNoteDialog((current) => ({ ...current, note: event.target.value }))}
                placeholder="Describe item condition, damage, issues..."
                className="min-h-24"
              />
            </div>

            {noteDialog.assetId ? (
              <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-3">
                <Label htmlFor="maintenance-required" className="text-sm font-medium">Maintenance Req'd</Label>
                <Checkbox
                  id="maintenance-required"
                  checked={noteDialog.maintenanceRequired}
                  onCheckedChange={(checked) => setNoteDialog((current) => ({ ...current, maintenanceRequired: checked === true }))}
                />
              </div>
            ) : null}

            <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Last scanned</span>
                <span className="text-right font-medium">{formatScannedAt(noteDialog.lastScannedAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Scanned by</span>
                <span className="text-right font-medium break-all">{noteDialog.lastScannedBy || '—'}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeNoteDialog}>Cancel</Button>
            <Button variant="outline" onClick={() => setNoteDialog((current) => ({ ...current, note: '' }))}>Clear note</Button>
            <Button onClick={() => void handleSaveNote()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
