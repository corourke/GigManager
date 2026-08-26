import { useState, useEffect, ReactNode } from 'react';
import { Package, ArrowLeft, Edit2, Trash2, Copy, Loader2, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import AppHeader from './AppHeader';
import { Organization, User, UserRole, ActivityLogEntry } from '../utils/supabase/types';
import { canManage } from '../utils/permissions';
import { getKit, deleteKit, duplicateKit, getKitFlattenedContents, getKitHierarchyTree } from '../services/kit.service';
import { getEntityActivity } from '../services/activityLog.service';
import ActivityFeed from './ActivityFeed';
import { History } from 'lucide-react';

interface KitDetailScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  kitId: string;
  onBack: () => void;
  onEdit: (kitId: string) => void;
  onSwitchOrganization: () => void;
  onLogout: () => void;
}

interface FlattenedAssetRow {
  asset_id: string;
  total_quantity: number;
  asset: any;
}

interface HierarchyEdge {
  parent_kit_id: string;
  child_kit_id: string;
  child_kit_name: string;
  quantity: number;
  depth: number;
}

const DEPTH_WARNING_THRESHOLD = 6;

/** Recursively renders the nested sub-kit structure from flat depth-tagged edges. */
function HierarchyTree({ rootId, edges }: { rootId: string; edges: HierarchyEdge[] }) {
  const childrenOf = (parentId: string) => edges.filter((e) => e.parent_kit_id === parentId);

  const renderNode = (parentId: string, level: number): ReactNode => {
    const children = childrenOf(parentId);
    if (children.length === 0) return null;
    return (
      <ul className={level === 0 ? '' : 'ml-6 border-l border-gray-200 pl-4'}>
        {children.map((edge) => (
          <li key={`${edge.parent_kit_id}-${edge.child_kit_id}`} className="py-1">
            <div className="flex items-center gap-2 text-sm">
              <Layers className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-900">{edge.child_kit_name}</span>
              <span className="text-gray-500">× {edge.quantity}</span>
            </div>
            {renderNode(edge.child_kit_id, level + 1)}
          </li>
        ))}
      </ul>
    );
  };

  return <>{renderNode(rootId, 0)}</>;
}

