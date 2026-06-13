import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  FileText, 
  DollarSign, 
  Receipt, 
  MoreHorizontal, 
  Car, 
  Calculator,
  Loader2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { createGigFinancial } from '../../services/gig.service';
import { FinType, FinCategory, UserRole } from '../../utils/supabase/types';
import { calculateMileageAmount, formatMileageNotes, getMileageRateForYear } from '../../utils/financials.utils';

const commonSchema = {
  date: z.string().min(1, 'Date is required'),
  description: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  counterparty_id: z.string().optional().default(''),
  external_entity_name: z.string().optional().default(''),
};

const agreementSchema = z.object({
  ...commonSchema,
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, 'Amount must be positive'),
  type: z.enum(['Informal Terms', 'Bid Accepted', 'Contract Signed']),
});

const paymentSchema = z.object({
  ...commonSchema,
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, 'Amount must be positive'),
  type: z.enum(['Payment Received', 'Deposit Received']),
  paid_at: z.string().min(1, 'Payment date is required'),
  reference_number: z.string().optional().default(''),
});

const mileageSchema = z.object({
  ...commonSchema,
  date: z.string().min(1, 'Date is required'),
  distance: z.string().optional(),
  start_odometer: z.string().optional(),
  end_odometer: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
});

const expenseSchema = z.object({
  ...commonSchema,
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, 'Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
});

interface QuickActionButtonsProps {
  gigId: string;
  organizationId: string;
  onSuccess: () => void;
  onOther?: () => void;
  userRole?: UserRole;
  gigStartDate?: string;
}

