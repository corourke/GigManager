import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Loader2, Plus, Trash2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createPurchaseTransaction } from '../services/purchase.service';
import { Organization, UserRole } from '../utils/supabase/types';

interface ScannedItem {
  description: string;
  quantity: number;
  item_price: number;
  item_cost: number;
  category?: string;
  sub_category?: string;
}

interface ScannedData {
  vendor: string;
  purchase_date: string;
  total_inv_amount: number;
  payment_method?: string;
  description?: string;
  category?: string;
  sub_category?: string;
  items: ScannedItem[];
}

interface ReviewScannedDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  scannedData: ScannedData | null;
  gigId?: string;
  onSuccess: (purchaseId: string) => void;
}

export default function ReviewScannedDataDialog({
  open,
  onOpenChange,
  organizationId,
  scannedData,
  gigId,
  onSuccess,
}: ReviewScannedDataDialogProps) {
  const [formData, setFormData] = useState<ScannedData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (scannedData) {
      setFormData({
        ...scannedData,
        items: scannedData.items || []
      });
    }
  }, [scannedData]);

  if (!formData) return null;

  const handleHeaderChange = (field: keyof ScannedData, value: string | number) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleItemChange = (index: number, field: keyof ScannedItem, value: string | number) => {
    setFormData(prev => {
      if (!prev) return null;
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const handleAddItem = () => {
    setFormData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        items: [
          ...prev.items,
          { description: '', quantity: 1, item_price: 0, item_cost: 0 }
        ]
      };
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => {
      if (!prev) return null;
      const newItems = [...prev.items];
      newItems.splice(index, 1);
      return { ...prev, items: newItems };
    });
  };

  const handleSubmit = async () => {
    if (!formData) return;

    setIsSubmitting(true);
    try {
      const header = {
        organization_id: organizationId,
        purchase_date: formData.purchase_date,
        vendor: formData.vendor,
        total_inv_amount: formData.total_inv_amount,
        payment_method: formData.payment_method,
        description: formData.description,
        category: formData.category,
        sub_category: formData.sub_category,
        gig_id: gigId,
        row_type: 'header' as const,
      };

      const items = formData.items.map(item => ({
        organization_id: organizationId,
        purchase_date: formData.purchase_date,
        vendor: formData.vendor,
        description: item.description,
        quantity: item.quantity,
        item_price: item.item_price,
        item_cost: item.item_cost,
        line_amount: item.item_price * item.quantity,
        line_cost: item.item_cost * item.quantity,
        category: item.category || formData.category,
        sub_category: item.sub_category || formData.sub_category,
        row_type: 'item' as const,
      }));

      const result = await createPurchaseTransaction(header, items);
      toast.success('Purchase created successfully');
      onSuccess(result.id);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error creating purchase:', err);
      toast.error(err.message || 'Failed to create purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatedTotal = formData.items.reduce((sum, item) => sum + (item.item_price * item.quantity), 0);
  const diff = Math.abs(calculatedTotal - formData.total_inv_amount);
  const hasMismatch = diff > 0.01;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Scanned Purchase</DialogTitle>
          <DialogDescription>
            Verify the extracted data from your invoice/receipt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Input 
                id="vendor" 
                value={formData.vendor} 
                onChange={e => handleHeaderChange('vendor', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase_date">Date</Label>
              <Input 
                id="purchase_date" 
                type="date"
                value={formData.purchase_date} 
                onChange={e => handleHeaderChange('purchase_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_inv_amount">Invoice Total</Label>
              <Input 
                id="total_inv_amount" 
                type="number"
                step="0.01"
                value={formData.total_inv_amount} 
                onChange={e => handleHeaderChange('total_inv_amount', parseFloat(e.target.value))}
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Line Items</h4>
              <Button variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead className="w-32">Price (Each)</TableHead>
                    <TableHead className="w-32">Cost (Each)</TableHead>
                    <TableHead className="w-32 text-right">Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input 
                          value={item.description} 
                          onChange={e => handleItemChange(index, 'description', e.target.value)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number"
                          value={item.quantity} 
                          onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number"
                          step="0.01"
                          value={item.item_price} 
                          onChange={e => handleItemChange(index, 'item_price', parseFloat(e.target.value))}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number"
                          step="0.01"
                          value={item.item_cost} 
                          onChange={e => handleItemChange(index, 'item_cost', parseFloat(e.target.value))}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        ${(item.item_price * item.quantity).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-gray-400 hover:text-red-600"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Reconciliation Check */}
          <div className={`p-4 rounded-lg flex items-start gap-3 ${hasMismatch ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">
                {hasMismatch ? 'Total Mismatch' : 'Reconciliation Successful'}
              </p>
              <p className="text-sm">
                Line items total: <span className="font-bold">${calculatedTotal.toFixed(2)}</span>. 
                Invoice total: <span className="font-bold">${formData.total_inv_amount.toFixed(2)}</span>.
                {hasMismatch && ` Difference of $${diff.toFixed(2)}.`}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="bg-sky-500 hover:bg-sky-600 text-white"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm and Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
