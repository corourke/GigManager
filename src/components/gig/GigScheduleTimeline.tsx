import {
  Truck,
  Volume2,
  Music,
  Mic2,
  Coffee,
  MoreHorizontal,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { cn } from '../ui/utils';
import { SCHEDULE_ACTIVITY_CONFIG } from '../../utils/supabase/constants';
import type { GigScheduleEntry, ScheduleActivityType } from '../../utils/supabase/types';
import type { ScheduleConflict } from '../../utils/scheduleConflicts';

const ICON_MAP: Record<string, React.ElementType> = {
  Truck,
  Volume2,
  Music,
  Mic2,
  Coffee,
  MoreHorizontal,
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

interface GigScheduleTimelineProps {
  entries: GigScheduleEntry[];
  conflicts?: ScheduleConflict[];
}

export default function GigScheduleTimeline({ entries, conflicts = [] }: GigScheduleTimelineProps) {
  if (!entries || entries.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-2">No schedule entries</p>
    );
  }

  const conflictEntryIds = new Set<string>();
  for (const c of conflicts) {
    conflictEntryIds.add(c.entryA.id);
    conflictEntryIds.add(c.entryB.id);
  }

  return (
    <div className="relative space-y-0">
      {/* Timeline line */}
      <div className="absolute left-[18px] top-3 bottom-3 w-px bg-border" />

      {entries.map((entry, i) => {
        const config = SCHEDULE_ACTIVITY_CONFIG[entry.activity_type as ScheduleActivityType];
        const Icon = ICON_MAP[config?.icon || 'MoreHorizontal'] || MoreHorizontal;
        const hasConflict = conflictEntryIds.has(entry.id);
        const actName = entry.act_participant?.organization?.name;

        return (
          <div key={entry.id || i} className="relative flex items-start gap-3 py-1.5">
            {/* Timeline dot */}
            <div className={cn(
              'relative z-10 flex items-center justify-center w-9 h-9 rounded-full shrink-0',
              hasConflict ? 'bg-orange-100 ring-2 ring-orange-400' : 'bg-background border border-border'
            )}>
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>

            {/* Content */}
            <div className={cn(
              'flex-1 min-w-0 rounded-lg border px-3 py-2',
              hasConflict ? 'border-orange-300 bg-orange-50/50' : 'border-border bg-background'
            )}>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn('text-[10px] font-semibold', config?.color)}>
                  {entry.label || config?.label || entry.activity_type}
                </Badge>
                {actName && (
                  <span className="text-xs font-medium text-muted-foreground">{actName}</span>
                )}
                {hasConflict && (
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatTime(entry.start_time)} – {formatTime(entry.end_time)}
              </p>
              {entry.notes && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.notes}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
