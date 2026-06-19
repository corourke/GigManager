import { AlertTriangle } from 'lucide-react';
import { cn } from '../ui/utils';
import { SCHEDULE_ACTIVITY_CONFIG } from '../../utils/supabase/constants';
import type { GigScheduleEntry, ScheduleActivityType } from '../../utils/supabase/types';
import type { ScheduleConflict } from '../../utils/scheduleConflicts';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function dateKey(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateHeader(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

interface GigScheduleTimelineProps {
  entries: GigScheduleEntry[];
  conflicts?: ScheduleConflict[];
  /** Gig date — when provided, entries on other dates get a date header. */
  gigDate?: string | null;
}

export default function GigScheduleTimeline({ entries, conflicts = [], gigDate }: GigScheduleTimelineProps) {
  if (!entries || entries.length === 0) {
    return <p className="text-sm text-gray-400 italic py-1">No schedule entries</p>;
  }

  const conflictEntryIds = new Set<string>();
  for (const c of conflicts) {
    conflictEntryIds.add(c.entryA.id);
    conflictEntryIds.add(c.entryB.id);
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  // Group consecutive entries by local date.
  const groups: Array<{ key: string; iso: string; items: GigScheduleEntry[] }> = [];
  for (const entry of sorted) {
    const key = dateKey(entry.start_time);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(entry);
    } else {
      groups.push({ key, iso: entry.start_time, items: [entry] });
    }
  }

  const gigKey = gigDate ? dateKey(gigDate) : null;
  const showDateHeaders = groups.length > 1 || (gigKey != null && groups[0]?.key !== gigKey);

  return (
    <div className="space-y-2">
      {groups.map(group => (
        <div key={group.key}>
          {showDateHeaders && (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
              {formatDateHeader(group.iso)}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((entry, i) => {
              const config = SCHEDULE_ACTIVITY_CONFIG[entry.activity_type as ScheduleActivityType];
              const hasConflict = conflictEntryIds.has(entry.id);
              const actName = entry.act_participant?.organization?.name;
              const dotColor = config?.color?.split(' ')[0] || 'bg-gray-300';

              return (
                <div
                  key={entry.id || i}
                  className={cn(
                    'flex items-baseline gap-2 rounded px-1.5 py-1 text-xs',
                    hasConflict && 'bg-orange-50'
                  )}
                >
                  <span className="text-gray-500 tabular-nums whitespace-nowrap shrink-0 w-[4.5rem] text-right">
                    {formatTime(entry.start_time)}
                  </span>
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0 self-center', dotColor)} />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-gray-800">
                      {entry.label || config?.label || entry.activity_type}
                    </span>
                    {actName && <span className="text-gray-500"> · {actName}</span>}
                    {entry.end_time && (
                      <span className="text-gray-400"> (ends {formatTime(entry.end_time)})</span>
                    )}
                    {entry.notes && (
                      <span className="block text-gray-400 truncate">{entry.notes}</span>
                    )}
                  </span>
                  {hasConflict && (
                    <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0 self-center" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
