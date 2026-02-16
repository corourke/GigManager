import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DollarSign, FileText, Loader2, Plus, Trash2, AlertCircle, Edit } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import OrganizationSelector from '../OrganizationSelector';
import { getGigFinancials, updateGigFinancials, createGigFinancial, deleteGigFinancial } from '../../services/gig.service';
import { useAutoSave } from '../../utils/hooks/useAutoSave';
import SaveStateIndicator from './SaveStateIndicator';
import { UserRole, FinType, FinCategory } from '../../utils/supabase/types';
import { FIN_TYPE_CONFIG, FIN_CATEGORY_CONFIG } from '../../utils/supabase/constants';

const CURRENCY_OPTIONS = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

const financialSchema = z.object({
  id: z.string(),
  date: z.string().min(1, 'Date is required'),
  amount: z.string().refine((val) => {
    if (!val.trim()) return false;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Amount must be a positive number'),
  type: z.string(),
  category: z.string(),
  description: z.string().optional().default(''),
  reference_number: z.string().optional().default(''),
  counterparty_id: z.string().optional().default(''),
  external_entity_name: z.string().optional().default(''),
  currency: z.string().optional().default('USD'),
  due_date: z.string().optional().default(''),
  paid_at: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

const financialsFormSchema = z.object({
  financials: z.array(financialSchema),
});

type FinancialsFormData = z.infer<typeof financialsFormSchema>;

interface FinancialData {
  id: string;
  date: string;
  amount: string;
  type: FinType;
  category: FinCategory;
  description: string;
  reference_number: string;
  counterparty_id: string;
  external_entity_name: string;
  currency: string;
  due_date: string;
  paid_at: string;
  notes: string;
}

interface FinancialModalData {
  id?: string;
  date: string;
  amount: string;
  type: FinType;
  category: FinCategory;
  description: string;
  reference_number: string;
  counterparty_id: string;
  external_entity_name: string;
  currency: string;
  due_date: string;
  paid_at: string;
  notes: string;
}

interface GigFinancialsSectionProps {
  gigId: string;
  currentOrganizationId: string;
  userRole?: UserRole;
}

export default function GigFinancialsSection({
  gigId,
  currentOrganizationId,
  userRole,
}: GigFinancialsSectionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [currentFinancialIndex, setCurrentFinancialIndex] = useState<number | null>(null);
  const [selectedCounterparty, setSelectedCounterparty] = useState<any>(null);
  const [showNotesModal, setShowNotesModal] = useState<number | null>(null);
  const [currentNotes, setCurrentNotes] = useState('');
  const [modalData, setModalData] = useState<FinancialModalData>({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    type: 'Bid Submitted',
    category: 'Other',
    description: '',
    reference_number: '',
    counterparty_id: '',
    external_entity_name: '',
    currency: 'USD',
    due_date: '',
    paid_at: '',
    notes: '',
  });

  // Only show to admins
  const isAdmin = userRole === 'Admin';

  const { control, handleSubmit, formState: { errors, isDirty }, watch, reset, setValue } = useForm<FinancialsFormData>({
    resolver: zodResolver(financialsFormSchema),
    mode: 'onChange',
    defaultValues: {
      financials: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'financials',
  });

  const handleSave = useCallback(async (data: FinancialsFormData) => {
    // Only save financials that have a valid amount
    const validFinancials = data.financials.filter(f => {
      const amount = parseFloat(f.amount);
      return !isNaN(amount) && f.date;
    });

    if (validFinancials.length === 0 && data.financials.length > 0) {
      // If there are financials but none are valid yet, don't save
      return;
    }

    await updateGigFinancials(gigId, currentOrganizationId, validFinancials.map(f => ({
      id: f.id.startsWith('temp-') ? undefined : f.id,
      amount: parseFloat(f.amount),
      date: f.date,
      type: f.type as FinType,
      category: f.category as FinCategory,
      description: f.description || '',
      reference_number: f.reference_number || '',
      counterparty_id: f.counterparty_id || undefined,
      external_entity_name: f.external_entity_name || '',
      currency: f.currency || 'USD',
      due_date: f.due_date || undefined,
      paid_at: f.paid_at || undefined,
      notes: f.notes || '',
    })));
  }, [gigId, currentOrganizationId]);

  const handleSaveSuccess = useCallback((data: FinancialsFormData) => {
    reset(data, { keepDirty: false, keepValues: true });
  }, [reset]);

  const { saveState, triggerSave } = useAutoSave<FinancialsFormData>({
    gigId,
    onSave: handleSave,
    onSuccess: handleSaveSuccess,
    debounceMs: 1000
  });

  const formValues = watch();

  useEffect(() => {
    if (isDirty) {
      triggerSave(formValues);
    }
  }, [formValues, isDirty, triggerSave]);

  useEffect(() => {
    if (isAdmin) {
      loadFinancialsData();
    }
  }, [gigId, isAdmin]);

  const loadFinancialsData = async () => {
    setIsLoading(true);
    try {
      const data = await getGigFinancials(gigId, currentOrganizationId);
      
      const loadedFinancials = data.map((f: any) => ({
        id: f.id,
        date: f.date || format(new Date(), 'yyyy-MM-dd'),
        amount: (f.amount !== null && f.amount !== undefined) ? f.amount.toString() : '',
        type: f.type,
        category: f.category,
        description: f.description || '',
        reference_number: f.reference_number || '',
        counterparty_id: f.counterparty_id || '',
        counterparty: f.counterparty || null,
        external_entity_name: f.external_entity_name || '',
        currency: f.currency || 'USD',
        due_date: f.due_date || '',
        paid_at: f.paid_at || '',
        notes: f.notes || '',
      }));

      reset({ financials: loadedFinancials });
    } catch (error: any) {
      console.error('Error loading financials:', error);
      toast.error('Failed to load financials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFinancial = () => {
    setModalData({
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: '',
      type: 'Bid Submitted',
      category: 'Other',
      description: '',
      reference_number: '',
      counterparty_id: '',
      external_entity_name: '',
      currency: 'USD',
      due_date: '',
      paid_at: '',
      notes: '',
    });
    setSelectedCounterparty(null);
    setCurrentFinancialIndex(null);
    setShowFinancialModal(true);
  };

  const handleEditFinancial = (index: number) => {
    const financial = fields[index] as any;
    setModalData({
      id: financial.id,
      date: financial.date,
      amount: financial.amount,
      type: financial.type,
      category: financial.category,
      description: financial.description || '',
      reference_number: financial.reference_number || '',
      counterparty_id: financial.counterparty_id || '',
      external_entity_name: financial.external_entity_name || '',
      currency: financial.currency || 'USD',
      due_date: financial.due_date || '',
      paid_at: financial.paid_at || '',
      notes: financial.notes || '',
    });
    setSelectedCounterparty(financial.counterparty || null);
    setCurrentFinancialIndex(index);
    setShowFinancialModal(true);
  };

  const handleRemoveFinancial = async (index: number) => {
    const financial = fields[index];
    if (financial.id && !financial.id.startsWith('temp-')) {
      try {
        await deleteGigFinancial(financial.id);
        toast.success('Financial record deleted');
      } catch (error: any) {
        console.error('Error deleting financial:', error);
        toast.error('Failed to delete financial record');
        return;
      }
    }
    remove(index);
  };

  const handleSaveModal = () => {
    if (currentFinancialIndex !== null) {
      // Update existing
      Object.entries(modalData).forEach(([key, value]) => {
        setValue(`financials.${currentFinancialIndex}.${key}` as any, value, { shouldDirty: true });
      });
      // Save the counterparty object for display in the table/selector next time
      setValue(`financials.${currentFinancialIndex}.counterparty` as any, selectedCounterparty, { shouldDirty: true });
    } else {
      // Add new
      append({
        id: `temp-${Math.random().toString(36).substr(2, 9)}`,
        date: modalData.date,
        amount: modalData.amount,
        type: modalData.type,
        category: modalData.category,
        description: modalData.description,
        reference_number: modalData.reference_number,
        counterparty_id: modalData.counterparty_id,
        counterparty: selectedCounterparty, // Save the counterparty object
        external_entity_name: modalData.external_entity_name,
        currency: modalData.currency,
        due_date: modalData.due_date,
        paid_at: modalData.paid_at,
        notes: modalData.notes,
      });
    }
    setShowFinancialModal(false);
  };

  const handleOpenNotes = (index: number) => {
    const financial = fields[index];
    setCurrentNotes(financial.notes || '');
    setShowNotesModal(index);
  };

  const handleSaveNotes = () => {
    if (showNotesModal !== null) {
      setValue(`financials.${showNotesModal}.notes`, currentNotes, { shouldDirty: true });
      setShowNotesModal(null);
      setCurrentNotes('');
    }
  };

  const formatCurrency = (amount: string, currency: string = 'USD') => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '$0.00';
    
    const opt = CURRENCY_OPTIONS.find(c => c.code === currency);
    const symbol = opt?.symbol || '$';
    
    return `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };

  if (!isAdmin) {
    return null; // Don't show the section at all for non-admins
  }

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-sky-500 mb-2" />
            <p className="text-gray-600">Loading financials...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-600" />
              <CardTitle>Financials</CardTitle>
              <SaveStateIndicator state={saveState} />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddFinancial}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Financial Record
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fields.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          {formatDate(field.date)}
                        </TableCell>
                        <TableCell>
                          {FIN_TYPE_CONFIG[field.type as FinType]?.label || field.type}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(field.amount, field.currency)}
                        </TableCell>
                        <TableCell>
                          {field.description || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenNotes(index)}
                              className="h-8 w-8 p-0"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditFinancial(index)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFinancial(index)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No financial records yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showFinancialModal} onOpenChange={(open) => {
        if (!open) {
          setShowFinancialModal(false);
          setCurrentFinancialIndex(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentFinancialIndex !== null ? 'Edit Financial Record' : 'Add Financial Record'}
            </DialogTitle>
            <DialogDescription>
              {currentFinancialIndex !== null ? 'Update the financial record details.' : 'Add a new financial record for this gig.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="modal-date">Date</Label>
                <Input
                  id="modal-date"
                  type="date"
                  value={modalData.date}
                  onChange={(e) => setModalData({ ...modalData, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="modal-amount">Amount</Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm text-gray-500 font-medium">
                    {CURRENCY_OPTIONS.find(c => c.code === modalData.currency)?.symbol || '$'}
                  </span>
                  <Input
                    id="modal-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-8 pr-16"
                    value={modalData.amount}
                    onChange={(e) => setModalData({ ...modalData, amount: e.target.value })}
                  />
                  <div className="absolute right-2">
                    <Select 
                      value={modalData.currency} 
                      onValueChange={(value) => setModalData({ ...modalData, currency: value })}
                    >
                      <SelectTrigger className="h-4 w-auto min-w-[42px] px-1.5 py-0 text-[12px] font-normal uppercase border-none bg-sky-100 text-sky-700 hover:bg-sky-200 transition-colors rounded-full shadow-none focus:ring-0">
                        <SelectValue placeholder="USD" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.code} value={opt.code} className="text-xs">{opt.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="modal-type">Type</Label>
                <Select value={modalData.type} onValueChange={(value: FinType) => setModalData({ ...modalData, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIN_TYPE_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="modal-category">Expense Category</Label>
                <Select value={modalData.category} onValueChange={(value: FinCategory) => setModalData({ ...modalData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIN_CATEGORY_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="modal-description">Description</Label>
              <Input
                id="modal-description"
                value={modalData.description}
                onChange={(e) => setModalData({ ...modalData, description: e.target.value })}
                placeholder="Brief description of this financial record"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="modal-reference">Reference Number</Label>
                <Input
                  id="modal-reference"
                  value={modalData.reference_number}
                  onChange={(e) => setModalData({ ...modalData, reference_number: e.target.value })}
                  placeholder="Invoice #, Check #, etc."
                />
              </div>
              <div>
                <Label htmlFor="modal-due-date">Due Date</Label>
                <Input
                  id="modal-due-date"
                  type="date"
                  value={modalData.due_date}
                  onChange={(e) => setModalData({ ...modalData, due_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Counterparty (Internal Organization)</Label>
              <OrganizationSelector
                selectedOrganization={selectedCounterparty}
                onSelect={(org) => {
                  setSelectedCounterparty(org);
                  setModalData({ ...modalData, counterparty_id: org?.id || '' });
                }}
                placeholder="Search for internal organization..."
              />
            </div>

            <div>
              <Label htmlFor="modal-external-entity">External Entity (Client/Vendor)</Label>
              <Input
                id="modal-external-entity"
                value={modalData.external_entity_name}
                onChange={(e) => setModalData({ ...modalData, external_entity_name: e.target.value })}
                placeholder="External client or vendor name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="modal-paid-at">Paid Date</Label>
                <Input
                  id="modal-paid-at"
                  type="date"
                  value={modalData.paid_at ? modalData.paid_at.split('T')[0] : ''}
                  onChange={(e) => setModalData({ ...modalData, paid_at: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="modal-notes">Notes</Label>
              <Textarea
                id="modal-notes"
                value={modalData.notes}
                onChange={(e) => setModalData({ ...modalData, notes: e.target.value })}
                placeholder="Internal notes (not shown on invoices)"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinancialModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveModal}
              disabled={!modalData.date || !modalData.amount || parseFloat(modalData.amount) <= 0}
            >
              {currentFinancialIndex !== null ? 'Update' : 'Add'} Financial Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNotesModal !== null} onOpenChange={(open) => {
        if (!open) {
          setShowNotesModal(null);
          setCurrentNotes('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Financial Record Notes</DialogTitle>
            <DialogDescription>
              Internal notes for this financial record. These are not shown on public documents.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={currentNotes}
            onChange={(e) => setCurrentNotes(e.target.value)}
            placeholder="Enter notes..."
            rows={10}
            onFocus={(e) => {
              const len = e.target.value.length;
              e.target.setSelectionRange(len, len);
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNotesModal(null);
              setCurrentNotes('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes}>
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}