import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Box, ArrowLeft, Edit2, Trash2, Copy, Loader2, History, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import AppHeader from './AppHeader';
import { Organization, User, UserRole } from '../utils/supabase/types';
import { getAsset, deleteAsset, duplicateAsset, getAssetStatusHistory, getAssetInventoryTracking } from '../services/asset.service';
import type { DbAssetStatusHistory, DbInventoryTracking } from '../utils/supabase/types';
import { ASSET_STATUS_CONFIG } from '../utils/supabase/constants';

interface AssetDetailScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  assetId: string;
  onBack: () => void;
  onEdit: (assetId: string) => void;
  onSwitchOrganization: () => void;
  onEditProfile?: () => void;
  onLogout: () => void;
}

export default function AssetDetailScreen({
  organization,
  user,
  userRole,
  assetId,
  onBack,
  onEdit,
  onSwitchOrganization,
  onEditProfile,
  onLogout,
}: AssetDetailScreenProps) {
  const [asset, setAsset] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusHistory, setStatusHistory] = useState<DbAssetStatusHistory[]>([]);
  const [inventoryTracking, setInventoryTracking] = useState<DbInventoryTracking[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    loadAsset();
  }, [assetId]);

  const loadAsset = async () => {
    setIsLoading(true);
    try {
      const data = await getAsset(assetId);
      setAsset(data);

      // Load history tables concurrently
      setIsLoadingHistory(true);
      try {
        const [history, tracking] = await Promise.all([
          getAssetStatusHistory(assetId),
          getAssetInventoryTracking(assetId),
        ]);
        setStatusHistory(history);
        setInventoryTracking(tracking);
      } catch (err) {
        console.error('Error loading asset history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    } catch (error: any) {
      console.error('Error loading asset:', error);
      toast.error(error.message || 'Failed to load asset');
      onBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const newAsset = await duplicateAsset(assetId);
      toast.success('Asset duplicated successfully');
      onBack(); // Go back to list, where the new asset will appear
    } catch (error: any) {
      console.error('Error duplicating asset:', error);
      toast.error(error.message || 'Failed to duplicate asset');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${asset?.manufacturer_model}"?`)) return;

    try {
      await deleteAsset(assetId);
      toast.success('Asset deleted successfully');
      onBack();
    } catch (error: any) {
      console.error('Error deleting asset:', error);
      toast.error(error.message || 'Failed to delete asset');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!asset) {
    return null;
  }

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="mb-4">
          <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assets
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Box className="w-8 h-8 text-sky-500" />
                <h1 className="text-2xl font-bold text-gray-900">{asset.manufacturer_model}</h1>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {asset.category && (
                  <Badge variant="secondary">
                    {asset.category}
                  </Badge>
                )}
                {asset.sub_category && (
                  <Badge variant="outline">
                    {asset.sub_category}
                  </Badge>
                )}
                {asset.type && (
                  <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                    {asset.type}
                  </Badge>
                )}
                {asset.status && (
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${ASSET_STATUS_CONFIG[asset.status as keyof typeof ASSET_STATUS_CONFIG]?.color ?? 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                    {asset.status}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => onEdit(assetId)}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Asset Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Manufacturer & Model</p>
                  <p className="mt-1 text-gray-900">{asset.manufacturer_model}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Serial Number</p>
                  <p className="mt-1 font-mono text-gray-900">{asset.serial_number || '—'}</p>
                </div>
                
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Inventory Tag ID</p>
                    <p className="mt-1 font-mono text-gray-900">{asset.tag_number || '-'}</p>
                  </div>
               
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Status</p>
                  <div className="mt-1">
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${ASSET_STATUS_CONFIG[asset.status as keyof typeof ASSET_STATUS_CONFIG]?.color ?? 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                      {asset.status ?? 'Active'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Retired On</p>
                  <p className="mt-1 text-gray-900">
                    {asset.retired_on ? format(new Date(asset.retired_on), 'PPP') : '—'}
                  </p>
                </div>
                {asset.purchase_id && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Purchase Link</p>
                    <div className="mt-2 bg-sky-50 border border-sky-100 rounded-md p-3 flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-sky-500" />
                      <div>
                        <p className="text-sm text-sky-800 font-medium">Linked to Purchase Record</p>
                        <p className="text-xs text-sky-600 font-mono mt-0.5">{asset.purchase_id}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Notes</p>
                  <div className="mt-1 text-gray-600 prose prose-sm max-w-none">
                    {asset.description
                      ? <ReactMarkdown>{asset.description}</ReactMarkdown>
                      : 'No description provided.'}
                  </div>
                </div>
              </div>
            </Card>

          </div>

          {/* Sidebar Info */}
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Inventory Info</h3>
              <div className="space-y-4">
                {asset.tag_number && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory Tag ID</p>
                    <p className="mt-1 text-gray-900 font-mono font-medium">{asset.tag_number}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Acquisition Date</p>
                  <p className="mt-1 text-gray-900 font-medium">
                    {asset.acquisition_date ? format(new Date(asset.acquisition_date), 'PPP') : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</p>
                  <p className="mt-1 text-gray-900 font-medium">{asset.vendor || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</p>
                  <p className="mt-1 text-gray-900 font-medium">{asset.quantity || 1}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Item Price</p>
                  <p className="mt-1 text-gray-900 font-medium">
                    {asset.item_price ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(asset.item_price) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Item Cost</p>
                  <p className="mt-1 text-gray-900 font-medium">
                    {asset.item_cost ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(asset.item_cost) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Replacement Value</p>
                  <p className="mt-1 text-gray-900 font-medium">
                    {asset.replacement_value ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(asset.replacement_value) : '—'}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* History Tables */}
        <div className="space-y-4 mt-4">
          {/* Asset Status History */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">Status History</h3>
            </div>
            {isLoadingHistory ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </div>
            ) : statusHistory.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No status changes recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statusHistory.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-gray-500">{row.from_status ?? '—'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${ASSET_STATUS_CONFIG[row.to_status as keyof typeof ASSET_STATUS_CONFIG]?.color ?? 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                          {row.to_status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {row.changed_by_user
                          ? `${row.changed_by_user.first_name} ${row.changed_by_user.last_name}`.trim()
                          : '—'}
                      </TableCell>
                      <TableCell className="text-gray-500 text-xs">
                        {format(new Date(row.changed_at), 'PPp')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          {/* Inventory Tracking */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">Inventory Tracking</h3>
              {inventoryTracking.length > 10 && (
                <span className="text-xs text-gray-400 ml-1">(last 10 of {inventoryTracking.length})</span>
              )}
            </div>
            {isLoadingHistory ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </div>
            ) : inventoryTracking.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No inventory scans recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gig</TableHead>
                    <TableHead>Kit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scanned By</TableHead>
                    <TableHead>Scanned At</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryTracking.slice(0, 10).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.gig?.title ?? '—'}</TableCell>
                      <TableCell>{row.kit?.name ?? '—'}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-sky-100 text-sky-800 border-sky-300">
                          {row.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {row.scanned_by_user
                          ? `${row.scanned_by_user.first_name} ${row.scanned_by_user.last_name}`.trim()
                          : '—'}
                      </TableCell>
                      <TableCell className="text-gray-500 text-xs">
                        {format(new Date(row.scanned_at), 'PPp')}
                      </TableCell>
                      <TableCell className="text-gray-500 text-xs max-w-[160px] truncate">
                        {row.notes ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
