import {useState, useEffect, useMemo } from 'react';
import {Package, Plus, Search, Loader2, AlertCircle, Upload, FileText, X } from 'lucide-react';
import { toast } from 'sonner';
import { getAssets, deleteAsset, duplicateAsset, updateAsset } from '../services/asset.service';
import { getAssetTrackingSummary } from '../services/inventoryManagement.service';
import { scanInvoice } from '../services/purchase.service';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import AppHeader from './AppHeader';
import EquipmentTabs from './EquipmentTabs';
import { Organization, User, UserRole } from '../utils/supabase/types';
import type { DbAsset } from '../utils/supabase/types';
import { canManage } from '../utils/permissions';
import { ASSET_STATUS_CONFIG } from '../utils/supabase/constants';
import { SmartDataTable, ColumnDef, RowAction } from './tables/SmartDataTable';
import { PageHeader } from './ui/PageHeader';
import ReviewScannedDataDialog from './ReviewScannedDataDialog';
import { TrackingStatusBadge } from './inventory/TrackingStatusBadge';

interface AssetListScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  onBack: () => void;
  onCreateAsset: () => void;
  onViewAsset: (assetId: string) => void;
  onNavigateToDashboard: () => void;
  onNavigateToGigs: () => void;
  onNavigateToAssets: () => void;
  onNavigateToKits: () => void;
  onNavigateToInventory?: () => void;
  onNavigateToImport?: () => void;
  onSwitchOrganization: () => void;
  onLogout: () => void;
  onEditProfile?: () => void;
}

