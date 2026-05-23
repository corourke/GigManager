import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { cn } from '../ui/utils';
import { addDays, subDays } from 'date-fns';

export type FutureDateKey = 'none' | 'future-7' | 'future-14' | 'future-30' | 'future-all';
export type PastDateKey = 'none' | 'past-7' | 'past-14' | 'past-30' | 'past-all';

export const FUTURE_FILTER_LABEL: Record<FutureDateKey, string> = {
  none: '',
  'future-7': '+7d',
  'future-14': '+14d',
  'future-30': '+30d',
  'future-all': 'All',
};

export const PAST_FILTER_LABEL: Record<PastDateKey, string> = {
  none: '',
  'past-7': '-7d',
  'past-14': '-14d',
  'past-30': '-30d',
  'past-all': 'All',
};

const DATE_FILTER_FUTURE: { key: FutureDateKey; label: string }[] = [
  { key: 'future-7', label: '+7d' },
  { key: 'future-14', label: '+14d' },
  { key: 'future-30', label: '+30d' },
  { key: 'future-all', label: 'All' },
];

const DATE_FILTER_PAST: { key: PastDateKey; label: string }[] = [
  { key: 'past-7', label: '-7d' },
  { key: 'past-14', label: '-14d' },
  { key: 'past-30', label: '-30d' },
  { key: 'past-all', label: 'All' },
];

export function applyDateFilter<T extends { start: string }>(
  items: T[],
  futureDateFilter: FutureDateKey,
  pastDateFilter: PastDateKey,
): T[] {
  if (futureDateFilter === 'none' && pastDateFilter === 'none') return items;
  const now = new Date();
  const future7 = futureDateFilter === 'future-7' ? addDays(now, 7) : null;
  const future14 = futureDateFilter === 'future-14' ? addDays(now, 14) : null;
  const future30 = futureDateFilter === 'future-30' ? addDays(now, 30) : null;
  const past7 = pastDateFilter === 'past-7' ? subDays(now, 7) : null;
  const past14 = pastDateFilter === 'past-14' ? subDays(now, 14) : null;
  const past30 = pastDateFilter === 'past-30' ? subDays(now, 30) : null;
  return items.filter((g) => {
    const start = new Date(g.start);
    const matchesFuture =
      futureDateFilter === 'none' ? false :
      future7 ? start >= now && start <= future7 :
      future14 ? start >= now && start <= future14 :
      future30 ? start >= now && start <= future30 :
      start >= now;
    const matchesPast =
      pastDateFilter === 'none' ? false :
      past7 ? start < now && start >= past7 :
      past14 ? start < now && start >= past14 :
      past30 ? start < now && start >= past30 :
      start < now;
    return matchesFuture || matchesPast;
  });
}

interface GigDateFilterDropdownProps {
  futureDateFilter: FutureDateKey;
  pastDateFilter: PastDateKey;
  onFutureChange: (key: FutureDateKey) => void;
  onPastChange: (key: PastDateKey) => void;
  compact?: boolean;
}

export function GigDateFilterDropdown({
  futureDateFilter,
  pastDateFilter,
  onFutureChange,
  onPastChange,
  compact = false,
}: GigDateFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const hasFilter = futureDateFilter !== 'none' || pastDateFilter !== 'none';
  const buttonLabel = hasFilter
    ? [FUTURE_FILTER_LABEL[futureDateFilter], PAST_FILTER_LABEL[pastDateFilter]].filter(Boolean).join(' / ')
    : 'All Dates';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-md font-medium border transition-colors whitespace-nowrap',
          compact ? 'px-3 h-8 text-xs' : 'px-3 h-9 text-sm',
          hasFilter
            ? 'bg-sky-500 text-white border-sky-500'
            : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
        )}
      >
        <Calendar className={cn('shrink-0', compact ? 'w-3 h-3' : 'w-4 h-4')} />
        <span>{buttonLabel}</span>
        <ChevronDown className={cn('shrink-0 transition-transform', compact ? 'w-3 h-3' : 'w-4 h-4', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
          <button
            onClick={() => { onFutureChange('none'); onPastChange('none'); setOpen(false); }}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-muted/50',
              !hasFilter ? 'text-sky-600' : 'text-muted-foreground'
            )}
          >
            <span className="w-4 flex items-center justify-center">
              {!hasFilter && <Check className="w-3 h-3" />}
            </span>
            All Dates
          </button>
          <div className="border-t border-border/50 my-1" />
          <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Future</p>
          {DATE_FILTER_FUTURE.map((option) => (
            <button
              key={option.key}
              onClick={() => onFutureChange(futureDateFilter === option.key ? 'none' : option.key)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-muted/50',
                futureDateFilter === option.key ? 'text-sky-600' : 'text-foreground'
              )}
            >
              <span className="w-4 flex items-center justify-center">
                {futureDateFilter === option.key && <Check className="w-3 h-3" />}
              </span>
              {option.label}
            </button>
          ))}
          <div className="border-t border-border/50 my-1" />
          <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Past</p>
          {DATE_FILTER_PAST.map((option) => (
            <button
              key={option.key}
              onClick={() => onPastChange(pastDateFilter === option.key ? 'none' : option.key)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-muted/50',
                pastDateFilter === option.key ? 'text-sky-600' : 'text-foreground'
              )}
            >
              <span className="w-4 flex items-center justify-center">
                {pastDateFilter === option.key && <Check className="w-3 h-3" />}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
