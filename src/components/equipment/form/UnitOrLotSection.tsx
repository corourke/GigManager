import { useRef, useState } from 'react';
import { AlertCircle, FileText, Hash, Layers, ScanLine, Tag } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { cn } from '../../ui/utils';
import { resizeUnitRows, type UnitRow } from '../../../utils/lineUnits';
import { fillSerials, fillTags } from '../../../utils/unitRowHelpers';

export type UnitOrLot = 'units' | 'lot';

/** A unit row; `id` once it's a saved record. */
export type FormUnitRow = UnitRow & { id?: string };

interface UnitOrLotSectionProps {
  idPrefix?: string;
  kind: UnitOrLot;
  onKindChange: (kind: UnitOrLot) => void;
  quantity: number;
  onQuantityChange?: (quantity: number) => void;
  /** Set elsewhere (the purchase line, or the one record being edited). */
  quantityLocked?: boolean;
  quantityNote?: string;
  rows: FormUnitRow[];
  onRowsChange: (rows: FormUnitRow[]) => void;
  /** From unitRowProblems: shown under the rows. */
  problems?: string[];
  /** Why Unit can't be chosen (an existing lot of more than 1). */
  unitBlocked?: string;
  /** Why Lot can't be chosen (saved units). */
  lotBlocked?: string;
  /** Number tags / paste serials / scan (not when editing one record). */
  helpers?: boolean;
  lotError?: string;
}

const KINDS = [
  ['units', 'Unit', Tag, 'Each one has its own serial number or tag.'],
  ['lot', 'Lot', Layers, 'Identical things with no serial or tag, counted together.'],
] as const;

/**
 * Unit or lot (#183). For units the quantity sets how many serial/tag rows there
 * are, one per unit, each needing a serial or a tag; helpers number tags in
 * sequence, paste a column of serials, or take scans (Enter moves to the next row,
 * which is what a barcode scanner sends). A lot has a quantity and no serial or tag.
 */
