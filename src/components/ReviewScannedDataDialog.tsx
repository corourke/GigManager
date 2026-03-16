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
import { 
  Loader2, 
  Plus, 
  Trash2, 
  AlertCircle, 
  FileIcon,
  Search,
  Maximize2,
  X as CloseIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createPurchaseTransaction } from '../services/purchase.service';
import { uploadAttachment, linkAttachmentToEntity } from '../services/attachment.service';
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
  file: File | null;
  gigId?: string;
  onSuccess: (purchaseId: string) => void;
}

export default function ReviewScannedDataDialog({
  open,
  onOpenChange,
  organizationId,
  scannedData,
  file,
  gigId,
  onSuccess,
}: ReviewScannedDataDialogProps) {
  const [formData, setFormData] = useState<ScannedData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0, show: false });

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  useEffect(() => {
    if (scannedData) {
      setFormData({
        ...scannedData,
        items: scannedData.items || []
      });
    } else if (open) {
      // Initialize with empty data for manual entry if scan failed
      setFormData({
        vendor: '',
        purchase_date: format(new Date(), 'yyyy-MM-dd'),
        total_inv_amount: 0,
        items: []
      });
    }
  }, [scannedData, open]);

  if (!formData && open) return null;
  if (!open) return null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;
    setMagnifierPos({ x, y, show: true });
  };

  const handleHeaderChange = (field: keyof ScannedData, value: string | number) => {
    setFormData(prev => {
      if (!prev) return null;
      const next = { ...prev, [field]: value };
      
      // If total_inv_amount changes, we should recalculate burdened costs
      if (field === 'total_inv_amount') {
        return recalculateBurdenedCosts(next);
      }
      return next;
    });
  };

  const handleItemChange = (index: number, field: keyof ScannedItem, value: string | number) => {
    setFormData(prev => {
      if (!prev) return null;
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      const next = { ...prev, items: newItems };
      
      // If quantity or price changes, recalculate burdened costs
      if (field === 'quantity' || field === 'item_price') {
        return recalculateBurdenedCosts(next);
      }
      return next;
    });
  };

  const recalculateBurdenedCosts = (data: ScannedData): ScannedData => {
    const totalLinePrice = data.items.reduce((sum, item) => sum + (item.item_price * item.quantity), 0);
    
    // Avoid division by zero
    if (totalLinePrice <= 0 || data.total_inv_amount <= 0) {
      const newItems = data.items.map(item => ({
        ...item,
        item_cost: item.item_price
      }));
      return { ...data, items: newItems };
    }

    // Burdened factor = Invoice Total / Sum of Item Prices
    const burdenFactor = data.total_inv_amount / totalLinePrice;

    const newItems = data.items.map(item => ({
      ...item,
      item_cost: Number((item.item_price * burdenFactor).toFixed(4))
    }));

    return { ...data, items: newItems };
  };

  const handleAddItem = () => {
    setFormData(prev => {
      if (!prev) return null;
      const newItem: ScannedItem = { description: '', quantity: 1, item_price: 0, item_cost: 0 };
      const next = {
        ...prev,
        items: [...prev.items, newItem]
      };
      return recalculateBurdenedCosts(next);
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => {
      if (!prev) return null;
      const newItems = [...prev.items];
      newItems.splice(index, 1);
      const next = { ...prev, items: newItems };
      return recalculateBurdenedCosts(next);
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
      
      // Upload and link file if provided
      if (file) {
        try {
          const attachment = await uploadAttachment(organizationId, file);
          if (attachment) {
            await linkAttachmentToEntity(attachment.id, 'purchase', result.id);
          }
        } catch (uploadErr) {
          console.error('Error uploading receipt attachment:', uploadErr);
          toast.error('Purchase created, but failed to upload receipt attachment');
        }
      }

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

  const calculatedTotalCost = formData.items.reduce((sum, item) => sum + (item.item_cost * item.quantity), 0);
  const diff = Math.abs(calculatedTotalCost - formData.total_inv_amount);
  const hasMismatch = diff > 0.05; // Slightly larger tolerance for rounding

  const isImage = file?.type.startsWith('image/');
  const isPdf = file?.type === 'application/pdf';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[98vw] !w-[1600px] h-[98vh] flex flex-col p-0 overflow-hidden">
        <div className="p-4 border-b flex-shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl">{scannedData ? 'Review Scanned Purchase' : 'Create Purchase Entry'}</DialogTitle>
            <DialogDescription>
              {scannedData 
                ? 'Verify the extracted data from your invoice/receipt.' 
                : 'The AI scan was unavailable. Use the document preview to manually enter the details.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Document Preview Panel */}
          <div className="w-1/2 border-r bg-gray-200 flex flex-col overflow-hidden relative">
            <div className="absolute top-4 right-4 z-20 flex gap-2">
               <Button 
                variant="secondary" 
                size="icon" 
                className="bg-white/80 backdrop-blur hover:bg-white shadow-md h-10 w-10"
                onClick={() => setShowFullPreview(true)}
              >
                <Maximize2 className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-auto p-4 flex justify-center items-start scrollbar-thin">
              {previewUrl && isImage && (
                <div 
                  className="relative cursor-crosshair shadow-2xl rounded overflow-hidden"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setMagnifierPos(prev => ({ ...prev, show: false }))}
                >
                  <img src={previewUrl} alt="Document Preview" className="max-w-full block" />
                  
                  {magnifierPos.show && (
                    <div 
                      className="absolute pointer-events-none border-2 border-white shadow-xl rounded-full w-64 h-64 overflow-hidden z-30 bg-white"
                      style={{
                        left: `${magnifierPos.x}%`,
                        top: `${magnifierPos.y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <div 
                        className="absolute inset-0 w-[400%] h-[400%]"
                        style={{
                          backgroundImage: `url(${previewUrl})`,
                          backgroundSize: '400% 400%',
                          backgroundPosition: `${magnifierPos.x}% ${magnifierPos.y}%`,
                          backgroundRepeat: 'no-repeat'
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
              {previewUrl && isPdf && (
                <iframe 
                  src={`${previewUrl}#toolbar=1&navpanes=0`} 
                  className="w-full h-full shadow-2xl rounded bg-white" 
                  title="PDF Preview"
                />
              )}
              {!previewUrl && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <FileIcon className="w-16 h-16 mb-4 opacity-20" />
                  <p>No document preview available</p>
                </div>
              )}
            </div>
            
            <div className="p-3 border-t bg-gray-50 flex justify-center gap-6 text-xs text-gray-500 flex-shrink-0">
              {isImage && (
                <div className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" />
                  <span className="font-medium">Hover to Magnify</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Full Preview Available</span>
              </div>
            </div>
          </div>

          {/* Form Entry Panel */}
          <div className="w-1/2 flex flex-col overflow-hidden bg-white">
            <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-thin">
              {/* Header Info */}
              <div className="space-y-6">
                <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 border-b pb-3">Purchase Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3 md:col-span-2">
                    <Label htmlFor="vendor" className="text-xs font-bold uppercase tracking-wider text-gray-500">Vendor Name</Label>
                    <Input 
                      id="vendor" 
                      value={formData.vendor} 
                      onChange={e => handleHeaderChange('vendor', e.target.value)}
                      placeholder="e.g. Sweetwater, B&H, Amazon"
                      className="text-xl font-bold h-12 border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="purchase_date" className="text-xs font-bold uppercase tracking-wider text-gray-500">Purchase Date</Label>
                    <Input 
                      id="purchase_date" 
                      type="date"
                      value={formData.purchase_date} 
                      onChange={e => handleHeaderChange('purchase_date', e.target.value)}
                      className="h-11 border-gray-300"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="total_inv_amount" className="text-xs font-bold uppercase tracking-wider text-gray-500">Invoice Total (Grand Total)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                      <Input 
                        id="total_inv_amount" 
                        type="text"
                        value={formData.total_inv_amount || ''} 
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          handleHeaderChange('total_inv_amount', val === '' ? 0 : parseFloat(val));
                        }}
                        placeholder="0.00"
                        className="pl-8 text-xl font-black text-sky-700 h-11 border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 italic">This total will be distributed as burdened cost across items.</p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-3">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400">Line Items</h4>
                  <Button variant="outline" size="sm" onClick={handleAddItem} className="h-9 border-sky-300 text-sky-600 hover:bg-sky-50 px-4 font-bold">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                
                <div className="space-y-6">
                  {formData.items.map((item, index) => (
                    <div key={index} className="p-6 bg-gray-50 rounded-xl border-2 border-gray-100 relative group/item shadow-sm hover:shadow-md transition-shadow">
                       <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white border shadow-sm text-gray-400 hover:text-red-600 hover:border-red-200"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-12 md:col-span-6 space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-tight text-gray-400">Description / Model</Label>
                          <Input 
                            value={item.description} 
                            onChange={e => handleItemChange(index, 'description', e.target.value)}
                            placeholder="Full item description"
                            className="bg-white border-gray-200 focus:border-sky-400 h-10 font-medium"
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2 space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-tight text-gray-400">Qty</Label>
                          <Input 
                            type="text"
                            value={item.quantity || ''} 
                            onChange={e => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              handleItemChange(index, 'quantity', val === '' ? 0 : parseInt(val));
                            }}
                            className="bg-white border-gray-200 text-center h-10 font-bold"
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2 space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-tight text-gray-400">Price (Each)</Label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">$</span>
                            <Input 
                              type="text"
                              value={item.item_price || ''} 
                              onChange={e => {
                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                handleItemChange(index, 'item_price', val === '' ? 0 : parseFloat(val));
                              }}
                              className="pl-6 bg-white border-gray-200 h-10 font-bold"
                            />
                          </div>
                        </div>
                        <div className="col-span-4 md:col-span-2 space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-tight text-gray-400">Line Amount</Label>
                          <div className="h-10 flex items-center justify-end px-3 bg-gray-200/50 rounded-md border-2 border-gray-100 font-bold text-gray-700">
                            ${(item.item_price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="col-span-12 pt-2 flex items-center justify-end gap-3 text-[11px]">
                          <span className="text-gray-400 font-medium italic">Computed Burdened Cost (Unit Cost):</span>
                          <span className="font-black text-sky-700 bg-sky-100/50 px-3 py-1 rounded-full border border-sky-200">
                            ${item.item_cost.toFixed(2)} / unit
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {formData.items.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 border-4 border-dashed rounded-2xl">
                      <Plus className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                      <p className="text-base font-medium text-gray-400">No items added yet. Click "Add Item" to begin.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reconciliation Check */}
              <div className={`p-6 rounded-xl flex items-start gap-4 shadow-sm border-2 ${hasMismatch ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-emerald-50 text-emerald-900 border-emerald-200'}`}>
                <AlertCircle className={`w-6 h-6 mt-0.5 ${hasMismatch ? 'text-amber-600' : 'text-emerald-600'}`} />
                <div className="flex-1">
                  <p className="font-black text-sm uppercase tracking-wider">
                    {hasMismatch ? 'Reconciliation Mismatch' : 'Reconciliation Successful'}
                  </p>
                  <p className="text-xs font-medium opacity-80 mt-2 leading-relaxed">
                    Sum of computed line costs: <span className="font-bold underline decoration-2">${calculatedTotalCost.toFixed(2)}</span>. 
                    Invoice total: <span className="font-bold underline decoration-2">${formData.total_inv_amount.toFixed(2)}</span>.
                    {hasMismatch && ` There is a discrepancy of $${diff.toFixed(2)} that may need manual adjustment or item price correction.`}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-4 flex-shrink-0">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="px-10 h-12 font-bold text-gray-600">
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting || formData.items.length === 0 || !formData.vendor}
                className="bg-sky-600 hover:bg-sky-700 text-white px-12 h-12 font-black shadow-lg shadow-sky-200 active:scale-95 transition-all"
              >
                {isSubmitting && <Loader2 className="w-5 h-5 mr-3 animate-spin" />}
                Confirm and Save Purchase
              </Button>
            </div>
          </div>
        </div>

        {/* Full Screen Preview Modal */}
        {showFullPreview && previewUrl && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col p-6 backdrop-blur-md">
            <div className="flex justify-end mb-6">
              <Button variant="ghost" className="text-white hover:bg-white/20 h-12 px-6 font-bold" onClick={() => setShowFullPreview(false)}>
                <CloseIcon className="w-8 h-8 mr-3" />
                Close Preview
              </Button>
            </div>
            <div className="flex-1 overflow-auto flex justify-center items-center">
              {isImage ? (
                <img src={previewUrl} alt="Full Preview" className="max-h-full max-w-full object-contain shadow-2xl rounded-lg" />
              ) : (
                <iframe src={previewUrl} className="w-full h-full bg-white rounded-lg shadow-2xl" />
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
