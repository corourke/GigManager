import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { cn } from '../ui/utils';
import { SCHEDULE_ACTIVITY_TYPES, SCHEDULE_ACTIVITY_CONFIG } from '../../utils/supabase/constants';
import { detectScheduleConflicts } from '../../utils/scheduleConflicts';
import { getGigScheduleEntries, updateGigScheduleEntries } from '../../services/gigSchedule.service';
import { getGigParticipants } from '../../services/gig.service';
import type { GigScheduleEntry, ScheduleActivityType } from '../../utils/supabase/types';

interface ActParticipant {
  id: string;
  organization?: { id: string; name: string } | null;
}

interface GigScheduleEditorProps {
  gigId: string;
  gigStart?: string | null;
  actParticipants?: ActParticipant[];
}

interface EditableEntry {
  _key: string; // stable client key; never persisted
  id?: string;
  activity_type: ScheduleActivityType;
  label: string;
  start_time: string; // local datetime string: YYYY-MM-DDTHH:MM (or '' if unset)
  end_time: string;
  act_participant_id: string;
  notes: string;
  _showMore?: boolean;
}

const makeKey = () => (crypto.randomUUID ? crypto.randomUUID() : `k-${Math.random().toString(36).slice(2)}`);

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toLocalTimeValue(local: string): string {
  if (!local) return '';
  const [, time] = local.split('T');
  return time ? time.slice(0, 5) : '';
}

function toLocalDateValue(local: string): string {
  if (!local) return '';
  return local.split('T')[0] || '';
}

function isoToLocalDatetime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localDatetimeToIso(local: string): string {
  if (!local) return '';
  return new Date(local).toISOString();
}

function combineDateTime(date: string, time: string): string {
  if (!time || !date) return '';
  return `${date}T${time}`;
}

