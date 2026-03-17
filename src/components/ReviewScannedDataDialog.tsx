import { useState, useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
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

function NumericInput({ value, onChange, placeholder = '0.00', className = '' }: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  className?: string;
}) {
  const [raw, setRaw] = useState<string | null>(null);
  const displayed = raw !== null ? raw : (value ? String(value) : '');

  return (
    <Input
      type="text"
      value={displayed}
      onChange={e => {
        const v = e.target.value.replace(/[^0-9.]/g, '');
        setRaw(v);
        const num = parseFloat(v);
        if (!isNaN(num)) onChange(num);
        else if (v === '' || v === '.') onChange(0);
      }}
      onBlur={() => setRaw(null)}
      placeholder={placeholder}
      className={className}
    />
  );
}

interface ScannedItem {
  description: string;
  quantity: number;
  item_price: number;
  item_cost: number;
  is_asset: boolean;
  is_durable?: boolean;
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
  const [magnifier, setMagnifier] = useState<{ show: boolean; pageX: number; pageY: number; src: string; bgX: number; bgY: number; bgW: number; bgH: number }>({ show: false, pageX: 0, pageY: 0, src: '', bgX: 0, bgY: 0, bgW: 0, bgH: 0 });

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
          is_asset: item.is_asset ?? item.is_durable ?? false,
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

  const ZOOM = 3;
  const MAG_R = 90;

