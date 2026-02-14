import { useState, useEffect, useMemo, useCallback } from 'react';
import { Package, Plus, Search, Loader2, Edit, Trash2, Copy, Eye, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getKits, deleteKit, duplicateKit, updateKit } from '../services/kit.service';
import { Button } from './ui/button';
import { Card } from './ui/card';
import AppHeader from './AppHeader';
import EquipmentTabs from './EquipmentTabs';
import { Organization, User, UserRole } from '../utils/supabase/types';
import { SmartDataTable, ColumnDef, RowAction } from './tables/SmartDataTable';
import { PageHeader } from './ui/PageHeader';
import { TAG_CONFIG } from '../utils/supabase/constants';

interface KitListScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  onBack: () => void;
  onCreateKit: () => void;
  onViewKit: (kitId: string) => void;
  onEditKit: (kitId: string) => void;
  onNavigateToDashboard: () => void;
  onNavigateToGigs: () => void;
  onNavigateToAssets: () => void;
  onNavigateToKits: () => void;
  onSwitchOrganization: () => void;
  onLogout: () => void;
}

export default function KitListScreen({
  organization,
  user,
  userRole,
  onBack,
  onCreateKit,
  onViewKit,
  onEditKit,
  onNavigateToDashboard,
  onNavigateToGigs,
  onNavigateToAssets,
  onNavigateToKits,
  onSwitchOrganization,
  onLogout,
}: KitListScreenProps) {
  // Memoize filters to prevent infinite re-renders
  const [allKits, setAllKits] = useState<any[]>([]);
  const [filteredKits, setFilteredKits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const kits = await getKits(organization.id);
      setAllKits(kits);
    } catch (err: any) {
      setError(err.message || 'Failed to load kits');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [organization.id]);

  const handleUpdateKit = async (id: string, updates: Partial<any>) => {
    try {
      await updateKit(id, updates);
      setAllKits(prev => prev.map(k => k.id === id ? { ...k, ...updates } : k));
      toast.success('Kit updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update kit');
      refresh();
    }
  };

  const handleDuplicateKit = async (kitId: string, kitName: string) => {
    try {
      await duplicateKit(kitId);
      toast.success(`Kit "${kitName}" duplicated successfully`);
      refresh();
    } catch (error: any) {
      console.error('Error duplicating kit:', error);
      toast.error(error.message || 'Failed to duplicate kit');
    }
  };

  const handleDeleteKit = async (kitId: string, kitName: string) => {
    if (!confirm(`Are you sure you want to delete "${kitName}"?`)) return;

    try {
      await deleteKit(kitId);
      toast.success('Kit deleted successfully');
      refresh();
    } catch (error: any) {
      console.error('Error deleting kit:', error);
      toast.error(error.message || 'Failed to delete kit');
      refresh();
    }
  };

  const categories = useMemo(() => 
    Array.from(new Set(allKits.map(k => k.category).filter(Boolean))),
    [allKits]
  );

  const TAG_PILL_CONFIG = useMemo(() => Object.fromEntries(
    Object.entries(TAG_CONFIG).map(([key, val]) => [key, { label: key, color: val.color }])
  ), []);

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      id: 'name',
      header: 'Name',
      accessor: 'name',
      sortable: true,
      filterable: true,
      editable: true,
      required: true,
      type: 'text',
    },
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
      id: 'tag_number',
      header: 'Tag #',
      accessor: 'tag_number',
      sortable: true,
      filterable: true,
      editable: true,
      type: 'text',
    },
    {
      id: 'items_count',
      header: 'Items',
      accessor: (row) => (row.kit_assets || []).reduce((sum: number, ka: any) => sum + (ka.quantity || 1), 0),
      sortable: true,
      readOnly: true,
      type: 'number',
    },
    {
      id: 'total_value',
      header: 'Total Value',
      accessor: (row) => (row.kit_assets || []).reduce((total: number, ka: any) => {
        return total + (ka.asset?.replacement_value || 0) * ka.quantity;
      }, 0),
      sortable: true,
      readOnly: true,
      type: 'currency',
    },
    {
      id: 'rental_value',
      header: 'Rental Value',
      accessor: 'rental_value',
      sortable: true,
      editable: true,
      type: 'currency',
    },
    {
      id: 'tags',
      header: 'Tags',
      accessor: 'tags',
      editable: true,
      type: 'multi-pill',
      pillConfig: TAG_PILL_CONFIG,
    },
    {
      id: 'description',
      header: 'Description',
      accessor: 'description',
      editable: true,
      optional: true,
      type: 'text',
    }
  ], [categories, TAG_PILL_CONFIG]);

  const rowActions = useMemo<RowAction<any>[]>(() => [
    {
      id: 'view',
      onClick: (row) => onViewKit(row.id),
    },
    {
      id: 'edit',
      label: 'Edit Configuration',
      onClick: (row) => onEditKit(row.id),
    },
    {
      id: 'duplicate',
      onClick: (row) => handleDuplicateKit(row.id, row.name),
    },
    {
      id: 'delete',
      disabled: () => userRole !== 'Admin',
      onClick: (row) => handleDeleteKit(row.id, row.name),
    }
  ], [onViewKit, onEditKit, userRole]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getKitAssetCount = (kit: any) => {
    if (!kit.kit_assets || kit.kit_assets.length === 0) return 0;
    return kit.kit_assets.reduce((sum: number, ka: any) => sum + (ka.quantity || 1), 0);
  };

  const getKitTotalValue = (kit: any) => {
    return (kit.kit_assets || []).reduce((total: number, ka: any) => {
      return total + (ka.asset?.replacement_value || 0) * ka.quantity;
    }, 0);
  };

  // Get unique categories for filter
  // const categories = Array.from(new Set(allKits.map((k) => k.category).filter(Boolean)));

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        organization={organization}
        user={user}
        userRole={userRole}
        currentRoute="kit-list"
        onSwitchOrganization={onSwitchOrganization}
        onLogout={onLogout}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Equipment Tabs */}
        <EquipmentTabs
          activeTab="kits"
          onNavigateToAssets={onNavigateToAssets}
          onNavigateToKits={onNavigateToKits}
        />

        {/* Header */}
        <PageHeader 
          icon={Package}
          title="Equipment Kits"
          description="Manage reusable equipment collections"
          actions={
            <Button onClick={onCreateKit} className="bg-sky-500 hover:bg-sky-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Kit
            </Button>
          }
        />

        {/* Kits Table */}
        <Card className="p-6">
          {error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2">Error loading kits</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={refresh} variant="outline">
                Try Again
              </Button>
            </div>
          ) : allKits.length === 0 && !isLoading ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2">No kits found</h3>
              <p className="text-gray-600 mb-6">
                Get started by creating your first equipment kit
              </p>
              <Button onClick={onCreateKit} className="bg-sky-500 hover:bg-sky-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Kit
              </Button>
            </div>
          ) : (
            <SmartDataTable
              tableId="kits-table"
              data={allKits}
              columns={columns}
              isLoading={isLoading}
              onRowUpdate={handleUpdateKit}
              rowActions={rowActions}
              onFilteredDataChange={setFilteredKits}
              emptyMessage="No kits match your filters"
            />
          )}
        </Card>
      </div>
    </div>
  );
}