export default function QuickActionButtons({
  gigId,
  organizationId,
  onSuccess,
  onOther,
  gigStartDate,
}: QuickActionButtonsProps) {
  const [activeModal, setActiveModal] = useState<'agreement' | 'payment' | 'expense' | 'mileage' | 'simple_expense' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const defaultDate = gigStartDate ?? format(new Date(), 'yyyy-MM-dd');

  const agreementForm = useForm<z.input<typeof agreementSchema>, any, z.output<typeof agreementSchema>>({
    resolver: zodResolver(agreementSchema),
    defaultValues: {
      date: defaultDate,
      type: 'Informal Terms',
      amount: '',
      description: '',
      notes: '',
    }
  });

  const paymentForm = useForm<z.input<typeof paymentSchema>, any, z.output<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: defaultDate,
      paid_at: defaultDate,
      type: 'Payment Received',
      amount: '',
      description: '',
      reference_number: '',
    }
  });

  const mileageForm = useForm<z.input<typeof mileageSchema>, any, z.output<typeof mileageSchema>>({
    resolver: zodResolver(mileageSchema),
    defaultValues: {
      date: defaultDate,
      distance: '',
      start_odometer: '',
      end_odometer: '',
      description: 'Travel to/from gig',
    }
  });

  const expenseForm = useForm<z.input<typeof expenseSchema>, any, z.output<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: defaultDate,
      amount: '',
      category: 'Other expenses',
      description: '',
    }
  });

  const milDistance = useWatch({ control: mileageForm.control, name: 'distance' });
  const milStart = useWatch({ control: mileageForm.control, name: 'start_odometer' });
  const milEnd = useWatch({ control: mileageForm.control, name: 'end_odometer' });
  const milDate = useWatch({ control: mileageForm.control, name: 'date' });

  const computedDistance = (() => {
    const d = parseFloat(milDistance || '0');
    if (d > 0) return d;
    const s = parseFloat(milStart || '0');
    const e = parseFloat(milEnd || '0');
    if (e > s) return e - s;
    return 0;
  })();

  const computedYear = milDate ? new Date(milDate).getFullYear() : new Date().getFullYear();
  const computedRate = getMileageRateForYear(computedYear);
  const computedAmount = computedDistance > 0 ? calculateMileageAmount(computedDistance, computedYear) : 0;

  const handleClose = () => {
    setActiveModal(null);
    setShowAdvanced(false);
    agreementForm.reset({ ...agreementForm.formState.defaultValues, date: defaultDate });
    paymentForm.reset({ ...paymentForm.formState.defaultValues, date: defaultDate, paid_at: defaultDate });
    mileageForm.reset({ ...mileageForm.formState.defaultValues, date: defaultDate });
    expenseForm.reset({ ...expenseForm.formState.defaultValues, date: defaultDate });
  };

  const openModal = (modal: 'agreement' | 'payment' | 'expense' | 'mileage' | 'simple_expense') => {
    setShowAdvanced(false);
    setActiveModal(modal);
  };

  const onAgreementSubmit = async (data: z.infer<typeof agreementSchema>) => {
    setIsSubmitting(true);
    try {
      await createGigFinancial({
        gig_id: gigId,
        organization_id: organizationId,
        type: data.type as FinType,
        amount: parseFloat(data.amount),
        date: data.date,
        description: data.description,
        notes: data.notes,
        counterparty_id: data.counterparty_id || undefined,
        external_entity_name: data.external_entity_name,
      });
      toast.success(`${data.type} recorded`);
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error saving agreement:', error);
      toast.error('Failed to save agreement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPaymentSubmit = async (data: z.infer<typeof paymentSchema>) => {
    setIsSubmitting(true);
    try {
      await createGigFinancial({
        gig_id: gigId,
        organization_id: organizationId,
        type: data.type as FinType,
        amount: parseFloat(data.amount),
        date: data.date,
        paid_at: data.paid_at,
        reference_number: data.reference_number,
        description: data.description,
        notes: data.notes,
        counterparty_id: data.counterparty_id || undefined,
        external_entity_name: data.external_entity_name,
      });
      toast.success(`${data.type} recorded`);
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error saving payment:', error);
      toast.error('Failed to save payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onMileageSubmit = async (data: z.infer<typeof mileageSchema>) => {
    setIsSubmitting(true);
    try {
      const distance = computedDistance;

      if (distance <= 0) {
        toast.error('Distance must be greater than zero');
        setIsSubmitting(false);
        return;
      }

      const year = new Date(data.date).getFullYear();
      const amount = calculateMileageAmount(distance, year);
      const rate = getMileageRateForYear(year);
      const autoNotes = formatMileageNotes(distance, rate);
      const combinedNotes = data.notes ? `${autoNotes}\n\n${data.notes}` : autoNotes;

      await createGigFinancial({
        gig_id: gigId,
        organization_id: organizationId,
        type: 'Expense Incurred',
        category: 'Car and truck expenses',
        amount,
        mileage: distance,
        date: data.date,
        description: data.description,
        notes: combinedNotes,
        counterparty_id: data.counterparty_id || undefined,
        external_entity_name: data.external_entity_name,
      });
      toast.success('Mileage recorded');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error saving mileage:', error);
      toast.error('Failed to save mileage');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onExpenseSubmit = async (data: z.infer<typeof expenseSchema>) => {
    setIsSubmitting(true);
    try {
      await createGigFinancial({
        gig_id: gigId,
        organization_id: organizationId,
        type: 'Expense Incurred',
        category: data.category as FinCategory,
        amount: parseFloat(data.amount),
        date: data.date,
        description: data.description,
        notes: data.notes,
        counterparty_id: data.counterparty_id || undefined,
        external_entity_name: data.external_entity_name,
      });
      toast.success('Expense recorded');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => openModal('agreement')} className="flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Agreement
      </Button>
      <Button variant="outline" size="sm" onClick={() => openModal('payment')} className="flex items-center gap-2">
        <DollarSign className="h-4 w-4" />
        Payment
      </Button>
      <Button variant="outline" size="sm" onClick={() => openModal('expense')} className="flex items-center gap-2">
        <Receipt className="h-4 w-4" />
        Expense / Mileage
      </Button>
      {onOther && (
        <Button variant="ghost" size="sm" onClick={onOther} className="flex items-center gap-2">
          <MoreHorizontal className="h-4 w-4" />
          Other
        </Button>
      )}

      {/* Agreement Modal */}
      <Dialog open={activeModal === 'agreement'} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record Agreement</DialogTitle>
            <DialogDescription>Quickly record a contract, bid, or informal agreement.</DialogDescription>
          </DialogHeader>
          <form onSubmit={agreementForm.handleSubmit(onAgreementSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ag-type">Type</Label>
                <Select 
                  value={agreementForm.watch('type')} 
                  onValueChange={(v) => agreementForm.setValue('type', v as any)}
                >
                  <SelectTrigger id="ag-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Informal Terms">Informal Terms</SelectItem>
                    <SelectItem value="Bid Accepted">Bid Accepted</SelectItem>
                    <SelectItem value="Contract Signed">Contract Signed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ag-date">Date</Label>
                <Input id="ag-date" type="date" {...agreementForm.register('date')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ag-amount">Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input id="ag-amount" placeholder="0.00" className="pl-8" {...agreementForm.register('amount')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ag-description">Description</Label>
              <Input id="ag-description" placeholder="What is this agreement for?" {...agreementForm.register('description')} />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="ag-advanced"
                checked={showAdvanced}
                onCheckedChange={setShowAdvanced}
                className="data-[state=unchecked]:bg-input/60 data-[state=unchecked]:border-input"
              />
              <Label htmlFor="ag-advanced" className="text-sm text-muted-foreground">Show advanced fields</Label>
            </div>

            {showAdvanced && (
              <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-1">
                <div className="space-y-2">
                  <Label htmlFor="ag-external_entity_name">Counterparty Name (External)</Label>
                  <Input id="ag-external_entity_name" placeholder="e.g. Acme Corp" {...agreementForm.register('external_entity_name')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ag-notes">Internal Notes</Label>
                  <Textarea id="ag-notes" placeholder="Any extra details..." {...agreementForm.register('notes')} />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Agreement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={activeModal === 'payment'} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Record a payment or deposit received.</DialogDescription>
          </DialogHeader>
          <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pay-type">Type</Label>
                <Select 
                  value={paymentForm.watch('type')} 
                  onValueChange={(v) => paymentForm.setValue('type', v as any)}
                >
                  <SelectTrigger id="pay-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Payment Received">Payment Received</SelectItem>
                    <SelectItem value="Deposit Received">Deposit Received</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-date">Date</Label>
                <Input id="pay-date" type="date" {...paymentForm.register('date')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pay-paid-date">Paid Date</Label>
                <Input id="pay-paid-date" type="date" {...paymentForm.register('paid_at')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-amount">Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input id="pay-amount" placeholder="0.00" className="pl-8" {...paymentForm.register('amount')} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-ref">Reference # (Check/Trans ID)</Label>
              <Input id="pay-ref" placeholder="Optional" {...paymentForm.register('reference_number')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-description">Description</Label>
              <Input id="pay-description" placeholder="e.g. Final payment for Gig" {...paymentForm.register('description')} />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="pay-advanced"
                checked={showAdvanced}
                onCheckedChange={setShowAdvanced}
                className="data-[state=unchecked]:bg-input/60 data-[state=unchecked]:border-input"
              />
              <Label htmlFor="pay-advanced" className="text-sm text-muted-foreground">Show advanced fields</Label>
            </div>

            {showAdvanced && (
              <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-1">
                <div className="space-y-2">
                  <Label htmlFor="pay-external_entity_name">Payer Name (External)</Label>
                  <Input id="pay-external_entity_name" placeholder="Who sent this?" {...paymentForm.register('external_entity_name')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pay-notes">Internal Notes</Label>
                  <Textarea id="pay-notes" placeholder="Any extra details..." {...paymentForm.register('notes')} />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense / Mileage Choice Modal */}
      <Dialog open={activeModal === 'expense'} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Expense or Mileage?</DialogTitle>
            <DialogDescription>Choose which type of cost you want to record.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button 
              variant="outline" 
              className="h-32 flex flex-col gap-2 items-center justify-center border-2 hover:border-primary"
              onClick={() => openModal('mileage')}
            >
              <Car className="h-8 w-8 text-primary" />
              <div className="font-semibold">Mileage</div>
              <div className="text-xs text-muted-foreground text-center">Auto-calculate via IRS rate</div>
            </Button>
            <Button 
              variant="outline" 
              className="h-32 flex flex-col gap-2 items-center justify-center border-2 hover:border-primary"
              onClick={() => openModal('simple_expense')}
            >
              <Receipt className="h-8 w-8 text-primary" />
              <div className="font-semibold">Simple Expense</div>
              <div className="text-xs text-muted-foreground text-center">Manual amount & category</div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mileage Modal */}
      <Dialog open={activeModal === 'mileage'} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Record Mileage</DialogTitle>
            <DialogDescription>Record travel distance for IRS car/truck expense deduction.</DialogDescription>
          </DialogHeader>
          <form onSubmit={mileageForm.handleSubmit(onMileageSubmit)} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mil-date">Date of Travel</Label>
              <Input id="mil-date" type="date" {...mileageForm.register('date')} />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Odometer</p>
                <div className="space-y-2">
                  <Label htmlFor="mil-start">Start</Label>
                  <Input id="mil-start" type="number" placeholder="e.g. 12000" {...mileageForm.register('start_odometer')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mil-end">End</Label>
                  <Input id="mil-end" type="number" placeholder="e.g. 12045" {...mileageForm.register('end_odometer')} />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Or Direct Distance</p>
                <div className="space-y-2">
                  <Label htmlFor="mil-distance">Miles Driven</Label>
                  <div className="relative">
                    <Calculator className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input id="mil-distance" type="number" placeholder="0.0" className="pl-8" {...mileageForm.register('distance')} />
                  </div>
                </div>
                {computedDistance > 0 && (
                  <div className="rounded-md bg-sky-50 border border-sky-200 px-3 py-2 space-y-0.5">
                    <p className="text-[10px] text-sky-600 uppercase tracking-wider font-medium">Calculated</p>
                    <p className="text-sm font-bold text-sky-800">{computedDistance.toFixed(1)} miles</p>
                    <p className="text-xs text-sky-700">
                      @ ${computedRate}/mi = <span className="font-semibold">${computedAmount.toFixed(2)}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mil-description">Description</Label>
              <Input id="mil-description" placeholder="Where did you go?" {...mileageForm.register('description')} />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="mil-advanced"
                checked={showAdvanced}
                onCheckedChange={setShowAdvanced}
                className="data-[state=unchecked]:bg-input/60 data-[state=unchecked]:border-input"
              />
              <Label htmlFor="mil-advanced" className="text-sm text-muted-foreground">Show advanced fields</Label>
            </div>

            {showAdvanced && (
              <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-1">
                <div className="space-y-2">
                  <Label htmlFor="mil-notes">Internal Notes</Label>
                  <Textarea id="mil-notes" placeholder="Any extra details..." {...mileageForm.register('notes')} />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Mileage
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Simple Expense Modal */}
      <Dialog open={activeModal === 'simple_expense'} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record Simple Expense</DialogTitle>
            <DialogDescription>Record a manual expense incurred.</DialogDescription>
          </DialogHeader>
          <form onSubmit={expenseForm.handleSubmit(onExpenseSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exp-date">Date</Label>
                <Input id="exp-date" type="date" {...expenseForm.register('date')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp-amount">Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input id="exp-amount" placeholder="0.00" className="pl-8" {...expenseForm.register('amount')} />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="exp-category">Category</Label>
              <Select 
                value={expenseForm.watch('category')} 
                onValueChange={(v) => expenseForm.setValue('category', v as any)}
              >
                <SelectTrigger id="exp-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Advertising">Advertising</SelectItem>
                  <SelectItem value="Commissions and fees">Commissions and fees</SelectItem>
                  <SelectItem value="Contract labor">Contract labor</SelectItem>
                  <SelectItem value="Insurance">Insurance</SelectItem>
                  <SelectItem value="Legal and professional services">Legal and professional services</SelectItem>
                  <SelectItem value="Office expense">Office expense</SelectItem>
                  <SelectItem value="Rent or lease">Rent or lease</SelectItem>
                  <SelectItem value="Repairs and maintenance">Repairs and maintenance</SelectItem>
                  <SelectItem value="Supplies">Supplies</SelectItem>
                  <SelectItem value="Travel">Travel</SelectItem>
                  <SelectItem value="Meals">Meals</SelectItem>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Other expenses">Other expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exp-description">Description</Label>
              <Input id="exp-description" placeholder="What was this expense for?" {...expenseForm.register('description')} />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="exp-advanced"
                checked={showAdvanced}
                onCheckedChange={setShowAdvanced}
                className="data-[state=unchecked]:bg-input/60 data-[state=unchecked]:border-input"
              />
              <Label htmlFor="exp-advanced" className="text-sm text-muted-foreground">Show advanced fields</Label>
            </div>

            {showAdvanced && (
              <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-1">
                <div className="space-y-2">
                  <Label htmlFor="exp-external_entity_name">Vendor Name (External)</Label>
                  <Input id="exp-external_entity_name" placeholder="e.g. Home Depot" {...expenseForm.register('external_entity_name')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exp-notes">Internal Notes</Label>
                  <Textarea id="exp-notes" placeholder="Any extra details..." {...expenseForm.register('notes')} />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
