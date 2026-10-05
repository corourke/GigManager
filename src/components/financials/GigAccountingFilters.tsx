import { Search, TableIcon, LayoutGrid } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { cn } from '../ui/utils';
import {
  SECTION_LABELS,
  SECTION_ORDER,
  TIMEFRAME_PRESETS,
  type AccountingSectionId,
  type TimeframePreset,
} from '../../utils/gigAccountingSections';

interface GigAccountingFiltersProps {
  searchQuery: string;
  timeframe: TimeframePreset;
  customFrom: string;
  customTo: string;
  visibleSections: Record<AccountingSectionId, boolean>;
  sectionCounts: Record<AccountingSectionId, number>;
  viewMode: 'table' | 'card';
  onSearchChange: (v: string) => void;
  onTimeframeChange: (v: TimeframePreset) => void;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  onToggleSection: (id: AccountingSectionId) => void;
  onViewModeChange: (v: 'table' | 'card') => void;
}

const TOGGLE_ON: Record<AccountingSectionId, string> = {
  'needs-attention': 'border-amber-400 bg-amber-50 text-amber-900',
  upcoming: 'border-sky-600 bg-sky-50 text-sky-900',
  settled: 'border-gray-500 bg-gray-100 text-gray-900',
};

export default function GigAccountingFilters({
  searchQuery,
  timeframe,
  customFrom,
  customTo,
  visibleSections,
  sectionCounts,
  viewMode,
  onSearchChange,
  onTimeframeChange,
  onCustomFromChange,
  onCustomToChange,
  onToggleSection,
  onViewModeChange,
}: GigAccountingFiltersProps) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search gigs…"
            aria-label="Search gigs"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-1" role="group" aria-label="View">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('table')}
            aria-label="Table view"
            aria-pressed={viewMode === 'table'}
          >
            <TableIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'card' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('card')}
            aria-label="Card view"
            aria-pressed={viewMode === 'card'}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Gig date">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-1">Gig date</span>
          {TIMEFRAME_PRESETS.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={timeframe === p.id ? 'default' : 'outline'}
              className="h-8 rounded-full"
              aria-pressed={timeframe === p.id}
              onClick={() => onTimeframeChange(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sections">
          {SECTION_ORDER.map((id) => {
            const on = visibleSections[id];
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => onToggleSection(id)}
                className={cn(
                  'h-8 rounded-md border px-3 text-sm font-medium transition-colors',
                  on ? TOGGLE_ON[id] : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50',
                )}
              >
                {SECTION_LABELS[id]} · {on ? sectionCounts[id] : 'off'}
              </button>
            );
          })}
        </div>
      </div>

      {timeframe === 'custom' && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="acct-from" className="text-xs">From</Label>
            <Input id="acct-from" type="date" value={customFrom} onChange={(e) => onCustomFromChange(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="acct-to" className="text-xs">To</Label>
            <Input id="acct-to" type="date" value={customTo} onChange={(e) => onCustomToChange(e.target.value)} className="w-40" />
          </div>
        </div>
      )}
    </Card>
  );
}
