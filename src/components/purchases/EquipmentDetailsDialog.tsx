import { useEffect, useMemo, useState } from 'react';
import { Briefcase, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
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

  const selectClass = 'h-9 w-full rounded-md border border-input bg-input-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-60';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Equipment details</DialogTitle>
          <DialogDescription className="truncate" title={itemName}>{itemName || 'New item'}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="eq-category">Category</Label>
            {newCategory ? (
              <Input id="eq-category" aria-label="Category" autoFocus placeholder="New category" value={draft.category}
                onChange={e => set('category', e.target.value)}
                onBlur={() => { if (!draft.category.trim()) setNewCategory(false); }} />
            ) : (
              <select id="eq-category" aria-label="Category" className={selectClass} value={draft.category} disabled={categoryLocked}
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

          <div className="space-y-1.5">
            <Label htmlFor="eq-type">Type <span className="font-normal text-muted-foreground">General to specific, separated by commas</span></Label>
            <Input
              id="eq-type"
              role="combobox"
              aria-label="Type"
              aria-expanded={typeOpen}
              aria-controls="eq-type-list"
              autoComplete="off"
              placeholder={draft.category ? 'e.g. Cable, XLR' : 'Choose a category first'}
              value={draft.type}
              onFocus={() => setTypeOpen(true)}
              onChange={e => { set('type', e.target.value); setTypeOpen(true); }}
              onKeyDown={e => { if (e.key === 'Escape') setTypeOpen(false); }}
            />
            {typeOpen && draft.category && (shownTypes.length > 0 || isNewType) && (
              <div id="eq-type-list" role="listbox" aria-label={`Types used in ${draft.category}`}
                className="max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md text-sm">
                {shownTypes.map(t => (
                  <div key={t.type} role="option" aria-selected={t.type === draft.type} tabIndex={-1}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { set('type', t.type); setTypeOpen(false); }}
                    className={`flex justify-between gap-3 px-3 py-1.5 cursor-pointer hover:bg-accent ${t.type === draft.type ? 'bg-sky-50' : ''}`}>
                    <span>{t.type}</span>
                    <span className="text-muted-foreground tabular-nums">{t.count}</span>
                  </div>
                ))}
                {isNewType && (
                  <div role="option" aria-selected={false} tabIndex={-1}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => setTypeOpen(false)}
                    className="px-3 py-1.5 cursor-pointer text-sky-700 border-t hover:bg-accent">
                    + Use "{typed}" as a new type
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="eq-kits">Kits</Label>
            {kitsLocked ? (
              <p className="text-sm text-muted-foreground">This item is already equipment. Manage its kits on the equipment page.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input p-1.5 min-h-9">
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
                    className="flex-1 min-w-[8rem] bg-transparent text-sm outline-none px-1" />
                </div>
                {kitMatches.length > 0 && (
                  <div role="listbox" aria-label="Kits" className="max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md text-sm">
                    {kitMatches.map(k => (
                      <div key={k.id} role="option" aria-selected={false} tabIndex={-1}
                        onClick={() => { set('kitIds', [...draft.kitIds, k.id]); setKitQuery(''); }}
                        className="px-3 py-1.5 cursor-pointer hover:bg-accent">{k.name}</div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Saving the purchase puts the item in these kits.</p>
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="eq-serial">Serial #</Label>
              <Input id="eq-serial" aria-label="Serial #" value={draft.serial_number} onChange={e => set('serial_number', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eq-tag">Tag #</Label>
              <Input id="eq-tag" aria-label="Tag #" value={draft.tag_number} onChange={e => set('tag_number', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eq-replace">Replacement value</Label>
              <Input id="eq-replace" aria-label="Replacement value" inputMode="decimal" className="text-right"
                value={draft.replacement_value ? String(draft.replacement_value) : ''}
                onChange={e => set('replacement_value', Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)} />
            </div>
          </div>
        </div>

        <DialogFooter>
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