export default function AssetListScreen({
  organization,
  user,
  userRole,
  onBack,
  onCreateAsset,
  onViewAsset,
  onNavigateToDashboard,
  onNavigateToGigs,
  onNavigateToAssets,
  onNavigateToKits,
  onNavigateToInventory,
  onNavigateToImport,
  onSwitchOrganization,
  onLogout,
  onEditProfile,
}: AssetListScreenProps) {
  // Memoize filters to prevent infinite re-renders
  const _assetFilters = useMemo(() => ({ organization_id: organization.id }), [organization.id]);

  // Asset list data
  const [allAssets, setAllAssets] = useState<DbAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<DbAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletedAssetIds, setDeletedAssetIds] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [assetTrackingSummary, setAssetTrackingSummary] = useState<Map<string, { status: string; location?: string | null; gigTitle?: string | null }>>(new Map());
  const [trackingStatusFilter, setTrackingStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const refresh = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [assets, trackingSummary] = await Promise.all([
        getAssets(organization.id),
        getAssetTrackingSummary(organization.id),
      ]);
      setAllAssets(assets);
      setAssetTrackingSummary(trackingSummary);
    } catch (err: any) {
      setError(err.message || 'Failed to load assets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [organization.id]);

  const handleUpdateAsset = async (id: string, updates: Partial<DbAsset>) => {
    try {
      await updateAsset(id, updates);
      setAllAssets(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
      toast.success('Asset updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update asset');
      refresh();
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    // Optimistically remove the asset from the UI immediately
    setDeletedAssetIds(prev => new Set(prev).add(assetId));

    try {
      await deleteAsset(assetId);
      toast.success('Asset deleted successfully');
      // Refresh to ensure consistency with server state and clear the deleted set
      refresh();
      setDeletedAssetIds(prev => {
        const next = new Set(prev);
        next.delete(assetId);
        return next;
      });
    } catch (error: any) {
      console.error('Error deleting asset:', error);
      toast.error(error.message || 'Failed to delete asset');
      // Restore the asset in the UI if deletion failed
      setDeletedAssetIds(prev => {
        const next = new Set(prev);
        next.delete(assetId);
        return next;
      });
      // Refresh to ensure consistency
      refresh();
    }
  };

  const handleDuplicateAsset = async (assetId: string) => {
    try {
      await duplicateAsset(assetId);
      toast.success('Asset duplicated successfully');
      refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to duplicate asset');
    }
  };

  const handleUploadInvoice = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setScannedFile(file);
    setIsScanning(true);
    try {
      const data = await scanInvoice(file, organization.id);
      setScannedData(data);
      setShowReviewDialog(true);
    } catch (err: any) {
      console.error('Error scanning invoice:', err);
      // If it's a known scan error (like Tier 1+ required), we still open the dialog
      // so the user can enter data manually and the file still gets uploaded.
      if (err.message?.includes('PDF_SCAN_ACCESS_REQUIRED') || err.message?.includes('access to the Claude 3.5 Sonnet PDF beta')) {
        toast.error('AI scan unavailable for this file type. Opening manual entry.');
        setScannedData(null); // Explicitly null to trigger manual mode in dialog
        setShowReviewDialog(true);
      } else {
        toast.error(err.message || 'Failed to scan invoice');
      }
    } finally {
      setIsScanning(false);
      event.target.value = ''; // Reset input
    }
  };

  const activeAssets = useMemo(() => {
    let filtered = allAssets.filter(asset => !deletedAssetIds.has(asset.id));
    
    // Apply tracking status filter
    if (trackingStatusFilter !== 'All') {
      filtered = filtered.filter(asset => {
        const tracking = assetTrackingSummary.get(asset.id);
        if (trackingStatusFilter === 'Untracked') return !tracking;
        return tracking?.status === trackingStatusFilter;
      });
    }

    // Apply global search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(asset => {
        return (
          asset.manufacturer_model?.toLowerCase().includes(query) ||
          asset.category?.toLowerCase().includes(query) ||
          asset.sub_category?.toLowerCase().includes(query) ||
          asset.serial_number?.toLowerCase().includes(query) ||
          asset.tag_number?.toLowerCase().includes(query) ||
          asset.type?.toLowerCase().includes(query) ||
          asset.vendor?.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  }, [allAssets, deletedAssetIds, trackingStatusFilter, assetTrackingSummary, searchQuery]);

  const categories = useMemo(() => 
    Array.from(new Set(allAssets.map(a => a.category).filter(Boolean))),
    [allAssets]
  );

  const columns = useMemo<ColumnDef<DbAsset>[]>(() => [
    {
      id: 'category',
      header: 'Category',
      accessor: 'category',
      sortable: true,
      filterable: true,
      editable: true,
      type: 'select',
      options: categories.map(cat => ({ label: cat, value: cat })),
    },
    {
      id: 'sub_category',
      header: 'Sub Category',
      accessor: 'sub_category',
      sortable: true,
      filterable: true,
      editable: true,
      optional: true,
      type: 'text',
    },
    {
      id: 'manufacturer_model',
      header: 'Manufacturer & Model',
      accessor: 'manufacturer_model',
      sortable: true,
      filterable: true,
      editable: true,
      required: true,
      type: 'text',
    },
    {
      id: 'type',
      header: 'Type',
      accessor: 'type',
      sortable: true,
      filterable: true,
      editable: true,
      optional: true,
      type: 'text',
    },
    {
      id: 'serial_number',
      header: 'Serial Number',
      accessor: 'serial_number',
      sortable: true,
      filterable: true,
      editable: true,
      type: 'text',
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      sortable: true,
      filterable: true,
      editable: true,
      type: 'pill',
      pillConfig: Object.entries(ASSET_STATUS_CONFIG).reduce((acc, [key, config]) => {
        acc[key] = { label: config.label, color: config.color };
        return acc;
      }, {} as any),
    },
    {
      id: 'quantity',
      header: 'Qty',
      accessor: 'quantity',
      sortable: true,
      editable: true,
      type: 'number',
      className: 'w-[80px]',
    },
    {
      id: 'replacement_value',
      header: 'Value (Each)',
      accessor: 'replacement_value',
      sortable: true,
      editable: true,
      type: 'currency',
    },
    {
      id: 'item_price',
      header: 'Price',
      accessor: 'item_price',
      sortable: true,
      editable: true,
      type: 'currency',
    },
    {
      id: 'item_cost',
      header: 'Cost',
      accessor: 'item_cost',
      sortable: true,
      editable: true,
      type: 'currency',
    },
    {
      id: 'total_value',
      header: 'Total Value',
      accessor: (row) => (row.replacement_value || 0) * (row.quantity || 1),
      sortable: true,
      type: 'currency',
      readOnly: true,
    },
    {
      id: 'retired_on',
      header: 'Retired On',
      accessor: 'retired_on',
      sortable: true,
      editable: true,
      type: 'text',
    },
    {
      id: 'insurance_policy_added',
      header: 'Insurance',
      accessor: 'insurance_policy_added',
      sortable: true,
      filterable: false,
      editable: true,
      type: 'checkbox',
      className: 'w-[100px] text-center',
    },
    {
      id: 'insurance_class',
      header: 'Ins. Class',
      accessor: 'insurance_class',
      sortable: true,
      filterable: true,
      editable: true,
      optional: true,
      type: 'text',
    },
    {
      id: 'current_status',
      header: 'Inventory Status',
      accessor: (row) => assetTrackingSummary.get(row.id)?.status ?? null,
      readOnly: true,
      type: 'text',
      render: (value, row) => {
        const tracking = assetTrackingSummary.get(row.id);
        if (!tracking) return <span className="text-xs text-muted-foreground">Untracked</span>;
        return <TrackingStatusBadge status={tracking.status} />;
      },
    },
    {
      id: 'last_location',
      header: 'Last Location',
      accessor: (row) => assetTrackingSummary.get(row.id)?.location ?? null,
      readOnly: true,
      type: 'text',
      render: (value) => value ? <span className="text-xs">{value}</span> : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      id: 'active_gig',
      header: 'Active Gig',
      accessor: (row) => assetTrackingSummary.get(row.id)?.gigTitle ?? null,
      readOnly: true,
      type: 'text',
      render: (value) => value ? <span className="text-xs">{value}</span> : <span className="text-xs text-muted-foreground">—</span>,
    },
  ], [categories, assetTrackingSummary]);

  const canEdit = canManage(userRole);

  const rowActions = useMemo<RowAction<DbAsset>[]>(() => [
    {
      id: 'view',
      onClick: (row) => onViewAsset(row.id),
    },
    // Manage actions hidden from read-only roles (Staff/Viewer)
    ...(canEdit ? ([
      {
        id: 'duplicate',
        onClick: (row: DbAsset) => handleDuplicateAsset(row.id),
      },
      {
        id: 'delete',
        disabled: () => userRole !== 'Admin',
        onClick: (row: DbAsset) => handleDeleteAsset(row.id),
      },
    ] satisfies RowAction<DbAsset>[]) : []),
  ], [canEdit, onViewAsset, userRole, handleDuplicateAsset, handleDeleteAsset]);

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        organization={organization}
        user={user}
        userRole={userRole}
        currentRoute="asset-list"
        onSwitchOrganization={onSwitchOrganization}
        onEditProfile={onEditProfile}
        onLogout={onLogout}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Equipment Tabs */}
        <EquipmentTabs
          activeTab="assets"
          onNavigateToAssets={onNavigateToAssets}
          onNavigateToKits={onNavigateToKits}
          onNavigateToInventory={onNavigateToInventory ?? (() => {})}
        />

        {/* Header */}
        <PageHeader 
          icon={Package}
          title="Assets"
          description="Manage your equipment inventory"
          actions={canEdit ? (
            <>
              <div className="relative overflow-hidden">
                <input
                  type="file"
                  title=""
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={handleUploadInvoice}
                  disabled={isScanning}
                  accept=".pdf,image/*"
                />
                <Button variant="outline" className="border-sky-500 text-sky-600 hover:bg-sky-50" disabled={isScanning}>
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Upload Invoice
                    </>
                  )}
                </Button>
              </div>
              <Button onClick={onCreateAsset} className="bg-sky-500 hover:bg-sky-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Asset
              </Button>
              {onNavigateToImport && (
                <Button
                  onClick={onNavigateToImport}
                  variant="outline"
                  className="border-sky-500 text-sky-600 hover:bg-sky-50"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
              )}
            </>
          ) : null}
        />

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Tracking:</span>
            <Select value={trackingStatusFilter} onValueChange={setTrackingStatusFilter}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Checked Out">Checked Out</SelectItem>
                <SelectItem value="In Transit">In Transit</SelectItem>
                <SelectItem value="On Site">On Site</SelectItem>
                <SelectItem value="In Warehouse">In Warehouse</SelectItem>
                <SelectItem value="Untracked">Untracked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by model, category, serial, etc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Assets Table */}
        <Card className="p-6">
          {error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2">Error loading assets</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={refresh} variant="outline">
                Try Again
              </Button>
            </div>
          ) : activeAssets.length === 0 && !isLoading ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2">No assets found</h3>
              <p className="text-gray-600 mb-6">
                {canEdit ? 'Get started by adding your first asset' : 'No assets to display'}
              </p>
              {canEdit && (
                <Button onClick={onCreateAsset} className="bg-sky-500 hover:bg-sky-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Asset
                </Button>
              )}
            </div>
          ) : (
            <SmartDataTable
              tableId="assets-table"
              data={activeAssets}
              columns={columns}
              isLoading={isLoading}
              onRowUpdate={handleUpdateAsset}
              rowActions={rowActions}
              onFilteredDataChange={setFilteredAssets}
              emptyMessage="No assets match your filters"
            />
          )}

          {/* Summary */}
          {!isLoading && !error && activeAssets.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-2xl text-gray-900">
                    {filteredAssets.reduce((sum, a) => sum + (a.quantity || 1), 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Replacement Value</p>
                  <p className="text-2xl text-gray-900">
                    {formatCurrency(
                      filteredAssets.reduce((sum, a) => sum + (a.replacement_value || 0) * (a.quantity || 1), 0)
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Insured Items</p>
                  <p className="text-2xl text-gray-900">
                    {filteredAssets
                      .filter((a) => a.insurance_policy_added)
                      .reduce((sum, a) => sum + (a.quantity || 1), 0)} /{' '}
                    {filteredAssets.reduce((sum, a) => sum + (a.quantity || 1), 0)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <ReviewScannedDataDialog
        open={showReviewDialog}
        onOpenChange={setShowReviewDialog}
        organizationId={organization.id}
        scannedData={scannedData}
        file={scannedFile}
        onSuccess={() => {
          refresh();
        }}
      />
    </div>
  );
}