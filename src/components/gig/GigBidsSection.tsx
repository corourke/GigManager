import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DollarSign, FileText, Loader2, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { getGigBids, updateGigBids } from '../../services/gig.service';
import { useAutoSave } from '../../utils/hooks/useAutoSave';
import SaveStateIndicator from './SaveStateIndicator';

const bidSchema = z.object({
  id: z.string(),
  date: z.string().min(1, 'Date is required'),
  amount: z.string().refine((val) => {
    if (!val.trim()) return false;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Amount must be a positive number'),
  type: z.string(),
  category: z.string(),
  notes: z.string().optional(),
});

const bidsFormSchema = z.object({
  bids: z.array(bidSchema),
});

type BidsFormData = z.infer<typeof bidsFormSchema>;

interface BidData {
  id: string;
  date: string;
  amount: string;
  type: string;
  category: string;
  notes: string;
}

interface GigBidsSectionProps {
  gigId: string;
  currentOrganizationId: string;
}

export default function GigBidsSection({
  gigId,
  currentOrganizationId,
}: GigBidsSectionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [showBidNotes, setShowBidNotes] = useState<number | null>(null);
  const [currentBidNotes, setCurrentBidNotes] = useState('');

  const { control, handleSubmit, formState: { errors, isDirty }, watch, reset, setValue } = useForm<BidsFormData>({
    resolver: zodResolver(bidsFormSchema),
    mode: 'onChange',
    defaultValues: {
      bids: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'bids',
  });

  const handleSave = useCallback(async (data: BidsFormData) => {
    // Only save bids that have a valid amount
    const validBids = data.bids.filter(b => {
      const amount = parseFloat(b.amount);
      return !isNaN(amount) && b.date;
    });

    if (validBids.length === 0 && data.bids.length > 0) {
      // If there are bids but none are valid yet, don't save
      return;
    }

    await updateGigBids(gigId, currentOrganizationId, validBids.map(b => ({
      id: b.id.startsWith('temp-') ? undefined : b.id,
      amount: parseFloat(b.amount),
      date: b.date,
      type: b.type as any,
      category: b.category as any,
      notes: b.notes || null,
    })));
  }, [gigId, currentOrganizationId]);

  const handleSaveSuccess = useCallback((data: BidsFormData) => {
    reset(data, { keepDirty: false, keepValues: true });
  }, [reset]);

  const { saveState, triggerSave } = useAutoSave<BidsFormData>({
    gigId,
    onSave: handleSave,
    onSuccess: handleSaveSuccess,
    debounceMs: 1000
  });

  const formValues = watch();

  useEffect(() => {
    if (isDirty) {
      // Validate before triggering auto-save
      // We check if all bids in the form are valid according to our schema
      const isValid = formValues.bids.every(bid => {
        const amount = parseFloat(bid.amount);
        return !isNaN(amount) && amount >= 0 && bid.date_given;
      });

      if (isValid) {
        triggerSave(formValues);
      }
    }
  }, [formValues, isDirty, triggerSave]);

  useEffect(() => {
    loadBidsData();
  }, [gigId]);

  const loadBidsData = async () => {
    setIsLoading(true);
    try {
      const data = await getGigBids(gigId, currentOrganizationId);

      // Filter for bid-related records
      const loadedBids = data
        .filter((f: any) => f.type.startsWith('Bid'))
        .map((b: any) => ({
          id: b.id,
          date: b.date || format(new Date(), 'yyyy-MM-dd'),
          amount: (b.amount !== null && b.amount !== undefined) ? b.amount.toString() : '',
          type: b.type,
          category: b.category,
          notes: b.notes || '',
        }));

      reset({ bids: loadedBids });
    } catch (error: any) {
      console.error('Error loading bids:', error);
      toast.error('Failed to load bids');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBid = () => {
    append({
      id: `temp-${Math.random().toString(36).substr(2, 9)}`,
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: '',
      type: 'Bid Submitted',
      category: 'Other',
      notes: '',
    });
  };

  const handleRemoveBid = (index: number) => {
    remove(index);
  };

  const handleOpenBidNotes = (index: number) => {
    const bid = fields[index];
    setCurrentBidNotes(bid.notes || '');
    setShowBidNotes(index);
  };

  const handleSaveBidNotes = () => {
    if (showBidNotes !== null) {
      setValue(`bids.${showBidNotes}.notes`, currentBidNotes, { shouldDirty: true });
      setShowBidNotes(null);
      setCurrentBidNotes('');
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-sky-500 mb-2" />
            <p className="text-gray-600">Loading...</p>
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
            <CardTitle>Bids</CardTitle>
            <SaveStateIndicator state={saveState} />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddBid}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Bid
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <Label className="text-xs text-gray-600">Date:</Label>
                  <div className="flex flex-col gap-1">
                    <Controller
                      name={`bids.${index}.date`}
                      control={control}
                      render={({ field: dateField }) => (
                        <Input
                          type="date"
                          value={dateField.value}
                          onChange={dateField.onChange}
                          className={`w-40 bg-white ${errors.bids?.[index]?.date ? 'border-red-500' : ''}`}
                        />
                      )}
                    />
                    {errors.bids?.[index]?.date && (
                      <p className="text-[10px] text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.bids[index]?.date?.message}
                      </p>
                    )}
                  </div>
                  <Label className="text-xs text-gray-600">Amount:</Label>
                  <div className="flex flex-col gap-1">
                    <div className="relative w-32">
                      <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                        $
                      </span>
                      <Controller
                        name={`bids.${index}.amount`}
                        control={control}
                        render={({ field: amountField }) => (
                          <Input
                            {...amountField}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className={`pl-5 bg-white ${errors.bids?.[index]?.amount ? 'border-red-500' : ''}`}
                            onFocus={(e) => e.target.select()}
                          />
                        )}
                      />
                    </div>
                    {errors.bids?.[index]?.amount && (
                      <p className="text-[10px] text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.bids[index]?.amount?.message}
                      </p>
                    )}
                  </div>
                  <Label className="text-xs text-gray-600">Status:</Label>
                  <Controller
                    name={`bids.${index}.type`}
                    control={control}
                    render={({ field: typeField }) => (
                      <Select
                        value={typeField.value}
                        onValueChange={typeField.onChange}
                      >
                        <SelectTrigger className="w-40 bg-white">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bid Submitted">Submitted</SelectItem>
                          <SelectItem value="Bid Accepted">Accepted</SelectItem>
                          <SelectItem value="Bid Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenBidNotes(index)}
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveBid(index)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {fields.length === 0 && (
            <p className="text-sm text-gray-500">No bids yet</p>
          )}
        </div>
      </CardContent>
    </Card>

      <Dialog open={showBidNotes !== null} onOpenChange={(open) => {
        if (!open) {
          setShowBidNotes(null);
          setCurrentBidNotes('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bid Notes</DialogTitle>
            <DialogDescription>
              Add notes about this bid.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={currentBidNotes}
            onChange={(e) => setCurrentBidNotes(e.target.value)}
            placeholder="Enter notes..."
            rows={6}
            onFocus={(e) => {
              const len = e.target.value.length;
              e.target.setSelectionRange(len, len);
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBidNotes(null);
              setCurrentBidNotes('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveBidNotes}>
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
