import {useState, useEffect, useMemo } from 'react';
import { Package, ArrowLeft, Save, Loader2, AlertCircle, Plus, X, Search, CheckCircle2, Boxes, Container, Layers } from 'lucide-react';
import { useSimpleFormChanges } from '../utils/hooks/useSimpleFormChanges';
import { createSubmissionPayload, normalizeFormData } from '../utils/form-utils';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
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
import { PageHeader } from './ui/PageHeader';
import { Organization, User, UserRole } from '../utils/supabase/types';
import { getKit, createKit, updateKit } from '../services/kit.service';
import { getAssets } from '../services/asset.service';
import { getKits } from '../services/kit.service';
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

/** A row in the kit's contents — exactly one of asset/childKit is set. */
interface KitComponentRow {
  id?: string;
  asset_id?: string;
  child_kit_id?: string;
  asset?: DbAsset;
  childKit?: { id: string; name: string; is_container?: boolean; category?: string | null; rental_value?: number | null };
  quantity: number;
}

/** A searchable candidate in the unified picker — an asset or an existing kit. */
type PickerCandidate =
  | { type: 'asset'; id: string; name: string; subtitle: string; asset: DbAsset }
  | { type: 'kit'; id: string; name: string; subtitle: string; componentCount: number };

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

  const [isContainer, setIsContainer] = useState(false);
  const [kitComponents, setKitComponents] = useState<KitComponentRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Unified component picker dialog
  const [showPicker, setShowPicker] = useState(false);
  const [pickerFilter, setPickerFilter] = useState<'all' | 'assets' | 'kits'>('all');
  const [pickerCandidates, setPickerCandidates] = useState<PickerCandidate[]>([]);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
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
    kitComponents: kitComponents,
    isContainer: isContainer,
  }), [formData, kitComponents, isContainer]);

  // Change detection for efficient updates
  const changeDetection = useSimpleFormChanges({
    initialData: {
      name: '',
      category: '',
      description: '',
      tags: [],
      tag_number: '',
      rental_value: '',
      kitComponents: [],
      isContainer: false,
    },
    currentData: currentData, // Pass the memoized currentData
  });

  // Data changes are automatically detected by the simplified hook

  useEffect(() => {
    if (kitId) {
      loadKit();
    }
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
      setIsContainer(kit.is_container ?? false);

      const mappedComponents: KitComponentRow[] = (kit.kit_components || []).map((kc: any) => ({
        id: kc.id,
        asset_id: kc.asset_id ?? undefined,
        child_kit_id: kc.child_kit_id ?? undefined,
        asset: kc.asset ?? undefined,
        childKit: kc.child_kit ?? undefined,
        quantity: kc.quantity,
      }));
      setKitComponents(mappedComponents);

      // Load initial data for change detection (including kit components and tracking type)
      changeDetection.loadInitialData({
        ...loadedData,
        kitComponents: mappedComponents,
        isContainer: kit.is_container ?? false,
      });
    } catch (error: any) {
      console.error('Error loading kit:', error);
      toast.error(error.message || 'Failed to load kit');
      onCancel();
    } finally {
      setIsLoading(false);
    }
  };

  const loadPickerCandidates = async () => {
    try {
      const [assets, kits] = await Promise.all([
        pickerFilter === 'kits' ? Promise.resolve([]) : getAssets(organization.id, { search: pickerSearchQuery || undefined }),
        pickerFilter === 'assets' ? Promise.resolve([]) : getKits(organization.id, { search: pickerSearchQuery || undefined }),
      ]);

      const assetCandidates: PickerCandidate[] = (assets || []).map((a: DbAsset) => ({
        type: 'asset',
        id: a.id,
        name: a.manufacturer_model || 'Unknown Asset',
        subtitle: [a.category, a.serial_number ? `SN: ${a.serial_number}` : null].filter(Boolean).join(' • '),
        asset: a,
      }));

      // Exclude the kit being edited itself, and kits already added as a direct
      // component — a UX nicety, not the security boundary (the DB trigger is).
      const alreadyDirectKitIds = new Set(kitComponents.filter(c => c.child_kit_id).map(c => c.child_kit_id));
      const kitCandidates: PickerCandidate[] = (kits || [])
        .filter((k: any) => k.id !== kitId && !alreadyDirectKitIds.has(k.id))
        .map((k: any) => ({
          type: 'kit' as const,
          id: k.id,
          name: k.name,
          subtitle: k.category || '',
          componentCount: k.kit_components?.length ?? 0,
        }));

      setPickerCandidates([...assetCandidates, ...kitCandidates]);
    } catch (error: any) {
      console.error('Error loading picker candidates:', error);
    }
  };

  useEffect(() => {
    if (showPicker) {
      loadPickerCandidates();
    }
  }, [pickerSearchQuery, pickerFilter, showPicker]);

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

  const candidateKey = (c: PickerCandidate) => `${c.type}:${c.id}`;

  const toggleSelected = (c: PickerCandidate) => {
    const key = candidateKey(c);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAddSelected = () => {
    const toAdd: KitComponentRow[] = [];
    for (const c of pickerCandidates) {
      if (!selectedKeys.has(candidateKey(c))) continue;
      if (c.type === 'asset') {
        toAdd.push({ asset_id: c.id, asset: c.asset, quantity: 1 });
      } else {
        toAdd.push({
          child_kit_id: c.id,
          childKit: { id: c.id, name: c.name, category: c.subtitle || null },
          quantity: 1,
        });
      }
    }
    if (toAdd.length === 0) return;

    setKitComponents((prev) => [...prev, ...toAdd]);
    setShowPicker(false);
    setPickerSearchQuery('');
    setSelectedKeys(new Set());
  };

  const componentRowId = (row: KitComponentRow) => row.asset_id ?? row.child_kit_id ?? '';

  const handleUpdateQuantity = (rowId: string, quantity: number) => {
    setKitComponents((prev) =>
      prev.map((row) =>
        componentRowId(row) === rowId ? { ...row, quantity: Math.max(1, quantity) } : row
      )
    );
  };

  const handleRemoveComponent = (rowId: string) => {
    setKitComponents((prev) => prev.filter((row) => componentRowId(row) !== rowId));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Kit name is required';
    }

    if (kitComponents.length === 0) {
      newErrors.components = 'At least one asset or sub-kit must be added to the kit';
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

      // Prepare kit data - combine basic fields with nested components
      const kitData: any = {
        organization_id: organization.id,
        ...basicKitData,
        is_container: isContainer,
      };

      // Always send components (complex nested data)
      kitData.components = kitComponents.map((row) => ({
        id: row.id,
        asset_id: row.asset_id,
        child_kit_id: row.child_kit_id,
        quantity: row.quantity,
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
          kitComponents: kitComponents,
          isContainer: isContainer,
        });

        onKitUpdated();
      } else {
        const newKit = await createKit(kitData);
        toast.success('Kit created successfully');
        onKitCreated(newKit.id);
      }
    } catch (error: any) {
      console.error('Error saving kit:', error);
      // The DB trigger's message is already user-facing ("Adding this kit
      // would create a circular reference") — no special-casing needed here.
      toast.error(error.message || 'Failed to save kit');
    } finally {
      setIsSaving(false);
    }
  };

  const getTotalValue = () => {
    return kitComponents.reduce((total, row) => {
      const unitValue = row.asset?.replacement_value ?? row.childKit?.rental_value ?? 0;
      return total + unitValue * row.quantity;
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
          <PageHeader
            icon={Package}
            title={isEditMode ? 'Edit Kit' : 'Create New Kit'}
            description={isEditMode ? 'Update kit information and contents' : 'Create a reusable equipment collection'}
          />
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

            {/* Components */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-gray-900">Kit Contents</h3>
                  {errors.components && (
                    <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.components}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Components
                </Button>
              </div>

              {kitComponents.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-600 mb-4">No assets or kits added yet</p>
                  <Button
                    type="button"
                    onClick={() => setShowPicker(true)}
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Component
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Component</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Value</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kitComponents.map((row) => {
                        const rowId = componentRowId(row);
                        const isKit = !!row.child_kit_id;
                        const unitValue = row.asset?.replacement_value ?? row.childKit?.rental_value ?? 0;
                        return (
                          <TableRow key={rowId}>
                            <TableCell>
                              <div>
                                <div className="text-sm text-gray-900">
                                  {isKit ? (row.childKit?.name || 'Unknown Kit') : (row.asset?.manufacturer_model || 'Unknown Asset')}
                                </div>
                                {!isKit && row.asset?.serial_number && (
                                  <div className="text-xs text-gray-500">
                                    SN: {row.asset.serial_number}
                                  </div>
                                )}
                                {isKit && row.childKit?.category && (
                                  <div className="text-xs text-gray-500">{row.childKit.category}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="gap-1">
                                {isKit ? <Layers className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                                {isKit ? 'Kit' : 'Asset'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min="1"
                                value={row.quantity}
                                onChange={(e) =>
                                  handleUpdateQuantity(rowId, parseInt(e.target.value) || 1)
                                }
                                className="w-20 ml-auto"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              {unitValue ? formatCurrency(unitValue) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(unitValue * row.quantity)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveComponent(rowId)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-gray-900 mb-3">Tracking Type</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsContainer(false)}
                  className={`relative flex flex-col items-start gap-1.5 rounded-lg border-2 p-3 text-left transition-colors ${
                    !isContainer
                      ? 'border-sky-500 bg-sky-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {!isContainer && (
                    <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-sky-500" />
                  )}
                  <Boxes className={`h-5 w-5 ${!isContainer ? 'text-sky-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${!isContainer ? 'text-sky-700' : 'text-gray-700'}`}>
                    Items
                  </span>
                  <span className="text-xs text-gray-500 leading-snug">
                    Each component is scanned individually
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsContainer(true)}
                  className={`relative flex flex-col items-start gap-1.5 rounded-lg border-2 p-3 text-left transition-colors ${
                    isContainer
                      ? 'border-sky-500 bg-sky-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {isContainer && (
                    <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-sky-500" />
                  )}
                  <Container className={`h-5 w-5 ${isContainer ? 'text-sky-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${isContainer ? 'text-sky-700' : 'text-gray-700'}`}>
                    Container
                  </span>
                  <span className="text-xs text-gray-500 leading-snug">
                    Whole kit — and everything nested inside it — scanned as one unit
                  </span>
                </button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-gray-900 mb-4">Kit Summary</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Total Components</p>
                  <p className="text-2xl text-gray-900">{kitComponents.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-2xl text-gray-900">
                    {kitComponents.reduce((sum, row) => sum + row.quantity, 0)}
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

      {/* Unified Component Picker Dialog */}
      <Dialog open={showPicker} onOpenChange={(open) => { setShowPicker(open); if (!open) setSelectedKeys(new Set()); }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Components</DialogTitle>
            <DialogDescription>
              Select assets or existing kits to add to this kit. Adding a kit nests everything inside it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search assets and kits..."
                value={pickerSearchQuery}
                onChange={(e) => setPickerSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              {(['all', 'assets', 'kits'] as const).map((f) => (
                <Badge
                  key={f}
                  variant={pickerFilter === f ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => setPickerFilter(f)}
                >
                  {f}
                </Badge>
              ))}
            </div>

            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {pickerCandidates.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No assets or kits found
                </div>
              ) : (
                pickerCandidates.map((c) => {
                  const key = candidateKey(c);
                  const selected = selectedKeys.has(key);
                  return (
                    <div
                      key={key}
                      className="p-4 hover:bg-gray-50 cursor-pointer flex items-start gap-3"
                      onClick={() => toggleSelected(c)}
                    >
                      {/* Selection is handled by the row's onClick — this checkbox is
                          purely a controlled visual indicator, no handler of its own,
                          so a click on it doesn't double-fire via event bubbling. */}
                      <Checkbox checked={selected} className="mt-0.5 pointer-events-none" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-gray-900">{c.name}</div>
                          <Badge variant="outline" className="gap-1 text-[10px]">
                            {c.type === 'kit' ? <Layers className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                            {c.type === 'kit' ? 'Kit' : 'Asset'}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                          {c.subtitle}
                          {c.type === 'kit' && ` • ${c.componentCount} component${c.componentCount === 1 ? '' : 's'}`}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {selectedKeys.size} selected
              </span>
              <Button type="button" onClick={handleAddSelected} disabled={selectedKeys.size === 0}>
                Add {selectedKeys.size > 0 ? selectedKeys.size : ''} Selected
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
