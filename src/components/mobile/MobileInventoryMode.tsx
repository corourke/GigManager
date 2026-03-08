import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '../ui/card';
import { 
  Barcode, 
  ChevronDown, 
  CheckCircle2, 
  Circle,
  Search,
  AlertTriangle,
  ChevronUp
} from 'lucide-react';
import { SCANNING_MODES, ScanningMode } from '../../config/inventoryWorkflow';
import { packingListService } from '../../services/mobile/packingList.service';
import { inventoryTrackingService } from '../../services/mobile/inventoryTracking.service';
import { idbStore } from '../../utils/idb/store';
import { MobileBarcodeScanner } from './MobileBarcodeScanner';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';

interface MobileInventoryModeProps {
  gigId: string | null;
  onSelectGig: (gigId: string) => void;
}

export default function MobileInventoryMode({ gigId, onSelectGig }: MobileInventoryModeProps) {
  const [selectedMode, setSelectedMode] = useState<ScanningMode>(SCANNING_MODES[0]);
  const [packingList, setPackingList] = useState<any>(null);
  const [gigTitle, setGigTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedKits, setExpandedKits] = useState<Set<string>>(new Set());
  const [scannerError, setScannerError] = useState<string | null>(null);

  useEffect(() => {
    if (gigId) {
      loadPackingList(gigId);
      loadGigTitle(gigId);
    }
  }, [gigId]);

  const loadGigTitle = async (id: string) => {
    try {
      const gigs = await idbStore.getGigs();
      const gig = gigs.find((g: any) => g.id === id);
      if (gig) {
        setGigTitle(gig.title);
        return;
      }
      const cached = await idbStore.getPackingList(id);
      if (cached?.gig_title) {
        setGigTitle(cached.gig_title);
        return;
      }
    } catch {
      // Ignore - will show fallback
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
        if (fresh?.gig_title) setGigTitle(fresh.gig_title);
      }
    } catch (error) {
      console.error('Failed to load packing list:', error);
      toast.error('Failed to load packing list');
    } finally {
      setLoading(false);
    }
  };

  const toggleKit = (kitId: string) => {
    const newExpanded = new Set(expandedKits);
    if (newExpanded.has(kitId)) {
      newExpanded.delete(kitId);
    } else {
      newExpanded.add(kitId);
    }
    setExpandedKits(newExpanded);
  };

  const handleManualToggle = useCallback(async (kitId: string, assetId?: string) => {
    if (!gigId || !packingList) return;

    const isAlreadyChecked = packingList.tracking.some(
      (t: any) => t.kit_id === kitId && (assetId ? t.asset_id === assetId : !t.asset_id) && t.status === selectedMode.resultingStatus
    );

    if (isAlreadyChecked) {
      const updated = {
        ...packingList,
        tracking: packingList.tracking.filter(
          (t: any) => !(t.kit_id === kitId && (assetId ? t.asset_id === assetId : !t.asset_id) && t.status === selectedMode.resultingStatus)
        ),
      };
      setPackingList(updated);
      await idbStore.putPackingList(gigId, updated);
      toast('Item unchecked');
    } else {
      await inventoryTrackingService.submitScan({
        gigId,
        kitId,
        assetId,
        status: selectedMode.resultingStatus,
      });
      const updated = await idbStore.getPackingList(gigId);
      setPackingList(updated);
      toast.success('Item checked');
    }
  }, [gigId, packingList, selectedMode]);

  const handleScan = async (tagNumber: string) => {
    setScannerError(null);
    try {
      const match = await inventoryTrackingService.matchTag(tagNumber);

      if (!match) {
        setScannerError(`No item found with tag: ${tagNumber}`);
        return;
      }

      const kitId = match.type === 'kit' ? match.item.id : null;
      const assetId = match.type === 'asset' ? match.item.id : null;

      await inventoryTrackingService.submitScan({
        gigId: gigId!,
        kitId: kitId || '00000000-0000-0000-0000-000000000000',
        assetId: assetId || undefined,
        status: selectedMode.resultingStatus,
      });

      toast.success(`Scanned: ${match.item.name}`);
      const updated = await idbStore.getPackingList(gigId!);
      setPackingList(updated);
    } catch (error) {
      console.error('Scan processing failed:', error);
      setScannerError('Failed to process scan. Please try again.');
    }
  };

  const stats = useMemo(() => {
    if (!packingList?.kits) return { total: 0, scanned: 0 };

    let total = 0;
    let scanned = 0;

    packingList.kits.forEach((ka: any) => {
      const kit = ka.kit;
      if (!kit) return;
      total++;
      if (packingList.tracking.some(
        (t: any) => t.kit_id === kit.id && !t.asset_id && t.status === selectedMode.resultingStatus
      )) scanned++;

      (kit.assets || []).forEach((ca: any) => {
        const asset = ca.asset || ca;
        total++;
        if (packingList.tracking.some(
          (t: any) => t.kit_id === kit.id && t.asset_id === (asset.id || ca.id) && t.status === selectedMode.resultingStatus
        )) scanned++;
      });
    });

    return { total, scanned };
  }, [packingList, selectedMode]);

  const filteredKits = useMemo(() => {
    if (!packingList?.kits) return [];
    if (!searchQuery.trim()) return packingList.kits;

    const q = searchQuery.toLowerCase();
    return packingList.kits.filter((ka: any) => {
      const kit = ka.kit;
      if (!kit) return false;
      if (kit.name?.toLowerCase().includes(q)) return true;
      if (kit.tag_number?.toLowerCase().includes(q)) return true;
      return (kit.assets || []).some((ca: any) => {
        const asset = ca.asset || ca;
        return asset.name?.toLowerCase().includes(q) || asset.tag_number?.toLowerCase().includes(q);
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
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
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
            {filteredKits.map((ka: any) => {
              const kit = ka.kit;
              if (!kit) return null;
              const isKitScanned = packingList.tracking.some(
                (t: any) => t.kit_id === kit.id && !t.asset_id && t.status === selectedMode.resultingStatus
              );
              const isExpanded = expandedKits.has(kit.id);
              const hasNoTag = !kit.tag_number;

              return (
                <div key={kit.id} className="space-y-1">
                  <Card
                    className={cn(
                      "transition-all active:scale-[0.98]",
                      isKitScanned ? "border-emerald-200 bg-emerald-50/30" : "border-border"
                    )}
                  >
                    <CardContent className="p-0">
                      <div className="flex items-stretch min-h-[64px]">
                        <button
                          className="w-10 flex items-center justify-center shrink-0 active:bg-muted/50 transition-colors"
                          onClick={() => handleManualToggle(kit.id)}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center",
                            isKitScanned ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"
                          )}>
                            {isKitScanned ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                          </div>
                        </button>
                        <div
                          className="flex-1 py-3 pr-1 flex items-start gap-2 cursor-pointer min-w-0"
                          onClick={() => toggleKit(kit.id)}
                        >
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm leading-tight truncate">{kit.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5 font-normal">
                                Kit
                              </Badge>
                              {hasNoTag && (
                                <Badge variant="destructive" className="text-[10px] py-0 h-4 px-1.5 font-normal gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  No Tag
                                </Badge>
                              )}
                              {!hasNoTag && (
                                <span className="text-[10px] text-muted-foreground font-mono">{kit.tag_number}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div
                          className="w-12 flex items-center justify-center border-l border-border/50 active:bg-muted/50 transition-colors"
                          onClick={() => toggleKit(kit.id)}
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {isExpanded && (
                    <div style={{ marginLeft: 10, paddingLeft: 30, paddingTop: 4, paddingBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(kit.assets || []).map((ca: any) => {
                        const asset = ca.asset || {};
                        const assetId = ca.asset_id || asset.id || ca.id;
                        const assetName = asset.manufacturer_model || asset.name || asset.description || asset.category || ca.notes || 'Unnamed Asset';
                        const assetTag = asset.tag_number;
                        const isAssetScanned = packingList.tracking.some(
                          (t: any) => t.kit_id === kit.id && t.asset_id === assetId && t.status === selectedMode.resultingStatus
                        );
                        const assetNoTag = !assetTag;

                        return (
                          <div
                            key={assetId}
                            className={cn(
                              "flex items-center gap-3 p-2.5 pl-3 rounded-lg border text-sm transition-all",
                              isAssetScanned
                                ? "bg-emerald-50/50 border-emerald-100"
                                : "bg-muted/20 border-border/50"
                            )}
                          >
                            <button
                              className="shrink-0 active:scale-90 transition-transform"
                              onClick={() => handleManualToggle(kit.id, assetId)}
                            >
                              <div className={cn(
                                isAssetScanned ? "text-emerald-500" : "text-muted-foreground"
                              )}>
                                {isAssetScanned ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                              </div>
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium leading-tight truncate">{assetName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-muted-foreground">Qty: {ca.quantity}</span>
                                {assetNoTag ? (
                                  <span className="text-[10px] text-destructive flex items-center gap-1 font-medium">
                                    <AlertTriangle className="w-2.5 h-2.5" /> No Tag
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-mono">{assetTag}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
  );
}
