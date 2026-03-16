import { useState, useEffect, useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
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

interface ScannedItem {
  description: string;
  quantity: number;
  item_price: number;
  item_cost: number;
  is_asset: boolean;
  category?: string;
  sub_category?: string;
  equipment_type?: string;
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
  const [pdfPageImages, setPdfPageImages] = useState<string[]>([]);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [magnifier, setMagnifier] = useState<{ show: boolean; imgX: number; imgY: number; pageX: number; pageY: number }>({ show: false, imgX: 0, imgY: 0, pageX: 0, pageY: 0 });

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      if (file.type === 'application/pdf') {
        renderPdfToImages(file);
      }
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  async function renderPdfToImages(pdfFile: File) {
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const images: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        images.push(canvas.toDataURL('image/png'));
      }
      setPdfPageImages(images);
    } catch (err) {
      console.error('PDF render error:', err);
      setPdfPageImages([]);
    }
  }

  useEffect(() => {
    if (scannedData) {
      setFormData(recalculateBurdenedCosts({
        ...scannedData,
        items: (scannedData.items || []).map(item => ({
          ...item,
          is_asset: item.is_asset ?? true,
        }))
      }));
    } else if (open) {
      setFormData({
        vendor: '',
        purchase_date: format(new Date(), 'yyyy-MM-dd'),
        total_inv_amount: 0,
        description: '',
        items: []
      });
    }
  }, [scannedData, open]);

  function recalculateBurdenedCosts(data: ScannedData): ScannedData {
    const totalLinePrice = data.items.reduce((sum, item) => sum + (item.item_price * item.quantity), 0);
    if (totalLinePrice <= 0 || data.total_inv_amount <= 0) {
      return { ...data, items: data.items.map(item => ({ ...item, item_cost: item.item_price })) };
    }
    const burdenFactor = data.total_inv_amount / totalLinePrice;
    return {
      ...data,
      items: data.items.map(item => ({
        ...item,
        item_cost: Number((item.item_price * burdenFactor).toFixed(4))
      }))
    };
  }

  if (!open || !formData) return null;

  const handleImgMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMagnifier({ show: true, imgX: x, imgY: y, pageX: e.clientX, pageY: e.clientY });
  };

  const handleHeaderChange = (field: keyof ScannedData, value: string | number) => {
    setFormData(prev => {
      if (!prev) return null;
      const next = { ...prev, [field]: value };
      return field === 'total_inv_amount' ? recalculateBurdenedCosts(next) : next;
    });
  };

  const handleItemChange = (index: number, field: keyof ScannedItem, value: string | number | boolean) => {
    setFormData(prev => {
      if (!prev) return null;
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      const next = { ...prev, items: newItems };
      return (field === 'quantity' || field === 'item_price') ? recalculateBurdenedCosts(next) : next;
    });
  };

  const handleAddItem = () => {
    setFormData(prev => {
      if (!prev) return null;
      return recalculateBurdenedCosts({
        ...prev,
        items: [...prev.items, { description: '', quantity: 1, item_price: 0, item_cost: 0, is_asset: true }]
      });
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => {
      if (!prev) return null;
      const newItems = [...prev.items];
      newItems.splice(index, 1);
      return recalculateBurdenedCosts({ ...prev, items: newItems });
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
        row_type: item.is_asset ? 'asset' as const : 'item' as const,
      }));
      const result = await createPurchaseTransaction(header, items);
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
  const hasMismatch = diff > 0.05;
  const isImage = file?.type.startsWith('image/');
  const isPdf = file?.type === 'application/pdf';

  const renderMagnifiableImage = (src: string, alt: string) => (
    <img
      src={src}
      alt={alt}
      className="max-w-full block rounded shadow-lg cursor-crosshair"
      onMouseMove={handleImgMouseMove}
      onMouseLeave={() => setMagnifier(prev => ({ ...prev, show: false }))}
    />
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          <div
            className="bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col border"
            style={{ width: '96vw', height: '94vh' }}
          >
            {/* Header */}
            <div className="px-4 py-2 border-b flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold">{scannedData ? 'Review Scanned Purchase' : 'Create Purchase Entry'}</h2>
                <p className="text-xs text-gray-500">
                  {scannedData ? 'Verify the extracted data below.' : 'Enter details manually using the document preview as reference.'}
                </p>
              </div>
              <DialogPrimitive.Close className="rounded-sm opacity-70 hover:opacity-100 p-1">
                <CloseIcon className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>

            {/* Body */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
              {/* Preview Panel */}
              <div style={{ width: '45%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f3f4f6', borderRight: '1px solid #e5e7eb', position: 'relative' }}>
                <button
                  onClick={() => setShowFullPreview(true)}
                  className="absolute top-2 right-2 z-20 bg-white/90 hover:bg-white shadow rounded p-1.5"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  {previewUrl && isImage && renderMagnifiableImage(previewUrl, 'Document Preview')}
                  {isPdf && pdfPageImages.length > 0 && pdfPageImages.map((src, i) => (
                    <div key={i}>{renderMagnifiableImage(src, `Page ${i + 1}`)}</div>
                  ))}
                  {isPdf && pdfPageImages.length === 0 && previewUrl && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14 }}>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Rendering PDF...
                    </div>
                  )}
                  {!previewUrl && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                      <FileIcon className="w-12 h-12 mb-2 opacity-20" />
                      <p className="text-sm">No preview available</p>
                    </div>
                  )}
                </div>

                <div className="px-3 py-1 border-t bg-gray-50 flex justify-center gap-4 text-[10px] text-gray-400 flex-shrink-0">
                  <span className="flex items-center gap-1"><Search className="w-3 h-3" /> Hover to magnify</span>
                  <span className="flex items-center gap-1"><Maximize2 className="w-3 h-3" /> Full preview</span>
                </div>
              </div>

              {/* Form Panel */}
              <div style={{ width: '55%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'white' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Purchase Summary */}
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b pb-1 mb-2">Purchase Summary</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        <div style={{ gridColumn: 'span 2' }}>
                          <Label className="text-[10px] font-semibold uppercase text-gray-500">Vendor</Label>
                          <Input
                            value={formData.vendor}
                            onChange={e => handleHeaderChange('vendor', e.target.value)}
                            placeholder="e.g. Sweetwater, B&H, Amazon"
                            className="h-8 text-sm font-semibold border-gray-300 mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] font-semibold uppercase text-gray-500">Date</Label>
                          <Input
                            type="date"
                            value={formData.purchase_date}
                            onChange={e => handleHeaderChange('purchase_date', e.target.value)}
                            className="h-8 text-sm border-gray-300 mt-0.5"
                          />
                        </div>
                        <div style={{ gridColumn: 'span 3' }}>
                          <Label className="text-[10px] font-semibold uppercase text-gray-500">Description / Notes</Label>
                          <Input
                            value={formData.description || ''}
                            onChange={e => handleHeaderChange('description', e.target.value)}
                            placeholder="Purchase description or notes"
                            className="h-8 text-sm border-gray-300 mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] font-semibold uppercase text-gray-500">Invoice Total</Label>
                          <div className="relative mt-0.5">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                            <Input
                              type="text"
                              value={formData.total_inv_amount || ''}
                              onChange={e => {
                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                handleHeaderChange('total_inv_amount', val === '' ? 0 : parseFloat(val));
                              }}
                              placeholder="0.00"
                              className="pl-5 h-8 text-sm font-bold text-sky-700 border-gray-300"
                            />
                          </div>
                        </div>
                        <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center' }}>
                          <p style={{ fontSize: 9, color: '#9ca3af', fontStyle: 'italic' }}>Distributed as burdened cost across items.</p>
                        </div>
                      </div>
                    </div>

                    {/* Line Items */}
                    <div>
                      <div className="flex items-center justify-between border-b pb-1 mb-1.5">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Line Items</h4>
                        <Button variant="outline" size="sm" onClick={handleAddItem} className="h-6 text-[10px] border-sky-300 text-sky-600 hover:bg-sky-50 px-2">
                          <Plus className="w-3 h-3 mr-1" /> Add Item
                        </Button>
                      </div>

                      {formData.items.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 75px 45px 70px 70px 20px', gap: '0 4px', padding: '0 2px', marginBottom: 2 }}
                          className="text-[8px] font-bold uppercase text-gray-400 tracking-wide">
                          <span />
                          <span>Description</span>
                          <span className="text-right">Item Price</span>
                          <span className="text-center">Qty</span>
                          <span className="text-right">Line Amt</span>
                          <span className="text-right">Unit Cost</span>
                          <span />
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {formData.items.map((item, index) => (
                          <div key={index} className="bg-gray-50 rounded border border-gray-100" style={{ padding: '3px 2px' }}>
                            {/* Main row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 75px 45px 70px 70px 20px', gap: '0 4px', alignItems: 'center' }}>
                              <label className="flex items-center justify-center cursor-pointer" title={item.is_asset ? 'Asset (durable)' : 'Expense'}>
                                <input
                                  type="checkbox"
                                  checked={item.is_asset}
                                  onChange={e => handleItemChange(index, 'is_asset', e.target.checked)}
                                  className="w-3.5 h-3.5 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                                />
                              </label>
                              <Input
                                value={item.description}
                                onChange={e => handleItemChange(index, 'description', e.target.value)}
                                placeholder="Item description"
                                className="bg-white border-gray-200 h-7 text-xs"
                              />
                              <div className="relative">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">$</span>
                                <Input
                                  type="text"
                                  value={item.item_price || ''}
                                  onChange={e => {
                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                    handleItemChange(index, 'item_price', val === '' ? 0 : parseFloat(val));
                                  }}
                                  className="pl-4 bg-white border-gray-200 h-7 text-xs font-semibold text-right"
                                />
                              </div>
                              <Input
                                type="text"
                                value={item.quantity || ''}
                                onChange={e => {
                                  const val = e.target.value.replace(/[^0-9]/g, '');
                                  handleItemChange(index, 'quantity', val === '' ? 0 : parseInt(val));
                                }}
                                className="bg-white border-gray-200 text-center h-7 text-xs font-semibold"
                              />
                              <div className="h-7 flex items-center justify-end px-1 bg-gray-100 rounded text-[11px] text-gray-600 font-medium">
                                ${(item.item_price * item.quantity).toFixed(2)}
                              </div>
                              <div className="h-7 flex items-center justify-end px-1 bg-sky-50 rounded text-[11px] text-sky-700 font-bold border border-sky-100">
                                ${item.item_cost.toFixed(2)}
                              </div>
                              <button
                                onClick={() => handleRemoveItem(index)}
                                className="h-7 w-5 flex items-center justify-center text-gray-300 hover:text-red-500"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            {/* Category row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: '0 4px', marginTop: 2 }}>
                              <span />
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <span style={{ fontSize: 9, color: '#9ca3af', whiteSpace: 'nowrap' }}>{item.is_asset ? 'Asset' : 'Expense'}</span>
                                <Input
                                  value={item.category || ''}
                                  onChange={e => handleItemChange(index, 'category', e.target.value)}
                                  placeholder="Category"
                                  className="bg-white border-gray-200 h-6 text-[11px] flex-1"
                                />
                                {item.is_asset && (
                                  <>
                                    <Input
                                      value={item.sub_category || ''}
                                      onChange={e => handleItemChange(index, 'sub_category', e.target.value)}
                                      placeholder="Sub-cat"
                                      className="bg-white border-gray-200 h-6 text-[11px] flex-1"
                                    />
                                    <Input
                                      value={item.equipment_type || ''}
                                      onChange={e => handleItemChange(index, 'equipment_type', e.target.value)}
                                      placeholder="Type"
                                      className="bg-white border-gray-200 h-6 text-[11px] flex-1"
                                    />
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {formData.items.length === 0 && (
                        <div className="text-center py-6 bg-gray-50 border-2 border-dashed rounded-lg">
                          <Plus className="w-6 h-6 text-gray-200 mx-auto mb-1" />
                          <p className="text-xs text-gray-400">No items yet. Click "Add Item" to begin.</p>
                        </div>
                      )}
                    </div>

                    {/* Reconciliation */}
                    <div className={`p-2 rounded flex items-center gap-2 text-xs border ${hasMismatch ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                      <AlertCircle className={`w-3.5 h-3.5 flex-shrink-0 ${hasMismatch ? 'text-amber-500' : 'text-emerald-500'}`} />
                      <span>
                        <strong>{hasMismatch ? 'Mismatch' : 'Reconciled'}:</strong>{' '}
                        Line costs ${calculatedTotalCost.toFixed(2)} vs Invoice ${formData.total_inv_amount.toFixed(2)}
                        {hasMismatch && <span className="text-amber-600"> (diff: ${diff.toFixed(2)})</span>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t bg-gray-50 flex justify-end gap-3 flex-shrink-0">
                  <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 px-6 text-sm">
                    Cancel
                  </Button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || formData.items.length === 0 || !formData.vendor}
                    className="h-8 px-6 text-sm font-semibold rounded-md inline-flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                    style={{ backgroundColor: '#0284c7', color: 'white' }}
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Purchase
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogPrimitive.Portal>

      {/* Magnifier - rendered as fixed portal to avoid container clipping */}
      {magnifier.show && (
        <div
          className="fixed pointer-events-none z-[200] border-2 border-white shadow-xl rounded-full overflow-hidden bg-white"
          style={{
            width: 180, height: 180,
            left: magnifier.pageX - 90,
            top: magnifier.pageY - 90,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundImage: `url(${isPdf && pdfPageImages.length > 0 ? pdfPageImages[0] : previewUrl})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: `${3 * 100}% ${3 * 100}%`,
              backgroundPosition: `${magnifier.imgX}% ${magnifier.imgY}%`,
            }}
          />
        </div>
      )}

      {/* Full Screen Preview */}
      {showFullPreview && previewUrl && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col p-4" onClick={() => setShowFullPreview(false)}>
          <div className="flex justify-end mb-2">
            <Button variant="ghost" className="text-white hover:bg-white/20 h-8 px-4 text-sm" onClick={() => setShowFullPreview(false)}>
              <CloseIcon className="w-5 h-5 mr-2" /> Close
            </Button>
          </div>
          <div className="flex-1 overflow-auto flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            {isImage && <img src={previewUrl} alt="Full Preview" className="max-w-full object-contain rounded" />}
            {isPdf && pdfPageImages.map((src, i) => (
              <img key={i} src={src} alt={`Page ${i + 1}`} className="max-w-full object-contain rounded shadow-lg" />
            ))}
          </div>
        </div>
      )}
    </DialogPrimitive.Root>
  );
}
