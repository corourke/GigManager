import { useState, useEffect, useMemo, useRef } from 'react';
import { Package, ArrowLeft, Save, Loader2, AlertCircle, Plus, X, Search } from 'lucide-react';
import { useSimpleFormChanges } from '../utils/hooks/useSimpleFormChanges';
import { createSubmissionPayload, normalizeFormData } from '../utils/form-utils';
import { toast } from 'sonner';
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
import { useAutocompleteSuggestions } from '../utils/hooks/useAutocompleteSuggestions';

interface KitScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  kitId?: string | null;
  onCancel: () => void;
  onKitCreated: (kitId: string) => void;
  onKitUpdated: () => void;
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
}

export default function KitScreen({
  organization,
  user,
  userRole,
  kitId,
  onCancel,
  onKitCreated,
  onKitUpdated,
  onSwitchOrganization,
  onLogout,
}: KitScreenProps) {
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

  // Autocomplete suggestions for kit category
  const kitCategorySuggestions = useAutocompleteSuggestions({
    field: 'category',
    organizationId: organization.id,
    sourceTable: 'kits',
    enabled: true,
  });

  // Create currentData that includes form values + nested data for change detection
  const currentData = useMemo(() => ({
    ...formData,
    kitAssets: kitAssets,
  }), [formData, kitAssets]);

  // Change detection for efficient updates
  const changeDetection = useSimpleFormChanges({
    initialData: {
      name: '',
      category: '',
      description: '',
      tags: [],
      tag_number: '',
      rental_value: '',
      kitAssets: [], // Include kit assets in initial data
    },
    currentData: currentData, // Pass the memoized currentData
  });

  // Data changes are automatically detected by the simplified hook

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
      const loadedData = {
        name: kit.name || '',
        category: kit.category || '',
        description: kit.description || '',
        tags: kit.tags || [],
        tag_number: kit.tag_number || '',
        rental_value: kit.rental_value?.toString() || '',
      };

      setFormData(loadedData);

      let loadedKitAssets: KitAsset[] = [];
      const mappedAssets = (kit.kit_assets || []).map((ka: any) => ({
        id: ka.id,
        asset_id: ka.asset.id,
        asset: ka.asset,
        quantity: ka.quantity,
      }));
      setKitAssets(mappedAssets);
      loadedKitAssets = mappedAssets;

      // Load initial data for change detection (including kit assets)
      changeDetection.loadInitialData({
        ...loadedData,
        kitAssets: loadedKitAssets || [],
      });
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
      // Normalize form data for basic kit fields
      const normalizedFormData = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        tags: formData.tags,
        tag_number: formData.tag_number,
        rental_value: formData.rental_value ? parseFloat(formData.rental_value) : null,
      };

      // Normalize and get only changed fields for basic kit data
      const normalizedData = normalizeFormData(normalizedFormData);
      
      // Transform originalData to match normalized structure (rental_value is number | null in normalized, string in original)
      const originalDataForComparison = isEditMode && changeDetection.originalData ? {
        name: changeDetection.originalData.name || '',
        category: changeDetection.originalData.category || '',
        description: changeDetection.originalData.description || '',
        tags: changeDetection.originalData.tags || [],
        tag_number: changeDetection.originalData.tag_number || '',
        rental_value: changeDetection.originalData.rental_value ? parseFloat(changeDetection.originalData.rental_value) : null,
      } : {};

      const basicKitData = isEditMode
        ? createSubmissionPayload(normalizedData, originalDataForComparison)
        : normalizedData;

      // Prepare kit data - combine basic fields with nested assets
      const kitData: any = {
        organization_id: organization.id,
        ...basicKitData,
      };

      // Always send assets (complex nested data)
      kitData.assets = kitAssets.map((ka) => ({
        id: ka.id,
        asset_id: ka.asset_id,
        quantity: ka.quantity,
      }));

      if (isEditMode && kitId) {
        await updateKit(kitId, kitData);
        toast.success('Kit updated successfully');

        // Mark as saved for change detection
        changeDetection.markAsSaved({
          name: formData.name.trim(),
          category: formData.category.trim(),
          description: formData.description.trim(),
          tags: formData.tags,
          tag_number: formData.tag_number.trim(),
          rental_value: formData.rental_value,
          kitAssets: kitAssets, // Include current kit assets in saved state
        });

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
                    list="kit_categories"
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    placeholder="e.g., Audio, Lighting, Production"
                  />
                  <datalist id="kit_categories">
                    {kitCategorySuggestions.suggestions.map((cat, index) => (
                      <option key={`kit-category-${index}-${cat}`} value={cat} />
                    ))}
                  </datalist>
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
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Value</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kitAssets.map((ka) => (
                        <TableRow key={ka.asset_id}>
                          <TableCell>
                            <div>
                              <div className="text-sm text-gray-900">
                                {ka.asset?.manufacturer_model || 'Unknown Asset'}
                              </div>
                              {ka.asset?.serial_number && (
                                <div className="text-xs text-gray-500">
                                  SN: {ka.asset.serial_number}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{ka.asset?.category || '-'}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="1"
                              value={ka.quantity}
                              onChange={(e) =>
                                handleUpdateAssetQuantity(
                                  ka.asset_id,
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className="w-20 ml-auto"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {ka.asset?.replacement_value
                              ? formatCurrency(ka.asset.replacement_value)
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency((ka.asset?.replacement_value || 0) * ka.quantity)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAsset(ka.asset_id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                  disabled={isSaving || (isEditMode && !changeDetection.hasChanges)}
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