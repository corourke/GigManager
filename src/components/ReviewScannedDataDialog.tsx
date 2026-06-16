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
  ChevronDown,
  ChevronRight,
  X as CloseIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { toFinCategory } from '../utils/supabase/constants';
import {
  createPurchaseTransaction,
  getPurchaseWithDetails,
  updatePurchase,
  createPurchase,
  deletePurchase,
  computeAssetFieldChanges,
  type AssetFieldChange,
} from '../services/purchase.service';
import { createGigFinancial, getGigFinancials, updateGigFinancial } from '../services/gig.service';
import { uploadAttachment, linkAttachmentToEntity, getAttachmentUrl } from '../services/attachment.service';
import { updateAsset } from '../services/asset.service';

function NumericInput({ value, onChange, placeholder = '0.00', className = '' }: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  className?: string;
}) {
  const [raw, setRaw] = useState<string | null>(null);
  const displayed = raw !== null ? raw : (value === 0 ? '' : String(value));

  return (
    <Input
      type="text"
      value={displayed}
      onChange={e => {
        let v = e.target.value.replace(/[^0-9.]/g, '');
        // Allow only one decimal point
        const dots = v.split('.').length - 1;
        if (dots > 1) {
          const parts = v.split('.');
          v = parts[0] + '.' + parts.slice(1).join('');
        }
        setRaw(v);
        const num = parseFloat(v);
        if (!isNaN(num)) {
          if (num !== value) onChange(num);
        } else if (v === '') {
          if (value !== 0) onChange(0);
        }
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
  kit?: string;
  serial_number?: string;
  tag_number?: string;
  replacement_value?: number;
  show_extra?: boolean;
  // Edit-mode tracking (present only when editing an existing purchase)
  _purchaseId?: string;
  _assetId?: string | null;
  _gigId?: string | null;
  _rowType?: string;
}

interface UpdatePlan {
  headerData: Record<string, any>;
  updatedItems: { id: string; data: Record<string, any> }[];
  newItems: Record<string, any>[];
  removedItemIds: string[];
  assetChanges: { assetId: string; itemDescription: string; changes: AssetFieldChange[]; data: Record<string, any> }[];
  gigChanges: { finId: string; label: string; from: number; to: number }[];
}

interface ScannedData {
  vendor: string;
  purchase_date: string;
  total_inv_amount: number;
  payment_method?: string;
  description?: string;
  category?: string;
  sub_category?: string;
  invoice_number?: string;
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
  /** When set, the dialog edits this existing purchase instead of creating one. */
  editPurchaseId?: string;
  /** Called after a successful edit save. */
  onUpdated?: (purchaseId: string) => void;
}

export default function ReviewScannedDataDialog({
  open,
  onOpenChange,
  organizationId,
  scannedData,
  file,
  gigId,
  onSuccess,
  editPurchaseId,
  onUpdated,
}: ReviewScannedDataDialogProps) {
  const isEditMode = !!editPurchaseId;
  const [formData, setFormData] = useState<ScannedData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assetsById, setAssetsById] = useState<Record<string, any>>({});
  const [ledgerByPurchaseId, setLedgerByPurchaseId] = useState<Record<string, any>>({});
  const [originalItemIds, setOriginalItemIds] = useState<string[]>([]);
  const [existingDoc, setExistingDoc] = useState<{ url: string; kind: 'image' | 'pdf' | 'other'; name: string } | null>(null);
  const [pendingPlan, setPendingPlan] = useState<UpdatePlan | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [pdfPageImages, setPdfPageImages] = useState<string[]>([]);
  const [magnifierEnabled, setMagnifierEnabled] = useState(false);
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
        await page.render({ canvas, viewport }).promise;
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
      const description = scannedData.description
        || (scannedData.invoice_number ? `Invoice #${scannedData.invoice_number}` : '');
      setFormData(recalculateBurdenedCosts({
        ...scannedData,
        description,
        items: (scannedData.items || []).map(item => ({
          ...item,
          is_asset: item.is_asset ?? item.is_durable ?? false,
        }))
      }));
    } else if (open && !editPurchaseId) {
      setFormData({
        vendor: '',
        purchase_date: format(new Date(), 'yyyy-MM-dd'),
        total_inv_amount: 0,
        description: '',
        items: []
      });
    }
  }, [scannedData, open, editPurchaseId]);

  // Edit mode: load the existing purchase, its linked assets, and gig ledger rows.
  useEffect(() => {
    if (!open || !editPurchaseId) return;
    let cancelled = false;
    setExistingDoc(null);
    setPendingPlan(null);
    (async () => {
      try {
        const details: any = await getPurchaseWithDetails(editPurchaseId);
        if (cancelled) return;

        const items: any[] = details.items || [];
        const aById: Record<string, any> = {};
        (details.assets || []).forEach((a: any) => { aById[a.id] = a; });
        setAssetsById(aById);
        setOriginalItemIds(items.map((it) => it.id));

        setFormData(recalculateBurdenedCosts({
          vendor: details.vendor || '',
          purchase_date: details.purchase_date || format(new Date(), 'yyyy-MM-dd'),
          total_inv_amount: details.total_inv_amount || 0,
          payment_method: details.payment_method || undefined,
          description: details.description || '',
          category: details.category || undefined,
          sub_category: details.sub_category || undefined,
          items: items.map((it) => ({
            description: it.description || '',
            quantity: it.quantity || 1,
            item_price: it.item_price || 0,
            item_cost: it.item_cost || 0,
            is_asset: it.row_type === 'asset',
            category: it.category || '',
            sub_category: it.sub_category || '',
            _purchaseId: it.id,
            _assetId: it.asset_id || null,
            _gigId: it.gig_id || null,
            _rowType: it.row_type,
          })),
        }));

        // Gig ledger rows linked by purchase_id, across every distinct linked gig.
        const gigIds = Array.from(new Set(
          [details.gig_id, ...items.map((it) => it.gig_id)].filter(Boolean)
        )) as string[];
        const lByPid: Record<string, any> = {};
        for (const gid of gigIds) {
          try {
            const rows: any[] = await getGigFinancials(gid, organizationId);
            (rows || []).forEach((r) => { if (r.purchase_id) lByPid[r.purchase_id] = r; });
          } catch { /* non-fatal */ }
        }
        if (!cancelled) setLedgerByPurchaseId(lByPid);

        // Show the existing attached document in the preview pane.
        const att: any = (details.attachments || [])[0];
        if (att?.file_path) {
          try {
            const url = await getAttachmentUrl(att.file_path);
            const ext = (att.file_name || '').split('.').pop()?.toLowerCase() || '';
            const kind = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)
              ? 'image' : ext === 'pdf' ? 'pdf' : 'other';
            if (!cancelled) setExistingDoc({ url, kind, name: att.file_name });
          } catch { /* non-fatal */ }
        }
      } catch (err: any) {
        console.error('Error loading purchase for edit:', err);
        toast.error('Failed to load purchase');
      }
    })();
    return () => { cancelled = true; };
  }, [open, editPurchaseId, organizationId]);

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
    // To show the point (relX, relY) in the center (MAG_R, MAG_R) of the container:
    // bgX = center_of_container - (relX_on_original * ZOOM)
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

      const assets = formData.items
        .filter(item => item.is_asset)
        .map(item => ({
          organization_id: organizationId,
          manufacturer_model: item.description,
          description: item.description,
          category: item.category || formData.category,
          sub_category: item.sub_category || formData.sub_category,
          equipment_type: item.equipment_type,
          quantity: item.quantity,
          item_price: item.item_price,
          item_cost: item.item_cost,
          acquisition_date: formData.purchase_date,
          vendor: formData.vendor,
          serial_number: item.serial_number,
          tag_number: item.tag_number,
          replacement_value: item.replacement_value || item.item_price,
          kit: item.kit,
          insurance_policy_added: false,
          status: 'Active',
        }));

      const result = await createPurchaseTransaction(header, items, assets);

      if (gigId) {
        try {
          await createGigFinancial({
            gig_id: gigId,
            organization_id: organizationId,
            date: formData.purchase_date,
            amount: formData.total_inv_amount,
            type: 'Expense Incurred',
            category: toFinCategory(formData.category) ?? 'Other expenses',
            description: formData.description || `Receipt: ${formData.vendor}`,
            purchase_id: result.id,
            paid_at: new Date().toISOString(), // Incurred from receipt implies paid
          });
          // Dispatch event to refresh financials
          window.dispatchEvent(new CustomEvent('gig-financials-updated', { detail: { gigId } }));
        } catch (finErr) {
          console.error('Error creating linked gig financial record:', finErr);
        }
      }

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

  // Build the set of DB writes implied by the current edit, including proposed
  // changes to linked assets and gig ledger entries (surfaced for confirmation).
  const buildUpdatePlan = (fd: ScannedData): UpdatePlan => {
    const headerData = {
      vendor: fd.vendor,
      purchase_date: fd.purchase_date,
      description: fd.description,
      total_inv_amount: fd.total_inv_amount,
      payment_method: fd.payment_method,
      category: fd.category,
      sub_category: fd.sub_category,
    };

    const updatedItems: UpdatePlan['updatedItems'] = [];
    const newItems: UpdatePlan['newItems'] = [];
    const presentIds = new Set<string>();

    for (const item of fd.items) {
      const lineData = {
        description: item.description,
        quantity: item.quantity,
        item_price: item.item_price,
        item_cost: item.item_cost,
        line_amount: Number((item.item_price * item.quantity).toFixed(4)),
        line_cost: Number((item.item_cost * item.quantity).toFixed(4)),
        category: item.category || fd.category,
        sub_category: item.sub_category || fd.sub_category,
      };
      if (item._purchaseId) {
        presentIds.add(item._purchaseId);
        updatedItems.push({ id: item._purchaseId, data: lineData });
      } else {
        newItems.push({
          organization_id: organizationId,
          parent_id: editPurchaseId,
          row_type: 'item',
          vendor: fd.vendor,
          ...lineData,
        });
      }
    }

    const removedItemIds = originalItemIds.filter(id => !presentIds.has(id));

    // Asset changes — only for existing lines linked to an asset.
    const assetChanges: UpdatePlan['assetChanges'] = [];
    for (const item of fd.items) {
      if (item._assetId && assetsById[item._assetId]) {
        const changes = computeAssetFieldChanges(
          {
            description: item.description,
            category: item.category || fd.category,
            sub_category: item.sub_category || fd.sub_category,
            quantity: item.quantity,
            item_price: item.item_price,
            item_cost: item.item_cost,
            vendor: fd.vendor,
            purchase_date: fd.purchase_date,
          },
          assetsById[item._assetId]
        );
        if (changes.length > 0) {
          const data: Record<string, any> = {};
          changes.forEach(c => { data[c.field] = c.to; });
          assetChanges.push({ assetId: item._assetId, itemDescription: item.description || '(item)', changes, data });
        }
      }
    }

    // Gig ledger changes — header total and any per-line linked ledger amounts.
    const gigChanges: UpdatePlan['gigChanges'] = [];
    const headerLedger = editPurchaseId ? ledgerByPurchaseId[editPurchaseId] : null;
    if (headerLedger && Number(headerLedger.amount) !== Number(fd.total_inv_amount)) {
      gigChanges.push({ finId: headerLedger.id, label: 'Invoice total → gig ledger', from: Number(headerLedger.amount), to: Number(fd.total_inv_amount) });
    }
    for (const item of fd.items) {
      if (!item._purchaseId) continue;
      const led = ledgerByPurchaseId[item._purchaseId];
      if (!led) continue;
      const newAmt = Number((item.item_price * item.quantity).toFixed(2));
      if (Number(led.amount) !== newAmt) {
        gigChanges.push({ finId: led.id, label: `${item.description || 'Line item'} → gig ledger`, from: Number(led.amount), to: newAmt });
      }
    }

    return { headerData, updatedItems, newItems, removedItemIds, assetChanges, gigChanges };
  };

  const commitUpdate = async (plan: UpdatePlan) => {
    if (!editPurchaseId) return;
    setIsSubmitting(true);
    try {
      await updatePurchase(editPurchaseId, plan.headerData);
      for (const u of plan.updatedItems) await updatePurchase(u.id, u.data);
      for (const n of plan.newItems) await createPurchase(n);
      for (const id of plan.removedItemIds) await deletePurchase(id);
      for (const a of plan.assetChanges) await updateAsset(a.assetId, a.data);
      for (const g of plan.gigChanges) await updateGigFinancial(g.finId, { amount: g.to });

      if (file) {
        try {
          const attachment = await uploadAttachment(organizationId, file);
          if (attachment) await linkAttachmentToEntity(attachment.id, 'purchase', editPurchaseId);
        } catch (uploadErr) {
          console.error('Error uploading attachment:', uploadErr);
          toast.error('Purchase updated, but failed to upload the new document');
        }
      }

      if (plan.gigChanges.length > 0) {
        window.dispatchEvent(new CustomEvent('gig-financials-updated', {}));
      }
      toast.success('Purchase updated successfully');
      onUpdated?.(editPurchaseId);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error updating purchase:', err);
      toast.error(err.message || 'Failed to update purchase');
    } finally {
      setIsSubmitting(false);
      setPendingPlan(null);
    }
  };

  const handleUpdate = () => {
    if (!formData) return;
    const plan = buildUpdatePlan(formData);
    if (plan.assetChanges.length > 0 || plan.gigChanges.length > 0) {
      setPendingPlan(plan); // show confirmation first
    } else {
      commitUpdate(plan);
    }
  };

  const fmtVal = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v));

  const calculatedTotalCost = formData.items.reduce((sum, item) => sum + ((item.item_cost ?? 0) * item.quantity), 0);
  const diff = Math.abs(calculatedTotalCost - formData.total_inv_amount);
  const hasMismatch = diff > 0.05;
  const isImage = file?.type.startsWith('image/');
  const isPdf = file?.type === 'application/pdf';

  const renderMagnifiableImage = (src: string, alt: string) => (
    <img
      src={src}
      alt={alt}
      style={{ maxWidth: '100%', display: 'block', borderRadius: 4, cursor: magnifierEnabled ? 'crosshair' : 'default', pointerEvents: magnifierEnabled ? 'auto' : 'none' }}
      onMouseMove={magnifierEnabled ? handleImgMouseMove(src) : undefined}
      onMouseLeave={magnifierEnabled ? () => setMagnifier(prev => ({ ...prev, show: false })) : undefined}
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
                <h2 style={{ fontSize: 15, fontWeight: 600 }}>{isEditMode ? 'Edit Purchase' : scannedData ? 'Review Scanned Purchase' : 'Create Purchase Entry'}</h2>
                <p style={{ fontSize: 11, color: '#6b7280' }}>
                  {isEditMode ? 'Update line items below. Changes to a linked asset or gig ledger are confirmed before saving.' : scannedData ? 'Verify the extracted data below.' : 'Enter details manually using the document preview as reference.'}
                </p>
              </div>
              <DialogPrimitive.Close className="rounded-sm opacity-70 hover:opacity-100 p-1">
                <CloseIcon className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>

            <div style={{ display: 'flex', flex: '1 1 0', overflow: 'hidden', minHeight: 0, height: 0 }}>
              {/* Preview Panel */}
              <div style={{ width: '45%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f3f4f6', borderRight: '1px solid #e5e7eb', position: 'relative' }}>
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
                  {/* Edit mode: render the already-attached document (no local file). */}
                  {!previewUrl && existingDoc && existingDoc.kind === 'image' && (
                    <img src={existingDoc.url} alt={existingDoc.name} style={{ maxWidth: '100%', display: 'block', borderRadius: 4 }} />
                  )}
                  {!previewUrl && existingDoc && existingDoc.kind === 'pdf' && (
                    <iframe src={existingDoc.url} title={existingDoc.name} style={{ width: '100%', height: '100%', border: 0, borderRadius: 4 }} />
                  )}
                  {!previewUrl && existingDoc && existingDoc.kind === 'other' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                      <FileIcon className="w-12 h-12 mb-2 opacity-30" />
                      <a href={existingDoc.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#0284c7' }}>{existingDoc.name}</a>
                    </div>
                  )}
                  {!previewUrl && !existingDoc && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                      <FileIcon className="w-12 h-12 mb-2 opacity-20" />
                      <p style={{ fontSize: 13 }}>{isEditMode ? 'No document attached' : 'No preview available'}</p>
                    </div>
                  )}
                </div>

                <div style={{ padding: '3px 12px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'center', gap: 12, fontSize: 10, color: '#9ca3af', flexShrink: 0 }}>
                  <button
                    onClick={() => { setMagnifierEnabled(v => !v); setMagnifier(prev => ({ ...prev, show: false })); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: magnifierEnabled ? '#dbeafe' : 'transparent', color: magnifierEnabled ? '#2563eb' : '#9ca3af', borderRadius: 3, padding: '2px 8px', cursor: 'pointer', fontSize: 10, fontWeight: magnifierEnabled ? 600 : 400 }}
                  >
                    <Search className="w-3 h-3" /> {magnifierEnabled ? 'Magnifier ON' : 'Magnifier'}
                  </button>
                  <button
                    onClick={() => setShowFullPreview(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'transparent', color: '#9ca3af', borderRadius: 3, padding: '2px 8px', cursor: 'pointer', fontSize: 10 }}
                  >
                    <Maximize2 className="w-3 h-3" /> Full preview
                  </button>
                </div>
              </div>

              {/* Form Panel */}
              <div style={{ width: '55%', height: '100%', display: 'flex', flexDirection: 'column', background: 'white' }}>
                <style>{`.review-form-scroll::-webkit-scrollbar{width:8px}.review-form-scroll::-webkit-scrollbar-track{background:#f1f5f9}.review-form-scroll::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}.review-form-scroll::-webkit-scrollbar-thumb:hover{background:#94a3b8}`}</style>
                <div style={{ position: 'relative', flex: '1 1 0', minHeight: 0 }}>
                <div className="review-form-scroll" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflowY: 'scroll', WebkitOverflowScrolling: 'touch', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Purchase Summary */}
                    <div>
                      <h4 style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', borderBottom: '1px solid #e5e7eb', paddingBottom: 3, marginBottom: 6 }}>Purchase Summary</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ flex: '2 1 300px' }}>
                          <span style={{ fontSize: 8, fontWeight: 600, textTransform: 'uppercase', color: '#6b7280', display: 'block', marginBottom: 1 }}>Vendor</span>
                          <Input
                            value={formData.vendor}
                            onChange={e => handleHeaderChange('vendor', e.target.value)}
                            placeholder="e.g. Sweetwater, B&H, Amazon"
                            className="h-7 text-xs font-semibold border-gray-300"
                          />
                        </div>
                        <div style={{ flex: '1 1 120px' }}>
                          <span style={{ fontSize: 8, fontWeight: 600, textTransform: 'uppercase', color: '#6b7280', display: 'block', marginBottom: 1 }}>Date</span>
                          <Input
                            type="date"
                            value={formData.purchase_date}
                            onChange={e => handleHeaderChange('purchase_date', e.target.value)}
                            className="h-7 text-xs border-gray-300"
                          />
                        </div>
                        <div style={{ width: '100%', display: 'flex', gap: 6 }}>
                          <div style={{ flex: '2 1 0' }}>
                            <span style={{ fontSize: 8, fontWeight: 600, textTransform: 'uppercase', color: '#6b7280', display: 'block', marginBottom: 1 }}>Description / Notes</span>
                            <Input
                              value={formData.description || ''}
                              onChange={e => handleHeaderChange('description', e.target.value)}
                              placeholder="Purchase notes"
                              className="h-7 text-xs border-gray-300"
                            />
                          </div>
                          <div style={{ flex: '0 0 100px' }}>
                            <span style={{ fontSize: 8, fontWeight: 600, textTransform: 'uppercase', color: '#6b7280', display: 'block', marginBottom: 1 }}>Invoice Total</span>
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 10 }}>$</span>
                              <NumericInput
                                value={formData.total_inv_amount}
                                onChange={v => handleHeaderChange('total_inv_amount', v)}
                                className="pl-4 h-7 text-xs font-bold text-sky-700 border-gray-300"
                              />
                            </div>
                          </div>
                          <div style={{ flex: '1 1 0', display: 'flex', alignItems: 'center', paddingTop: 10 }}>
                            <p style={{ fontSize: 7, color: '#9ca3af', fontStyle: 'italic', lineHeight: 1, margin: 0 }}>Distributed as burdened cost across items.</p>
                          </div>
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
                              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: isEditMode ? 'not-allowed' : 'pointer', gap: 0 }} title={isEditMode ? (item.is_asset ? 'Asset — change type via Reclassify' : 'Expense — change type via Reclassify') : (item.is_asset ? 'Asset (durable)' : 'Expense')}>
                                <input
                                  type="checkbox"
                                  checked={item.is_asset}
                                  disabled={isEditMode}
                                  onChange={e => {
                                    handleItemChange(index, 'is_asset', e.target.checked);
                                    if (e.target.checked && !item.show_extra) {
                                      handleItemChange(index, 'show_extra', true);
                                    }
                                  }}
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
                                  value={Number(((item.item_price ?? 0) * item.quantity).toFixed(2))}
                                  onChange={v => handleLineAmtChange(index, v)}
                                  className="pl-3.5 bg-white border-gray-200 h-6 text-[11px] text-right"
                                />
                              </div>
                              <div style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 4px', background: '#f0f9ff', borderRadius: 3, fontSize: 10, color: '#0369a1', fontWeight: 700, border: '1px solid #e0f2fe' }}>
                                ${(item.item_cost ?? 0).toFixed(2)}
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
                                {item.is_asset ? (
                                  isEditMode ? (
                                    <span style={{ fontSize: 8, color: '#0284c7', whiteSpace: 'nowrap', fontWeight: 600, width: 40 + 12 }}>Asset</span>
                                  ) : (
                                    <button
                                      onClick={() => handleItemChange(index, 'show_extra', !item.show_extra)}
                                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#0284c7' }}
                                    >
                                      {item.show_extra ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                      <span style={{ fontSize: 8, color: '#0284c7', whiteSpace: 'nowrap', fontWeight: 600, width: 40, textAlign: 'left', marginLeft: 1 }}>Asset</span>
                                    </button>
                                  )
                                ) : (
                                  <span style={{ fontSize: 8, color: '#810606', whiteSpace: 'nowrap', fontWeight: 600, width: 40 + 12 }}>Expense</span>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                                  <span style={{ fontSize: 7, color: '#9ca3af', fontWeight: 600, flexShrink: 0 }}>C:</span>
                                  <Input
                                    value={item.category || ''}
                                    onChange={e => handleItemChange(index, 'category', e.target.value)}
                                    placeholder="Category"
                                    className="bg-white border-gray-200 h-5 text-[10px] flex-1"
                                  />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                                  <span style={{ fontSize: 7, color: '#9ca3af', fontWeight: 600, flexShrink: 0 }}>SC:</span>
                                  <Input
                                    value={item.sub_category || ''}
                                    onChange={e => handleItemChange(index, 'sub_category', e.target.value)}
                                    placeholder="Sub-cat"
                                    className="bg-white border-gray-200 h-5 text-[10px] flex-1"
                                  />
                                </div>
                                {!isEditMode && (
                                  <Input
                                    value={item.equipment_type || ''}
                                    onChange={e => handleItemChange(index, 'equipment_type', e.target.value)}
                                    placeholder="Type"
                                    className="bg-white border-gray-200 h-5 text-[10px] flex-1"
                                  />
                                )}
                              </div>
                            </div>
                            {!isEditMode && item.is_asset && item.show_extra && (
                              <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr 1fr 72px', gap: '0 3px', marginTop: 2, paddingBottom: 2 }}>
                                <span />
                                <Input
                                  value={item.kit || ''}
                                  onChange={e => handleItemChange(index, 'kit', e.target.value)}
                                  placeholder="Kit name"
                                  className="bg-white border-gray-200 h-5 text-[10px]"
                                />
                                <Input
                                  value={item.serial_number || ''}
                                  onChange={e => handleItemChange(index, 'serial_number', e.target.value)}
                                  placeholder="Serial #"
                                  className="bg-white border-gray-200 h-5 text-[10px]"
                                />
                                <Input
                                  value={item.tag_number || ''}
                                  onChange={e => handleItemChange(index, 'tag_number', e.target.value)}
                                  placeholder="Tag #"
                                  className="bg-white border-gray-200 h-5 text-[10px]"
                                />
                                <div style={{ position: 'relative' }}>
                                  <span style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 9 }}>$</span>
                                  <NumericInput
                                    value={item.replacement_value || 0}
                                    onChange={v => handleItemChange(index, 'replacement_value', v)}
                                    placeholder="Replace Value"
                                    className="pl-3.5 bg-white border-gray-200 h-5 text-[10px] text-right"
                                  />
                                </div>
                              </div>
                            )}
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
                </div>

                {/* Footer */}
                <div style={{ padding: '6px 16px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'flex-end', gap: 12, flexShrink: 0 }}>
                  <Button variant="outline" onClick={() => onOpenChange(false)} className="h-7 px-5 text-xs">
                    Cancel
                  </Button>
                  <button
                    onClick={isEditMode ? handleUpdate : handleSubmit}
                    disabled={isSubmitting || formData.items.length === 0 || !formData.vendor}
                    style={{ height: 28, padding: '0 20px', fontSize: 12, fontWeight: 600, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0284c7', color: 'white', border: 'none', cursor: 'pointer', opacity: (isSubmitting || formData.items.length === 0 || !formData.vendor) ? 0.5 : 1 }}
                  >
                    {isSubmitting && <Loader2 style={{ width: 14, height: 14, marginRight: 6 }} className="animate-spin" />}
                    {isEditMode ? 'Save Changes' : 'Save Purchase'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {pendingPlan && (pendingPlan.assetChanges.length > 0 || pendingPlan.gigChanges.length > 0) && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 10px 40px rgba(0,0,0,0.3)', width: 540, maxWidth: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Confirm linked record updates</h3>
                <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Your edits also affect these linked records. Review and confirm before saving.</p>
              </div>
              <div style={{ padding: '12px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {pendingPlan.assetChanges.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0284c7', marginBottom: 6 }}>Asset updates</h4>
                    {pendingPlan.assetChanges.map((a, ai) => (
                      <div key={ai} style={{ marginBottom: 8, border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 8px' }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{a.itemDescription}</p>
                        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                          <tbody>
                            {a.changes.map((c, ci) => (
                              <tr key={ci}>
                                <td style={{ color: '#6b7280', padding: '1px 6px 1px 0', whiteSpace: 'nowrap' }}>{c.label}</td>
                                <td style={{ color: '#9ca3af', padding: '1px 6px', textAlign: 'right' }}>{fmtVal(c.from)}</td>
                                <td style={{ color: '#9ca3af', padding: '1px 4px' }}>→</td>
                                <td style={{ color: '#065f46', fontWeight: 600, padding: '1px 0' }}>{fmtVal(c.to)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
                {pendingPlan.gigChanges.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#7c3aed', marginBottom: 6 }}>Gig ledger updates</h4>
                    <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                      <tbody>
                        {pendingPlan.gigChanges.map((g, gi) => (
                          <tr key={gi}>
                            <td style={{ color: '#6b7280', padding: '1px 6px 1px 0' }}>{g.label}</td>
                            <td style={{ color: '#9ca3af', padding: '1px 6px', textAlign: 'right' }}>${g.from.toFixed(2)}</td>
                            <td style={{ color: '#9ca3af', padding: '1px 4px' }}>→</td>
                            <td style={{ color: '#065f46', fontWeight: 600, padding: '1px 0' }}>${g.to.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div style={{ padding: '10px 16px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <Button variant="outline" onClick={() => setPendingPlan(null)} disabled={isSubmitting} className="h-7 px-4 text-xs">
                  Cancel
                </Button>
                <button
                  onClick={() => commitUpdate(pendingPlan)}
                  disabled={isSubmitting}
                  style={{ height: 28, padding: '0 16px', fontSize: 12, fontWeight: 600, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0284c7', color: 'white', border: 'none', cursor: 'pointer', opacity: isSubmitting ? 0.5 : 1 }}
                >
                  {isSubmitting && <Loader2 style={{ width: 14, height: 14, marginRight: 6 }} className="animate-spin" />}
                  Confirm &amp; Save
                </button>
              </div>
            </div>
          </div>
        )}

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
