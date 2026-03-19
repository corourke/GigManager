import { useState, useEffect } from 'react';
import { Package, ArrowLeft, Save, Loader2, AlertCircle, History, CreditCard, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import AppHeader from './AppHeader';
import { Organization, User, UserRole } from '../utils/supabase/types';
import { getAsset, createAsset, updateAsset, getAssetStatusHistory, getAssetInventoryTracking } from '../services/asset.service';
import type { DbAsset, DbAssetStatusHistory, DbInventoryTracking } from '../utils/supabase/types';
import { ASSET_STATUS_CONFIG } from '../utils/supabase/constants';
import { useSimpleFormChanges } from '../utils/hooks/useSimpleFormChanges';
import { createSubmissionPayload, normalizeFormData } from '../utils/form-utils';
import { useAutocompleteSuggestions } from '../utils/hooks/useAutocompleteSuggestions';
import AttachmentManager from './AttachmentManager';

interface AssetScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  assetId?: string | null; // If provided, edit mode
  onCancel: () => void;
  onAssetCreated: (assetId: string) => void;
  onAssetUpdated: () => void;
  onNavigateToPurchases?: (purchaseId?: string) => void;
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
  item_price: string;
  item_cost: string;
  replacement_value: string;
  sub_category: string;
  type: string;
  description: string;
  insurance_policy_added: boolean;
  insurance_class: string;
  quantity: string;
  tag_number: string;
  status: string;
  retired_on: string;
  service_life: string;
  dep_method: string;
  liquidation_amt: string;
  purchase_id?: string;
}


