import { useState, useEffect } from 'react';
import { Package, ArrowLeft, Edit2, Trash2, Copy, Loader2 } from 'lucide-react';
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
import { Organization, User, UserRole } from '../utils/supabase/types';
import { getKit, deleteKit, duplicateKit } from '../services/kit.service';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadKit();
  }, [kitId]);

  const loadKit = async () => {
    setIsLoading(true);
    try {
      const data = await getKit(kitId);
      setKit(data);
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
      const newKit = await duplicateKit(kitId);
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
    if (!kit?.kit_assets) return 0;
    return kit.kit_assets.reduce((total: number, ka: any) => {
      return total + (ka.asset?.replacement_value || 0) * ka.quantity;
    }, 0);
  };

  const getTotalItems = () => {
    if (!kit?.kit_assets) return 0;
    return kit.kit_assets.reduce((total: number, ka: any) => total + ka.quantity, 0);
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
              <Button
                variant="outline"
                onClick={() => onEdit(kitId)}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={handleDuplicate}
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </Button>
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
            <p className="text-3xl text-gray-900">{kit.kit_assets?.length || 0}</p>
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

        {/* Assets Table */}
        <Card className="p-6">
          <h3 className="text-gray-900 mb-4">Assets in Kit</h3>
          {!kit.kit_assets || kit.kit_assets.length === 0 ? (
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
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kit.kit_assets.map((ka: any) => (
                    <TableRow key={ka.id}>
                      <TableCell>
                        <div className="text-sm text-gray-900">
                          {ka.asset?.manufacturer_model}
                        </div>
                        {ka.asset?.type && (
                          <div className="text-xs text-gray-500">{ka.asset.type}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-700">{ka.asset?.category}</div>
                        {ka.asset?.sub_category && (
                          <div className="text-xs text-gray-500">
                            {ka.asset.sub_category}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-700 font-mono">
                          {ka.asset?.serial_number || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">{ka.quantity}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">
                          {formatCurrency(ka.asset?.replacement_value || 0)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">
                          {formatCurrency((ka.asset?.replacement_value || 0) * ka.quantity)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {ka.notes || '—'}
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

        {/* TODO: Gig Assignments Section */}
        {/* This would show which gigs this kit is currently assigned to */}
      </div>
    </div>
  );
}