  const handleImgMouseMove = (src: string) => (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    const bgW = rect.width * ZOOM;
    const bgH = rect.height * ZOOM;
    const bgX = MAG_R - relX * ZOOM;
    const bgY = MAG_R - relY * ZOOM;
    setMagnifier({ show: true, pageX: e.clientX, pageY: e.clientY, src, bgX, bgY, bgW, bgH });
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

  const handleLineAmtChange = (index: number, lineAmt: number) => {
    setFormData(prev => {
      if (!prev) return null;
      const newItems = [...prev.items];
      const qty = newItems[index].quantity || 1;
      newItems[index] = { ...newItems[index], item_price: Number((lineAmt / qty).toFixed(4)) };
      return recalculateBurdenedCosts({ ...prev, items: newItems });
    });
  };

  const handleAddItem = () => {
    setFormData(prev => {
      if (!prev) return null;
      return recalculateBurdenedCosts({
        ...prev,
        items: [...prev.items, { description: '', quantity: 1, item_price: 0, item_cost: 0, is_asset: false }]
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
      style={{ maxWidth: '100%', display: 'block', borderRadius: 4, cursor: 'crosshair' }}
      onMouseMove={handleImgMouseMove(src)}
      onMouseLeave={() => setMagnifier(prev => ({ ...prev, show: false }))}
    />
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ padding: 12 }}>
          <div
            className="bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col border"
            style={{ width: '96vw', height: '94vh' }}
          >
            <div style={{ padding: '6px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 600 }}>{scannedData ? 'Review Scanned Purchase' : 'Create Purchase Entry'}</h2>
                <p style={{ fontSize: 11, color: '#6b7280' }}>
                  {scannedData ? 'Verify the extracted data below.' : 'Enter details manually using the document preview as reference.'}
                </p>
              </div>
              <DialogPrimitive.Close className="rounded-sm opacity-70 hover:opacity-100 p-1">
                <CloseIcon className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
              {/* Preview Panel */}
              <div style={{ width: '45%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f3f4f6', borderRight: '1px solid #e5e7eb', position: 'relative' }}>
                <button
                  onClick={() => setShowFullPreview(true)}
                  style={{ position: 'absolute', top: 8, right: 8, zIndex: 20, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 4, padding: 6, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}
                  title="Full screen preview"
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
                      <p style={{ fontSize: 13 }}>No preview available</p>
                    </div>
                  )}
                </div>

                <div style={{ padding: '3px 12px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'center', gap: 16, fontSize: 10, color: '#9ca3af', flexShrink: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Search className="w-3 h-3" /> Hover to magnify</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Maximize2 className="w-3 h-3" /> Full preview</span>
                </div>
              </div>

              {/* Form Panel */}
              <div style={{ width: '55%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'white' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Purchase Summary */}
                    <div>
                      <h4 style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', borderBottom: '1px solid #e5e7eb', paddingBottom: 3, marginBottom: 6 }}>Purchase Summary</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                        <div style={{ gridColumn: 'span 2' }}>
                          <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#6b7280' }}>Vendor</span>
                          <Input
                            value={formData.vendor}
                            onChange={e => handleHeaderChange('vendor', e.target.value)}
                            placeholder="e.g. Sweetwater, B&H, Amazon"
                            className="h-7 text-xs font-semibold border-gray-300 mt-0.5"
                          />
                        </div>
                        <div>
                          <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#6b7280' }}>Date</span>
                          <Input
                            type="date"
                            value={formData.purchase_date}
                            onChange={e => handleHeaderChange('purchase_date', e.target.value)}
                            className="h-7 text-xs border-gray-300 mt-0.5"
                          />
                        </div>
                        <div>
                          <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#6b7280' }}>Description / Notes</span>
                          <Input
                            value={formData.description || ''}
                            onChange={e => handleHeaderChange('description', e.target.value)}
                            placeholder="Purchase notes"
                            className="h-7 text-xs border-gray-300 mt-0.5"
                          />
                        </div>
                        <div>
                          <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#6b7280' }}>Invoice Total</span>
                          <div style={{ position: 'relative', marginTop: 2 }}>
                            <span style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 11 }}>$</span>
                            <NumericInput
                              value={formData.total_inv_amount}
                              onChange={v => handleHeaderChange('total_inv_amount', v)}
                              className="pl-4 h-7 text-xs font-bold text-sky-700 border-gray-300"
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
                          <p style={{ fontSize: 9, color: '#9ca3af', fontStyle: 'italic', lineHeight: 1.2 }}>Distributed as burdened cost across items.</p>
                        </div>
                      </div>
                    </div>

                    {/* Line Items */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: 3, marginBottom: 4 }}>
                        <h4 style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af' }}>Line Items</h4>
                        <button
                          onClick={handleAddItem}
                          style={{ height: 22, padding: '0 8px', fontSize: 10, border: '1px solid #7dd3fc', color: '#0284c7', background: 'white', borderRadius: 4, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                        >
                          <Plus className="w-3 h-3" /> Add Item
                        </button>
                      </div>

                      {formData.items.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 72px 40px 72px 68px 18px', gap: '0 3px', padding: '0 2px', marginBottom: 2, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '0.04em' }}>
                          <span style={{ fontSize: 8, textAlign: 'center' }}>A/E</span>
                          <span>Description</span>
                          <span style={{ textAlign: 'center' }}>Item Price</span>
                          <span style={{ textAlign: 'center' }}>Qty</span>
                          <span style={{ textAlign: 'center' }}>Line Amt</span>
                          <span style={{ textAlign: 'center' }}>Unit Cost</span>
                          <span />
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {formData.items.map((item, index) => (
                          <div key={index} style={{ background: '#f9fafb', borderRadius: 4, border: '1px solid #f3f4f6', padding: '2px 2px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 72px 40px 72px 68px 18px', gap: '0 3px', alignItems: 'center' }}>
                              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: 0 }} title={item.is_asset ? 'Asset (durable)' : 'Expense'}>
                                <input
                                  type="checkbox"
                                  checked={item.is_asset}
                                  onChange={e => handleItemChange(index, 'is_asset', e.target.checked)}
                                  style={{ width: 13, height: 13, borderRadius: 2, accentColor: '#0284c7' }}
                                />
                              </label>
                              <Input
                                value={item.description}
                                onChange={e => handleItemChange(index, 'description', e.target.value)}
                                placeholder="Item description"
                                className="bg-white border-gray-200 h-6 text-[11px]"
                              />
                              <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 10 }}>$</span>
                                <NumericInput
                                  value={item.item_price}
                                  onChange={v => handleItemChange(index, 'item_price', v)}
                                  className="pl-3.5 bg-white border-gray-200 h-6 text-[11px] font-semibold text-right"
                                />
                              </div>
                              <NumericInput
                                value={item.quantity}
                                onChange={v => handleItemChange(index, 'quantity', Math.max(1, Math.round(v)))}
                                placeholder="1"
                                className="bg-white border-gray-200 text-center h-6 text-[11px] font-semibold"
                              />
                              <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 10 }}>$</span>
                                <NumericInput
                                  value={Number((item.item_price * item.quantity).toFixed(2))}
                                  onChange={v => handleLineAmtChange(index, v)}
                                  className="pl-3.5 bg-white border-gray-200 h-6 text-[11px] text-right"
                                />
                              </div>
                              <div style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 4px', background: '#f0f9ff', borderRadius: 3, fontSize: 10, color: '#0369a1', fontWeight: 700, border: '1px solid #e0f2fe' }}>
                                ${item.item_cost.toFixed(2)}
                              </div>
                              <button
                                onClick={() => handleRemoveItem(index)}
                                style={{ height: 24, width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db', background: 'none', border: 'none', cursor: 'pointer' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}
                              >
                                <Trash2 style={{ width: 12, height: 12 }} />
                              </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: '0 3px', marginTop: 1 }}>
                              <span />
                              <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                                <span style={{ fontSize: 8, color: item.is_asset ? '#0284c7' : '#810606', whiteSpace: 'nowrap', fontWeight: 600, width: 40 }}>{item.is_asset ? 'Asset' : 'Expense'}</span>
                                <Input
                                  value={item.category || ''}
                                  onChange={e => handleItemChange(index, 'category', e.target.value)}
                                  placeholder="Category"
                                  className="bg-white border-gray-200 h-5 text-[10px] flex-1"
                                />
                                {item.is_asset && (
                                  <>
                                    <Input
                                      value={item.sub_category || ''}
                                      onChange={e => handleItemChange(index, 'sub_category', e.target.value)}
                                      placeholder="Sub-cat"
                                      className="bg-white border-gray-200 h-5 text-[10px] flex-1"
                                    />
                                    <Input
                                      value={item.equipment_type || ''}
                                      onChange={e => handleItemChange(index, 'equipment_type', e.target.value)}
                                      placeholder="Type"
                                      className="bg-white border-gray-200 h-5 text-[10px] flex-1"
                                    />
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {formData.items.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '20px 0', background: '#f9fafb', border: '2px dashed #e5e7eb', borderRadius: 8 }}>
                          <Plus style={{ width: 24, height: 24, color: '#e5e7eb', margin: '0 auto 4px' }} />
                          <p style={{ fontSize: 11, color: '#9ca3af' }}>No items yet. Click "Add Item" to begin.</p>
                        </div>
                      )}
                    </div>

                    {/* Reconciliation */}
                    <div style={{ padding: 6, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, border: `1px solid ${hasMismatch ? '#fde68a' : '#a7f3d0'}`, background: hasMismatch ? '#fffbeb' : '#ecfdf5', color: hasMismatch ? '#92400e' : '#065f46' }}>
                      <AlertCircle style={{ width: 14, height: 14, flexShrink: 0, color: hasMismatch ? '#f59e0b' : '#10b981' }} />
                      <span>
                        <strong>{hasMismatch ? 'Mismatch' : 'Reconciled'}:</strong>{' '}
                        Line costs ${calculatedTotalCost.toFixed(2)} vs Invoice ${formData.total_inv_amount.toFixed(2)}
                        {hasMismatch && <span style={{ color: '#d97706' }}> (diff: ${diff.toFixed(2)})</span>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '6px 16px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'flex-end', gap: 12, flexShrink: 0 }}>
                  <Button variant="outline" onClick={() => onOpenChange(false)} className="h-7 px-5 text-xs">
                    Cancel
                  </Button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || formData.items.length === 0 || !formData.vendor}
                    style={{ height: 28, padding: '0 20px', fontSize: 12, fontWeight: 600, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0284c7', color: 'white', border: 'none', cursor: 'pointer', opacity: (isSubmitting || formData.items.length === 0 || !formData.vendor) ? 0.5 : 1 }}
                  >
                    {isSubmitting && <Loader2 style={{ width: 14, height: 14, marginRight: 6 }} className="animate-spin" />}
                    Save Purchase
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {magnifier.show && magnifier.src && (
          <div
            style={{
              position: 'fixed',
              pointerEvents: 'none',
              zIndex: 200,
              border: '2px solid white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'white',
              width: MAG_R * 2,
              height: MAG_R * 2,
              left: magnifier.pageX - MAG_R,
              top: magnifier.pageY - MAG_R,
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundImage: `url(${magnifier.src})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${magnifier.bgW}px ${magnifier.bgH}px`,
                backgroundPosition: `${magnifier.bgX}px ${magnifier.bgY}px`,
              }}
            />
          </div>
        )}

        {showFullPreview && previewUrl && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', padding: 16 }}
            onClick={() => setShowFullPreview(false)}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '4px 12px', borderRadius: 4 }}
                onClick={() => setShowFullPreview(false)}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <CloseIcon style={{ width: 18, height: 18 }} /> Close
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }} onClick={e => e.stopPropagation()}>
              {isImage && <img src={previewUrl} alt="Full Preview" style={{ maxWidth: '100%', objectFit: 'contain', borderRadius: 4 }} />}
              {isPdf && pdfPageImages.map((src, i) => (
                <img key={i} src={src} alt={`Page ${i + 1}`} style={{ maxWidth: '100%', objectFit: 'contain', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
              ))}
            </div>
          </div>
        )}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
