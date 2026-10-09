import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import {
  RECOVERY_PERIODS, asRecoveryPeriod, categoryPeriod, effectiveRecoveryPeriod,
  type CategoryPeriods, type RecoveryPeriod,
} from '../../utils/recoveryPeriod';
import { resizeUnitRows, unitRowProblems } from '../../utils/lineUnits';
import ItemSection from '../equipment/form/ItemSection';
import { draftCategory, itemDraftErrors, type ItemDraft, type ItemOption } from '../equipment/form/itemDraft';
import UnitOrLotSection, { type FormUnitRow, type UnitOrLot } from '../equipment/form/UnitOrLotSection';
import InsuranceSection from '../equipment/form/InsuranceSection';

/** A purchase line's equipment (#183): what it is, units or a lot, and its value. */
export interface EquipmentDetails {
  item: ItemDraft;
  kind: UnitOrLot;
  /** One row per unit; a saved unit's row carries its id. */
  units: FormUnitRow[];
  /** Each, copied to every unit or the lot. */
  replacement_value: string;
  insured: boolean;
  /** Depreciated lines only (#125): the period chosen; null follows the category's default. */
  recovery_period?: RecoveryPeriod | null;
}

interface EquipmentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  /** The line's description, shown under the title. */
  itemName: string;
  /** The line's quantity: how many units, or the lot's size. */
  quantity: number;
  /** The organization's active equipment categories. */
  categories: string[];
  /** The organization's items, to pick from and to suggest. */
  items: ItemOption[];
  value: EquipmentDetails;
  onSave: (value: EquipmentDetails) => void;
  /** A depreciated line in a filed year keeps its category. */
  categoryLocked?: boolean;
  /** The line is depreciated: ask for its recovery period (#125). */
  depreciated?: boolean;
  /** Each equipment category's default recovery period. */
  categoryPeriods?: CategoryPeriods;
  /** A filed year's recovery period, once set, stays. */
  periodLocked?: boolean;
  /** The line's equipment is saved: its item and Unit/Lot stay; units can be edited and added. */
  saved?: boolean;
}

/** A saved line keeps its saved units, plus empty rows up to the quantity; a new one follows the quantity. */
const rowsFor = (units: FormUnitRow[], quantity: number, saved?: boolean) => {
  if (!saved) return resizeUnitRows(units, quantity);
  const kept = units.filter((u) => u.id);
  const extra = Math.max(0, quantity - kept.length);
  return [...kept, ...Array.from({ length: extra }, () => ({ serial_number: '', tag_number: '' }))];
};

/**
 * The equipment details of a purchase line (#183, mockup screen 4): the same three
 * sections as Add Item (What it is, Unit or lot, Insurance), plus the recovery
 * period of a depreciated line. Kits are set in the kit editor. Changes apply on
 * Done; Cancel drops them.
 */
