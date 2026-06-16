import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  FileText,
  X,
  RefreshCw,
  Upload,
  Loader2,
  Music,
  Package,
  Plus,
  Pencil,
  Trash2,
  LayoutList,
  TableProperties,
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Alert } from '../../ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../ui/alert-dialog';
import { Organization, User, UserRole, DbPurchase } from '../../../utils/supabase/types';
import { getPurchases, reclassifyExpenseAsAsset, scanInvoice, deletePurchase, updatePurchase, shouldPromptForLedgerEntry } from '../../../services/purchase.service';
import { getEntityAttachments, uploadAttachment, linkAttachmentToEntity } from '../../../services/attachment.service';
import { getGigsForOrganization, createGigFinancial } from '../../../services/gig.service';
import { toFinCategory } from '../../../utils/supabase/constants';
import { toast } from 'sonner';
import { isSyntheticHeader } from './reconciliation';
import PurchaseDetailPanel, { PanelState } from './PurchaseDetailPanel';
import ReviewScannedDataDialog from '../../ReviewScannedDataDialog';
import PurchaseSummaryView from './PurchaseSummaryView';
import GigCombobox from './GigCombobox';

interface PurchasesTabProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  highlightPurchaseId?: string | null;
  returnGigId?: string | null;
  onNavigateToGigDetail?: (gigId: string) => void;
  onNavigateToAssetDetail?: (assetId: string) => void;
  onEditAsset?: (assetId: string) => void;
}

