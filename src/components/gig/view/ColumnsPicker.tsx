import { Columns3 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import type { ColumnDef } from './useColumnVisibility';

interface ColumnsPickerProps {
  columns: readonly ColumnDef[];
  isVisible: (key: string) => boolean;
  toggle: (key: string) => void;
}

/** "Columns ▾" menu for a gig-page table (#12). Required columns aren't listed. */
export default function ColumnsPicker({ columns, isVisible, toggle }: ColumnsPickerProps) {
  const optional = columns.filter((c) => !c.required);
  if (optional.length === 0) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground no-print">
          <Columns3 className="w-3.5 h-3.5 mr-1" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground px-1 pb-1">Show columns</p>
        {optional.map((c) => (
          <label key={c.key} className="flex items-center gap-2 px-1 py-1 text-sm cursor-pointer rounded hover:bg-muted/60">
            <Checkbox checked={isVisible(c.key)} onCheckedChange={() => toggle(c.key)} />
            {c.label}
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}