export default function KitDetailScreen({
  organization,
  user,
  userRole,
  kitId,
  onBack,
  onEdit,
  onSwitchOrganization,
  onLogout,
}: KitDetailScreenProps) {
  const [kit, setKit] = useState<any>(null);
  const [flattenedAssets, setFlattenedAssets] = useState<FlattenedAssetRow[]>([]);
  const [hierarchyEdges, setHierarchyEdges] = useState<HierarchyEdge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [kitActivity, setKitActivity] = useState<ActivityLogEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    loadKit();
  }, [kitId]);

  const loadKit = async () => {
    setIsLoading(true);
    try {
      const [data, flattened, tree] = await Promise.all([
        getKit(kitId),
        getKitFlattenedContents(kitId),
        getKitHierarchyTree(kitId),
      ]);
      setKit(data);
      setFlattenedAssets(flattened as FlattenedAssetRow[]);
      setHierarchyEdges(tree as HierarchyEdge[]);

      const maxDepth = (tree as HierarchyEdge[]).reduce((max, e) => Math.max(max, e.depth), 0);
      if (maxDepth > DEPTH_WARNING_THRESHOLD) {
        toast.warning(`This kit is nested ${maxDepth} levels deep — is that intentional?`);
      }

      setActivityLoading(true);
      getEntityActivity('kit', kitId)
        .then(setKitActivity)
        .catch(() => {})
        .finally(() => setActivityLoading(false));
    } catch (error: any) {
      console.error('Error loading kit:', error);
      toast.error(error.message || 'Failed to load kit');
      onBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const _newKit = await duplicateKit(kitId);
      toast.success('Kit duplicated successfully');
      // Navigate to the new kit
      onBack();
    } catch (error: any) {
      console.error('Error duplicating kit:', error);
      toast.error(error.message || 'Failed to duplicate kit');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${kit?.name}"?`)) return;

    try {
      await deleteKit(kitId);
      toast.success('Kit deleted successfully');
      onBack();
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

  const getTotalValue = () => {
    return flattenedAssets.reduce((total, row) => {
      return total + (row.asset?.replacement_value || 0) * row.total_quantity;
    }, 0);
  };

  const getTotalItems = () => {
    return flattenedAssets.reduce((total, row) => total + row.total_quantity, 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!kit) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        organization={organization}
        user={user}
        userRole={userRole}
        currentRoute="kit-detail"
        onSwitchOrganization={onSwitchOrganization}
        onLogout={onLogout}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Kits
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-8 h-8 text-sky-500" />
                <h1 className="text-gray-900">{kit.name}</h1>
              </div>
              {kit.category && (
                <Badge variant="outline" className="mb-2">
                  {kit.category}
                </Badge>
              )}
              {kit.tag_number && (
                <div className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Tag Number:</span> {kit.tag_number}
                </div>
              )}
              {kit.description && (
                <p className="text-gray-600 mt-2">{kit.description}</p>
              )}
              {kit.tags && kit.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {kit.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {canManage(userRole) && (
                <Button
                  variant="outline"
                  onClick={() => onEdit(kitId)}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
              {canManage(userRole) && (
                <Button
                  variant="outline"
                  onClick={handleDuplicate}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </Button>
              )}
              {userRole === 'Admin' && (
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <p className="text-sm text-gray-600 mb-1">Total Assets</p>
            <p className="text-3xl text-gray-900">{flattenedAssets.length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-gray-600 mb-1">Total Items</p>
            <p className="text-3xl text-gray-900">{getTotalItems()}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-gray-600 mb-1">Total Value</p>
            <p className="text-3xl text-gray-900">{formatCurrency(getTotalValue())}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-gray-600 mb-1">Rental Value</p>
            <p className="text-3xl text-gray-900">{formatCurrency(kit.rental_value || 0)}</p>
          </Card>
        </div>

        {/* Flattened Assets Table */}
        <Card className="p-6">
          <h3 className="text-gray-900 mb-1">Assets in Kit</h3>
          <p className="text-xs text-gray-500 mb-4">
            Aggregated across this kit and everything nested inside it
          </p>
          {flattenedAssets.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No assets in this kit</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Value</TableHead>
                    <TableHead>Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flattenedAssets.map((row) => (
                    <TableRow key={row.asset_id}>
                      <TableCell>
                        <div className="text-sm text-gray-900">
                          {row.asset?.manufacturer_model}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-700">{row.asset?.category}</div>
                        {row.asset?.sub_category && (
                          <div className="text-xs text-gray-500">
                            {row.asset.sub_category}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-700 font-mono">
                          {row.asset?.serial_number || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">{row.total_quantity}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">
                          {formatCurrency(row.asset?.replacement_value || 0)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">
                          {formatCurrency((row.asset?.replacement_value || 0) * row.total_quantity)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-end">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-8">
                      <span className="text-sm text-gray-600">Total Items:</span>
                      <span className="text-sm text-gray-900">{getTotalItems()}</span>
                    </div>
                    <div className="flex items-center justify-between gap-8">
                      <span className="text-gray-900">Total Value:</span>
                      <span className="text-gray-900">{formatCurrency(getTotalValue())}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Hierarchy Structure */}
        {hierarchyEdges.length > 0 && (
          <Card className="p-6 mt-4">
            <h3 className="text-gray-900 mb-1">Nested Structure</h3>
            <p className="text-xs text-gray-500 mb-4">Sub-kits contained in this kit, at every level</p>
            <HierarchyTree rootId={kitId} edges={hierarchyEdges} />
          </Card>
        )}

        {/* TODO: Gig Assignments Section */}
        {/* This would show which gigs this kit is currently assigned to */}

        {/* Kit Change History */}
        <Card className="p-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">Change History</h3>
          </div>
          <ActivityFeed entries={kitActivity} isLoading={activityLoading} />
        </Card>
      </div>
    </div>
  );
}
