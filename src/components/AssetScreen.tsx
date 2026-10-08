import { useState, useEffect } from 'react';
import { Save, Loader2, AlertCircle, History, CreditCard, ExternalLink, Box, Layers, Tag } from 'lucide-react';
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
import { PageHeader } from './layout/PageHeader';
import { Organization, User, UserRole } from '../utils/supabase/types';
import { createAsset, updateAsset, getAssetDepreciatedDate } from '../services/asset.service';
import { useAssetData, useAssetMutations } from './asset/useAssetData';
import type { DbInventoryTracking, ActivityLogEntry } from '../utils/supabase/types';
import ActivityFeed from './ActivityFeed';
import { ASSET_STATUS_CONFIG } from '../utils/supabase/constants';
import { useSimpleFormChanges } from '../utils/hooks/useSimpleFormChanges';
import { createSubmissionPayload, normalizeFormData } from '../utils/form-utils';
import { useAutocompleteSuggestions } from '../utils/hooks/useAutocompleteSuggestions';
import { getEquipmentCategories, getEquipmentCategoryPeriods } from '../services/purchaseCategory.service';
import { getLockedTaxYears } from '../services/taxYear.service';
import { isTaxYearLocked } from '../utils/taxTreatment';
import { RECOVERY_PERIODS, categoryPeriod, type CategoryPeriods } from '../utils/recoveryPeriod';
import AttachmentManager from './AttachmentManager';
import { getItem, getItems, type EquipmentItemWithRecords } from '../services/equipmentItem.service';
import { recordKind, type RecordKind } from '../utils/equipmentItems';
import { cn } from './ui/utils';

interface AssetScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  assetId?: string | null; // If provided, edit mode
  /** Adding to this item (#182). In edit mode the record's own item is used. */
  itemId?: string | null;
  /** Back and after saving: the item page, once the item is known. */
  onBackToItem?: (itemId: string) => void;
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
  type: string;
  description: string;
  insurance_policy_added: boolean;
  insurance_class: string;
  quantity: string;
  tag_number: string;
  status: string;
  retired_on: string;
  recovery_period: string;
  liquidation_amt: string;
  purchase_id?: string;
}


