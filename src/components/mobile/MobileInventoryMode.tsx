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
  Minus,
  Plus,
} from 'lucide-react';
import { NOT_RETURNED_STATUS, RETURNED_STATUS, SCANNING_MODES, ScanningMode } from '../../config/inventoryWorkflow';
import { writeOffPieces } from '../../services/writeOff.service';
import { canManage } from '../../utils/permissions';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { cn } from '../ui/utils';
import { useAuth } from '../../contexts/AuthContext';
import { TrackingStatusBadge } from '../inventory/TrackingStatusBadge';

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


const getLatestTrackingRecordForItem = (tracking: TrackingRecord[] = [], kitId: string, assetId?: string) => {
  return inventoryTrackingService.getLatestTrackingRecord(tracking, kitId, assetId) as TrackingRecord | null;
};

const getDisplayedTrackingRecord = (tracking: TrackingRecord[] = [], kitId: string, assetId?: string) => {
  if (!assetId) {
    return getLatestTrackingRecordForItem(tracking, kitId);
  }

  return getLatestTrackingRecordForItem(tracking, kitId, assetId) || getLatestTrackingRecordForItem(tracking, kitId);
};

// A non-container kit never gets its own tracking record (nothing physical
// to scan) — so "is this kit's row checked" means "are all of its
// scannable units currently in this status," not a single record lookup.
// A container still has its own record to check directly.
const isKitFullyScanned = (tracking: TrackingRecord[], packingList: any, kit: any, targetStatus: string): boolean => {
  if (kit.is_container) {
    return getDisplayedTrackingRecord(tracking, kit.id)?.status === targetStatus;
  }
  // Every piece, "any" lines included (#185): 7 of a line of 10 isn't packed yet.
  const { done, total } = inventoryTrackingService.getKitProgress({ ...packingList, tracking }, kit.id, targetStatus);
  return total > 0 && done === total;
};

type AnySlot = { kit_id: string; item_id: string; item_name: string; quantity: number };

/** A lot line being counted (#185): `start` is what the kit holds now, or the full line. */
type CounterState = { kitId: string; assetId: string; name: string; line: number; start: number; count: number };

