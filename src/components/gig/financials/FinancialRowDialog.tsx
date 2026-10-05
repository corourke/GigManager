import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import OrganizationSelector from '../../OrganizationSelector';
import { FIN_CATEGORY_CONFIG } from '../../../utils/supabase/constants';
import { ALL_STAGES, stageLabel, type FinDirection, type FinStage } from '../../../utils/moneyFlow';
import type { DbGigFinancial, FinCategory } from '../../../utils/supabase/types';
import type { GigFinancialPatch } from '../../../services/gigFinancial.service';
import { CURRENCY_OPTIONS } from './format';

interface FinancialRowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The row being edited; null to add one. */
  row: (DbGigFinancial & { counterparty?: any }) | null;
  /** Starting values when adding. */
  defaults?: { direction: FinDirection; stage: FinStage; date?: string };
  onSubmit: (values: GigFinancialPatch & { direction: FinDirection; stage: FinStage }) => Promise<void>;
}

interface FormState {
  direction: FinDirection;
  stage: FinStage;
  amount: string;
  amount_settled: string;
  currency: string;
  date: string;
  due_date: string;
  paid_at: string;
  description: string;
  category: string;
  reference_number: string;
  counterparty_id: string;
  external_entity_name: string;
  notes: string;
}

const today = () => format(new Date(), 'yyyy-MM-dd');

function initial(row: DbGigFinancial | null, defaults?: FinancialRowDialogProps['defaults']): FormState {
  if (row) {
    return {
      direction: row.direction,
      stage: row.stage,
      amount: row.amount != null ? String(row.amount) : '',
      amount_settled: row.amount_settled != null ? String(row.amount_settled) : '',
      currency: row.currency || 'USD',
      date: row.date,
      due_date: row.due_date ?? '',
      paid_at: row.paid_at ? row.paid_at.slice(0, 10) : '',
      description: row.description ?? '',
      category: row.category ?? '',
      reference_number: row.reference_number ?? '',
      counterparty_id: row.counterparty_id ?? '',
      external_entity_name: row.external_entity_name ?? '',
      notes: row.notes ?? '',
    };
  }
  return {
    direction: defaults?.direction ?? 'in',
    stage: defaults?.stage ?? 'accepted',
    amount: '',
    amount_settled: '',
    currency: 'USD',
    date: defaults?.date ?? today(),
    due_date: '',
    paid_at: '',
    description: '',
    category: '',
    reference_number: '',
    counterparty_id: '',
    external_entity_name: '',
    notes: '',
  };
}

/** Add or edit one money-in or money-out row, every field. */
export default function FinancialRowDialog({ open, onOpenChange, row, defaults, onSubmit }: FinancialRowDialogProps) {
  const [form, setForm] = useState<FormState>(() => initial(row, defaults));
  const [counterparty, setCounterparty] = useState<any>(row?.counterparty ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(initial(row, defaults));
    setCounterparty(row?.counterparty ?? null);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const isPaid = form.stage === 'paid';
  const amountOptional = form.stage === 'requested';
  const amount = parseFloat(form.amount);
  const amountValid = amountOptional ? form.amount.trim() === '' || amount >= 0 : Number.isFinite(amount) && amount >= 0;
  const valid = !!form.date && amountValid;
  const isIn = form.direction === 'in';

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const settled = parseFloat(form.amount_settled);
      await onSubmit({
        direction: form.direction,
        stage: form.stage,
        amount: form.amount.trim() === '' ? null : amount,
        amount_settled: isPaid ? (Number.isFinite(settled) ? settled : amount) : null,
        currency: form.currency,
        date: form.date,
        due_date: form.due_date || null,
        paid_at: isPaid ? form.paid_at || today() : null,
        description: form.description || null,
        category: (form.category || null) as FinCategory | null,
        reference_number: form.reference_number || null,
        counterparty_id: form.counterparty_id || null,
        external_entity_name: form.external_entity_name || null,
        notes: form.notes || null,
      });
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || 'The record could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row ? 'Edit' : 'Add'} {isIn ? 'money in' : 'money out'}</DialogTitle>
          <DialogDescription>
            {isIn ? 'A fee, deposit or other payment to you.' : 'A cost: sub-contractor, expense or payment you make.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fr-direction">Direction</Label>
              <Select value={form.direction} onValueChange={(v) => set('direction', v as FinDirection)}>
                <SelectTrigger id="fr-direction"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Money in</SelectItem>
                  <SelectItem value="out">Money out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fr-stage">Stage</Label>
              <Select value={form.stage} onValueChange={(v) => set('stage', v as FinStage)}>
                <SelectTrigger id="fr-stage"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>{stageLabel(form.direction, s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fr-description">Description</Label>
            <Input
              id="fr-description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder={isIn ? 'e.g. Performance fee, Deposit' : 'e.g. Lighting rig, Fuel'}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fr-amount">Agreed amount{amountOptional ? ' (optional)' : ''}</Label>
              <Input id="fr-amount" inputMode="decimal" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fr-currency">Currency</Label>
              <Select value={form.currency} onValueChange={(v) => set('currency', v)}>
                <SelectTrigger id="fr-currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fr-date">Date</Label>
              <Input id="fr-date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fr-due">Due date</Label>
              <Input id="fr-due" type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
            </div>
            {isPaid && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fr-settled">{isIn ? 'Amount received' : 'Amount paid'}</Label>
                  <Input
                    id="fr-settled"
                    inputMode="decimal"
                    value={form.amount_settled}
                    onChange={(e) => set('amount_settled', e.target.value)}
                    placeholder={form.amount || '0.00'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fr-paid">{isIn ? 'Date received' : 'Date paid'}</Label>
                  <Input id="fr-paid" type="date" value={form.paid_at} onChange={(e) => set('paid_at', e.target.value)} />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fr-category">Category</Label>
              <Select value={form.category || undefined} onValueChange={(v) => set('category', v)}>
                <SelectTrigger id="fr-category"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FIN_CATEGORY_CONFIG).map(([value, config]) => (
                    <SelectItem key={value} value={value}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fr-ref">Reference</Label>
              <Input
                id="fr-ref"
                value={form.reference_number}
                onChange={(e) => set('reference_number', e.target.value)}
                placeholder="Invoice #, check #"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isIn ? 'Client (organization)' : 'Vendor (organization)'}</Label>
              <OrganizationSelector
                selectedOrganization={counterparty}
                onSelect={(org) => {
                  setCounterparty(org);
                  set('counterparty_id', org?.id || '');
                }}
                placeholder="Search organizations..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fr-external">{isIn ? 'Or client name' : 'Or vendor name'}</Label>
              <Input id="fr-external" value={form.external_entity_name} onChange={(e) => set('external_entity_name', e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fr-notes">Notes</Label>
            <Textarea id="fr-notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} />
          </div>

          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={!valid || saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
