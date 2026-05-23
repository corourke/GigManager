import { useEffect, useRef, useState } from 'react';
import { Filter, ChevronDown, Check } from 'lucide-react';
import { cn } from '../ui/utils';
import type { GigStatus } from '../../utils/supabase/types';
import { GIG_STATUS_CONFIG } from '../../utils/supabase/constants';

const STATUS_OPTIONS: { key: GigStatus; label: string }[] = Object.entries(GIG_STATUS_CONFIG).map(
  ([key, cfg]) => ({ key: key as GigStatus, label: cfg.label })
);

interface GigStatusFilterDropdownProps {
  activeStatuses: GigStatus[];
  onChange: (statuses: GigStatus[]) => void;
  compact?: boolean;
}

export function GigStatusFilterDropdown({
  activeStatuses,
  onChange,
  compact = false,
}: GigStatusFilterDropdownProps) {
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

  const hasFilter = activeStatuses.length > 0;
  const buttonLabel = hasFilter
    ? activeStatuses.map((s) => GIG_STATUS_CONFIG[s]?.label ?? s).join(', ')
    : 'All Statuses';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-md font-medium border transition-colors',
          compact ? 'px-3 h-8 text-xs' : 'px-3 h-9 text-sm',
          hasFilter
            ? 'bg-sky-500 text-white border-sky-500'
            : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
        )}
      >
        <Filter className={cn('shrink-0', compact ? 'w-3 h-3' : 'w-4 h-4')} />
        <span className={cn('truncate', compact ? 'max-w-[140px]' : 'max-w-[200px]')}>{buttonLabel}</span>
        <ChevronDown className={cn('shrink-0 transition-transform', compact ? 'w-3 h-3' : 'w-4 h-4', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[180px]">
          <button
            onClick={() => { onChange([]); setOpen(false); }}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-muted/50',
              !hasFilter ? 'text-sky-600' : 'text-muted-foreground'
            )}
          >
            <span className="w-4 flex items-center justify-center">
              {!hasFilter && <Check className="w-3 h-3" />}
            </span>
            All
          </button>
          <div className="border-t border-border/50 my-1" />
          {STATUS_OPTIONS.map((option) => {
            const selected = activeStatuses.includes(option.key);
            return (
              <button
                key={option.key}
                onClick={() =>
                  onChange(
                    selected
                      ? activeStatuses.filter((s) => s !== option.key)
                      : [...activeStatuses, option.key]
                  )
                }
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-muted/50"
              >
                <span className="w-4 flex items-center justify-center">
                  {selected && <Check className="w-3 h-3 text-sky-600" />}
                </span>
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
