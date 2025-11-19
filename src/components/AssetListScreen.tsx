import { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Search, Filter, Loader2, Edit2, Trash2, AlertCircle, Shield } from 'lucide-react';
import { useRealtimeList } from '../utils/hooks/useRealtimeList';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import AppHeader from './AppHeader';
import EquipmentTabs from './EquipmentTabs';
import type { Organization, User, UserRole } from '../App';
import { getAssets, deleteAsset } from '../utils/api';
import type { DbAsset } from '../utils/supabase/types';

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
  onSwitchOrganization: () => void;
  onLogout: () => void;
  useMockData?: boolean;
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
  onSwitchOrganization,
  onLogout,
  useMockData = false,
}: AssetListScreenProps) {
  // Memoize filters to prevent infinite re-renders
  const assetFilters = useMemo(() => ({ organization_id: organization.id }), [organization.id]);

  // Real-time asset list
  const { data: allAssets, loading: isLoading, error, refresh } = useRealtimeList<DbAsset>({
    table: 'assets',
    filters: assetFilters,
    enabled: true,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [insuranceFilter, setInsuranceFilter] = useState<string>('all');

  // Filter assets based on current filters
  const assets = allAssets.filter((asset) => {
    // Category filter
    if (categoryFilter !== 'all' && asset.category !== categoryFilter) {
      return false;
    }

    // Insurance filter
    if (insuranceFilter === 'yes' && !asset.insurance_added) {
      return false;
    }
    if (insuranceFilter === 'no' && asset.insurance_added) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        asset.name?.toLowerCase().includes(query) ||
        asset.category?.toLowerCase().includes(query) ||
        asset.tag_number?.toLowerCase().includes(query) ||
        asset.description?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
      await deleteAsset(assetId);
      toast.success('Asset deleted successfully');
      // Real-time list will automatically update
    } catch (error: any) {
      console.error('Error deleting asset:', error);
      toast.error(error.message || 'Failed to delete asset');
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Get unique categories for filter
  const categories = Array.from(new Set(assets.map(a => a.category).filter(Boolean)));

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        organization={organization}
        user={user}
        userRole={userRole}
        currentRoute="asset-list"
        onNavigateToDashboard={onNavigateToDashboard}
        onNavigateToGigs={onNavigateToGigs}
        onNavigateToAssets={onNavigateToAssets}
        onSwitchOrganization={onSwitchOrganization}
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-gray-900 flex items-center gap-2">
              <Package className="w-8 h-8 text-sky-500" />
              Assets
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your equipment inventory
            </p>
          </div>
          <Button onClick={onCreateAsset} className="bg-sky-500 hover:bg-sky-600 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add Asset
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by manufacturer, model, or serial number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={insuranceFilter} onValueChange={setInsuranceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Insurance Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assets</SelectItem>
                <SelectItem value="yes">Insured</SelectItem>
                <SelectItem value="no">Not Insured</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

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
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2">No assets found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || categoryFilter !== 'all' || insuranceFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first asset'}
              </p>
              {!searchQuery && categoryFilter === 'all' && insuranceFilter === 'all' && (
                <Button onClick={onCreateAsset} className="bg-sky-500 hover:bg-sky-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Asset
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Manufacturer/Model</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Replacement Value</TableHead>
                    <TableHead>Insurance</TableHead>
                    <TableHead>Insurance Class</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <div>
                          <div className="text-sm text-gray-900">{asset.category}</div>
                          {asset.sub_category && (
                            <div className="text-xs text-gray-500">{asset.sub_category}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">{asset.manufacturer_model}</div>
                        {asset.type && (
                          <div className="text-xs text-gray-500">{asset.type}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-700 font-mono">
                          {asset.serial_number || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">
                          {asset.quantity || '1'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">
                          {formatCurrency(asset.replacement_value)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {asset.insurance_policy_added ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            <Shield className="w-3 h-3 mr-1" />
                            Insured
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600 border-gray-200">
                            Not Insured
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">
                          {asset.insurance_class || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewAsset(asset.id)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {userRole === 'Admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAsset(asset.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Summary */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Assets</p>
                    <p className="text-2xl text-gray-900">{assets.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Replacement Value</p>
                    <p className="text-2xl text-gray-900">
                      {formatCurrency(
                        assets.reduce((sum, a) => sum + (a.replacement_value || 0), 0)
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Insured Assets</p>
                    <p className="text-2xl text-gray-900">
                      {assets.filter((a) => a.insurance_policy_added).length} /{' '}
                      {assets.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}