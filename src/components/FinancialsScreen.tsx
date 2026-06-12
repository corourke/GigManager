import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Banknote, 
  Receipt, 
  TrendingUp, 
  Search, 
  Filter, 
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  ArrowLeft,
  X,
  RefreshCw,
  Upload,
  Loader2
} from 'lucide-react';
import { Card } from './ui/card';
import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from './ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
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
} from './ui/alert-dialog';
import AppHeader from './AppHeader';
import GigAccountingTab from './financials/GigAccountingTab';
import { Organization, User, UserRole, DbPurchase } from '../utils/supabase/types';
import { getPurchases, reclassifyExpenseAsAsset } from '../services/purchase.service';
import { getEntityAttachments, getAttachmentUrl, uploadAttachment, linkAttachmentToEntity } from '../services/attachment.service';
import { toast } from 'sonner';

interface FinancialsScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  onSwitchOrganization: () => void;
  onLogout: () => void;
  onNavigateToGigs: () => void;
  onNavigateToAssets: () => void;
  highlightPurchaseId?: string | null;
  returnGigId?: string | null;
  onNavigateToGigDetail?: (gigId: string) => void;
}

type FinancialTab = 'purchases' | 'gig-accounting' | 'reporting';

export default function FinancialsScreen({
  organization,
  user,
  userRole,
  onSwitchOrganization,
  onLogout,
  onNavigateToGigs,
  onNavigateToAssets,
  highlightPurchaseId: initialHighlightId,
  returnGigId,
  onNavigateToGigDetail
}: FinancialsScreenProps) {
  const [activeTab, setActiveTab] = useState<FinancialTab>('purchases');
  const [purchases, setPurchases] = useState<DbPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [reclassifyingItemId, setReclassifyingItemId] = useState<string | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState<string | null>(null);
  const [highlightPurchaseId, setHighlightPurchaseId] = useState<string | null>(initialHighlightId || null);
  const [showOnlyHighlighted, setShowOnlyHighlighted] = useState(!!initialHighlightId);
  
  // Update state when initialHighlightId changes
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

  const [headerAttachments, setHeaderAttachments] = useState<Map<string, { filePath: string; fileName: string }>>(new Map());

  async function loadPurchases() {
    setIsLoading(true);
    try {
      const data = await getPurchases(organization.id);
      setPurchases(data);

      const headers = data.filter(p => p.row_type === 'header');
      const attMap = new Map<string, { filePath: string; fileName: string }>();
      await Promise.all(headers.map(async (h) => {
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

  const handleViewDoc = async (headerId: string) => {
    const att = headerAttachments.get(headerId);
    if (!att) return;
    try {
      const url = await getAttachmentUrl(att.filePath);
      if (url) window.open(url, '_blank');
    } catch (err) {
      toast.error('Failed to get document URL');
    }
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
      
      // Update local state to show the new attachment
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
      // Reset input so same file can be selected again if needed
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

  // Filter and group purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      // If filtering by a specific receipt link
      if (showOnlyHighlighted && highlightPurchaseId) {
        // If it's a header, match ID
        if (p.row_type === 'header') return p.id === highlightPurchaseId;
        // If it's an item/asset, match ID or its parent_id
        return p.id === highlightPurchaseId || p.parent_id === highlightPurchaseId;
      }

      // Vendor filter
      if (vendorFilter && !p.vendor?.toLowerCase().includes(vendorFilter.toLowerCase())) {
        return false;
      }
      
      // Date range filter
      if (startDate && p.purchase_date && p.purchase_date < startDate) return false;
      if (endDate && p.purchase_date && p.purchase_date > endDate) return false;
      
      return true;
    });
  }, [purchases, vendorFilter, startDate, endDate]);

  // Grouped structure: Header -> its Items/Assets
  // Also standalone items/assets that might not have a header in this view
  const groupedPurchases = useMemo(() => {
    const headers = filteredPurchases.filter(p => p.row_type === 'header');
    const items = filteredPurchases.filter(p => p.row_type === 'item' || p.row_type === 'asset');
    
    const groups = headers.map(header => {
      const children = items.filter(item => item.parent_id === header.id);
      
      // Check if this group matches the type filter
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

    // Find orphaned items that match filters
    const orphanedItems = items.filter(item => 
      !headers.some(h => h.id === item.parent_id) &&
      (typeFilter === 'all' || (typeFilter === 'asset' ? (!!item.asset_id || item.row_type === 'asset') : (!item.asset_id && item.row_type !== 'asset')))
    );

    if (orphanedItems.length > 0) {
      // Group orphans by date/vendor as "pseudo-headers" or just list them
      // For now, let's group them by date/vendor
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
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        organization={organization}
        user={user}
        userRole={userRole}
        currentRoute="financials"
        onSwitchOrganization={onSwitchOrganization}
        onLogout={onLogout}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          icon={Banknote}
          iconClassName="w-8 h-8 text-green-600"
          title="Financials"
          description="Manage purchases, gig accounting, and financial reporting."
        />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FinancialTab)} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-white border border-gray-200 p-1">
              <TabsTrigger value="purchases" className="flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Purchases
              </TabsTrigger>
              <TabsTrigger value="gig-accounting" className="flex items-center gap-2">
                <Banknote className="w-4 h-4" />
                Gig Accounting
              </TabsTrigger>
              <TabsTrigger value="reporting" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Reporting
              </TabsTrigger>
            </TabsList>

            {returnGigId && onNavigateToGigDetail && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={() => onNavigateToGigDetail(returnGigId)}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Gig
              </Button>
            )}
          </div>

          <TabsContent value="purchases" className="space-y-6">
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
              /* Filters & Totals */
              <Card className="p-4">
                <div className="flex flex-wrap items-end gap-4">
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
                  <p className="text-sm">Try adjusting your filters or importing some data.</p>
                </Card>
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
                          {headerAttachments.has(group.header.id) ? (
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
                          )}
                          <div className="text-right">
                            <span className="text-xs text-gray-500 mr-2">Invoice Total:</span>
                            <span className="text-sm font-bold">${group.header.total_inv_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
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
          </TabsContent>

          <TabsContent value="gig-accounting">
            <GigAccountingTab
              organization={organization}
              userRole={userRole}
              onNavigateToGigDetail={onNavigateToGigDetail}
            />
          </TabsContent>

          <TabsContent value="reporting">
            <Card className="p-12 text-center text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-medium">Reporting Dashboard Coming Soon</p>
              <p className="text-sm">Visual reports on your organization's spending and assets.</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
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
