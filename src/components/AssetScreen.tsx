import { useState, useEffect } from 'react';
import { Package, ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import AppHeader from './AppHeader';
import { Organization, User, UserRole } from '../utils/supabase/types';
import { getAsset, createAsset, updateAsset } from '../services/asset.service';
import type { DbAsset } from '../utils/supabase/types';
import { useSimpleFormChanges } from '../utils/hooks/useSimpleFormChanges';
import { createSubmissionPayload, normalizeFormData } from '../utils/form-utils';
import { useAutocompleteSuggestions } from '../utils/hooks/useAutocompleteSuggestions';

interface AssetScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  assetId?: string | null; // If provided, edit mode
  onCancel: () => void;
  onAssetCreated: (assetId: string) => void;
  onAssetUpdated: () => void;
  onSwitchOrganization: () => void;
  onEditProfile?: () => void;
  onLogout: () => void;
}

interface FormData {
  category: string;
  manufacturer_model: string;
  serial_number: string;
  acquisition_date: string;
  vendor: string;
  cost: string;
  replacement_value: string;
  sub_category: string;
  type: string;
  description: string;
  insurance_policy_added: boolean;
  insurance_class: string;
  quantity: string;
}


export default function AssetScreen({
  organization,
  user,
  userRole,
  assetId,
  onCancel,
  onAssetCreated,
  onAssetUpdated,
  onSwitchOrganization,
  onEditProfile,
  onLogout,
}: AssetScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [totalCost, setTotalCost] = useState<string>(''); // Helper field, not saved

  // Form state with change detection
  const [formData, setFormData] = useState<FormData>({
    category: '',
    manufacturer_model: '',
    serial_number: '',
    acquisition_date: '',
    vendor: '',
    cost: '',
    replacement_value: '',
    sub_category: '',
    type: '',
    description: '',
    insurance_policy_added: false,
    insurance_class: '',
    quantity: '',
  });

  // Change detection hook (simplified for manual state)
  const changeDetection = useSimpleFormChanges({
    currentData: formData,
    initialData: {},
  });

  const isEditMode = !!assetId;

  // Autocomplete suggestions for all fields
  const categorySuggestions = useAutocompleteSuggestions({
    field: 'category',
    organizationId: organization.id,
    sourceTable: 'assets',
    enabled: true,
  });

  const subCategorySuggestions = useAutocompleteSuggestions({
    field: 'sub_category',
    organizationId: organization.id,
    sourceTable: 'assets',
    filterByCategory: formData.category || undefined,
    enabled: true,
  });

  const typeSuggestions = useAutocompleteSuggestions({
    field: 'type',
    organizationId: organization.id,
    sourceTable: 'assets',
    enabled: true,
  });

  const vendorSuggestions = useAutocompleteSuggestions({
    field: 'vendor',
    organizationId: organization.id,
    sourceTable: 'assets',
    enabled: true,
  });

  useEffect(() => {
    if (assetId) {
      loadAsset();
    }
  }, [assetId]);

  const loadAsset = async () => {
    if (!assetId) return;

    setIsLoading(true);
    try {
      const asset = await getAsset(assetId);
      const loadedData = {
        category: asset.category || '',
        manufacturer_model: asset.manufacturer_model || '',
        serial_number: asset.serial_number || '',
        acquisition_date: asset.acquisition_date || '',
        vendor: asset.vendor || '',
        cost: asset.cost?.toString() || '',
        replacement_value: asset.replacement_value?.toString() || '',
        sub_category: asset.sub_category || '',
        type: asset.type || '',
        description: asset.description || '',
        insurance_policy_added: asset.insurance_policy_added || false,
        insurance_class: asset.insurance_class || '',
        quantity: asset.quantity?.toString() || '',
      };
      setFormData(loadedData);
      changeDetection.loadInitialData(loadedData);
    } catch (error: any) {
      console.error('Error loading asset:', error);
      toast.error(error.message || 'Failed to load asset');
      onCancel();
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    if (!formData.manufacturer_model.trim()) {
      newErrors.manufacturer_model = 'Manufacturer/Model is required';
    }

    if (!formData.acquisition_date) {
      newErrors.acquisition_date = 'Acquisition date is required';
    }

    if (formData.cost && isNaN(parseFloat(formData.cost))) {
      newErrors.cost = 'Cost must be a valid number';
    }

    if (formData.replacement_value && isNaN(parseFloat(formData.replacement_value))) {
      newErrors.replacement_value = 'Replacement value must be a valid number';
    }

    if (formData.quantity && (isNaN(parseInt(formData.quantity)) || parseInt(formData.quantity) < 1)) {
      newErrors.quantity = 'Quantity must be a positive number';
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
      // Normalize form data first
      const normalizedData = normalizeFormData(formData);
      
      // Convert numeric string fields: empty/null -> undefined, non-empty -> parse to number
      // This prevents sending empty strings or null to numeric database fields
      if (normalizedData.cost === null || normalizedData.cost === '') {
        normalizedData.cost = undefined as any;
      } else if (typeof normalizedData.cost === 'string' && normalizedData.cost.trim()) {
        normalizedData.cost = parseFloat(normalizedData.cost) as any;
      }
      
      if (normalizedData.replacement_value === null || normalizedData.replacement_value === '') {
        normalizedData.replacement_value = undefined as any;
      } else if (typeof normalizedData.replacement_value === 'string' && normalizedData.replacement_value.trim()) {
        normalizedData.replacement_value = parseFloat(normalizedData.replacement_value) as any;
      }
      
      if (normalizedData.quantity === null || normalizedData.quantity === '') {
        normalizedData.quantity = undefined as any;
      } else if (typeof normalizedData.quantity === 'string' && normalizedData.quantity.trim()) {
        normalizedData.quantity = parseInt(normalizedData.quantity) as any;
      }

      const submissionData = isEditMode && changeDetection.hasChanges
        ? createSubmissionPayload(normalizedData, changeDetection.originalData)
        : {
            organization_id: organization.id,
            ...normalizedData,
          };

      if (isEditMode && assetId) {
        // For updates, only send changed fields + required organization_id
        const updateData = {
          ...submissionData,
          organization_id: organization.id, // Always include for RLS
        };
        await updateAsset(assetId, updateData);
        changeDetection.markAsSaved(normalizedData);
        toast.success('Asset updated successfully');
        onAssetUpdated();
      } else {
        // For creates, send all data
        const createData = {
          organization_id: organization.id,
          ...normalizedData,
        };
        const newAsset = await createAsset(createData);
        toast.success('Asset created successfully');
        onAssetCreated(newAsset.id);
      }
    } catch (error: any) {
      console.error('Error saving asset:', error);
      toast.error(error.message || 'Failed to save asset');
    } finally {
      setIsSaving(false);
    }
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
        currentRoute="create-asset"
        onSwitchOrganization={onSwitchOrganization}
        onEditProfile={onEditProfile}
        onLogout={onLogout}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assets
          </Button>
          <h1 className="text-gray-900 flex items-center gap-2">
            <Package className="w-8 h-8 text-sky-500" />
            {isEditMode ? 'Edit Asset' : 'Add New Asset'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {isEditMode
              ? 'Update asset information'
              : 'Add a new asset to your inventory'}
          </p>
        </div>

        {/* Form */}
        <Card className="p-4">
          <div className="space-y-4">
            {/* Basic Information */}
            <div>
              <h3 className="text-gray-900 mb-2">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="category"
                    list="categories"
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    placeholder="e.g., Audio, Lighting, Video"
                    className={errors.category ? 'border-red-500' : ''}
                  />
                  <datalist id="categories">
                    {categorySuggestions.suggestions.map((cat, index) => (
                      <option key={`category-${index}-${cat}`} value={cat} />
                    ))}
                  </datalist>
                  {errors.category && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.category}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sub_category">Sub-Category</Label>
                  <Input
                    id="sub_category"
                    list="sub_categories"
                    value={formData.sub_category}
                    onChange={(e) => handleChange('sub_category', e.target.value)}
                    placeholder="e.g., Microphones, LED Fixtures"
                  />
                  <datalist id="sub_categories">
                    {subCategorySuggestions.suggestions.map((subCat, index) => (
                      <option key={`subcategory-${index}-${subCat}`} value={subCat} />
                    ))}
                  </datalist>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="manufacturer_model">
                    Manufacturer and Model <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="manufacturer_model"
                    value={formData.manufacturer_model}
                    onChange={(e) => handleChange('manufacturer_model', e.target.value)}
                    placeholder="e.g., Shure SM58, Martin MAC Aura"
                    className={errors.manufacturer_model ? 'border-red-500' : ''}
                  />
                  {errors.manufacturer_model && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.manufacturer_model}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Equipment Type</Label>
                  <Input
                    id="type"
                    list="types"
                    value={formData.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    placeholder="e.g., Dynamic Microphone"
                  />
                  <datalist id="types">
                    {typeSuggestions.suggestions.map((type, index) => (
                      <option key={`type-${index}-${type}`} value={type} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serial_number">Serial Number</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) => handleChange('serial_number', e.target.value)}
                    placeholder="Unique serial number"
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div>
              <h3 className="text-gray-900 mb-2">Financial Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="acquisition_date">
                    Acquisition Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="acquisition_date"
                    type="date"
                    value={formData.acquisition_date}
                    onChange={(e) => handleChange('acquisition_date', e.target.value)}
                    className={errors.acquisition_date ? 'border-red-500' : ''}
                  />
                  {errors.acquisition_date && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.acquisition_date}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor</Label>
                  <Input
                    id="vendor"
                    list="vendors"
                    value={formData.vendor}
                    onChange={(e) => handleChange('vendor', e.target.value)}
                    placeholder="Where was this purchased?"
                  />
                  <datalist id="vendors">
                    {vendorSuggestions.suggestions.map((vendor, index) => (
                      <option key={`vendor-${index}-${vendor}`} value={vendor} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => handleChange('quantity', e.target.value)}
                    placeholder="1"
                    className={errors.quantity ? 'border-red-500' : ''}
                  />
                  <p className="text-xs text-gray-500">
                    For bulk assets that don't have unique serial numbers
                  </p>
                  {errors.quantity && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.quantity}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_cost">
                    Total Cost
                    <span className="text-xs text-gray-400 font-normal ml-2">
                      (Cost of all items (not saved))
                    </span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <Input
                      id="total_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={totalCost}
                      onChange={(e) => setTotalCost(e.target.value)}
                      onBlur={() => {
                        if (totalCost && formData.quantity) {
                          const total = parseFloat(totalCost);
                          const qty = parseInt(formData.quantity) || 1;
                          if (!isNaN(total) && qty > 0) {
                            const itemCost = (total / qty).toFixed(2);
                            handleChange('cost', itemCost);
                          }
                        }
                      }}
                      placeholder="0.00"
                      className="pl-7"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost">
                    Item Cost
                    <span className="text-xs text-gray-400 font-normal ml-2">
                      (Cost per each item)
                    </span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.cost}
                      onChange={(e) => handleChange('cost', e.target.value)}
                      placeholder="0.00"
                      className={`pl-7 ${errors.cost ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.cost && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.cost}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="replacement_value">
                    Replacement Value
                    <span className="text-xs text-gray-400 font-normal ml-2">
                      (Per item)
                    </span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <Input
                      id="replacement_value"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.replacement_value}
                      onChange={(e) => handleChange('replacement_value', e.target.value)}
                      placeholder="0.00"
                      className={`pl-7 ${errors.replacement_value ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.replacement_value && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.replacement_value}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Insurance */}
            <div>
              <h3 className="text-gray-900 mb-2">Insurance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-normal">Insured</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="insurance_policy_added"
                      checked={formData.insurance_policy_added}
                      onCheckedChange={(checked) =>
                        handleChange('insurance_policy_added', !!checked)
                      }
                    />
                    <Label
                      htmlFor="insurance_policy_added"
                      className="text-sm font-normal cursor-pointer"
                    >This asset has been added to an insurance policy.</Label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="insurance_class">Insurance Class</Label>
                  <Input
                    id="insurance_class"
                    value={formData.insurance_class}
                    onChange={(e) => handleChange('insurance_class', e.target.value)}
                    placeholder="e.g., Class A, Premium Coverage"
                  />
                  <p className="text-xs text-gray-500">
                    The category used by your insurance company.
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-gray-900 mb-2">Additional Details</h3>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Additional notes about this asset..."
                  rows={4}
                />
                <p className="text-xs text-gray-500">
                  Supports Markdown formatting
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSaving || (isEditMode && !changeDetection.hasChanges)}
                className="bg-sky-500 hover:bg-sky-600 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : isEditMode && !changeDetection.hasChanges ? (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    No Changes
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isEditMode ? 'Update Asset' : 'Create Asset'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}