export default function AssetScreen({
  organization,
  user,
  userRole,
  assetId,
  onCancel,
  onAssetCreated,
  onAssetUpdated,
  onNavigateToPurchases,
  onSwitchOrganization,
  onEditProfile,
  onLogout,
}: AssetScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [totalCost, setTotalCost] = useState<string>(''); // Helper field, not saved
  const [statusHistory, setStatusHistory] = useState<DbAssetStatusHistory[]>([]);
  const [inventoryTracking, setInventoryTracking] = useState<DbInventoryTracking[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Form state with change detection
  const [formData, setFormData] = useState<FormData>({
    category: '',
    manufacturer_model: '',
    serial_number: '',
    acquisition_date: '',
    vendor: '',
    item_price: '',
    item_cost: '',
    replacement_value: '',
    sub_category: '',
    type: '',
    description: '',
    insurance_policy_added: false,
    insurance_class: '',
    quantity: '',
    tag_number: '',
    status: 'Active',
    retired_on: '',
    service_life: '',
    dep_method: '',
    liquidation_amt: '',
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
      const loadedData: FormData = {
        category: asset.category || '',
        manufacturer_model: asset.manufacturer_model || '',
        serial_number: asset.serial_number || '',
        acquisition_date: asset.acquisition_date || '',
        vendor: asset.vendor || '',
        item_price: asset.item_price?.toString() || '',
        item_cost: asset.item_cost?.toString() || '',
        replacement_value: asset.replacement_value?.toString() || '',
        sub_category: asset.sub_category || '',
        type: asset.type || '',
        description: asset.description || '',
        insurance_policy_added: asset.insurance_policy_added || false,
        insurance_class: asset.insurance_class || '',
        quantity: asset.quantity?.toString() || '',
        tag_number: asset.tag_number || '',
        status: asset.status || 'Active',
        retired_on: asset.retired_on || '',
        service_life: asset.service_life?.toString() || '',
        dep_method: asset.dep_method || '',
        liquidation_amt: asset.liquidation_amt?.toString() || '',
        purchase_id: asset.purchase_id,
      };
      setFormData(loadedData);
      changeDetection.loadInitialData(loadedData);

      // Load read-only history tables (edit mode only)
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
      onCancel();
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-set status to 'Disposed' when liquidation_amt is entered
      if (field === 'liquidation_amt' && typeof value === 'string' && value.trim() !== '') {
        next.status = 'Disposed';
      }
      return next;
    });
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

    if (formData.item_price && isNaN(parseFloat(formData.item_price))) {
      newErrors.item_price = 'Item price must be a valid number';
    }

    if (formData.item_cost && isNaN(parseFloat(formData.item_cost))) {
      newErrors.item_cost = 'Item cost must be a valid number';
    }

    if (formData.replacement_value && isNaN(parseFloat(formData.replacement_value))) {
      newErrors.replacement_value = 'Replacement value must be a valid number';
    }

    if (formData.quantity && (isNaN(parseInt(formData.quantity)) || parseInt(formData.quantity) < 1)) {
      newErrors.quantity = 'Quantity must be a positive number';
    }

    if (formData.service_life && (isNaN(parseInt(formData.service_life)) || parseInt(formData.service_life) < 1)) {
      newErrors.service_life = 'Service life must be a positive whole number';
    }

    if (formData.liquidation_amt && isNaN(parseFloat(formData.liquidation_amt))) {
      newErrors.liquidation_amt = 'Disposal or salvage amount must be a valid number';
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
      if (normalizedData.item_price === null || normalizedData.item_price === '') {
        normalizedData.item_price = undefined as any;
      } else if (typeof normalizedData.item_price === 'string' && normalizedData.item_price.trim()) {
        normalizedData.item_price = parseFloat(normalizedData.item_price) as any;
      }

      if (normalizedData.item_cost === null || normalizedData.item_cost === '') {
        normalizedData.item_cost = undefined as any;
      } else if (typeof normalizedData.item_cost === 'string' && normalizedData.item_cost.trim()) {
        normalizedData.item_cost = parseFloat(normalizedData.item_cost) as any;
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

      if (normalizedData.service_life === null || normalizedData.service_life === '') {
        normalizedData.service_life = undefined as any;
      } else if (typeof normalizedData.service_life === 'string' && normalizedData.service_life.trim()) {
        normalizedData.service_life = parseInt(normalizedData.service_life) as any;
      }

      if (normalizedData.liquidation_amt === null || normalizedData.liquidation_amt === '') {
        normalizedData.liquidation_amt = undefined as any;
      } else if (typeof normalizedData.liquidation_amt === 'string' && normalizedData.liquidation_amt.trim()) {
        normalizedData.liquidation_amt = parseFloat(normalizedData.liquidation_amt) as any;
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
              </div>
            </div>

            {/* Financial Information */}
            <div className="border-t border-gray-100 pt-4">
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
                    Total Invoice Amount
                    <span className="text-xs text-gray-400 font-normal ml-2">
                      (Used to calculate Item Cost)
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
                            handleChange('item_cost', itemCost);
                          }
                        }
                      }}
                      placeholder="0.00"
                      className="pl-7"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="item_price">
                    Item Price
                    <span className="text-xs text-gray-400 font-normal ml-2">
                      (Selling price per item)
                    </span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <Input
                      id="item_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.item_price}
                      onChange={(e) => handleChange('item_price', e.target.value)}
                      placeholder="0.00"
                      className={`pl-7 ${errors.item_price ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.item_price && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.item_price}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="item_cost">
                    Item Cost
                    <span className="text-xs text-gray-400 font-normal ml-2">
                      (Burdened cost per item)
                    </span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <Input
                      id="item_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.item_cost}
                      onChange={(e) => handleChange('item_cost', e.target.value)}
                      placeholder="0.00"
                      className={`pl-7 ${errors.item_cost ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.item_cost && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.item_cost}
                    </p>
                  )}
                </div>

                {formData.purchase_id && onNavigateToPurchases && (
                  <div className="space-y-2 flex flex-col justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigateToPurchases?.(formData.purchase_id)}
                      className="text-sky-600 border-sky-200 hover:bg-sky-50"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      View in Purchase Management
                      <ExternalLink className="w-3 h-3 ml-2 opacity-50" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Insurance */}
            <div className="border-t border-gray-100 pt-4">
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

            {/* Asset Lifecycle */}
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-gray-900 mb-2">Asset Lifecycle</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tag_number">Inventory Tag ID</Label>
                  <Input
                    id="tag_number"
                    value={formData.tag_number}
                    onChange={(e) => handleChange('tag_number', e.target.value)}
                    placeholder="e.g., TAG-001"
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange('status', value)}
                  >
                    <SelectTrigger id="status">
                      {formData.status in ASSET_STATUS_CONFIG ? (
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${ASSET_STATUS_CONFIG[formData.status as keyof typeof ASSET_STATUS_CONFIG].color}`}>
                          {ASSET_STATUS_CONFIG[formData.status as keyof typeof ASSET_STATUS_CONFIG].label}
                        </span>
                      ) : (
                        <SelectValue placeholder="Select status" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ASSET_STATUS_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.status === 'Disposed' && (
                    <p className="text-xs text-amber-600">
                      This asset is marked as disposed. Enter a Disposal or Salvage Amount below if applicable.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service_life">Expected Service Life (years)</Label>
                  <Input
                    id="service_life"
                    type="number"
                    min="1"
                    value={formData.service_life}
                    onChange={(e) => handleChange('service_life', e.target.value)}
                    placeholder="e.g., 10"
                    className={errors.service_life ? 'border-red-500' : ''}
                  />
                  {errors.service_life && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.service_life}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dep_method">Depreciation Method</Label>
                  <Input
                    id="dep_method"
                    value={formData.dep_method}
                    onChange={(e) => handleChange('dep_method', e.target.value)}
                    placeholder="e.g., Straight-Line"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retired_on">Retired On</Label>
                  <Input
                    id="retired_on"
                    type="date"
                    value={formData.retired_on}
                    onChange={(e) => handleChange('retired_on', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="liquidation_amt">
                    Disposal or Salvage Amount
                    <span className="text-xs text-gray-400 font-normal ml-2">
                      (Setting this marks status as Disposed)
                    </span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <Input
                      id="liquidation_amt"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.liquidation_amt}
                      onChange={(e) => handleChange('liquidation_amt', e.target.value)}
                      placeholder="0.00"
                      className={`pl-7 ${errors.liquidation_amt ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.liquidation_amt && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.liquidation_amt}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Description and Attachments */}
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-gray-900 mb-2">Additional Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Additional notes about this asset..."
                    rows={6}
                  />
                  <p className="text-xs text-gray-500">
                    Supports Markdown formatting
                  </p>
                </div>
                
                {isEditMode && assetId && (
                  <div className="space-y-2">
                    <AttachmentManager
                      organizationId={organization.id}
                      entityType="asset"
                      entityId={assetId}
                      title="Asset Attachments"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Read-only History Tables — Edit Mode Only */}
            {isEditMode && (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                {/* Asset Status History */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <History className="w-4 h-4 text-gray-500" />
                    <h3 className="text-gray-900">Status History</h3>
                  </div>
                  {isLoadingHistory ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading history...
                    </div>
                  ) : statusHistory.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">No status changes recorded.</p>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
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
                              <TableCell>
                                <span className="text-gray-500">{row.from_status ?? '—'}</span>
                              </TableCell>
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
                    </div>
                  )}
                </div>

                {/* Inventory Tracking */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <History className="w-4 h-4 text-gray-500" />
                    <h3 className="text-gray-900">Inventory Tracking</h3>
                    {inventoryTracking.length > 10 && (
                      <span className="text-xs text-gray-400 ml-1">(last 10 of {inventoryTracking.length})</span>
                    )}
                  </div>
                  {isLoadingHistory ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading tracking...
                    </div>
                  ) : inventoryTracking.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">No inventory scans recorded.</p>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
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
                    </div>
                  )}
                </div>
              </div>
            )}

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
