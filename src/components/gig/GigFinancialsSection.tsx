import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createClient } from '../../utils/supabase/client';
import { DollarSign, FileText, Loader2, Plus, Trash2, AlertCircle, Edit, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import OrganizationSelector from '../OrganizationSelector';
import { 
  getGigFinancials, 
  updateGigFinancials, 
  createGigFinancial, 
  deleteGigFinancial,
  getGigProfitabilitySummary 
} from '../../services/gig.service';
import { scanInvoice } from '../../services/purchase.service';
import ReviewScannedDataDialog from '../ReviewScannedDataDialog';
import { useAutoSave } from '../../utils/hooks/useAutoSave';
import SaveStateIndicator from './SaveStateIndicator';
import { UserRole, FinType, FinCategory } from '../../utils/supabase/types';
import { FIN_TYPE_CONFIG, FIN_CATEGORY_CONFIG, FIN_TYPE_GROUPS } from '../../utils/supabase/constants';
import GigProfitabilitySummary from './GigProfitabilitySummary';
import { Badge } from '../ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ChevronDown, ChevronRight, Receipt, Users, MousePointer2 } from 'lucide-react';

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
  purchase_id: z.string().optional(),
  staff_assignment_id: z.string().optional(),
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
  purchase_id?: string;
  staff_assignment_id?: string;
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
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [projectedStaff, setProjectedStaff] = useState<any[]>([]);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [currentFinancialIndex, setCurrentFinancialIndex] = useState<number | null>(null);
  const [selectedCounterparty, setSelectedCounterparty] = useState<any>(null);
  const [showNotesModal, setShowNotesModal] = useState<number | null>(null);
  const [currentNotes, setCurrentNotes] = useState('');
  
  // Scanning states
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  const [modalData, setModalData] = useState<FinancialModalData>({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    type: 'Contract Signed',
    category: 'Production',
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
      purchase_id: f.purchase_id || undefined,
      staff_assignment_id: f.staff_assignment_id || undefined,
    })));
    loadSummaryData();
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

  const groupedFinancials = {
    revenue: fields.filter((f: any) => (FIN_TYPE_GROUPS.revenue as readonly string[]).includes(f.type)),
    cost: fields.filter((f: any) => (FIN_TYPE_GROUPS.cost as readonly string[]).includes(f.type)),
    other: fields.filter((f: any) => 
      !(FIN_TYPE_GROUPS.revenue as readonly string[]).includes(f.type) && 
      !(FIN_TYPE_GROUPS.cost as readonly string[]).includes(f.type)
    )
  };

  useEffect(() => {
    if (isDirty) {
      triggerSave(formValues);
    }
  }, [formValues, isDirty, triggerSave]);

  useEffect(() => {
    if (isAdmin) {
      loadFinancialsData();
      loadSummaryData();
      loadProjectedStaff();
    }
  }, [gigId, isAdmin]);

  const loadProjectedStaff = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('gig_staff_assignments')
        .select(`
          id,
          fee,
          rate,
          status,
          user:user_id(id, first_name, last_name),
          slot:gig_staff_slots!inner(gig_id, organization_id, role_info:staff_roles(name))
        `)
        .eq('slot.gig_id', gigId)
        .eq('slot.organization_id', currentOrganizationId)
        .is('completed_at', null)
        .or('fee.gt.0,rate.gt.0');

      if (error) throw error;
      
      // Filter for Confirmed/Requested only as per summary logic
      const validProjected = (data || []).filter(a => a.status === 'Confirmed' || a.status === 'Requested');
      setProjectedStaff(validProjected);
    } catch (error) {
      console.error('Error loading projected staff:', error);
    }
  };

  const loadSummaryData = async () => {
    setIsSummaryLoading(true);
    try {
      const data = await getGigProfitabilitySummary(gigId, currentOrganizationId);
      setSummary(data);
    } catch (error) {
      console.error('Error loading summary:', error);
    } finally {
      setIsSummaryLoading(false);
    }
  };

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
        purchase_id: f.purchase_id || '',
        staff_assignment_id: f.staff_assignment_id || '',
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
      type: 'Contract Signed',
      category: 'Production',
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
      purchase_id: financial.purchase_id || '',
      staff_assignment_id: financial.staff_assignment_id || '',
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
        loadSummaryData();
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
        purchase_id: (modalData as any).purchase_id,
        staff_assignment_id: (modalData as any).staff_assignment_id,
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

  const handleUploadReceipt = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setScannedFile(file);
    setIsScanning(true);
    try {
      const data = await scanInvoice(file);
      setScannedData(data);
      setShowReviewDialog(true);
    } catch (err: any) {
      console.error('Error scanning receipt:', err);
      if (err.message?.includes('PDF_SCAN_ACCESS_REQUIRED') || err.message?.includes('access to the Claude 3.5 Sonnet PDF beta')) {
        toast.error('AI scan unavailable for this file type. Opening manual entry.');
        setScannedData(null);
        setShowReviewDialog(true);
      } else {
        toast.error(err.message || 'Failed to scan receipt');
      }
    } finally {
      setIsScanning(false);
      event.target.value = '';
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

  const FinancialRow = ({ field, index }: { field: any; index: number }) => {
    const isPaid = !!field.paid_at;
    const source = field.purchase_id ? 'Receipt' : field.staff_assignment_id ? 'Staff' : 'Manual';
    
    return (
      <TableRow key={field.id}>
        <TableCell className="py-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{formatDate(field.date)}</span>
            <div className="flex items-center gap-1.5 mt-1">
              {source === 'Receipt' && (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                  <Receipt className="w-3 h-3 mr-1" />
                  Receipt
                </Badge>
              )}
              {source === 'Staff' && (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                  <Users className="w-3 h-3 mr-1" />
                  Staff
                </Badge>
              )}
              {source === 'Manual' && (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-gray-50 text-gray-600 border-gray-200">
                  <MousePointer2 className="w-3 h-3 mr-1" />
                  Manual
                </Badge>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="py-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm">{FIN_TYPE_CONFIG[field.type as FinType]?.label || field.type}</span>
            <div className="flex items-center gap-1">
              {isPaid ? (
                <Badge className="h-4 px-1 text-[9px] bg-green-100 text-green-700 hover:bg-green-100 border-none">Paid</Badge>
              ) : (
                <Badge className="h-4 px-1 text-[9px] bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">Unpaid</Badge>
              )}
              <span className="text-[10px] text-gray-400">•</span>
              <span className="text-[10px] text-gray-500">{field.category}</span>
            </div>
          </div>
        </TableCell>
        <TableCell className="text-right font-mono py-3">
          <span className={isPaid ? 'text-green-700' : 'text-gray-900'}>
            {formatCurrency(field.amount, field.currency)}
          </span>
        </TableCell>
        <TableCell className="py-3 text-sm text-gray-600 max-w-[200px] truncate">
          {field.description || '-'}
        </TableCell>
        <TableCell className="text-right py-3">
          <div className="flex items-center justify-end gap-1">
            {field.purchase_id && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => window.open(`/purchases/${field.purchase_id}`, '_blank')}
                title="View Receipt Details"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
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
              data-testid={`edit-financial-${index}`}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveFinancial(index)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              data-testid={`delete-financial-${index}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
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
      {summary && (
        <GigProfitabilitySummary 
          summary={summary} 
          isLoading={isSummaryLoading} 
        />
      )}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-600" />
              <CardTitle>Financials</CardTitle>
              <SaveStateIndicator state={saveState} />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddFinancial}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Record
              </Button>
              <div className="relative overflow-hidden">
                <input
                  type="file"
                  title=""
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={handleUploadReceipt}
                  disabled={isScanning}
                  accept=".pdf,image/*"
                />
                <Button variant="outline" size="sm" disabled={isScanning}>
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Receipt className="w-4 h-4 mr-1" />
                      Upload Receipt
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {fields.length > 0 ? (
              <>
                {/* Revenue Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b">
                    <h3 className="text-sm font-semibold text-green-700">Revenue</h3>
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-green-50 text-green-700 border-green-200">
                      {groupedFinancials.revenue.length}
                    </Badge>
                  </div>
                  {groupedFinancials.revenue.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50/50">
                            <TableHead className="h-10">Date</TableHead>
                            <TableHead className="h-10">Type</TableHead>
                            <TableHead className="text-right h-10">Amount</TableHead>
                            <TableHead className="h-10">Description</TableHead>
                            <TableHead className="text-right h-10">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupedFinancials.revenue.map((field: any) => {
                            const index = fields.findIndex(f => f.id === field.id);
                            return <FinancialRow key={field.id} field={field} index={index} />;
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic py-2 pl-1">No revenue records yet</p>
                  )}
                </div>

                {/* Expenses Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b">
                    <h3 className="text-sm font-semibold text-red-700">Expenses</h3>
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-red-50 text-red-700 border-red-200">
                      {groupedFinancials.cost.length}
                    </Badge>
                  </div>
                  {groupedFinancials.cost.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50/50">
                            <TableHead className="h-10">Date</TableHead>
                            <TableHead className="h-10">Type</TableHead>
                            <TableHead className="text-right h-10">Amount</TableHead>
                            <TableHead className="h-10">Description</TableHead>
                            <TableHead className="text-right h-10">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupedFinancials.cost.map((field: any) => {
                            const index = fields.findIndex(f => f.id === field.id);
                            return <FinancialRow key={field.id} field={field} index={index} />;
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic py-2 pl-1">No expense records yet</p>
                  )}
                </div>

                {/* Projected Staff Section */}
                {projectedStaff.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b">
                      <h3 className="text-sm font-semibold text-amber-700">Projected Staff Costs</h3>
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                        {projectedStaff.length}
                      </Badge>
                    </div>
                    <div className="border rounded-lg overflow-hidden bg-amber-50/10">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-amber-50/30 hover:bg-amber-50/30">
                            <TableHead className="h-10">Role</TableHead>
                            <TableHead className="h-10">Staff</TableHead>
                            <TableHead className="text-right h-10">Projected Amount</TableHead>
                            <TableHead className="h-10">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {projectedStaff.map((staff: any) => (
                            <TableRow key={staff.id} className="hover:bg-amber-50/20">
                              <TableCell className="py-2.5 font-medium">{staff.slot?.role_info?.name || 'Staff'}</TableCell>
                              <TableCell className="py-2.5">
                                {staff.user ? `${staff.user.first_name} ${staff.user.last_name}` : 'Unassigned'}
                              </TableCell>
                              <TableCell className="py-2.5 text-right font-mono">
                                {formatCurrency(staff.fee?.toString() || staff.rate?.toString() || '0')}
                              </TableCell>
                              <TableCell className="py-2.5">
                                <Badge variant="secondary" className="text-[10px] font-normal">
                                  {staff.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Other Section (if any) */}
                {groupedFinancials.other.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b">
                      <h3 className="text-sm font-semibold text-gray-700">Other Records</h3>
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-gray-50 text-gray-700 border-gray-200">
                        {groupedFinancials.other.length}
                      </Badge>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50/50">
                            <TableHead className="h-10">Date</TableHead>
                            <TableHead className="h-10">Type</TableHead>
                            <TableHead className="text-right h-10">Amount</TableHead>
                            <TableHead className="h-10">Description</TableHead>
                            <TableHead className="text-right h-10">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupedFinancials.other.map((field: any) => {
                            const index = fields.findIndex(f => f.id === field.id);
                            return <FinancialRow key={field.id} field={field} index={index} />;
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
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
                  <SelectContent className="max-h-[300px]">
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50/50">Common Types</div>
                    {[
                      'Contract Signed',
                      'Bid Accepted',
                      'Deposit Received',
                      'Payment Received',
                      'Expense Incurred',
                      'Payment Sent'
                    ].map((type) => (
                      <SelectItem key={type} value={type}>
                        {FIN_TYPE_CONFIG[type as FinType].label}
                      </SelectItem>
                    ))}
                    
                    <Collapsible className="w-full">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-between px-2 py-1.5 h-8 text-xs font-medium text-sky-600 hover:text-sky-700 hover:bg-sky-50">
                          <span>All Types</span>
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {Object.entries(FIN_TYPE_CONFIG)
                          .filter(([type]) => ![
                            'Contract Signed',
                            'Bid Accepted',
                            'Deposit Received',
                            'Payment Received',
                            'Expense Incurred',
                            'Payment Sent'
                          ].includes(type))
                          .map(([value, config]) => (
                            <SelectItem key={value} value={value} className="pl-4">
                              {config.label}
                            </SelectItem>
                          ))}
                      </CollapsibleContent>
                    </Collapsible>
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

      <ReviewScannedDataDialog
        open={showReviewDialog}
        onOpenChange={setShowReviewDialog}
        organizationId={currentOrganizationId}
        scannedData={scannedData}
        file={scannedFile}
        gigId={gigId}
        onSuccess={() => {
          loadFinancialsData();
          loadSummaryData();
        }}
      />
    </>
  );
}