import { useEffect, useMemo, useState } from 'react';
import { Briefcase, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { getTypeUsage } from '../../services/purchaseCategory.service';
import { getKitOptions } from '../../services/kit.service';

export interface EquipmentDetails {
  category: string;
  type: string;
  kitIds: string[];
  serial_number: string;
  tag_number: string;
  replacement_value: number;
}

interface EquipmentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  /** The line's description, shown under the title. */
  itemName: string;
  /** The organization's active equipment categories. */
  categories: string[];
  value: EquipmentDetails;
  onSave: (value: EquipmentDetails) => void;
  /** A depreciated line in a filed year keeps its category. */
  categoryLocked?: boolean;
  /** An existing equipment record's kits are managed on its own page. */
  kitsLocked?: boolean;
}

const NEW_CATEGORY = '__new__';

/**
 * The equipment details of a purchase line (10-06 design): category, type
 * (suggested from the types already used in that category), kits, serial,
 * tag and replacement value. Changes apply on Done; Cancel drops them.
 */
export default function EquipmentDetailsDialog({
  open, onOpenChange, organizationId, itemName, categories, value, onSave, categoryLocked, kitsLocked,
}: EquipmentDetailsDialogProps) {
  const [draft, setDraft] = useState<EquipmentDetails>(value);
  const [newCategory, setNewCategory] = useState(false);
  const [types, setTypes] = useState<{ type: string; count: number }[]>([]);
  const [typeOpen, setTypeOpen] = useState(false);
  const [kits, setKits] = useState<{ id: string; name: string }[]>([]);
  const [kitQuery, setKitQuery] = useState('');

  // Start from the line's values each time it opens (not on every render:
  // callers pass a fresh object).
  useEffect(() => {
    if (open) { setDraft(value); setNewCategory(false); setKitQuery(''); setTypeOpen(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getTypeUsage(organizationId, draft.category).then(t => { if (!cancelled) setTypes(t); });
    return () => { cancelled = true; };
  }, [open, organizationId, draft.category]);

  useEffect(() => {
    if (!open || kitsLocked) return;
    let cancelled = false;
    getKitOptions(organizationId).then(k => { if (!cancelled) setKits(k); }).catch(() => {});
    return () => { cancelled = true; };
  }, [open, organizationId, kitsLocked]);

  const set = <K extends keyof EquipmentDetails>(k: K, v: EquipmentDetails[K]) => setDraft(d => ({ ...d, [k]: v }));

  const typed = draft.type.trim();
  const shownTypes = useMemo(
    () => types.filter(t => !typed || t.type.toLowerCase().includes(typed.toLowerCase())),
    [types, typed],
  );
  const isNewType = !!typed && !types.some(t => t.type.toLowerCase() === typed.toLowerCase());

  const kitName = (id: string) => kits.find(k => k.id === id)?.name ?? 'Kit';
  const kitMatches = kitQuery.trim()
    ? kits.filter(k => !draft.kitIds.includes(k.id) && k.name.toLowerCase().includes(kitQuery.trim().toLowerCase())).slice(0, 8)
    : [];

  const fieldClass = 'h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus-visible:border-sky-700 focus-visible:ring-sky-700/30 focus-visible:ring-[3px] disabled:opacity-60';
  const labelClass = 'flex flex-col gap-1 text-xs font-semibold text-slate-700';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* grid-cols-[minmax(0,1fr)]: a long item name truncates instead of widening the pop-up. */}
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 grid-cols-[minmax(0,1fr)] overflow-hidden">
        <DialogHeader className="min-w-0 px-5 py-4 pr-12 border-b border-slate-200 gap-0.5 text-left">
          <DialogTitle className="text-base font-bold">Equipment details</DialogTitle>
          <DialogDescription className="truncate text-xs text-slate-500" title={itemName}>{itemName || 'New item'}</DialogDescription>
        </DialogHeader>

        <div className="min-w-0 px-5 py-4 flex flex-col gap-3.5">
          <div className={labelClass}>
            <label htmlFor="eq-category">Category</label>
            {newCategory ? (
              <input id="eq-category" aria-label="Category" autoFocus placeholder="New category" value={draft.category}
                className={fieldClass}
                onChange={e => set('category', e.target.value)}
                onBlur={() => { if (!draft.category.trim()) setNewCategory(false); }} />
            ) : (
              <select id="eq-category" aria-label="Category" className={`${fieldClass} font-normal`} value={draft.category} disabled={categoryLocked}
                onChange={e => {
                  if (e.target.value === NEW_CATEGORY) { set('category', ''); setNewCategory(true); }
                  else set('category', e.target.value);
                }}>
                <option value="">Choose a category…</option>
                {draft.category && !categories.includes(draft.category) && <option value={draft.category}>{draft.category}</option>}
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                <option value={NEW_CATEGORY}>Add new category…</option>
              </select>
            )}
          </div>

          <div className={labelClass}>
            <label htmlFor="eq-type">Type <span className="font-normal text-slate-500">General to specific, separated by commas</span></label>
            <input
              id="eq-type"
              role="combobox"
              aria-label="Type"
              aria-expanded={typeOpen}
              aria-controls="eq-type-list"
              autoComplete="off"
              className={`${fieldClass} font-normal`}
              placeholder={draft.category ? 'e.g. Cable, XLR' : 'Choose a category first'}
              value={draft.type}
              onFocus={() => setTypeOpen(true)}
              onChange={e => { set('type', e.target.value); setTypeOpen(true); }}
              onKeyDown={e => { if (e.key === 'Escape') setTypeOpen(false); }}
            />
            {typeOpen && draft.category && (shownTypes.length > 0 || isNewType) && (
              <div className="rounded-md border border-slate-300 bg-white shadow-md font-normal overflow-hidden">
                <div className="px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 bg-slate-50">Types used in {draft.category}</div>
                <div id="eq-type-list" role="listbox" aria-label={`Types used in ${draft.category}`} className="max-h-48 overflow-y-auto text-sm">
                  {shownTypes.map(t => {
                    const cut = t.type.lastIndexOf(',') + 1;
                    const selected = t.type === draft.type;
                    return (
                      <div key={t.type} role="option" aria-selected={selected} tabIndex={-1}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => { set('type', t.type); setTypeOpen(false); }}
                        className={`flex justify-between gap-3 px-2.5 py-1.5 cursor-pointer hover:bg-sky-50 ${selected ? 'bg-sky-100' : ''}`}>
                        <span className="min-w-0 truncate"><span className="text-slate-500">{t.type.slice(0, cut)}</span><strong className="text-slate-900">{t.type.slice(cut)}</strong></span>
                        <span className="text-xs text-slate-400 tabular-nums">{t.count}</span>
                      </div>
                    );
                  })}
                  {isNewType && (
                    <div role="option" aria-selected={false} tabIndex={-1}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => setTypeOpen(false)}
                      className="px-2.5 py-1.5 cursor-pointer text-sky-700 border-t border-slate-200 hover:bg-sky-50">
                      + Use "{typed}" as a new type
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={labelClass}>
            <label htmlFor="eq-kits">Kits</label>
            {kitsLocked ? (
              <p className="font-normal text-slate-500">This item is already equipment. Manage its kits on the equipment page.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-300 bg-white p-1.5 min-h-9">
                  {draft.kitIds.map(id => (
                    <span key={id} className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-900 px-2 py-0.5 text-xs font-semibold">
                      <Briefcase className="w-3 h-3" />{kitName(id)}
                      <button type="button" aria-label={`Remove ${kitName(id)}`} className="hover:text-red-600"
                        onClick={() => set('kitIds', draft.kitIds.filter(k => k !== id))}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input id="eq-kits" aria-label="Search kits" placeholder="Search kits…" value={kitQuery}
                    onChange={e => setKitQuery(e.target.value)}
                    className="flex-1 min-w-[8rem] bg-transparent text-sm font-normal outline-none px-1" />
                </div>
                {kitMatches.length > 0 && (
                  <div role="listbox" aria-label="Kits" className="max-h-40 overflow-y-auto rounded-md border border-slate-300 bg-white shadow-md text-sm font-normal">
                    {kitMatches.map(k => (
                      <div key={k.id} role="option" aria-selected={false} tabIndex={-1}
                        onClick={() => { set('kitIds', [...draft.kitIds, k.id]); setKitQuery(''); }}
                        className="px-2.5 py-1.5 cursor-pointer hover:bg-sky-50">{k.name}</div>
                    ))}
                  </div>
                )}
                <span className="font-normal text-slate-500">
                  {kits.length > 0 ? `Picks from your ${kits.length} kits. ` : ''}Saving the purchase puts the item in these kits.
                </span>
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className={labelClass}>
              <label htmlFor="eq-serial">Serial #</label>
              <input id="eq-serial" aria-label="Serial #" className={`${fieldClass} font-normal`} value={draft.serial_number} onChange={e => set('serial_number', e.target.value)} />
            </div>
            <div className={labelClass}>
              <label htmlFor="eq-tag">Tag #</label>
              <input id="eq-tag" aria-label="Tag #" className={`${fieldClass} font-normal`} value={draft.tag_number} onChange={e => set('tag_number', e.target.value)} />
            </div>
            <div className={labelClass}>
              <label htmlFor="eq-replace">Replacement value</label>
              <input id="eq-replace" aria-label="Replacement value" inputMode="decimal" className={`${fieldClass} font-normal text-right`}
                value={draft.replacement_value ? String(draft.replacement_value) : ''}
                onChange={e => set('replacement_value', Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)} />
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-slate-200 bg-slate-50">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-sky-700 hover:bg-sky-800 text-white"
            onClick={() => { onSave({ ...draft, category: draft.category.trim(), type: draft.type.trim() }); onOpenChange(false); }}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