/** Fewer came back on Unload than went out: what happens to the rest (#185). */
type ShortReturnState = { kitId: string; assetId: string; name: string; stillOut: number };

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
  const { user, selectedOrganization, userRole } = useAuth();
  const [selectedMode, setSelectedMode] = useState<ScanningMode>(SCANNING_MODES[0]);
  const [locationInput, setLocationInput] = useState<string>(SCANNING_MODES[0].locationLabel);
  const [packingList, setPackingList] = useState<any>(null);
  const [gigTitle, setGigTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedKits, setExpandedKits] = useState<Set<string>>(new Set());
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [noteDialog, setNoteDialog] = useState<NoteDialogState>({ open: false, note: '', maintenanceRequired: false });
  const [counter, setCounter] = useState<CounterState | null>(null);
  const [shortReturn, setShortReturn] = useState<ShortReturnState | null>(null);
  // Finish unload (#185): what's still out, and which of it to mark missing.
  const [finishing, setFinishing] = useState<{ kit_id: string; asset_id: string | null; quantity: number; name: string; missing: boolean }[] | null>(null);

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

    let isCheckedInCurrentMode: boolean;
    if (assetId) {
      const trackingRecord = getDisplayedTrackingRecord(packingList.tracking || [], kitId, assetId);
      isCheckedInCurrentMode = trackingRecord?.status === selectedMode.resultingStatus;
    } else {
      const kit = packingList.kits?.find((assignment: any) => assignment.kit?.id === kitId)?.kit;
      isCheckedInCurrentMode = kit
        ? isKitFullyScanned(packingList.tracking || [], packingList, kit, selectedMode.resultingStatus)
        : false;
    }

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
      location: locationInput || null,
    });

    await refreshPackingList(gigId);
    toast.success('Item checked');
  }, [gigId, locationInput, packingList, refreshPackingList, selectedMode, selectedOrganization, user]);

  const scanLot = useCallback(async (kitId: string, assetId: string, quantity: number, status: string) => {
    if (!gigId || !selectedOrganization || !user) return;
    await inventoryTrackingService.submitScan({
      gigId,
      kitId,
      assetId,
      quantity,
      status,
      organizationId: selectedOrganization.id,
      scannedBy: user.id,
      location: locationInput || null,
    });
    await refreshPackingList(gigId);
  }, [gigId, locationInput, refreshPackingList, selectedOrganization, user]);

  // A lot line is counted, not ticked (#185). It starts at what the kit holds from an earlier
  // step (on Unload: what went out), or the full line.
  const openCounter = useCallback((kitId: string, assetId: string, name: string, line: number) => {
    const latest = getLatestTrackingRecordForItem(packingList?.tracking || [], kitId, assetId);
    const holds = latest && latest.status !== RETURNED_STATUS && latest.status !== selectedMode.resultingStatus
      ? Math.max(1, Number((latest as any).quantity ?? line) || 1)
      : 0;
    const start = holds || line;
    setCounter({ kitId, assetId, name, line, start, count: start });
  }, [packingList, selectedMode]);

  const confirmCounter = useCallback(async () => {
    if (!counter) return;
    const { kitId, assetId, name, start, count } = counter;
    setCounter(null);
    if (selectedMode.resultingStatus === RETURNED_STATUS && count < start) {
      setShortReturn({ kitId, assetId, name, stillOut: start - count });
      return;
    }
    if (count <= 0) return;
    await scanLot(kitId, assetId, count, selectedMode.resultingStatus);
    toast.success(count < counter.line ? `${name}: ${count} of ${counter.line}` : 'Item checked');
  }, [counter, scanLot, selectedMode]);

  // Leave at the gig: one Not Returned row with what's still out; the rest are home.
  const leaveAtGig = useCallback(async () => {
    if (!shortReturn) return;
    const { kitId, assetId, stillOut } = shortReturn;
    setShortReturn(null);
    await scanLot(kitId, assetId, stillOut, NOT_RETURNED_STATUS);
    toast(`${stillOut} left at the gig`);
  }, [scanLot, shortReturn]);

  // Mark missing: online only, Admin or Manager (the write-off RPC checks too). It writes the
  // bucket's closing row itself, so the list is reloaded from the server.
  const markMissing = useCallback(async () => {
    if (!shortReturn || !gigId) return;
    const { kitId, assetId, stillOut } = shortReturn;
    setShortReturn(null);
    try {
      await writeOffPieces({ assetId, quantity: stillOut, gigId, kitId, stillOut: 0 });
      toast.success(`${stillOut} marked missing`);
    } catch (error) {
      console.error('Write-off failed:', error);
      toast.error('Could not mark them missing. Try again, or leave them at the gig.');
    }
    await loadPackingList(gigId);
  }, [gigId, shortReturn]);

  const openFinishUnload = useCallback(() => {
    if (!packingList) return;
    const names = new Map<string, string>();
    for (const assignment of packingList.kits || []) {
      const kit = assignment.kit;
      if (!kit) continue;
      names.set(`kit:${kit.id}`, kit.name || 'Kit');
      for (const a of [...(kit.assets || []), ...(kit.direct_assets || [])]) {
        const asset = a.asset || {};
        const id = a.asset_id || asset.id;
        if (id && asset.manufacturer_model && !names.has(id)) names.set(id, asset.manufacturer_model);
      }
      for (const line of kit.any_lines || []) {
        for (const r of packingList.item_records?.[line.item_id] || []) {
          names.set(r.id, r.tag_number ? `${line.item_name} (${r.tag_number})` : line.item_name);
        }
      }
    }
    setFinishing(inventoryTrackingService.getStillOut(packingList).map((t: { kit_id: string; asset_id: string | null; quantity: number }) => ({
      ...t,
      name: t.asset_id ? names.get(t.asset_id) ?? 'Item' : names.get(`kit:${t.kit_id}`) ?? 'Kit',
      missing: false,
    })));
  }, [packingList]);

  // Each item left at the gig gets a Not Returned row with what's still out (a container as a
  // whole); each marked missing is written off. Write-offs need a connection and Admin or Manager.
  const finishUnload = useCallback(async () => {
    if (!finishing || !gigId || !selectedOrganization || !user) return;
    const items = finishing;
    setFinishing(null);
    let missingFailed = 0;
    for (const item of items) {
      if (item.missing && item.asset_id) {
        try {
          await writeOffPieces({ assetId: item.asset_id, quantity: item.quantity, gigId, kitId: item.kit_id, stillOut: 0 });
        } catch (error) {
          console.error('Write-off failed:', error);
          missingFailed += 1;
        }
        continue;
      }
      await inventoryTrackingService.submitScan({
        gigId,
        kitId: item.kit_id,
        assetId: item.asset_id ?? undefined,
        quantity: item.asset_id ? item.quantity : undefined,
        status: NOT_RETURNED_STATUS,
        organizationId: selectedOrganization.id,
        scannedBy: user.id,
        location: locationInput || null,
      });
    }
    if (items.some((i) => i.missing)) {
      await loadPackingList(gigId);
    } else {
      await refreshPackingList(gigId);
    }
    if (missingFailed > 0) {
      toast.error(`${missingFailed} could not be marked missing. They're still listed as out.`);
    } else if (items.length > 0) {
      toast.success('Unload finished');
    }
  }, [finishing, gigId, locationInput, refreshPackingList, selectedOrganization, user]);

  // An "any" line (#185): checking it fills it from what the kit holds, then lots at home (most
  // at home first, no prompt); un-checking deletes the rows that filled it in this mode.
  const handleAnyToggle = useCallback(async (slot: AnySlot) => {
    if (!gigId || !packingList || !selectedOrganization || !user) {
      return;
    }
    const status = selectedMode.resultingStatus;
    const tracking = packingList.tracking || [];
    const records: { id: string }[] = packingList.item_records?.[slot.item_id] || [];

    if (inventoryTrackingService.getAnySlotFilled(packingList, slot, status) >= slot.quantity) {
      for (const r of records) {
        if (getLatestTrackingRecordForItem(tracking, slot.kit_id, r.id)?.status === status) {
          await inventoryTrackingService.clearTracking({ gigId, kitId: slot.kit_id, assetId: r.id });
        }
      }
      await refreshPackingList(gigId);
      toast('Item unchecked');
      return;
    }

    const { fills, short } = inventoryTrackingService.getAnySlotFills(packingList, slot, status, gigId);
    for (const fill of fills) {
      await inventoryTrackingService.submitScan({
        gigId,
        kitId: slot.kit_id,
        assetId: fill.asset_id,
        quantity: fill.quantity,
        status,
        organizationId: selectedOrganization.id,
        scannedBy: user.id,
        location: locationInput || null,
      });
    }
    await refreshPackingList(gigId);
    if (short > 0) {
      toast.warning(`${slot.item_name}: ${short} short. Scan tagged ones to fill the rest.`);
    } else {
      toast.success('Item checked');
    }
  }, [gigId, locationInput, packingList, refreshPackingList, selectedMode, selectedOrganization, user]);

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

  const handleModeSelect = useCallback((mode: ScanningMode) => {
    setLocationInput((currentLocation) =>
      currentLocation === selectedMode.locationLabel ? mode.locationLabel : currentLocation
    );
    setSelectedMode(mode);
  }, [selectedMode]);

  const matchTagLocally = useCallback((tagNumber: string) => {
    if (!packingList?.kits) return null;
    const tag = tagNumber.trim();

    for (const assignment of packingList.kits) {
      const kit = assignment.kit;
      if (!kit) continue;

      if (kit.tag_number === tag) {
        return { type: 'kit' as const, kitId: kit.id, assetId: undefined, label: kit.name || 'Kit' };
      }
    }

    // A tagged line goes under the kit a kit scan would write it under: the top kit, or the
    // nearest container it's sealed in (getCascadeTargets), never a nested kit's own id.
    const roots: string[] = packingList.top_level_kit_ids?.length
      ? packingList.top_level_kit_ids
      : packingList.kits.map((a: any) => a.kit_id ?? a.kit?.id);
    const assetsById = new Map<string, any>();
    for (const assignment of packingList.kits) {
      for (const a of assignment.kit?.assets || []) {
        const asset = a.asset || {};
        assetsById.set(a.asset_id || asset.id || a.id, asset);
      }
    }
    for (const root of roots) {
      for (const target of inventoryTrackingService.getCascadeTargets(packingList, root)) {
        const asset = target.asset_id ? assetsById.get(target.asset_id) : null;
        if (asset?.tag_number === tag) {
          return {
            type: 'asset' as const,
            kitId: target.kit_id,
            assetId: target.asset_id ?? undefined,
            label: asset.manufacturer_model || asset.name || asset.description || 'Asset',
          };
        }
      }
    }
    // A tagged unit of an "any" line's item fills a slot under the line's kit (#185): the first
    // line of that item that isn't full yet in this mode.
    const slots: AnySlot[] = roots.flatMap((root) => inventoryTrackingService.getAnySlots(packingList, root));
    for (const slot of slots) {
      const unit = (packingList.item_records?.[slot.item_id] || []).find((r: any) => r.tag_number === tag);
      if (!unit) continue;
      const open = slots.find((s) => s.item_id === slot.item_id
        && inventoryTrackingService.getAnySlotFilled(packingList, s, selectedMode.resultingStatus) < s.quantity) ?? slot;
      return { type: 'asset' as const, kitId: open.kit_id, assetId: unit.id, label: slot.item_name };
    }
    return null;
  }, [packingList, selectedMode]);

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
        location: locationInput || null,
      });

      await refreshPackingList(gigId);
      toast.success(`Scanned: ${match.label}`);
    } catch (error) {
      console.error('Scan processing failed:', error);
      setScannerError('Failed to process scan. Please try again.');
    }
  };

  // In pieces, each counted once however the kits nest (#185).
  const stats = useMemo(
    () => inventoryTrackingService.getScanProgress(packingList, selectedMode.resultingStatus),
    [packingList, selectedMode]
  );

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

  // The real nested structure to render: each kit assignment paired with its
  // depth in the tree, in parent-then-children order. A container's own
  // children are never descended into — scanning it is a single action for
  // everything inside, so nothing beneath it gets its own row. Collapsed
  // kits simply aren't descended into. Search results stay a flat list
  // (depth 0) — a nested tree isn't more useful than flat matches when
  // you're hunting for one specific item, and it sidesteps ancestor kits
  // that don't themselves match needing to be synthesized into the results.
  const treeRows = useMemo(() => {
    if (!packingList?.kits) {
      return [] as { assignment: any; depth: number; assetsSource: 'direct' | 'flattened'; rootId: string; multiplier: number }[];
    }
    if (searchQuery.trim()) {
      // Flattened, not direct — the search filter above matches against
      // every nested asset too, so the expanded list needs to be able to
      // show a match that lives inside a nested sub-kit that didn't itself
      // match by name/tag.
      return filteredKits.map((assignment: any) => ({ assignment, depth: 0, assetsSource: 'flattened' as const, rootId: assignment.kit_id ?? assignment.kit?.id, multiplier: 1 }));
    }

    const byId = new Map<string, any>(packingList.kits.map((a: any) => [a.kit_id ?? a.kit?.id, a]));
    const childrenOf = new Map<string, { id: string; quantity: number }[]>();
    for (const edge of packingList.hierarchy_edges || []) {
      const parentAssignment = byId.get(edge.parent_kit_id);
      if (!parentAssignment?.kit || parentAssignment.kit.is_container) continue;
      const list = childrenOf.get(edge.parent_kit_id) ?? [];
      list.push({ id: edge.child_kit_id, quantity: Math.max(1, Number(edge.quantity ?? 1) || 1) });
      childrenOf.set(edge.parent_kit_id, list);
    }

    // Fall back to every kit as its own root for a packing list cached
    // before this field existed — same flat-but-correct behavior as before.
    const rootIds: string[] = packingList.top_level_kit_ids?.length
      ? packingList.top_level_kit_ids
      : packingList.kits.map((a: any) => a.kit_id ?? a.kit?.id);

    const rows: { assignment: any; depth: number; assetsSource: 'direct' | 'flattened'; rootId: string; multiplier: number }[] = [];
    const visited = new Set<string>();
    // rootId and multiplier: whose rows a nested kit's "any" lines are tracked under, and how
    // many copies of it the top kit holds (#185).
    const visit = (kitId: string, depth: number, rootId: string, multiplier: number) => {
      if (visited.has(kitId)) return;
      visited.add(kitId);
      const assignment = byId.get(kitId);
      if (!assignment?.kit) return;
      // Direct assets only — a nested sub-kit gets its own row below (when
      // expanded), so folding its assets in here too would show them twice.
      rows.push({ assignment, depth, assetsSource: 'direct', rootId, multiplier });
      if (!expandedKits.has(kitId)) return;
      for (const child of childrenOf.get(kitId) ?? []) visit(child.id, depth + 1, rootId, multiplier * child.quantity);
    };
    for (const rootId of rootIds) visit(rootId, 0, rootId, 1);
    return rows;
  }, [packingList, expandedKits, searchQuery, filteredKits]);

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
                <span>{stats.done} / {stats.total} pieces</span>
              </div>
            </div>
            <button
              className="flex items-center gap-2 px-4 h-11 rounded-full text-sm font-medium shadow-lg active:scale-95 transition-transform"
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
                  onClick={() => handleModeSelect(mode)}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>

          <div className="px-4 pb-3">
            <input
              type="text"
              list="location-suggestions"
              placeholder="Location (e.g. Truck 1, Warehouse A)"
              className="w-full bg-muted/50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 transition-all"
              value={locationInput}
              onChange={(event) => setLocationInput(event.target.value)}
              aria-label="Current location"
            />
            <datalist id="location-suggestions">
              {Array.from(new Set(SCANNING_MODES.map((mode) => mode.locationLabel))).map((label) => (
                <option key={label} value={label} />
              ))}
            </datalist>
            {selectedMode.resultingStatus === RETURNED_STATUS ? (
              <Button variant="outline" className="mt-2 w-full h-10" onClick={openFinishUnload}>Finish unload</Button>
            ) : null}
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
          ) : treeRows.length === 0 ? (
            <Card className="p-8 text-center bg-muted/20 border-dashed">
              <p className="text-muted-foreground">
                {searchQuery ? 'No matching items found.' : 'No items on this packing list.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {treeRows.map(({ assignment, depth, assetsSource, rootId, multiplier }: { assignment: any; depth: number; assetsSource: 'direct' | 'flattened'; rootId: string; multiplier: number }) => {
                const kit = assignment.kit;
                if (!kit) {
                  return null;
                }
                const expandedAssets = assetsSource === 'direct' ? (kit.direct_assets ?? kit.assets ?? []) : (kit.assets ?? []);

                const kitTracking = getDisplayedTrackingRecord(packingList?.tracking || [], kit.id);
                const isKitChecked = packingList ? isKitFullyScanned(packingList.tracking || [], packingList, kit, selectedMode.resultingStatus) : false;
                const isExpanded = expandedKits.has(kit.id);
                // Only a container is expected to have a physical tag — a
                // non-container kit is organizational, so a missing tag
                // there isn't an anomaly worth flagging.
                const hasNoTag = kit.is_container && !kit.tag_number;
                const isLogicalKit = kit.is_container === false;
                // Scannable units under this kit, respecting nested
                // container boundaries — not the raw flattened asset list,
                // which would count a nested container's contents as this
                // kit's own even though scanning it doesn't touch them.
                const kitProgress = isLogicalKit && packingList
                  ? inventoryTrackingService.getKitProgress(packingList, kit.id, selectedMode.resultingStatus)
                  : { done: 0, total: 0 };
                // A nested kit that isn't a container has no rows of its own: its lines are
                // tracked under the top kit, as a kit scan writes them.
                const trackKitId = kit.is_container ? kit.id : rootId;
                // This kit's own "any" lines, under the kit their pieces are tracked in (#185).
                const anySlots: AnySlot[] = (kit.any_lines || []).map((line: any) => ({
                  kit_id: trackKitId,
                  item_id: line.item_id,
                  item_name: line.item_name,
                  quantity: Math.max(1, Number(line.quantity ?? 1) || 1) * (kit.is_container ? 1 : multiplier),
                }));

                return (
                  <div
                    key={kit.id}
                    className={cn('space-y-1', depth > 0 && 'border-l-2 border-border/60 pl-2')}
                    style={depth > 0 ? { marginLeft: depth * 16 } : undefined}
                  >
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
                            {isLogicalKit && kitProgress.total > 0 ? (
                              <p className="mt-1 text-[10px] text-muted-foreground">{kitProgress.done} / {kitProgress.total} pieces {selectedMode.resultingStatus}</p>
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
                        {expandedAssets.map((assetAssignment: any) => {
                          const asset = assetAssignment.asset || {};
                          const assetId = assetAssignment.asset_id || asset.id || assetAssignment.id;
                          const assetName = asset.manufacturer_model || asset.name || asset.description || asset.category || assetAssignment.notes || 'Unnamed Asset';
                          const assetTag = asset.tag_number;
                          const assetTracking = getDisplayedTrackingRecord(packingList?.tracking || [], trackKitId, assetId);
                          const latestExactAssetTracking = getLatestTrackingRecordForItem(packingList?.tracking || [], trackKitId, assetId);
                          const assetNoTag = !assetTag;
                          // A line of more than one is a lot: counted, not ticked (#185). It's
                          // checked when all of it is there; 7 of 10 shows as 7 / 10.
                          const line = Math.max(1, Number(assetAssignment.quantity ?? 1) || 1) * (kit.is_container ? 1 : multiplier);
                          const isLotLine = line > 1;
                          const piecesHere = assetTracking?.status === selectedMode.resultingStatus
                            ? Number((assetTracking as any).quantity ?? line) || line
                            : 0;
                          const isAssetChecked = piecesHere >= line;

                          return (
                            <div key={assetId} className={cn('flex items-stretch rounded-lg border text-sm transition-all', isAssetChecked ? 'bg-emerald-50/50 border-emerald-100' : 'bg-muted/20 border-border/50')}>
                              <button
                                aria-label={`${isAssetChecked ? 'Uncheck' : 'Check'} ${assetName}`}
                                className="w-10 flex items-center justify-center shrink-0 active:scale-90 transition-transform"
                                onClick={() => (isLotLine && !isAssetChecked
                                  ? openCounter(trackKitId, assetId, assetName, line)
                                  : handleManualToggle(trackKitId, assetId))}
                              >
                                <div className={cn(isAssetChecked ? 'text-emerald-500' : 'text-muted-foreground')}>
                                  {isAssetChecked ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                </div>
                              </button>
                              <div className="flex-1 min-w-0 py-2.5 pr-2.5">
                                <p className="font-medium leading-tight truncate">{assetName}</p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-[10px] text-muted-foreground">
                                    {isLotLine && piecesHere > 0 && piecesHere < line ? `${piecesHere} / ${line}` : `Qty: ${line}`}
                                  </span>
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
                                  kitId: trackKitId,
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
                        {anySlots.map((slot) => {
                          const filled = packingList ? inventoryTrackingService.getAnySlotFilled(packingList, slot, selectedMode.resultingStatus) : 0;
                          const isFull = filled >= slot.quantity;
                          return (
                            <div key={`any-${slot.item_id}`} className={cn('flex items-stretch rounded-lg border text-sm transition-all', isFull ? 'bg-emerald-50/50 border-emerald-100' : 'bg-muted/20 border-border/50')}>
                              <button
                                aria-label={`${isFull ? 'Uncheck' : 'Check'} ${slot.item_name}`}
                                className="w-10 flex items-center justify-center shrink-0 active:scale-90 transition-transform"
                                onClick={() => void handleAnyToggle(slot)}
                              >
                                <div className={cn(isFull ? 'text-emerald-500' : 'text-muted-foreground')}>
                                  {isFull ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                </div>
                              </button>
                              <div className="flex-1 min-w-0 py-2.5 pr-2.5">
                                <p className="font-medium leading-tight truncate">{slot.item_name}</p>
                                <span className="text-[10px] text-muted-foreground">Any · {Math.min(filled, slot.quantity)} / {slot.quantity}</span>
                              </div>
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

      <Dialog open={counter !== null} onOpenChange={(open) => (!open ? setCounter(null) : undefined)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{counter?.name}</DialogTitle>
          </DialogHeader>
          {counter ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" className="h-12 w-12" aria-label="One fewer"
                  onClick={() => setCounter((c) => (c ? { ...c, count: Math.max(0, c.count - 1) } : c))}>
                  <Minus className="w-5 h-5" />
                </Button>
                <input
                  type="number"
                  inputMode="numeric"
                  aria-label="How many"
                  className="w-20 h-12 text-center text-xl font-semibold rounded-md border border-border bg-background"
                  value={counter.count}
                  min={0}
                  onChange={(event) => {
                    const n = Math.max(0, Math.floor(Number(event.target.value) || 0));
                    setCounter((c) => (c ? { ...c, count: n } : c));
                  }}
                />
                <Button variant="outline" className="h-12 w-12" aria-label="One more"
                  onClick={() => setCounter((c) => (c ? { ...c, count: c.count + 1 } : c))}>
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {selectedMode.resultingStatus === RETURNED_STATUS ? `${counter.start} went out` : `Line calls for ${counter.line}`}
              </p>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="h-11" onClick={() => setCounter(null)}>Cancel</Button>
            <Button className="h-11" onClick={() => void confirmCounter()}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shortReturn !== null} onOpenChange={(open) => (!open ? setShortReturn(null) : undefined)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{shortReturn?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm font-medium">{shortReturn?.stillOut} not back</p>
          <p className="text-sm text-muted-foreground">
            Leave them at the gig to pick up later, or mark them missing to take them out of inventory.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            {canManage(userRole) && navigator.onLine ? (
              <Button variant="outline" className="h-11" onClick={() => void markMissing()}>Mark missing</Button>
            ) : null}
            <Button className="h-11" onClick={() => void leaveAtGig()}>Leave at the gig</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={finishing !== null} onOpenChange={(open) => (!open ? setFinishing(null) : undefined)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finish unload</DialogTitle>
          </DialogHeader>
          {finishing && finishing.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{finishing.length} still out</p>
              <p className="text-sm text-muted-foreground">
                What isn't marked missing stays at the gig until it comes back.
              </p>
              <div className="max-h-72 overflow-y-auto space-y-1.5">
                {finishing.map((item, index) => (
                  <div key={`${item.kit_id}|${item.asset_id ?? ''}`} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2">
                    <span className="text-sm truncate">{item.name} · {item.quantity}</span>
                    {item.asset_id && canManage(userRole) && navigator.onLine ? (
                      <label className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                        <Checkbox
                          aria-label={`${item.name} missing`}
                          checked={item.missing}
                          onCheckedChange={(checked) => setFinishing((current) => current?.map((c, i) => (i === index ? { ...c, missing: checked === true } : c)) ?? null)}
                        />
                        Missing
                      </label>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Everything is back.</p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="h-11" onClick={() => setFinishing(null)}>Cancel</Button>
            <Button className="h-11" onClick={() => void finishUnload()}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="h-11" onClick={closeNoteDialog}>Cancel</Button>
            <Button variant="outline" className="h-11" onClick={() => setNoteDialog((current) => ({ ...current, note: '' }))}>Clear note</Button>
            <Button className="h-11" onClick={() => void handleSaveNote()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
