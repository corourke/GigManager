import { useState, useEffect } from 'react';
import { Box, ArrowLeft, Edit2, Trash2, Copy, Loader2, Tag, Calendar, DollarSign, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import AppHeader from './AppHeader';
import { Organization, User, UserRole } from '../utils/supabase/types';
import { getAsset, deleteAsset, duplicateAsset } from '../services/asset.service';
import { format } from 'date-fns';

interface AssetDetailScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  assetId: string;
  onBack: () => void;
  onEdit: (assetId: string) => void;
  onSwitchOrganization: () => void;
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
  onLogout,
}: AssetDetailScreenProps) {
  const [asset, setAsset] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAsset();
  }, [assetId]);

  const loadAsset = async () => {
    setIsLoading(true);
    try {
      const data = await getAsset(assetId);
      setAsset(data);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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
        onLogout={onLogout}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Manufacturer & Model</p>
                  <p className="mt-1 text-gray-900">{asset.manufacturer_model}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Serial Number</p>
                  <p className="mt-1 font-mono text-gray-900">{asset.serial_number || '—'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Description</p>
                  <p className="mt-1 text-gray-600">{asset.description || 'No description provided.'}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm font-medium uppercase tracking-wider">Cost</span>
                  </div>
                  <p className="text-xl font-semibold text-gray-900">{formatCurrency(asset.cost || 0)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-sm font-medium uppercase tracking-wider">Replacement Value</span>
                  </div>
                  <p className="text-xl font-semibold text-sky-600">{formatCurrency(asset.replacement_value || 0)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium uppercase tracking-wider">Acquisition Date</span>
                  </div>
                  <p className="text-lg text-gray-900">
                    {asset.acquisition_date ? format(new Date(asset.acquisition_date), 'PPP') : '—'}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Info</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</p>
                  <p className="mt-1 text-gray-900 font-medium">{asset.vendor || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</p>
                  <p className="mt-1 text-gray-900 font-medium">{asset.quantity || 1}</p>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${asset.insurance_policy_added ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <p className="text-sm font-medium text-gray-900">
                      {asset.insurance_policy_added ? 'Insured' : 'Not Insured'}
                    </p>
                  </div>
                  {asset.insurance_class && (
                    <p className="text-xs text-gray-500 mt-1 ml-5">Class: {asset.insurance_class}</p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-sky-50 border-sky-100">
              <h4 className="text-sm font-semibold text-sky-900 mb-2">Asset QR / Tag</h4>
              <div className="bg-white p-4 rounded-lg border border-sky-200 flex flex-col items-center justify-center aspect-square">
                <Tag className="w-12 h-12 text-sky-300 mb-2" />
                <p className="text-xs font-mono text-sky-800">{asset.id.split('-')[0].toUpperCase()}</p>
              </div>
              <p className="text-xs text-sky-600 mt-3 text-center">
                System generated tracking ID for internal inventory management.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
