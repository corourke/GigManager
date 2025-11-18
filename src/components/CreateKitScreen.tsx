import { useState, useEffect } from 'react';
import { Package, ArrowLeft, Save, Loader2, AlertCircle, Plus, X, Search } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import AppHeader from './AppHeader';
import type { Organization, User, UserRole } from '../App';
import { getKit, createKit, updateKit, getAssets } from '../utils/api';
import type { DbAsset } from '../utils/supabase/types';

interface CreateKitScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  kitId?: string | null;
  onCancel: () => void;
  onKitCreated: (kitId: string) => void;
  onKitUpdated: () => void;
  onNavigateToDashboard: () => void;
  onNavigateToGigs: () => void;
  onSwitchOrganization: () => void;
  onLogout: () => void;
}

interface FormData {
  name: string;
  category: string;
  description: string;
  tags: string[];
  tag_number: string;
  rental_value: string;
}

interface KitAsset {
  id?: string;
  asset_id: string;
  asset?: DbAsset;
  quantity: number;
  notes: string;
}

export default function CreateKitScreen({
  organization,
  user,
  userRole,
  kitId,
  onCancel,
  onKitCreated,
  onKitUpdated,
  onNavigateToDashboard,
  onNavigateToGigs,
  onSwitchOrganization,
  onLogout,
}: CreateKitScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    category: '',
    description: '',
    tags: [],
    tag_number: '',
    rental_value: '',
  });
  const [kitAssets, setKitAssets] = useState<KitAsset[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Asset picker dialog
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<DbAsset[]>([]);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [tagInput, setTagInput] = useState('');

  const isEditMode = !!kitId;

  useEffect(() => {
    if (kitId) {
      loadKit();
    }
    loadAvailableAssets();
  }, [kitId]);

  const loadKit = async () => {
    if (!kitId) return;

    setIsLoading(true);
    try {
      const kit = await getKit(kitId);
      setFormData({
        name: kit.name || '',
        category: kit.category || '',
        description: kit.description || '',
        tags: kit.tags || [],
        tag_number: kit.tag_number || '',
        rental_value: kit.rental_value?.toString() || '',
      });
      
      setKitAssets(
        (kit.kit_assets || []).map((ka: any) => ({
          id: ka.id,
          asset_id: ka.asset.id,
          asset: ka.asset,
          quantity: ka.quantity,
          notes: ka.notes || '',
        }))
      );
    } catch (error: any) {
      console.error('Error loading kit:', error);
      toast.error(error.message || 'Failed to load kit');
      onCancel();
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableAssets = async () => {
    try {
      const assets = await getAssets(organization.id, {
        search: assetSearchQuery || undefined,
      });
      setAvailableAssets(assets);
    } catch (error: any) {
      console.error('Error loading assets:', error);
    }
  };

  useEffect(() => {
    if (showAssetPicker) {
      loadAvailableAssets();
    }
  }, [assetSearchQuery, showAssetPicker]);

  const handleChange = (field: keyof FormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      handleChange('tags', [...formData.tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    handleChange('tags', formData.tags.filter((t) => t !== tag));
  };

  const handleAddAsset = (asset: DbAsset) => {
    // Check if asset already in kit
    const existing = kitAssets.find((ka) => ka.asset_id === asset.id);
    if (existing) {
      toast.error('Asset already in kit');
      return;
    }

    setKitAssets((prev) => [
      ...prev,
      {
        asset_id: asset.id,
        asset,
        quantity: 1,
        notes: '',
      },
    ]);
    setShowAssetPicker(false);
    setAssetSearchQuery('');
  };

  const handleUpdateAssetQuantity = (assetId: string, quantity: number) => {
    setKitAssets((prev) =>
      prev.map((ka) =>
        ka.asset_id === assetId ? { ...ka, quantity: Math.max(1, quantity) } : ka
      )
    );
  };

  const handleUpdateAssetNotes = (assetId: string, notes: string) => {
    setKitAssets((prev) =>
      prev.map((ka) => (ka.asset_id === assetId ? { ...ka, notes } : ka))
    );
  };

  const handleRemoveAsset = (assetId: string) => {
    setKitAssets((prev) => prev.filter((ka) => ka.asset_id !== assetId));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Kit name is required';
    }

    if (kitAssets.length === 0) {
      newErrors.assets = 'At least one asset must be added to the kit';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setIsSaving(true);
    try {
      const kitData = {
        organization_id: organization.id,
        name: formData.name.trim(),
        category: formData.category.trim() || undefined,
        description: formData.description.trim() || undefined,
        tags: formData.tags,
        tag_number: formData.tag_number.trim() || undefined,
        rental_value: formData.rental_value ? parseFloat(formData.rental_value) : undefined,
        assets: kitAssets.map((ka) => ({
          id: ka.id,
          asset_id: ka.asset_id,
          quantity: ka.quantity,
          notes: ka.notes.trim() || undefined,
        })),
      };

      if (isEditMode && kitId) {
        await updateKit(kitId, kitData);
        toast.success('Kit updated successfully');
        onKitUpdated();
      } else {
        const newKit = await createKit(kitData);
        toast.success('Kit created successfully');
        onKitCreated(newKit.id);
      }
    } catch (error: any) {
      console.error('Error saving kit:', error);
      toast.error(error.message || 'Failed to save kit');
    } finally {
      setIsSaving(false);
    }
  };

  const getTotalValue = () => {
    return kitAssets.reduce((total, ka) => {
      return total + (ka.asset?.replacement_value || 0) * ka.quantity;
    }, 0);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        organization={organization}
        user={user}
        userRole={userRole}
        currentRoute="create-kit"
        onNavigateToDashboard={onNavigateToDashboard}
        onNavigateToGigs={onNavigateToGigs}
        onSwitchOrganization={onSwitchOrganization}
        onLogout={onLogout}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={onCancel} className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Kits
          </Button>
          <h1 className="text-gray-900 flex items-center gap-2">
            <Package className="w-8 h-8 text-sky-500" />
            {isEditMode ? 'Edit Kit' : 'Create New Kit'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {isEditMode
              ? 'Update kit information and assets'
              : 'Create a reusable equipment collection'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="p-6">
              <h3 className="text-gray-900 mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Kit Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g., Small Lighting Setup, Wedding DJ Kit"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    placeholder="e.g., Audio, Lighting, Production"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Describe this kit and when to use it..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Add tags (press Enter)"
                    />
                    <Button type="button" onClick={handleAddTag} variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="pl-2 pr-1">
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tag_number">Tag Number</Label>
                  <Input
                    id="tag_number"
                    value={formData.tag_number}
                    onChange={(e) => handleChange('tag_number', e.target.value)}
                    placeholder="e.g., KIT-001, LGT-A"
                  />
                  <p className="text-xs text-gray-500">
                    Physical tag or identifier for this kit
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rental_value">Rental Value</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <Input
                      id="rental_value"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.rental_value}
                      onChange={(e) => handleChange('rental_value', e.target.value)}
                      placeholder="0.00"
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Daily or event rental rate for this kit
                  </p>
                </div>
              </div>
            </Card>

            {/* Assets */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-gray-900">Assets in Kit</h3>
                  {errors.assets && (
                    <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.assets}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={() => setShowAssetPicker(true)}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Asset
                </Button>
              </div>

              {kitAssets.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-600 mb-4">No assets added yet</p>
                  <Button
                    type="button"
                    onClick={() => setShowAssetPicker(true)}
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Asset
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {kitAssets.map((ka) => (
                    <div
                      key={ka.asset_id}
                      className="p-4 border border-gray-200 rounded-lg space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm text-gray-900">
                            {ka.asset?.manufacturer_model}
                          </div>
                          <div className="text-xs text-gray-500">
                            {ka.asset?.category}
                            {ka.asset?.serial_number && ` • SN: ${ka.asset.serial_number}`}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAsset(ka.asset_id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`quantity-${ka.asset_id}`} className="text-xs">
                            Quantity
                          </Label>
                          <Input
                            id={`quantity-${ka.asset_id}`}
                            type="number"
                            min="1"
                            value={ka.quantity}
                            onChange={(e) =>
                              handleUpdateAssetQuantity(
                                ka.asset_id,
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Value</Label>
                          <div className="mt-1 text-sm text-gray-900">
                            {formatCurrency((ka.asset?.replacement_value || 0) * ka.quantity)}
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`notes-${ka.asset_id}`} className="text-xs">
                          Notes
                        </Label>
                        <Input
                          id={`notes-${ka.asset_id}`}
                          value={ka.notes}
                          onChange={(e) =>
                            handleUpdateAssetNotes(ka.asset_id, e.target.value)
                          }
                          placeholder="Optional notes for this asset..."
                          className="mt-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-gray-900 mb-4">Kit Summary</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Total Assets</p>
                  <p className="text-2xl text-gray-900">{kitAssets.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-2xl text-gray-900">
                    {kitAssets.reduce((sum, ka) => sum + ka.quantity, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl text-gray-900">{formatCurrency(getTotalValue())}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="space-y-3">
                <Button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isEditMode ? 'Update Kit' : 'Create Kit'}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSaving}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Asset Picker Dialog */}
      <Dialog open={showAssetPicker} onOpenChange={setShowAssetPicker}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Asset to Kit</DialogTitle>
            <DialogDescription>
              Select an asset from your inventory to add to this kit
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search assets..."
                value={assetSearchQuery}
                onChange={(e) => setAssetSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {availableAssets.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No assets found
                </div>
              ) : (
                availableAssets.map((asset) => {
                  const alreadyAdded = kitAssets.some((ka) => ka.asset_id === asset.id);
                  return (
                    <div
                      key={asset.id}
                      className={`p-4 hover:bg-gray-50 ${
                        alreadyAdded ? 'opacity-50' : 'cursor-pointer'
                      }`}
                      onClick={() => !alreadyAdded && handleAddAsset(asset)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm text-gray-900">
                            {asset.manufacturer_model}
                          </div>
                          <div className="text-xs text-gray-500">
                            {asset.category}
                            {asset.serial_number && ` • SN: ${asset.serial_number}`}
                          </div>
                        </div>
                        {alreadyAdded && (
                          <Badge variant="outline" className="ml-2">
                            Added
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}