function formatDateHeader(dateKey: string): string {
  if (!dateKey) return 'No time set';
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function entryToEditable(entry: GigScheduleEntry): EditableEntry {
  return {
    _key: makeKey(),
    id: entry.id,
    activity_type: entry.activity_type as ScheduleActivityType,
    label: entry.label || '',
    start_time: isoToLocalDatetime(entry.start_time),
    end_time: entry.end_time ? isoToLocalDatetime(entry.end_time) : '',
    act_participant_id: entry.act_participant_id || '',
    notes: entry.notes || '',
  };
}

function makeEmptyEntry(): EditableEntry {
  return {
    _key: makeKey(),
    activity_type: 'Set',
    label: '',
    start_time: '',
    end_time: '',
    act_participant_id: '',
    notes: '',
  };
}

const CUSTOM_TYPE = '__custom__' as const;

function getDisplayLabel(entry: EditableEntry): string {
  if (entry.label) return entry.label;
  return SCHEDULE_ACTIVITY_CONFIG[entry.activity_type]?.label || entry.activity_type;
}

function isCustomLabel(entry: EditableEntry): boolean {
  const config = SCHEDULE_ACTIVITY_CONFIG[entry.activity_type];
  return !!entry.label && entry.label !== config?.label;
}

const INPUT_CLASS = 'h-7 px-2 text-xs bg-background rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-ring/30';

export default function GigScheduleEditor({ gigId, gigStart, actParticipants: actParticipantsProp }: GigScheduleEditorProps) {
  const [entries, setEntries] = useState<EditableEntry[]>([]);
  const [acts, setActs] = useState<ActParticipant[]>(actParticipantsProp || []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gigDateKey = gigStart ? toLocalDateValue(isoToLocalDatetime(gigStart)) : '';
  const defaultDate = () => gigDateKey || new Date().toISOString().slice(0, 10);

  useEffect(() => {
    loadEntries();
    loadActParticipants();
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [gigId]);

  const loadActParticipants = async () => {
    try {
      const participants = await getGigParticipants(gigId);
      setActs(
        participants
          .filter((p: any) => p.role === 'Act')
          .map((p: any) => ({ id: p.id, organization: p.organization }))
      );
    } catch {
      // fall back to prop
    }
  };

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await getGigScheduleEntries(gigId);
      setEntries(data.map(entryToEditable));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const debouncedSave = useCallback((updatedEntries: EditableEntry[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setDirty(true);
    saveTimerRef.current = setTimeout(() => {
      saveEntries(updatedEntries);
    }, 1200);
  }, [gigId]);

  const saveEntries = async (entriesToSave: EditableEntry[]) => {
    const valid = entriesToSave.filter(e => e.start_time);
    if (valid.length === 0) {
      // Nothing persistable yet; clear the spinner but keep local edits.
      setDirty(false);
      return;
    }
    const sortedValid = [...valid].sort((a, b) => a.start_time.localeCompare(b.start_time));
    setSaving(true);
    try {
      await updateGigScheduleEntries(
        gigId,
        sortedValid.map(e => ({
          id: e.id,
          activity_type: e.activity_type,
          label: e.label || null,
          start_time: localDatetimeToIso(e.start_time),
          end_time: e.end_time ? localDatetimeToIso(e.end_time) : null,
          act_participant_id: e.act_participant_id || null,
          notes: e.notes || null,
        })) as any
      );
      const fresh = await getGigScheduleEntries(gigId);
      setDirty(false);
      // Merge: fresh rows align chronologically with sortedValid; carry over the
      // stable _key and expansion flag so the open row doesn't collapse on save.
      setEntries(prev => {
        const incomplete = prev.filter(e => !e.start_time);
        const merged = fresh.map((f, idx) => ({
          ...entryToEditable(f),
          _key: sortedValid[idx]?._key ?? makeKey(),
          _showMore: sortedValid[idx]?._showMore ?? false,
        }));
        return [...merged, ...incomplete];
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const updateEntry = (key: string, changes: Partial<EditableEntry>, persist = true) => {
    setEntries(prev => {
      const updated = prev.map(e => (e._key === key ? { ...e, ...changes } : e));
      if (persist) debouncedSave(updated);
      return updated;
    });
  };

  const addEntry = () => {
    setEntries(prev => [...prev, makeEmptyEntry()]);
  };

  const removeEntry = (key: string) => {
    setEntries(prev => {
      const updated = prev.filter(e => e._key !== key);
      debouncedSave(updated);
      return updated;
    });
  };

  // Conflict highlighting (keyed by _key so unsaved rows match too).
  const conflictSource = entries
    .filter(e => e.start_time && e.end_time)
    .map(e => ({
      id: e._key,
      gig_id: gigId,
      start_time: localDatetimeToIso(e.start_time),
      end_time: localDatetimeToIso(e.end_time),
      act_participant_id: e.act_participant_id || null,
      activity_type: e.activity_type,
      label: e.label || null,
      notes: e.notes || null,
      sort_order: 0,
      created_at: '',
      updated_at: '',
    })) as GigScheduleEntry[];
  const conflicts = detectScheduleConflicts(conflictSource);
  const conflictKeys = new Set(conflicts.flatMap(c => [c.entryA.id, c.entryB.id]));

  // Group by date for the compact display. Dated entries grouped by their date;
  // entries without a start time fall into a trailing untimed group.
  const dated = entries.filter(e => e.start_time);
  const untimed = entries.filter(e => !e.start_time);
  const groupOrder: string[] = [];
  const groupMap = new Map<string, EditableEntry[]>();
  for (const e of dated) {
    const key = toLocalDateValue(e.start_time);
    if (!groupMap.has(key)) { groupMap.set(key, []); groupOrder.push(key); }
    groupMap.get(key)!.push(e);
  }
  groupOrder.sort((a, b) => a.localeCompare(b));
  const distinctDates = groupOrder;
  const showDateHeaders =
    distinctDates.length > 1 || (distinctDates.length === 1 && distinctDates[0] !== gigDateKey);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading schedule...</span>
        </div>
      </Card>
    );
  }

  const renderRow = (entry: EditableEntry) => {
    const hasConflict = conflictKeys.has(entry._key);
    const config = SCHEDULE_ACTIVITY_CONFIG[entry.activity_type];
    const startDate = entry.start_time ? toLocalDateValue(entry.start_time) : '';
    const startTime = entry.start_time ? toLocalTimeValue(entry.start_time) : '';
    const endTime = entry.end_time ? toLocalTimeValue(entry.end_time) : '';
    const useCustomLabel = isCustomLabel(entry);
    const selectValue = useCustomLabel ? CUSTOM_TYPE : entry.activity_type;

    return (
      <div
        key={entry._key}
        className={cn(
          'rounded-md border px-2 py-1.5',
          hasConflict ? 'border-orange-300 bg-orange-50/50' : 'border-border',
        )}
      >
        {hasConflict && (
          <div className="flex items-center gap-1 text-orange-600 text-[10px] font-medium mb-1">
            <AlertTriangle className="w-3 h-3" />
            Conflict
          </div>
        )}

        {/* Primary row: start time · type/label · act · expand · delete */}
        <div className="flex items-center gap-1.5">
          <input
            type="time"
            className={cn(INPUT_CLASS, 'w-[6.5rem] shrink-0 tabular-nums')}
            value={startTime}
            onChange={e => {
              const date = startDate || defaultDate();
              updateEntry(entry._key, { start_time: combineDateTime(date, e.target.value) });
            }}
          />

          {/* Type/Label combo */}
          <div className="relative min-w-0 flex-1">
            {useCustomLabel ? (
              <div className="flex items-center gap-1">
                <span className={cn('w-2 h-2 rounded-full shrink-0', config?.color?.split(' ')[0] || 'bg-gray-400')} />
                <input
                  type="text"
                  className={cn(INPUT_CLASS, 'w-full')}
                  value={entry.label}
                  placeholder="Custom label"
                  onChange={e => updateEntry(entry._key, { label: e.target.value })}
                />
                <button
                  className="text-muted-foreground hover:text-foreground p-0.5 shrink-0"
                  title="Use a preset"
                  onClick={() => updateEntry(entry._key, { label: '' })}
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <select
                className={cn(INPUT_CLASS, 'w-full pr-6 appearance-none')}
                value={selectValue}
                onChange={e => {
                  const val = e.target.value;
                  if (val === CUSTOM_TYPE) {
                    updateEntry(entry._key, { label: getDisplayLabel(entry) });
                  } else {
                    updateEntry(entry._key, { activity_type: val as ScheduleActivityType, label: '' });
                  }
                }}
              >
                {SCHEDULE_ACTIVITY_TYPES.map(t => (
                  <option key={t} value={t}>{SCHEDULE_ACTIVITY_CONFIG[t].label}</option>
                ))}
                <option value={CUSTOM_TYPE}>Custom...</option>
              </select>
            )}
          </div>

          {acts.length > 0 && (
            <select
              className={cn(INPUT_CLASS, 'min-w-0 w-28')}
              value={entry.act_participant_id}
              onChange={e => updateEntry(entry._key, { act_participant_id: e.target.value })}
            >
              <option value="">—</option>
              {acts.map(p => (
                <option key={p.id} value={p.id}>{p.organization?.name || 'Act'}</option>
              ))}
            </select>
          )}

          <button
            className={cn(
              'shrink-0 p-1 rounded hover:bg-muted/50 text-muted-foreground',
              entry._showMore && 'text-foreground',
            )}
            title="End time, date, notes"
            onClick={() => updateEntry(entry._key, { _showMore: !entry._showMore }, false)}
          >
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', entry._showMore && 'rotate-180')} />
          </button>

          <button
            className="shrink-0 p-1 rounded text-destructive/60 hover:text-destructive hover:bg-destructive/10"
            onClick={() => removeEntry(entry._key)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Expanded: end time (optional), date override, notes */}
        {entry._showMore && (
          <div className="mt-1.5 pl-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-muted-foreground w-10 shrink-0">End</label>
              <input
                type="time"
                className={cn(INPUT_CLASS, 'w-[6.5rem] tabular-nums')}
                value={endTime}
                onChange={e => {
                  if (!e.target.value) {
                    updateEntry(entry._key, { end_time: '' });
                    return;
                  }
                  const date = (entry.end_time && toLocalDateValue(entry.end_time)) || startDate || defaultDate();
                  updateEntry(entry._key, { end_time: combineDateTime(date, e.target.value) });
                }}
              />
              {endTime
                ? (
                  <button
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={() => updateEntry(entry._key, { end_time: '' })}
                  >
                    Clear
                  </button>
                )
                : <span className="text-[10px] text-muted-foreground/60">optional</span>}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-muted-foreground w-10 shrink-0">Date</label>
              <input
                type="date"
                className={cn(INPUT_CLASS, 'w-36')}
                value={startDate || gigDateKey}
                disabled={!startTime}
                title={!startTime ? 'Set a start time first' : undefined}
                onChange={e => {
                  if (!startTime) return;
                  updateEntry(entry._key, {
                    start_time: combineDateTime(e.target.value, startTime),
                    ...(endTime ? { end_time: combineDateTime(e.target.value, endTime) } : {}),
                  });
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-muted-foreground w-10 shrink-0">Notes</label>
              <input
                type="text"
                className={cn(INPUT_CLASS, 'flex-1')}
                placeholder="Optional"
                value={entry.notes}
                onChange={e => updateEntry(entry._key, { notes: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Schedule</h3>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          {!saving && dirty && <span className="text-xs text-muted-foreground">Unsaved</span>}
        </div>
        <Button variant="outline" size="sm" onClick={addEntry} className="gap-1 h-7 text-xs">
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-4 text-center">No schedule entries yet.</p>
      ) : (
        <div className="space-y-2">
          {distinctDates.map(dateKey => (
            <div key={dateKey} className="space-y-1">
              {showDateHeaders && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-1">
                  {formatDateHeader(dateKey)}
                </p>
              )}
              {groupMap.get(dateKey)!.map(renderRow)}
            </div>
          ))}
          {untimed.length > 0 && (
            <div className="space-y-1">
              {(showDateHeaders || distinctDates.length > 0) && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-1">
                  No time set
                </p>
              )}
              {untimed.map(renderRow)}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