export default function EquipmentDetailsDialog({
  open, onOpenChange, organizationId, itemName, quantity, categories, items, value, onSave,
  categoryLocked, depreciated, categoryPeriods = {}, periodLocked, saved,
}: EquipmentDetailsDialogProps) {
  const [draft, setDraft] = useState<EquipmentDetails>(value);
  const [showProblems, setShowProblems] = useState(false);

  // Start from the line's values each time it opens (callers pass a fresh object).
  useEffect(() => {
    if (open) {
      setDraft({ ...value, units: value.kind === 'units' ? rowsFor(value.units, quantity, saved) : value.units });
      setShowProblems(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const category = draftCategory(draft.item);
  const setItem = (item: ItemDraft) => setDraft((d) => {
    const before = draftCategory(d.item);
    const after = draftCategory(item);
    // A period that was only the old category's default follows the new category.
    const followed = d.recovery_period != null && d.recovery_period === categoryPeriod(categoryPeriods, before) && before !== after;
    return { ...d, item, recovery_period: followed ? null : d.recovery_period };
  });

  const period = depreciated ? effectiveRecoveryPeriod(draft.recovery_period, categoryPeriods, category) : null;
  const periodFromCategory = depreciated && draft.recovery_period == null && period != null;
  const needsPeriod = !!depreciated && period == null;

  const itemErrors = itemDraftErrors(draft.item);
  const problems = draft.kind === 'units' ? unitRowProblems(draft.units) : [];
  const savedUnits = draft.units.filter((u) => u.id).length;

  const done = () => {
    if (Object.keys(itemErrors).length || problems.length) { setShowProblems(true); return; }
    onSave({
      ...draft,
      item: draft.item.mode === 'new'
        ? { ...draft.item, manufacturer_model: draft.item.manufacturer_model.trim(), category: draft.item.category.trim(), type: draft.item.type.trim() }
        : draft.item,
      // Only a chosen period is kept; one from the category follows the category.
      ...(depreciated ? { recovery_period: periodFromCategory ? null : period } : {}),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* grid-cols-[minmax(0,1fr)]: a long item name truncates instead of widening the pop-up. */}
      <DialogContent className="sm:max-w-[680px] p-0 gap-0 grid-cols-[minmax(0,1fr)] overflow-hidden max-h-[92vh]">
        <DialogHeader className="min-w-0 px-5 py-4 pr-12 border-b border-slate-200 gap-0.5 text-left">
          <DialogTitle className="text-base font-bold">Equipment details</DialogTitle>
          <DialogDescription className="truncate text-xs text-slate-500" title={itemName}>
            {itemName || 'New item'} · qty {quantity}{depreciated ? ' · Depreciate' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 overflow-y-auto px-5 py-4 space-y-4">
          <section aria-labelledby="eq-what">
            <h3 id="eq-what" className="text-gray-900 mb-2">What it is</h3>
            <ItemSection idPrefix="eq_item" organizationId={organizationId} value={draft.item} onChange={setItem}
              categories={categories} items={items} fixed={saved} locked={saved} categoryLocked={categoryLocked}
              errors={showProblems ? itemErrors : {}} />
          </section>

          <section aria-labelledby="eq-units" className="border-t border-gray-100 pt-4">
            <h3 id="eq-units" className="text-gray-900 mb-2">Unit or lot</h3>
            <UnitOrLotSection idPrefix="eq_units" kind={draft.kind}
              onKindChange={(kind) => setDraft((d) => ({ ...d, kind }))}
              quantity={quantity} quantityLocked
              quantityNote={saved && draft.kind === 'units' && savedUnits > quantity
                ? `This line has ${quantity}, and ${savedUnits} units are saved on it. Saving the purchase asks what to do with the others.`
                : 'From the purchase line. Change it on the line.'}
              rows={draft.units} onRowsChange={(units) => setDraft((d) => ({ ...d, units }))}
              problems={showProblems ? problems : []}
              unitBlocked={saved && draft.kind === 'lot' ? 'This line’s equipment is saved as a lot. Splitting a lot into units comes with #186.' : undefined} />
            {saved && draft.kind === 'units' && <p className="mt-2 text-xs text-muted-foreground">Rows with a serial or tag already saved are this line’s units; new rows add units when the purchase is saved.</p>}
          </section>

          <section aria-labelledby="eq-insurance" className="border-t border-gray-100 pt-4">
            <h3 id="eq-insurance" className="text-gray-900 mb-2">Insurance</h3>
            <InsuranceSection idPrefix="eq_value" replacementValue={draft.replacement_value}
              onReplacementValueChange={(replacement_value) => setDraft((d) => ({ ...d, replacement_value }))}
              insured={draft.insured} onInsuredChange={(insured) => setDraft((d) => ({ ...d, insured }))}
              count={draft.kind === 'units' ? draft.units.length : 1} />
          </section>

          {depreciated && (
            <div className="border-t border-gray-100 pt-4">
              <div className="space-y-2">
                <Label htmlFor="eq-period-select">Recovery period</Label>
                <select id="eq-period-select" disabled={periodLocked}
                  className={`h-9 w-full rounded-md border bg-input-background px-3 text-sm ${needsPeriod ? 'border-amber-500 bg-amber-50' : 'border-input'}`}
                  value={period ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, recovery_period: asRecoveryPeriod(e.target.value) }))}>
                  <option value="">Choose a recovery period…</option>
                  {RECOVERY_PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}: {p.examples}</option>)}
                </select>
                <p className={`text-xs ${needsPeriod ? 'text-amber-800' : 'text-muted-foreground'}`}>
                  {periodLocked ? 'The tax year is filed, so the recovery period stays as it is.'
                    : needsPeriod ? `${category ? `${category} has no default period.` : 'Choose a category, or pick a period.'} Choose one for the tax program.`
                    : periodFromCategory ? `The default for ${category}. Shown because the line is depreciated.`
                    : 'For the tax program; it works out the depreciation.'}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-5 py-3 border-t border-slate-200 bg-slate-50">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-sky-700 hover:bg-sky-800 text-white"
            disabled={needsPeriod}
            title={needsPeriod ? 'Choose a recovery period first' : undefined}
            onClick={done}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