export default function PurchasesTab({
  organization,
  user,
  userRole,
  highlightPurchaseId: initialHighlightId,
  returnGigId,
  onNavigateToGigDetail,
  onNavigateToAssetDetail,
  onEditAsset,
}: PurchasesTabProps) {
  const [purchases, setPurchases] = useState<DbPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [reclassifyingItemId, setReclassifyingItemId] = useState<string | null>(null);
  const [assigningGigItemId, setAssigningGigItemId] = useState<string | null>(null);
  const [ledgerPrompt, setLedgerPrompt] = useState<{ item: DbPurchase; gigId: string; gigTitle?: string } | null>(null);
  const [creatingLedger, setCreatingLedger] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState<string | null>(null);
  const [highlightPurchaseId, setHighlightPurchaseId] = useState<string | null>(initialHighlightId || null);
  const [showOnlyHighlighted, setShowOnlyHighlighted] = useState(!!initialHighlightId);

  useEffect(() => {
    if (initialHighlightId) {
      setHighlightPurchaseId(initialHighlightId);
      setShowOnlyHighlighted(true);
    }
  }, [initialHighlightId]);

  // Filters
  const [vendorFilter, setVendorFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'asset' | 'expense'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadHeaderId, setActiveUploadHeaderId] = useState<string | null>(null);
  const [panelState, setPanelState] = useState<PanelState>({ mode: 'closed' });
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [editPurchaseId, setEditPurchaseId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'header' | 'item'; purchase: DbPurchase; childCount?: number } | null>(null);
  const [viewMode, setViewMode] = useState<'detailed' | 'summary'>('detailed');
  const [gigNames, setGigNames] = useState<Map<string, string>>(new Map());

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  useEffect(() => {
    loadPurchases();
  }, [organization.id]);

  useEffect(() => {
    getGigsForOrganization(organization.id)
      .then((gigs: any[]) => {
        const map = new Map<string, string>();
        gigs.forEach(g => map.set(g.id, g.title));
        setGigNames(map);
      })
      .catch(() => {});
  }, [organization.id]);

  const [headerAttachments, setHeaderAttachments] = useState<Map<string, { filePath: string; fileName: string }>>(new Map());

  async function loadPurchases() {
    setIsLoading(true);
    try {
      const data = await getPurchases(organization.id);
      setPurchases(data);

      const headers = data.filter((p: DbPurchase) => p.row_type === 'header');
      const attMap = new Map<string, { filePath: string; fileName: string }>();
      await Promise.all(headers.map(async (h: DbPurchase) => {
        try {
          const atts = await getEntityAttachments('purchase', h.id);
          if (atts && atts.length > 0) {
            attMap.set(h.id, { filePath: atts[0].file_path, fileName: atts[0].file_name });
          }
        } catch (_) { /* ignore */ }
      }));
      setHeaderAttachments(attMap);
    } catch (error) {
      console.error('Error loading purchases:', error);
      toast.error('Failed to load purchases');
    } finally {
      setIsLoading(false);
    }
  }

  const handleViewDoc = (headerId: string) => {
    setPanelState({ mode: 'document', headerId });
  };

  const triggerFileUpload = (headerId: string) => {
    setActiveUploadHeaderId(headerId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const headerId = activeUploadHeaderId;

    if (!file || !headerId) return;

    setIsUploadingAttachment(headerId);
    try {
      const attachment = await uploadAttachment(organization.id, file);
      await linkAttachmentToEntity(attachment.id, 'purchase', headerId);

      toast.success('File attached successfully');

      setHeaderAttachments(prev => {
        const next = new Map(prev);
        next.set(headerId, { filePath: attachment.file_path, fileName: attachment.file_name });
        return next;
      });
    } catch (err: any) {
      console.error('Error attaching file:', err);
      toast.error(err.message || 'Failed to attach file');
    } finally {
      setIsUploadingAttachment(null);
      setActiveUploadHeaderId(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleReclassifyAsAsset = async (itemId: string) => {
    setReclassifyingItemId(itemId);
    try {
      await reclassifyExpenseAsAsset(itemId);
      toast.success('Item reclassified as asset');
      await loadPurchases();
      setExpandedItemId(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reclassify item');
    } finally {
      setReclassifyingItemId(null);
    }
  };

  const handleAssignGig = async (item: DbPurchase, gigId: string | null, gigTitle?: string) => {
    const previousGigId = item.gig_id || null;
    if (gigId === previousGigId) return;
    setAssigningGigItemId(item.id);
    try {
      await updatePurchase(item.id, { gig_id: gigId });
      toast.success(gigId ? `Assigned to ${gigTitle || 'gig'}` : 'Gig association removed');
      await loadPurchases();
      // Offer to create a gig expense ledger entry when an expense line is first
      // linked to a gig (mirrors the import flow's behavior).
      if (gigId && shouldPromptForLedgerEntry(item.row_type, previousGigId, gigId)) {
        setLedgerPrompt({ item, gigId, gigTitle });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign gig');
    } finally {
      setAssigningGigItemId(null);
    }
  };

  const handleCreateLedgerEntry = async () => {
    if (!ledgerPrompt) return;
    const { item, gigId } = ledgerPrompt;
    setCreatingLedger(true);
    try {
      const amount = item.line_amount ?? (item.item_price ?? 0) * (item.quantity ?? 1);
      await createGigFinancial({
        gig_id: gigId,
        organization_id: organization.id,
        date: item.purchase_date || new Date().toISOString().slice(0, 10),
        amount,
        type: 'Expense Incurred',
        category: toFinCategory(item.category) ?? 'Other expenses',
        description: item.description || `Expense: ${item.vendor || ''}`.trim(),
        purchase_id: item.id,
        paid_at: new Date().toISOString(),
      });
      window.dispatchEvent(new CustomEvent('gig-financials-updated', { detail: { gigId } }));
      toast.success('Gig expense ledger entry created');
      setLedgerPrompt(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create ledger entry');
    } finally {
      setCreatingLedger(false);
    }
  };

  // Filter and group purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      if (showOnlyHighlighted && highlightPurchaseId) {
        if (p.row_type === 'header') return p.id === highlightPurchaseId;
        return p.id === highlightPurchaseId || p.parent_id === highlightPurchaseId;
      }

      if (vendorFilter && !p.vendor?.toLowerCase().includes(vendorFilter.toLowerCase())) {
        return false;
      }

      if (startDate && p.purchase_date && p.purchase_date < startDate) return false;
      if (endDate && p.purchase_date && p.purchase_date > endDate) return false;

      return true;
    });
  }, [purchases, vendorFilter, startDate, endDate, showOnlyHighlighted, highlightPurchaseId]);

  const groupedPurchases = useMemo(() => {
    const headers = filteredPurchases.filter(p => p.row_type === 'header');
    const items = filteredPurchases.filter(p => p.row_type === 'item' || p.row_type === 'asset');

    const groups = headers.map(header => {
      const children = items.filter(item => item.parent_id === header.id);

      const hasAssets = children.some(c => c.asset_id || c.row_type === 'asset');
      const hasExpenses = children.some(c => !c.asset_id && c.row_type !== 'asset');

      let matchesType = true;
      if (typeFilter === 'asset') matchesType = hasAssets;
      if (typeFilter === 'expense') matchesType = hasExpenses;

      if (!matchesType) return null;

      return {
        header,
        children: children.filter(c => {
          if (typeFilter === 'asset') return !!c.asset_id || c.row_type === 'asset';
          if (typeFilter === 'expense') return !c.asset_id && c.row_type !== 'asset';
          return true;
        })
      };
    }).filter(Boolean) as Array<{ header: DbPurchase, children: DbPurchase[] }>;

    const orphanedItems = items.filter(item =>
      !headers.some(h => h.id === item.parent_id) &&
      (typeFilter === 'all' || (typeFilter === 'asset' ? (!!item.asset_id || item.row_type === 'asset') : (!item.asset_id && item.row_type !== 'asset')))
    );

    if (orphanedItems.length > 0) {
      const orphanGroups = new Map<string, DbPurchase[]>();
      orphanedItems.forEach(item => {
        const key = `${item.purchase_date}|${item.vendor}`;
        if (!orphanGroups.has(key)) orphanGroups.set(key, []);
        orphanGroups.get(key)!.push(item);
      });

      orphanGroups.forEach((children, key) => {
        const [date, vendor] = key.split('|');
        groups.push({
          header: {
            id: `orphan-${key}`,
            purchase_date: date,
            vendor,
            row_type: 'header',
            total_inv_amount: children.reduce((sum, c) => sum + (c.line_cost || 0), 0)
          } as DbPurchase,
          children
        });
      });
    }

    return groups.sort((a, b) => (b.header.purchase_date || '').localeCompare(a.header.purchase_date || ''));
  }, [filteredPurchases, typeFilter]);

  const totals = useMemo(() => {
    let totalCost = 0;
    let assetCount = 0;
    let expenseCount = 0;

    groupedPurchases.forEach(group => {
      group.children.forEach(child => {
        totalCost += (child.line_cost || 0);
        if (child.asset_id || child.row_type === 'asset') assetCount++;
        else expenseCount++;
      });
    });

    return { totalCost, assetCount, expenseCount };
  }, [groupedPurchases]);

  const highlightedGroupId = useMemo(() => {
    if (!highlightPurchaseId) return null;
    const asHeader = groupedPurchases.find(g => g.header.id === highlightPurchaseId);
    if (asHeader) return asHeader.header.id;
    const asChild = groupedPurchases.find(g => g.children.some(c => c.id === highlightPurchaseId));
    if (asChild) return asChild.header.id;
    return null;
  }, [highlightPurchaseId, groupedPurchases]);

  const getSiblingItemIds = useCallback((headerId: string) => {
    const group = groupedPurchases.find(g => g.header.id === headerId);
    if (!group) return [];
    // Only line items that have something to show in the panel (a linked asset
    // or gig) participate in Prev/Next stepping. Pure expense lines have no
    // panel view, so they're skipped rather than stalling the stepper.
    return group.children.filter(c => c.asset_id || c.gig_id).map(c => c.id);
  }, [groupedPurchases]);

  const getAssetIdForItem = useCallback((itemId: string) => {
    const item = purchases.find(p => p.id === itemId);
    return item?.asset_id || null;
  }, [purchases]);

  const getGigIdForItem = useCallback((itemId: string) => {
    const item = purchases.find(p => p.id === itemId);
    return item?.gig_id || null;
  }, [purchases]);

  const handleOpenAssetPanel = (item: DbPurchase) => {
    if (!item.asset_id) return;
    const parentId = item.parent_id || '';
    setPanelState({
      mode: 'asset',
      assetId: item.asset_id,
      itemId: item.id,
      siblingItemIds: getSiblingItemIds(parentId),
    });
  };

  const handleOpenGigPanel = (gigId: string, item?: DbPurchase) => {
    if (item) {
      const parentId = item.parent_id || '';
      setPanelState({
        mode: 'gig',
        gigId,
        itemId: item.id,
        siblingItemIds: getSiblingItemIds(parentId),
      });
    } else {
      setPanelState({ mode: 'gig', gigId });
    }
  };

  const isAdmin = userRole === 'Admin' || userRole === 'Manager';

  const handleAddNew = () => {
    setEditPurchaseId(null);
    setScannedData(null);
    setScanFile(null);
    setReviewDialogOpen(true);
  };

  const handleUploadInvoice = () => {
    scanInputRef.current?.click();
  };

  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;

    setIsScanning(true);
    try {
      const data = await scanInvoice(file, organization.id);
      setEditPurchaseId(null);
      setScanFile(file);
      setScannedData(data);
      setReviewDialogOpen(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to scan invoice');
    } finally {
      setIsScanning(false);
    }
  };

  const handlePurchaseCreated = async (_purchaseId: string) => {
    await loadPurchases();
  };

  const handleEditHeader = (group: { header: DbPurchase; children: DbPurchase[] }) => {
    // Reuse the same dialog as invoice import/create, in edit mode.
    setScannedData(null);
    setScanFile(null);
    setEditPurchaseId(group.header.id);
    setReviewDialogOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return;
    try {
      await deletePurchase(deleteConfirm.purchase.id);
      toast.success(deleteConfirm.type === 'header' ? 'Purchase deleted' : 'Line item deleted');
      await loadPurchases();
      setExpandedItemId(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightedGroupId) {
      setCollapsedGroups(prev => {
        const next = new Set(prev);
        next.delete(highlightedGroupId);
        return next;
      });
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [highlightedGroupId]);

  return (
    <div className="space-y-6">
      {showOnlyHighlighted && highlightPurchaseId ? (
        <Alert className="bg-sky-50 border-sky-200 py-6 px-6 flex items-center justify-between gap-6 shadow-sm border-l-4 border-l-sky-500">
          <div className="flex items-center gap-4 text-sky-900">
            <div className="bg-sky-100 p-3 rounded-xl text-sky-600 shadow-inner">
              <Filter className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold leading-none tracking-tight">Viewing Linked Receipt</h3>
              <p className="text-sm text-sky-700/90 font-medium">
                Showing specific record linked from <span className="font-bold underline decoration-sky-300 underline-offset-2">Gig Financials</span>.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-sky-300 text-sky-600 hover:bg-sky-100 hover:text-sky-700 bg-white shadow-sm px-6 h-11 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => {
              setShowOnlyHighlighted(false);
              setHighlightPurchaseId(null);
            }}
          >
            <X className="w-4 h-4 mr-2" />
            Clear Filter & Show All
          </Button>
        </Alert>
      ) : (
        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            {isAdmin && (
              <div className="flex gap-2">
                <Button size="sm" className="h-9" onClick={handleAddNew}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add New
                </Button>
                <Button size="sm" variant="outline" className="h-9" onClick={handleUploadInvoice} disabled={isScanning}>
                  {isScanning ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
                  {isScanning ? 'Scanning...' : 'Upload Invoice'}
                </Button>
              </div>
            )}
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="vendor-filter" className="text-xs">Vendor</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="vendor-filter"
                  placeholder="Search vendor..."
                  className="pl-9 h-9 text-sm"
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                />
              </div>
            </div>

            <div className="w-40">
              <Label className="text-xs">Type</Label>
              <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="asset">Assets</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-36">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                className="h-9 text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="w-36">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                className="h-9 text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-end gap-1 border rounded-md p-0.5">
              <Button
                variant={viewMode === 'detailed' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode('detailed')}
                title="Detailed view"
              >
                <LayoutList className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'summary' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode('summary')}
                title="Summary view"
              >
                <TableProperties className="w-4 h-4" />
              </Button>
            </div>

            <div className="ml-auto flex gap-4 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-center">
                <p className="text-[10px] uppercase text-gray-500 font-semibold">Total Cost</p>
                <p className="text-lg font-bold text-gray-900">${totals.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="text-center">
                <p className="text-[10px] uppercase text-gray-500 font-semibold">Assets</p>
                <p className="text-lg font-bold text-blue-600">{totals.assetCount}</p>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="text-center">
                <p className="text-[10px] uppercase text-gray-500 font-semibold">Expenses</p>
                <p className="text-lg font-bold text-orange-600">{totals.expenseCount}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Purchases Table/List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading purchases...</p>
          </div>
        ) : groupedPurchases.length === 0 ? (
          <Card className="p-12 text-center text-gray-500">
            <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-medium">No purchases found</p>
            <p className="text-sm mb-4">Try adjusting your filters or importing some data.</p>
            {isAdmin && (
              <div className="flex justify-center gap-3">
                <Button size="sm" onClick={handleAddNew}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add New
                </Button>
                <Button size="sm" variant="outline" onClick={handleUploadInvoice} disabled={isScanning}>
                  {isScanning ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
                  {isScanning ? 'Scanning...' : 'Upload Invoice'}
                </Button>
              </div>
            )}
          </Card>
        ) : viewMode === 'summary' ? (
          <PurchaseSummaryView
            groups={groupedPurchases}
            headerAttachments={headerAttachments}
            gigNames={gigNames}
            onSelectGroup={(headerId) => {
              setViewMode('detailed');
              setCollapsedGroups(prev => {
                const next = new Set(prev);
                next.delete(headerId);
                return next;
              });
            }}
            onViewDoc={handleViewDoc}
          />
        ) : (
          <div className="space-y-4">
            {groupedPurchases.map((group) => (
              <div key={group.header.id} ref={highlightedGroupId === group.header.id ? highlightRef : undefined}>
              <Card
                className={`overflow-hidden border-gray-200${highlightedGroupId === group.header.id ? ' ring-2 ring-sky-400 ring-offset-2' : ''}`}
              >
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-900">{group.header.purchase_date}</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300" />
                    <span className="text-sm font-bold text-sky-700">{group.header.vendor}</span>
                    {group.header.description && (
                      <>
                        <div className="w-px h-4 bg-gray-300" />
                        <span className="text-sm text-gray-600 truncate max-w-[300px]" title={group.header.description}>
                          {group.header.description}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {group.header.gig_id && !isSyntheticHeader(group.header.id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-purple-600 hover:bg-purple-50"
                        onClick={(e) => { e.stopPropagation(); handleOpenGigPanel(group.header.gig_id!); }}
                        title="View linked gig"
                      >
                        <Music className="w-3.5 h-3.5 mr-1" />
                        <span className="text-[10px]">Gig Details</span>
                      </Button>
                    )}
                    {!isSyntheticHeader(group.header.id) && (
                      headerAttachments.has(group.header.id) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-sky-600 hover:bg-sky-50"
                          onClick={() => handleViewDoc(group.header.id)}
                          title={`View ${headerAttachments.get(group.header.id)?.fileName || 'document'}`}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          <span className="text-[10px]">View Doc</span>
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-gray-500 hover:text-sky-600 hover:bg-sky-50"
                          onClick={() => triggerFileUpload(group.header.id)}
                          disabled={isUploadingAttachment === group.header.id}
                          title="Attach a receipt or invoice PDF"
                        >
                          {isUploadingAttachment === group.header.id ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 mr-1" />
                          )}
                          <span className="text-[10px]">{isUploadingAttachment === group.header.id ? 'Attaching...' : 'Attach Doc'}</span>
                        </Button>
                      )
                    )}
                    <div className="text-right">
                      <span className="text-xs text-gray-500 mr-2">Invoice Total:</span>
                      <span className="text-sm font-bold">${group.header.total_inv_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {isAdmin && !isSyntheticHeader(group.header.id) && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-gray-400 hover:text-sky-600"
                          onClick={(e) => { e.stopPropagation(); handleEditHeader(group); }}
                          title="Edit purchase"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'header', purchase: group.header, childCount: group.children.length }); }}
                          title="Delete purchase"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleGroup(group.header.id)}>
                      {collapsedGroups.has(group.header.id) ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {!collapsedGroups.has(group.header.id) && (
                <Table>
                  <TableHeader className="bg-white">
                    <TableRow className="h-8 hover:bg-transparent">
                      <TableHead className="text-[10px] uppercase font-bold py-1 px-4">Type</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold py-1">Description / Model</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold py-1">Category</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold py-1 text-center">Qty</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold py-1 text-right">Price</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold py-1 text-right">Cost</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold py-1 w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.children.map((item) => (
                      <React.Fragment key={item.id}>
                      <TableRow
                        className="h-9 hover:bg-sky-50 transition-colors cursor-pointer"
                        onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                      >
                        <TableCell className="py-1 px-4">
                          {(item.asset_id || item.row_type === 'asset') ? (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none text-[10px] h-5 px-1.5 uppercase font-bold">Asset</Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none text-[10px] h-5 px-1.5 uppercase font-bold">Expense</Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-1 font-medium text-sm text-gray-800">
                          {item.description || '-'}
                        </TableCell>
                        <TableCell className="py-1 text-sm text-gray-600">
                          {item.category || '-'}
                        </TableCell>
                        <TableCell className="py-1 text-sm text-center font-mono">
                          {item.quantity || '1'}
                        </TableCell>
                        <TableCell className="py-1 text-sm text-right font-mono text-gray-500">
                          {item.item_price ? `$${item.item_price.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="py-1 text-sm text-right font-bold font-mono">
                          {item.line_cost ? `$${item.line_cost.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="py-1 text-center">
                          {expandedItemId === item.id ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 inline" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 inline" />}
                        </TableCell>
                      </TableRow>
                      {expandedItemId === item.id && (
                        <TableRow className="bg-gray-50">
                          <TableCell colSpan={7} className="py-2 px-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-xs">
                              <div><span className="text-gray-500 font-medium">Item Price:</span> {item.item_price != null ? `$${item.item_price.toFixed(2)}` : '-'}</div>
                              <div><span className="text-gray-500 font-medium">Item Cost:</span> {item.item_cost != null ? `$${item.item_cost.toFixed(2)}` : '-'}</div>
                              <div><span className="text-gray-500 font-medium">Line Amt:</span> {item.line_amount != null ? `$${item.line_amount.toFixed(2)}` : '-'}</div>
                              <div><span className="text-gray-500 font-medium">Line Cost:</span> {item.line_cost != null ? `$${item.line_cost.toFixed(2)}` : '-'}</div>
                              <div><span className="text-gray-500 font-medium">Category:</span> {item.category || '-'}</div>
                              <div><span className="text-gray-500 font-medium">Sub-cat:</span> {item.sub_category || '-'}</div>
                              <div><span className="text-gray-500 font-medium">Row Type:</span> {item.row_type}</div>
                              <div><span className="text-gray-500 font-medium">ID:</span> <span className="font-mono text-[10px]">{item.id}</span></div>
                              {item.asset_id && <div className="col-span-2"><span className="text-gray-500 font-medium">Asset ID:</span> <span className="font-mono text-[10px]">{item.asset_id}</span></div>}
                            </div>
                            <div className="mt-2 flex gap-2 flex-wrap">
                              {isAdmin && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-3 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'item', purchase: item }); }}
                                >
                                  <Trash2 className="w-3 h-3 mr-1.5" />
                                  Delete Item
                                </Button>
                              )}
                              {(item.asset_id || item.row_type === 'asset') && item.asset_id && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-3 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                                  onClick={(e) => { e.stopPropagation(); handleOpenAssetPanel(item); }}
                                >
                                  <Package className="w-3 h-3 mr-1.5" />
                                  Asset Details
                                </Button>
                              )}
                              {item.gig_id && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-3 text-xs text-purple-600 border-purple-200 hover:bg-purple-50"
                                  onClick={(e) => { e.stopPropagation(); handleOpenGigPanel(item.gig_id!, item); }}
                                >
                                  <Music className="w-3 h-3 mr-1.5" />
                                  Gig Details
                                </Button>
                              )}
                            </div>
                            {isAdmin && (
                              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Assign Gig:</span>
                                <div className="w-[360px] max-w-full">
                                  <GigCombobox
                                    organizationId={organization.id}
                                    value={item.gig_id || null}
                                    onChange={(gigId, gigTitle) => handleAssignGig(item, gigId, gigTitle)}
                                    disabled={assigningGigItemId === item.id}
                                  />
                                </div>
                              </div>
                            )}
                            {item.row_type === 'item' && (userRole === 'Admin' || userRole === 'Manager') && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-7 px-3 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                                      <RefreshCw className="w-3 h-3 mr-1.5" />
                                      Reclassify as Asset
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Reclassify as Asset?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will register the item as a capital asset in inventory. If this purchase is linked to a gig, the linked gig expense record will also be removed. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleReclassifyAsAsset(item.id)}
                                        disabled={reclassifyingItemId === item.id}
                                      >
                                        {reclassifyingItemId === item.id && <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                                        Reclassify as Asset
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
                )}
              </Card>
              </div>
            ))}
          </div>
        )}
      </div>
      <PurchaseDetailPanel
        panelState={panelState}
        onPanelChange={setPanelState}
        organizationId={organization.id}
        onViewAsset={onNavigateToAssetDetail}
        onEditAsset={onEditAsset}
        onNavigateToGigDetail={onNavigateToGigDetail}
        getAssetIdForItem={getAssetIdForItem}
        getGigIdForItem={getGigIdForItem}
      />
      <AlertDialog open={!!ledgerPrompt} onOpenChange={(open) => { if (!open) setLedgerPrompt(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create gig expense record?</AlertDialogTitle>
            <AlertDialogDescription>
              This expense line is now linked to {ledgerPrompt?.gigTitle ? `"${ledgerPrompt.gigTitle}"` : 'a gig'}. Would you
              like to record it as an "Expense Incurred" entry in that gig's financials
              {ledgerPrompt && (
                <> for ${((ledgerPrompt.item.line_amount ?? (ledgerPrompt.item.item_price ?? 0) * (ledgerPrompt.item.quantity ?? 1))).toFixed(2)}</>
              )}? You can skip this and the line will still be linked to the gig.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={creatingLedger}>Skip</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleCreateLedgerEntry(); }} disabled={creatingLedger}>
              {creatingLedger && <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Create record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirm?.type === 'header' ? 'Delete Purchase?' : 'Delete Line Item?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {deleteConfirm?.type === 'header' ? (
                <>
                  <p>This will delete the purchase header and all {deleteConfirm.childCount} line item(s).</p>
                  {deleteConfirm.purchase.gig_id && (
                    <p className="text-amber-600">This purchase is linked to a gig. Any associated gig financial records will not be automatically deleted — review them in the gig's financials.</p>
                  )}
                </>
              ) : (
                <>
                  <p>This will permanently remove this line item.</p>
                  {deleteConfirm?.purchase.asset_id && (
                    <p className="text-amber-600">This item is linked to an asset. Deleting it will unlink the asset (the asset will not be deleted).</p>
                  )}
                  {deleteConfirm?.purchase.gig_id && (
                    <p className="text-amber-600">This item may be linked to a gig financial record. That record will not be automatically deleted.</p>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirmed} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReviewScannedDataDialog
        open={reviewDialogOpen}
        onOpenChange={(o) => { setReviewDialogOpen(o); if (!o) setEditPurchaseId(null); }}
        organizationId={organization.id}
        scannedData={scannedData}
        file={scanFile}
        editPurchaseId={editPurchaseId || undefined}
        onSuccess={handlePurchaseCreated}
        onUpdated={handlePurchaseCreated}
      />
      <input
        type="file"
        ref={scanInputRef}
        onChange={handleScanFile}
        className="hidden"
        accept=".pdf,image/*"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAttachFile}
        className="hidden"
        accept=".pdf,image/*"
      />
    </div>
  );
}