export default function UnitOrLotSection({
  idPrefix = 'units', kind, onKindChange, quantity, onQuantityChange, quantityLocked, quantityNote,
  rows, onRowsChange, problems = [], unitBlocked, lotBlocked, helpers = true, lotError,
}: UnitOrLotSectionProps) {
  const [tagStart, setTagStart] = useState('');
  const [pasted, setPasted] = useState('');
  const [tagsOpen, setTagsOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  // What's typed in Quantity: it can be blank while typing; a number ≥ 1 applies.
  const [qtyText, setQtyText] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const id = (f: string) => `${idPrefix}_${f}`;

  const setQuantity = (raw: string) => {
    setQtyText(raw);
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1 || String(n) !== raw.trim()) return;
    if (kind === 'units') {
      const dropped = rows.slice(n).filter((r) => r.serial_number.trim() || r.tag_number.trim());
      if (dropped.length && !window.confirm(`Remove ${dropped.length === 1 ? 'a unit that has' : `${dropped.length} units that have`} a serial or tag?`)) {
        setQtyText(null);
        return;
      }
      onRowsChange(resizeUnitRows(rows, n));
    }
    onQuantityChange?.(n);
  };
  const setRow = (i: number, patch: Partial<FormUnitRow>) => onRowsChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const focusField = (i: number, field: 'serial' | 'tag') =>
    grid.current?.querySelector<HTMLInputElement>(`[data-row="${i}"][data-field="${field}"]`)?.focus();
  const nextOnEnter = (i: number, field: 'serial' | 'tag') => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    focusField(i + 1, field);
  };
  const scan = () => {
    const i = rows.findIndex((r) => !r.serial_number.trim());
    focusField(i < 0 ? 0 : i, 'serial');
  };

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Unit or lot" className="grid grid-cols-2 gap-2">
        {KINDS.map(([value, label, Icon, help]) => {
          const blocked = value === 'units' ? !!unitBlocked : !!lotBlocked;
          return (
            <button key={value} type="button" role="radio" aria-checked={kind === value} disabled={blocked}
              onClick={() => {
                if (value === 'units') onRowsChange(resizeUnitRows(rows, quantity));
                onKindChange(value);
              }}
              className={cn('flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left disabled:opacity-50',
                kind === value ? 'border-sky-500 bg-sky-50' : 'border-gray-200 bg-white')}>
              <span className="flex items-center gap-1.5 text-sm font-semibold"><Icon className="h-4 w-4" aria-hidden />{label}</span>
              <span className="text-xs text-gray-600">{help}</span>
            </button>
          );
        })}
      </div>
      {(unitBlocked || lotBlocked) && <p className="text-xs text-muted-foreground">{unitBlocked || lotBlocked}</p>}

      {kind === 'lot' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor={id('quantity')}>Quantity</Label>
            <Input id={id('quantity')} type="number" min="1" value={qtyText ?? String(quantity)} disabled={quantityLocked}
              className={lotError ? 'border-red-500' : ''}
              onChange={(e) => setQuantity(e.target.value)} onBlur={() => setQtyText(null)} />
            {quantityNote && <p className="text-xs text-muted-foreground">{quantityNote}</p>}
            {lotError && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{lotError}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor={id('lot_serial')}>Serial Number</Label>
            <Input id={id('lot_serial')} disabled placeholder="Not for a lot" value="" readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id('lot_tag')}>Inventory Tag ID</Label>
            <Input id={id('lot_tag')} disabled placeholder="Not for a lot" value="" readOnly />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor={id('quantity')}>Quantity</Label>
              <Input id={id('quantity')} type="number" min="1" value={qtyText ?? String(quantity)} disabled={quantityLocked}
                onChange={(e) => setQuantity(e.target.value)} onBlur={() => setQtyText(null)} />
              <p className="text-xs text-muted-foreground">{quantityNote ?? 'One row per unit.'}</p>
            </div>
          </div>
          <div className="rounded-lg border">
            {helpers && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b bg-gray-50 px-3 py-1.5 text-xs">
                <span className="font-semibold text-gray-700">{rows.length} {rows.length === 1 ? 'unit' : 'units'}</span>
                <span className="ml-auto" />
                <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" className="inline-flex items-center gap-1 font-medium text-sky-700 hover:underline"><Hash className="h-3.5 w-3.5" aria-hidden />Number tags</button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 space-y-2">
                    <Label htmlFor={id('tag_start')}>First tag</Label>
                    <Input id={id('tag_start')} value={tagStart} placeholder="e.g., DSL-0141" className="font-mono"
                      onChange={(e) => setTagStart(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Each unit gets the next tag in sequence.</p>
                    <Button type="button" size="sm" disabled={!tagStart.trim()}
                      onClick={() => { onRowsChange(fillTags(rows, tagStart)); setTagsOpen(false); }}>Number {rows.length} tags</Button>
                  </PopoverContent>
                </Popover>
                <Popover open={pasteOpen} onOpenChange={setPasteOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" className="inline-flex items-center gap-1 font-medium text-sky-700 hover:underline"><FileText className="h-3.5 w-3.5" aria-hidden />Paste serials</button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 space-y-2">
                    <Label htmlFor={id('pasted')}>Serial numbers</Label>
                    <Textarea id={id('pasted')} rows={5} value={pasted} className="font-mono" placeholder={'One per line, or separated by ;'}
                      onChange={(e) => setPasted(e.target.value)} />
                    <Button type="button" size="sm" disabled={!pasted.trim()}
                      onClick={() => { onRowsChange(fillSerials(rows, pasted)); setPasted(''); setPasteOpen(false); }}>Fill serials</Button>
                  </PopoverContent>
                </Popover>
                <button type="button" onClick={scan} title="Scan with a barcode scanner: each scan fills a serial and moves to the next unit."
                  className="inline-flex items-center gap-1 font-medium text-sky-700 hover:underline"><ScanLine className="h-3.5 w-3.5" aria-hidden />Scan</button>
              </div>
            )}
            <div ref={grid} className="grid grid-cols-[24px_1fr_1fr] items-center gap-x-3 gap-y-2 p-3">
              <span />
              <span className="text-sm font-medium">Serial Number</span>
              <span className="text-sm font-medium">Inventory Tag ID</span>
              {rows.map((r, i) => (
                <div key={i} className="contents">
                  <span className="text-right text-xs text-muted-foreground">{rows.length > 1 ? i + 1 : ''}</span>
                  <Input aria-label={rows.length > 1 ? `Serial number, unit ${i + 1}` : 'Serial number'} data-row={i} data-field="serial"
                    className="font-mono" placeholder="Serial number" value={r.serial_number}
                    onChange={(e) => setRow(i, { serial_number: e.target.value })} onKeyDown={nextOnEnter(i, 'serial')} />
                  <Input aria-label={rows.length > 1 ? `Inventory tag, unit ${i + 1}` : 'Inventory tag'} data-row={i} data-field="tag"
                    className="font-mono" placeholder="e.g., TAG-001" value={r.tag_number}
                    onChange={(e) => setRow(i, { tag_number: e.target.value })} onKeyDown={nextOnEnter(i, 'tag')} />
                </div>
              ))}
            </div>
          </div>
          {problems.length > 0 && (
            <ul className="space-y-1" aria-label="Problems with the units">
              {problems.map((p) => <li key={p} className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{p}</li>)}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