export default function AssetScreen({
  organization,
  user,
  userRole,
  assetId,
  itemId,
  onBackToItem,
  onCancel,
  onAssetCreated,
  onAssetUpdated,
  onNavigateToPurchases,
  onSwitchOrganization,
  onEditProfile,
  onLogout,
}: AssetScreenProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [totalCost, setTotalCost] = useState<string>(''); // Helper field, not saved

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
    type: '',
    description: '',
    insurance_policy_added: false,
    insurance_class: '',
    quantity: '',
    tag_number: '',
    status: 'Active',
    retired_on: '',
    recovery_period: '',
    liquidation_amt: '',
  });

  // What it is (#182): the item this unit or lot belongs to. Picked from the
  // organization's items, or "a new item" typed in (the database finds or
  // creates the item from model + category).
  const [item, setItem] = useState<EquipmentItemWithRecords | null>(null);
  const [itemOptions, setItemOptions] = useState<EquipmentItemWithRecords[]>([]);
  const [choosingItem, setChoosingItem] = useState(false);
  // Unit (serial or tag, quantity 1) or lot (neither, a quantity).
  const [kind, setKind] = useState<RecordKind>('unit');
  const [loadedLotQuantity, setLoadedLotQuantity] = useState<number | null>(null);

  // Change detection hook (simplified for manual state)
  const changeDetection = useSimpleFormChanges({
    currentData: formData,
    initialData: {},
  });

  const isEditMode = !!assetId;

  // Categories come from the organization's list (Settings → Categories);
  // types are suggested from those already used in the chosen category.
  const [equipmentCategories, setEquipmentCategories] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    getEquipmentCategories(organization.id).then(c => { if (!cancelled) setEquipmentCategories(c); });
    getEquipmentCategoryPeriods(organization.id).then(p => { if (!cancelled) setCategoryPeriods(p); });
    return () => { cancelled = true; };
  }, [organization.id]);

  const applyItem = (picked: EquipmentItemWithRecords) => {
    setItem(picked);
    setChoosingItem(false);
    setFormData((prev) => ({
      ...prev,
      manufacturer_model: picked.manufacturer_model,
      category: picked.category,
      type: picked.type ?? '',
      description: picked.description ?? '',
      insurance_class: picked.insurance_class ?? '',
    }));
  };

  useEffect(() => {
    if (assetId || !itemId) return;
    let cancelled = false;
    getItem(itemId).then((i) => { if (!cancelled) applyItem(i); }).catch(() => {});
    return () => { cancelled = true; };
  }, [assetId, itemId]);

  const needsPicker = !item && !assetId && !itemId;
  useEffect(() => {
    if (!needsPicker && !choosingItem) return;
    let cancelled = false;
    getItems(organization.id).then((list) => { if (!cancelled) setItemOptions(list); }).catch(() => {});
    return () => { cancelled = true; };
  }, [needsPicker, choosingItem, organization.id]);

  // Only depreciated equipment has a recovery period (#125); a filed year's,
  // once set, stays.
  const [categoryPeriods, setCategoryPeriods] = useState<CategoryPeriods>({});
  const [depreciatedOn, setDepreciatedOn] = useState<string | null>(null);
  const [lockedYears, setLockedYears] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (!assetId) return;
    let cancelled = false;
    getAssetDepreciatedDate(assetId).then(d => { if (!cancelled) setDepreciatedOn(d); });
    getLockedTaxYears(organization.id).then(y => { if (!cancelled) setLockedYears(y); });
    return () => { cancelled = true; };
  }, [assetId, organization.id]);
  const depreciated = !!depreciatedOn;
  const defaultPeriod = categoryPeriod(categoryPeriods, formData.category);
  const periodLocked = depreciated && isTaxYearLocked(depreciatedOn, lockedYears) && !!changeDetection.originalData?.recovery_period;

  const typeSuggestions = useAutocompleteSuggestions({
    field: 'type',
    organizationId: organization.id,
    sourceTable: 'assets',
    filterByCategory: formData.category || undefined,
    enabled: !!formData.category,
  });

  const vendorSuggestions = useAutocompleteSuggestions({
    field: 'vendor',
    organizationId: organization.id,
    sourceTable: 'assets',
    enabled: true,
  });

  // Server state (Phase 7): asset + read-only history/tracking via useQuery.
  const { assetQuery, inventoryTrackingQuery, activityQuery } = useAssetData(assetId);
  const assetMutations = useAssetMutations(organization.id);
  const isLoading = assetQuery.isLoading;
  const isSaving = assetMutations.createAsset.isPending || assetMutations.updateAsset.isPending;
  const inventoryTracking = (inventoryTrackingQuery.data ?? []) as DbInventoryTracking[];
  const assetActivity = (activityQuery.data ?? []) as ActivityLogEntry[];
  const isLoadingHistory = inventoryTrackingQuery.isLoading || activityQuery.isLoading;

  // Populate the form when the asset query first resolves (edit mode). The
  // query is not invalidated by mutations, so this never clobbers edits.
  useEffect(() => {
    const asset = assetQuery.data;
    if (!asset) return;
    const loadedData: FormData = {
      category: asset.category || '',
      manufacturer_model: asset.manufacturer_model || '',
      serial_number: asset.serial_number || '',
      acquisition_date: asset.acquisition_date || '',
      vendor: asset.vendor || '',
      item_price: asset.item_price?.toString() || '',
      item_cost: asset.item_cost?.toString() || '',
      replacement_value: asset.replacement_value?.toString() || '',
      type: asset.type || '',
      description: asset.description || '',
      insurance_policy_added: asset.insurance_policy_added || false,
      insurance_class: asset.insurance_class || '',
      quantity: asset.quantity?.toString() || '',
      tag_number: asset.tag_number || '',
      status: asset.status || 'Active',
      retired_on: asset.retired_on || '',
      recovery_period: asset.recovery_period?.toString() || '',
      liquidation_amt: asset.liquidation_amt?.toString() || '',
      purchase_id: asset.purchase_id,
    };
    setFormData(loadedData);
    changeDetection.loadInitialData(loadedData);
    const loadedKind = recordKind(asset);
    setKind(loadedKind);
    setLoadedLotQuantity(loadedKind === 'lot' ? (asset.quantity ?? 1) : null);
    if (asset.equipment_item_id) {
      getItem(asset.equipment_item_id).then(setItem).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetQuery.data]);

  // Surface a load failure the same way the old loader did: toast + cancel.
  useEffect(() => {
    if (!assetQuery.isError) return;
    const error = assetQuery.error as any;
    console.error('Error loading asset:', error);
    toast.error(error?.message || 'Failed to load asset');
    onCancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetQuery.isError]);

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
      newErrors.category = item ? 'Category is required' : 'Choose an item, or enter a new one';
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

    if (kind === 'unit' && !formData.serial_number.trim() && !formData.tag_number.trim()) {
      newErrors.unit = 'A unit needs a serial number or a tag (either will do).';
    }

    if (kind === 'lot' && formData.quantity && (isNaN(parseInt(formData.quantity)) || parseInt(formData.quantity) < 1)) {
      newErrors.quantity = 'Quantity must be a positive number';
    }

    if (depreciated && !formData.recovery_period && !defaultPeriod) {
      newErrors.recovery_period = 'Choose a recovery period: this equipment is depreciated';
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

    try {
      // A unit is one thing (quantity 1); a lot has no serial number or tag.
      const shaped: FormData = kind === 'unit'
        ? { ...formData, quantity: '1' }
        : { ...formData, serial_number: '', tag_number: '', quantity: formData.quantity || '1' };

      // Normalize form data first
      const normalizedData = normalizeFormData(shaped);

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

      // Depreciated: the period chosen, else the category's. Not depreciated: none.
      if (depreciated) {
        normalizedData.recovery_period = (formData.recovery_period ? parseInt(formData.recovery_period) : defaultPeriod) as any;
      } else {
        delete (normalizedData as any).recovery_period;
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
        // The in-place normalization above converts string form fields to the
        // column types; the cast reflects that runtime conversion (refactor
        // tracked for the Phase 7 component split)
        await assetMutations.updateAsset.mutateAsync({
          id: assetId,
          data: updateData as Parameters<typeof updateAsset>[1],
        });
        changeDetection.markAsSaved(normalizedData);
        toast.success(kind === 'unit' ? 'Unit updated' : 'Lot updated');
        if (item && onBackToItem) onBackToItem(item.id); else onAssetUpdated();
      } else {
        // For creates, send all data
        const createData = {
          organization_id: organization.id,
          ...normalizedData,
        };
        const newAsset = await assetMutations.createAsset.mutateAsync(
          createData as unknown as Parameters<typeof createAsset>[0],
        );
        toast.success(kind === 'unit' ? 'Unit added' : 'Lot added');
        const newItemId = (newAsset as { equipment_item_id?: string }).equipment_item_id ?? item?.id;
        if (newItemId && onBackToItem) onBackToItem(newItemId); else onAssetCreated(newAsset.id);
      }
    } catch (error: any) {
      console.error('Error saving asset:', error);
      toast.error(error.message || 'Failed to save asset');
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

      <PageHeader
        back={item && onBackToItem
          ? { label: `Back to ${item.manufacturer_model}`, onClick: () => onBackToItem(item.id) }
          : { label: 'Back to Items', onClick: onCancel }}
        title={isEditMode
          ? (formData.tag_number || (formData.serial_number ? `SN ${formData.serial_number}` : `Lot of ${formData.quantity || 1}`))
          : 'Add unit or lot'}
        meta={item ? item.manufacturer_model : undefined}
      />

      {/* Narrower than the header, but left-aligned with the title (#39). */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 *:max-w-4xl">

        {/* Form */}
        <Card className="p-4">
          <div className="space-y-4">
            {/* What it is (#182) */}
            <div>
              <h3 className="text-gray-900 mb-2">What it is</h3>
              {item && !choosingItem ? (
                <div className="flex items-center gap-3 rounded-lg border bg-gray-50 px-3 py-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border bg-white text-gray-600"><Box className="h-4 w-4" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{item.manufacturer_model}</div>
                    <div className="text-xs text-muted-foreground">{[item.category, item.type].filter(Boolean).join(' · ')}</div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="text-sky-700" onClick={() => setChoosingItem(true)}>Change item</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="item_choice">Item</Label>
                    <select
                      id="item_choice"
                      value=""
                      onChange={(e) => {
                        const picked = itemOptions.find((i) => i.id === e.target.value);
                        if (picked) applyItem(picked);
                      }}
                      className="h-9 w-full rounded-md border border-input bg-input-background px-3 text-base md:text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    >
                      <option value="">An item we already have…</option>
                      {itemOptions.map((i) => (
                        <option key={i.id} value={i.id}>{`${i.manufacturer_model} · ${i.category}`}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">Or enter a new item below: the same manufacturer &amp; model and category always means the same item.</p>
                  </div>
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
                  <Label htmlFor="category">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className={`h-9 w-full rounded-md border bg-input-background px-3 text-base md:text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ${errors.category ? 'border-red-500' : 'border-input'}`}
                  >
                    <option value="">Choose a category…</option>
                    {formData.category && !equipmentCategories.includes(formData.category) && (
                      <option value={formData.category}>{formData.category}</option>
                    )}
                    {equipmentCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.category}
                    </p>
                  )}
                </div>

                

                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Input
                    id="type"
                    list="types"
                    value={formData.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    placeholder="e.g., Microphone, Vocal, Dynamic"
                  />
                  <datalist id="types">
                    {typeSuggestions.suggestions.map((type, index) => (
                      <option key={`type-${index}-${type}`} value={type} />
                    ))}
                  </datalist>
                  <p className="text-xs text-gray-500">
                    General to specific, separated by commas. Suggestions are the types already used in this category.
                  </p>
                </div>
                  </div>
                </div>
              )}
            </div>

            {/* Unit or lot (#182) */}
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-gray-900 mb-2">Unit or lot</h3>
              <div role="radiogroup" aria-label="Unit or lot" className="grid grid-cols-2 gap-2">
                {([
                  ['unit', 'Unit', Tag, 'One physical thing with a serial number or tag. Quantity is always 1.'],
                  ['lot', 'Lot', Layers, 'Several identical things with no serial or tag, counted together.'],
                ] as const).map(([value, label, Icon, help]) => {
                  const blocked = value === 'unit' && (loadedLotQuantity ?? 0) > 1;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={kind === value}
                      disabled={blocked}
                      onClick={() => setKind(value)}
                      className={cn('flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left disabled:opacity-50',
                        kind === value ? 'border-sky-500 bg-sky-50' : 'border-gray-200 bg-white')}
                    >
                      <span className="flex items-center gap-1.5 text-sm font-semibold"><Icon className="h-4 w-4" aria-hidden />{label}</span>
                      <span className="text-xs text-gray-600">{help}</span>
                    </button>
                  );
                })}
              </div>
              {(loadedLotQuantity ?? 0) > 1 && (
                <p className="mt-2 text-xs text-gray-500">A lot of {loadedLotQuantity} can’t become one unit here. Splitting a lot comes with the maintenance work (#186).</p>
              )}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serial_number">Serial Number</Label>
                  <Input
                    id="serial_number"
                    value={kind === 'lot' ? '' : formData.serial_number}
                    onChange={(e) => handleChange('serial_number', e.target.value)}
                    placeholder={kind === 'lot' ? 'Not for a lot' : 'Serial number'}
                    disabled={kind === 'lot'}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tag_number">Inventory Tag ID</Label>
                  <Input
                    id="tag_number"
                    value={kind === 'lot' ? '' : formData.tag_number}
                    onChange={(e) => handleChange('tag_number', e.target.value)}
                    placeholder={kind === 'lot' ? 'Not for a lot' : 'e.g., TAG-001'}
                    disabled={kind === 'lot'}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={kind === 'unit' ? '1' : formData.quantity}
                    onChange={(e) => handleChange('quantity', e.target.value)}
                    placeholder="1"
                    disabled={kind === 'unit'}
                    className={errors.quantity ? 'border-red-500' : ''}
                  />
                  {kind === 'unit' && <p className="text-xs text-gray-500">Always 1 for a unit.</p>}
                  {errors.quantity && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.quantity}
                    </p>
                  )}
                </div>
              </div>
              {errors.unit && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.unit}
                </p>
              )}
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
                    >{kind === 'unit' ? 'This unit has been added to an insurance policy.' : 'This lot has been added to an insurance policy.'}</Label>
                  </div>
                </div>

                {!item && (
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
                )}

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
              <h3 className="text-gray-900 mb-2">Lifecycle</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {depreciated && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="recovery_period">Recovery period</Label>
                    <Select
                      value={formData.recovery_period || (defaultPeriod ? String(defaultPeriod) : '')}
                      onValueChange={(value) => handleChange('recovery_period', value)}
                      disabled={periodLocked}
                    >
                      <SelectTrigger id="recovery_period" aria-label="Recovery period" className={errors.recovery_period ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Choose a recovery period" />
                      </SelectTrigger>
                      <SelectContent>
                        {RECOVERY_PERIODS.map(p => (
                          <SelectItem key={p.value} value={String(p.value)}>{p.label}: {p.examples}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      {periodLocked ? 'Its tax year is filed, so the recovery period stays as it is.'
                        : !formData.recovery_period && defaultPeriod ? `The default for ${formData.category}. The tax program uses it to work out depreciation.`
                        : 'This item is depreciated. The tax program uses the period to work out depreciation.'}
                    </p>
                    {errors.recovery_period && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.recovery_period}
                      </p>
                    )}
                  </div>
                )}

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

            {/* Description (the item's, when it is a new item) and attachments */}
            {(!item || (isEditMode && assetId)) && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-gray-900 mb-2">Additional Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {!item && (
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="What this item is, and how to handle it…"
                    rows={6}
                  />
                  <p className="text-xs text-gray-500">
                    Supports Markdown formatting
                  </p>
                </div>
                )}

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
            )}

            {/* Read-only History Tables — Edit Mode Only */}
            {isEditMode && (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                {/* Asset Change History */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <History className="w-4 h-4 text-gray-500" />
                    <h3 className="text-gray-900">Change History</h3>
                  </div>
                  <ActivityFeed entries={assetActivity} isLoading={isLoadingHistory} />
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
                    {isEditMode ? (kind === 'unit' ? 'Update Unit' : 'Update Lot') : (kind === 'unit' ? 'Add Unit' : 'Add Lot')}
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
