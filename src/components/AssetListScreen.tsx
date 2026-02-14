import { useState, useEffect, useMemo, useCallback } from 'react';
import { Package, Plus, Search, Filter, Loader2, Edit, Trash2, AlertCircle, Shield, Upload, Eye, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { getAssets, deleteAsset, duplicateAsset, updateAsset } from '../services/asset.service';
import { Button } from './ui/button';
import { Card } from './ui/card';
import AppHeader from './AppHeader';
import EquipmentTabs from './EquipmentTabs';
import { Organization, User, UserRole } from '../utils/supabase/types';
import type { DbAsset } from '../utils/supabase/types';
import { SmartDataTable, ColumnDef, RowAction } from './tables/SmartDataTable';
import { PageHeader } from './ui/PageHeader';

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
  onNavigateToImport,
  onSwitchOrganization,
  onLogout,
  onEditProfile,
}: AssetListScreenProps) {
  // Memoize filters to prevent infinite re-renders
  const assetFilters = useMemo(() => ({ organization_id: organization.id }), [organization.id]);

  // Asset list data
  const [allAssets, setAllAssets] = useState<DbAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<DbAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletedAssetIds, setDeletedAssetIds] = useState<Set<string>>(new Set());

  const refresh = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const assets = await getAssets(organization.id);
      setAllAssets(assets);
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

  const activeAssets = useMemo(() => 
    allAssets.filter(asset => !deletedAssetIds.has(asset.id)),
    [allAssets, deletedAssetIds]
  );

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
      header: 'Manufacturer/Model',
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
      id: 'total_value',
      header: 'Total Value',
      accessor: (row) => (row.replacement_value || 0) * (row.quantity || 1),
      sortable: true,
      type: 'currency',
      readOnly: true,
    },
    {
      id: 'insurance_policy_added',
      header: 'Insurance',
      accessor: 'insurance_policy_added',
      sortable: true,
      filterable: true,
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
    }
  ], [categories]);

  const rowActions = useMemo<RowAction<DbAsset>[]>(() => [
    {
      id: 'view',
      onClick: (row) => onViewAsset(row.id),
    },
    {
      id: 'duplicate',
      onClick: (row) => handleDuplicateAsset(row.id),
    },
    {
      id: 'delete',
      disabled: () => userRole !== 'Admin',
      onClick: (row) => handleDeleteAsset(row.id),
    }
  ], [onViewAsset, userRole]);

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
        />

        {/* Header */}
        <PageHeader 
          icon={Package}
          title="Assets"
          description="Manage your equipment inventory"
          actions={
            <>
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
          }
        />

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
                Get started by adding your first asset
              </p>
              <Button onClick={onCreateAsset} className="bg-sky-500 hover:bg-sky-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Asset
              </Button>
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
    </div>
  );
}