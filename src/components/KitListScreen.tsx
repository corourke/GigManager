import { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Search, Loader2, Edit2, Trash2, Copy, Eye, AlertCircle } from 'lucide-react';
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
import { getKits, deleteKit, duplicateKit } from '../utils/api';

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
  const kitFilters = useMemo(() => ({ organization_id: organization.id }), [organization.id]);

  // Real-time kit list
  const { data: allKits, loading: isLoading, error, refresh } = useRealtimeList<any>({
    table: 'kits',
    filters: kitFilters,
    enabled: true,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Filter kits based on current filters
  const kits = allKits.filter((kit) => {
    // Category filter
    if (categoryFilter !== 'all' && kit.category !== categoryFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        kit.name?.toLowerCase().includes(query) ||
        kit.category?.toLowerCase().includes(query) ||
        kit.tag_number?.toLowerCase().includes(query) ||
        kit.description?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const handleDuplicateKit = async (kitId: string, kitName: string) => {
    try {
      const newKit = await duplicateKit(kitId);
      toast.success(`Kit "${kitName}" duplicated successfully`);
      // Real-time list will automatically update
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
      // Real-time list will automatically update
    } catch (error: any) {
      console.error('Error deleting kit:', error);
      toast.error(error.message || 'Failed to delete kit');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getKitAssetCount = (kit: any) => {
    return kit.kit_assets?.length || 0;
  };

  const getKitTotalValue = (kit: any) => {
    return (kit.kit_assets || []).reduce((total: number, ka: any) => {
      return total + (ka.asset?.replacement_value || 0) * ka.quantity;
    }, 0);
  };

  // Get unique categories for filter
  const categories = Array.from(new Set(kits.map((k) => k.category).filter(Boolean)));

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        organization={organization}
        user={user}
        userRole={userRole}
        currentRoute="kit-list"
        onNavigateToDashboard={onNavigateToDashboard}
        onNavigateToGigs={onNavigateToGigs}
        onNavigateToAssets={onNavigateToAssets}
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-gray-900 flex items-center gap-2">
              <Package className="w-8 h-8 text-sky-500" />
              Equipment Kits
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage reusable equipment collections
            </p>
          </div>
          <Button onClick={onCreateKit} className="bg-sky-500 hover:bg-sky-600 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Create Kit
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by kit name or description..."
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
          </div>
        </Card>

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
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
            </div>
          ) : kits.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2">No kits found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || categoryFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first equipment kit'}
              </p>
              {!searchQuery && categoryFilter === 'all' && (
                <Button onClick={onCreateKit} className="bg-sky-500 hover:bg-sky-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Kit
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Tag Number</TableHead>
                    <TableHead>Assets</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Rental Value</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kits.map((kit) => (
                    <TableRow key={kit.id} className="cursor-pointer hover:bg-gray-50">
                      <TableCell onClick={() => onViewKit(kit.id)}>
                        <div className="text-sm text-gray-900">{kit.name}</div>
                        {kit.description && (
                          <div className="text-xs text-gray-500 line-clamp-1">
                            {kit.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell onClick={() => onViewKit(kit.id)}>
                        {kit.category ? (
                          <Badge variant="outline">{kit.category}</Badge>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell onClick={() => onViewKit(kit.id)}>
                        <div className="text-sm text-gray-900">
                          {kit.tag_number || '—'}
                        </div>
                      </TableCell>
                      <TableCell onClick={() => onViewKit(kit.id)}>
                        <div className="text-sm text-gray-900">
                          {getKitAssetCount(kit)} items
                        </div>
                      </TableCell>
                      <TableCell onClick={() => onViewKit(kit.id)}>
                        <div className="text-sm text-gray-900">
                          {formatCurrency(getKitTotalValue(kit))}
                        </div>
                      </TableCell>
                      <TableCell onClick={() => onViewKit(kit.id)}>
                        <div className="text-sm text-gray-900">
                          {formatCurrency(kit.rental_value || 0)}
                        </div>
                      </TableCell>
                      <TableCell onClick={() => onViewKit(kit.id)}>
                        <div className="flex flex-wrap gap-1">
                          {kit.tags && kit.tags.length > 0 ? (
                            kit.tags.slice(0, 2).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                          {kit.tags && kit.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{kit.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewKit(kit.id)}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditKit(kit.id)}
                            title="Edit Kit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicateKit(kit.id, kit.name)}
                            title="Duplicate Kit"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          {userRole === 'Admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteKit(kit.id, kit.name)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete Kit"
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
                    <p className="text-sm text-gray-600">Total Kits</p>
                    <p className="text-2xl text-gray-900">{kits.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Assets in Kits</p>
                    <p className="text-2xl text-gray-900">
                      {kits.reduce((sum, k) => sum + getKitAssetCount(k), 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Combined Kit Value</p>
                    <p className="text-2xl text-gray-900">
                      {formatCurrency(
                        kits.reduce((sum, k) => sum + getKitTotalValue(k), 0)
                      )}
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