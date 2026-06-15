import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Checkbox } from '../../ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog';
import { toast } from 'sonner';
import { updatePurchase, createPurchase, deletePurchase, assignGigToPurchaseChildren, shouldPromptForLedgerEntry } from '../../../services/purchase.service';
import { createGigFinancial } from '../../../services/gig.service';
import { toFinCategory } from '../../../utils/supabase/constants';
import GigCombobox from './GigCombobox';
import type { DbPurchase } from '../../../utils/supabase/types';

interface EditableLineItem {
  id?: string;
  description: string;
  category: string;
  sub_category: string;
  quantity: number;
  item_price: number;
  line_cost: number;
  row_type: 'item' | 'asset';
  gig_id: string | null;
  _originalGigId: string | null;
  _isNew?: boolean;
  _deleted?: boolean;
}

interface PurchaseEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  header: DbPurchase;
  items: DbPurchase[];
  organizationId: string;
  onSaved: () => void;
}

interface LedgerPromptItem {
  itemIndex: number;
  description: string;
  lineCost: number;
  gigId: string;
  purchaseItemId?: string;
  category?: string;
  purchaseDate?: string;
}

export default function PurchaseEditDialog({
  open,
  onOpenChange,
  header,
  items,
  organizationId,
  onSaved,
}: PurchaseEditDialogProps) {
  const [purchaseDate, setPurchaseDate] = useState('');
  const [vendor, setVendor] = useState('');
  const [description, setDescription] = useState('');
  const [totalInvAmount, setTotalInvAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [headerGigId, setHeaderGigId] = useState<string | null>(null);
  const [applyGigToAll, setApplyGigToAll] = useState(false);
  const [lineItems, setLineItems] = useState<EditableLineItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [ledgerPrompts, setLedgerPrompts] = useState<LedgerPromptItem[]>([]);
  const [showLedgerPrompt, setShowLedgerPrompt] = useState(false);
  const [removalWarning, setRemovalWarning] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPurchaseDate(header.purchase_date || '');
      setVendor(header.vendor || '');
      setDescription(header.description || '');
      setTotalInvAmount(header.total_inv_amount || 0);
      setPaymentMethod(header.payment_method || '');
      setHeaderGigId(header.gig_id || null);
      setApplyGigToAll(false);
      setLineItems(items.map(item => ({
        id: item.id,
        description: item.description || '',
        category: item.category || '',
        sub_category: item.sub_category || '',
        quantity: item.quantity || 1,
        item_price: item.item_price || 0,
        line_cost: item.line_cost || 0,
        row_type: (item.row_type === 'asset' ? 'asset' : 'item') as 'item' | 'asset',
        gig_id: item.gig_id || null,
        _originalGigId: item.gig_id || null,
      })));
      setLedgerPrompts([]);
      setShowLedgerPrompt(false);
    }
  }, [open, header, items]);

  const activeItems = lineItems.filter(li => !li._deleted);
  const lineCostSum = activeItems.reduce((sum, li) => sum + (li.line_cost || 0), 0);
  const reconciled = Math.abs(totalInvAmount - lineCostSum) <= 0.01;

  const handleItemChange = (index: number, field: keyof EditableLineItem, value: any) => {
    setLineItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddItem = () => {
    setLineItems(prev => [...prev, {
      description: '',
      category: '',
      sub_category: '',
      quantity: 1,
      item_price: 0,
      line_cost: 0,
      row_type: 'item',
      gig_id: null,
      _originalGigId: null,
      _isNew: true,
    }]);
  };

  const handleRemoveItem = (index: number) => {
    setLineItems(prev => {
      const next = [...prev];
      if (next[index].id) {
        next[index] = { ...next[index], _deleted: true };
      } else {
        next.splice(index, 1);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!vendor.trim()) {
      toast.error('Vendor is required');
      return;
    }
    if (!purchaseDate) {
      toast.error('Date is required');
      return;
    }

    // Check for ledger prompt candidates before saving
    const prompts: LedgerPromptItem[] = [];
    for (let i = 0; i < lineItems.length; i++) {
      const li = lineItems[i];
      if (li._deleted) continue;
      const effectiveGigId = li.gig_id || headerGigId;
      if (shouldPromptForLedgerEntry(li.row_type, li._originalGigId, effectiveGigId)) {
        prompts.push({
          itemIndex: i,
          description: li.description || description || `Receipt: ${vendor}`,
          lineCost: li.line_cost,
          gigId: effectiveGigId!,
          purchaseItemId: li.id,
          category: li.category,
          purchaseDate,
        });
      }
    }

    if (prompts.length > 0) {
      setLedgerPrompts(prompts);
      setShowLedgerPrompt(true);
      return;
    }

    await performSave([]);
  };

  const performSave = async (ledgerItemsToCreate: LedgerPromptItem[]) => {
    setIsSaving(true);
    try {
      await updatePurchase(header.id, {
        purchase_date: purchaseDate,
        vendor,
        description,
        total_inv_amount: totalInvAmount,
        payment_method: paymentMethod,
        gig_id: headerGigId,
      });

      for (const item of lineItems) {
        if (item._deleted && item.id) {
          await deletePurchase(item.id);
        } else if (item._isNew && !item._deleted) {
          await createPurchase({
            organization_id: organizationId,
            parent_id: header.id,
            purchase_date: purchaseDate,
            vendor,
            description: item.description,
            category: item.category || undefined,
            sub_category: item.sub_category || undefined,
            quantity: item.quantity,
            item_price: item.item_price,
            line_cost: item.line_cost,
            line_amount: item.item_price * item.quantity,
            row_type: item.row_type,
            gig_id: item.gig_id,
          });
        } else if (item.id && !item._deleted) {
          await updatePurchase(item.id, {
            description: item.description,
            category: item.category || undefined,
            sub_category: item.sub_category || undefined,
            quantity: item.quantity,
            item_price: item.item_price,
            line_cost: item.line_cost,
            line_amount: item.item_price * item.quantity,
            gig_id: item.gig_id,
          });
        }
      }

      // Apply gig to all unlinked children
      if (applyGigToAll && headerGigId) {
        const result = await assignGigToPurchaseChildren(header.id, headerGigId, organizationId);
        if (result.failed > 0) {
          toast.warning(`${result.updated} items linked, ${result.failed} failed`);
        }
      }

      // Create ledger entries for accepted prompts
      for (const entry of ledgerItemsToCreate) {
        try {
          await createGigFinancial({
            gig_id: entry.gigId,
            organization_id: organizationId,
            date: entry.purchaseDate || purchaseDate,
            amount: entry.lineCost,
            type: 'Expense Incurred',
            category: toFinCategory(entry.category) ?? 'Other expenses',
            description: entry.description,
            purchase_id: entry.purchaseItemId,
          });
        } catch (err) {
          console.error('Failed to create ledger entry:', err);
        }
      }

      toast.success('Purchase updated');
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Purchase</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Header fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Vendor *</Label>
                <Input value={vendor} onChange={e => setVendor(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Date *</Label>
                <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Invoice Total</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={totalInvAmount || ''}
                  onChange={e => setTotalInvAmount(parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Payment Method</Label>
                <Input value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Linked Gig</Label>
                <GigCombobox
                  organizationId={organizationId}
                  value={headerGigId}
                  onChange={(id) => setHeaderGigId(id)}
                />
              </div>
            </div>

            {headerGigId && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="apply-gig-all"
                  checked={applyGigToAll}
                  onCheckedChange={(checked) => setApplyGigToAll(!!checked)}
                />
                <Label htmlFor="apply-gig-all" className="text-xs text-gray-600 cursor-pointer">
                  Apply gig to all unlinked line items
                </Label>
              </div>
            )}

            {/* Reconciliation indicator */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded text-xs border ${reconciled ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
              <AlertCircle className="w-3.5 h-3.5" />
              {reconciled
                ? `Reconciled: Line costs $${lineCostSum.toFixed(2)} match invoice total`
                : `Mismatch: Line costs $${lineCostSum.toFixed(2)} vs Invoice $${totalInvAmount.toFixed(2)} (diff: $${Math.abs(totalInvAmount - lineCostSum).toFixed(2)})`
              }
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold uppercase text-gray-500">Line Items</Label>
                <Button variant="outline" size="sm" className="h-6 text-xs" onClick={handleAddItem}>
                  <Plus className="w-3 h-3 mr-1" /> Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {lineItems.map((item, index) => {
                  if (item._deleted) return null;
                  return (
                    <div key={item.id || `new-${index}`} className="bg-gray-50 p-2 rounded border border-gray-100 space-y-1">
                      <div className="grid grid-cols-[1fr_100px_80px_60px_80px_80px_32px] gap-2 items-center">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={e => handleItemChange(index, 'description', e.target.value)}
                          className="h-7 text-xs"
                        />
                        <Input
                          placeholder="Category"
                          value={item.category}
                          onChange={e => handleItemChange(index, 'category', e.target.value)}
                          className="h-7 text-xs"
                        />
                        <Input
                          placeholder="Sub-cat"
                          value={item.sub_category}
                          onChange={e => handleItemChange(index, 'sub_category', e.target.value)}
                          className="h-7 text-xs"
                        />
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity || ''}
                          onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="h-7 text-xs text-center"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={item.item_price || ''}
                          onChange={e => handleItemChange(index, 'item_price', parseFloat(e.target.value) || 0)}
                          className="h-7 text-xs text-right"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Cost"
                          value={item.line_cost || ''}
                          onChange={e => handleItemChange(index, 'line_cost', parseFloat(e.target.value) || 0)}
                          className="h-7 text-xs text-right font-semibold"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="pl-0">
                        <Label className="text-[10px] text-gray-400">Gig override</Label>
                        <GigCombobox
                          organizationId={organizationId}
                          value={item.gig_id}
                          onChange={(id) => {
                            handleItemChange(index, 'gig_id', id);
                            if (!id && lineItems[index]._originalGigId) {
                              setRemovalWarning('This line item may be linked to a gig financial record. Removing the gig association will not delete that record.');
                            }
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ledger Prompt Dialog */}
      <AlertDialog open={showLedgerPrompt} onOpenChange={setShowLedgerPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add to Gig Financial Ledger?</AlertDialogTitle>
            <AlertDialogDescription>
              {ledgerPrompts.length === 1
                ? 'This expense line item is being assigned to a gig for the first time. Would you like to also add it to the gig\'s financial ledger?'
                : `${ledgerPrompts.length} expense line items are being assigned to a gig for the first time. Would you like to also add them to the gig's financial ledger?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowLedgerPrompt(false); performSave([]); }}>
              No, just link
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowLedgerPrompt(false); performSave(ledgerPrompts); }}>
              Yes, add to ledger
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Gig removal warning */}
      <AlertDialog open={!!removalWarning} onOpenChange={() => setRemovalWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gig Association Removed</AlertDialogTitle>
            <AlertDialogDescription>{removalWarning}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setRemovalWarning(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
