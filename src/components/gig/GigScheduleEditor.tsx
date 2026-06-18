import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  Clock,
  GripVertical,
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
  actParticipants?: ActParticipant[];
}

interface EditableEntry {
  id?: string;
  activity_type: ScheduleActivityType;
  label: string;
  start_time: string; // local datetime string: YYYY-MM-DDTHH:MM
  end_time: string;
  act_participant_id: string;
  notes: string;
  _showMore?: boolean;
}

function toLocalTimeValue(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalDateValue(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toLocalDatetimeValue(iso: string): string {
  if (!iso) return '';
  return `${toLocalDateValue(iso)}T${toLocalTimeValue(iso)}`;
}

function fromLocalDatetimeValue(local: string): string {
  if (!local) return '';
  return new Date(local).toISOString();
}

function combineDateTime(date: string, time: string): string {
  if (!time || !date) return '';
  return `${date}T${time}`;
}

function formatTimeAmPm(localDatetime: string): string {
  if (!localDatetime) return '';
  const [, timePart] = localDatetime.split('T');
  if (!timePart) return '';
  const [hStr, mStr] = timePart.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mStr} ${ampm}`;
}

function entryToEditable(entry: GigScheduleEntry): EditableEntry {
  return {
    id: entry.id,
    activity_type: entry.activity_type as ScheduleActivityType,
    label: entry.label || '',
    start_time: toLocalDatetimeValue(entry.start_time),
    end_time: entry.end_time ? toLocalDatetimeValue(entry.end_time) : '',
    act_participant_id: entry.act_participant_id || '',
    notes: entry.notes || '',
  };
}

function makeEmptyEntry(): EditableEntry {
  return {
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

const INPUT_CLASS = 'h-8 px-2 text-sm bg-background rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-ring/30';

export default function GigScheduleEditor({ gigId, actParticipants: actParticipantsProp }: GigScheduleEditorProps) {
  const [entries, setEntries] = useState<EditableEntry[]>([]);
  const [acts, setActs] = useState<ActParticipant[]>(actParticipantsProp || []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    }, 1500);
  }, [gigId]);

  const saveEntries = async (entriesToSave: EditableEntry[]) => {
    const valid = entriesToSave.filter(e => e.start_time);
    const incomplete = entriesToSave.filter(e => !e.start_time);
    if (valid.length === 0 && incomplete.length > 0) {
      return;
    }
    setSaving(true);
    try {
      await updateGigScheduleEntries(
        gigId,
        valid.map(e => ({
          id: e.id,
          activity_type: e.activity_type,
          label: e.label || null,
          start_time: fromLocalDatetimeValue(e.start_time),
          end_time: e.end_time ? fromLocalDatetimeValue(e.end_time) : null,
          act_participant_id: e.act_participant_id || null,
          notes: e.notes || null,
        })) as any
      );
      setDirty(false);
      const fresh = await getGigScheduleEntries(gigId);
      setEntries([...fresh.map(entryToEditable), ...incomplete]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const updateEntry = (index: number, field: keyof EditableEntry, value: string | boolean) => {
    setEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field !== '_showMore') {
        debouncedSave(updated);
      }
      return updated;
    });
  };

  const addEntry = () => {
    setEntries(prev => [...prev, makeEmptyEntry()]);
  };

  const removeEntry = (index: number) => {
    setEntries(prev => {
      const updated = prev.filter((_, i) => i !== index);
      debouncedSave(updated);
      return updated;
    });
  };

  // Build conflict set for highlighting
  const conflictEntries = entries
    .filter(e => e.start_time && e.end_time)
    .map((e, i) => ({
      ...e,
      id: e.id || `new-${i}`,
      gig_id: gigId,
      start_time: fromLocalDatetimeValue(e.start_time),
      end_time: fromLocalDatetimeValue(e.end_time),
      act_participant_id: e.act_participant_id || null,
      activity_type: e.activity_type,
      label: e.label || null,
      notes: e.notes || null,
      sort_order: 0,
      created_at: '',
      updated_at: '',
    })) as GigScheduleEntry[];
  const conflicts = detectScheduleConflicts(conflictEntries);
  const conflictIds = new Set(conflicts.flatMap(c => [c.entryA.id, c.entryB.id]));

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
        <p className="text-sm text-gray-400 italic py-4 text-center">
          No schedule entries yet.
        </p>
      ) : (
        <div className="space-y-1">
          {entries.map((entry, i) => {
            const tempId = entry.id || `new-${i}`;
            const hasConflict = conflictIds.has(tempId);
            const config = SCHEDULE_ACTIVITY_CONFIG[entry.activity_type];
            const startDate = entry.start_time ? toLocalDateValue(entry.start_time) : '';
            const startTime = entry.start_time ? toLocalTimeValue(entry.start_time) : '';
            const endDate = entry.end_time ? toLocalDateValue(entry.end_time) : '';
            const endTime = entry.end_time ? toLocalTimeValue(entry.end_time) : '';
            const useCustomLabel = isCustomLabel(entry);
            const selectValue = useCustomLabel ? CUSTOM_TYPE : entry.activity_type;
            const startAmPm = formatTimeAmPm(entry.start_time);

            return (
              <div
                key={tempId}
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

                {/* Primary row: grip · time · type/label · act · expand · delete */}
                <div className="flex items-center gap-1.5">
                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 cursor-grab" />

                  {/* Start time (required) — shows AM/PM */}
                  <div className="relative shrink-0 w-[5.5rem]">
                    <input
                      type="time"
                      className={cn(INPUT_CLASS, 'w-full h-7 text-xs opacity-0 absolute inset-0 cursor-pointer')}
                      value={startTime}
                      onChange={e => {
                        const date = startDate || new Date().toISOString().slice(0, 10);
                        updateEntry(i, 'start_time', combineDateTime(date, e.target.value));
                      }}
                    />
                    <div className={cn(
                      INPUT_CLASS,
                      'w-full h-7 text-xs flex items-center pointer-events-none tabular-nums',
                      !startAmPm && 'text-muted-foreground/50',
                    )}>
                      {startAmPm || '— : — —'}
                    </div>
                  </div>

                  {/* Type/Label combo */}
                  <div className="relative min-w-0 w-36 shrink-0">
                    {useCustomLabel ? (
                      <div className="flex items-center gap-0.5">
                        <span
                          className={cn('w-2 h-2 rounded-full shrink-0', config?.color?.split(' ')[0] || 'bg-gray-400')}
                        />
                        <input
                          type="text"
                          className={cn(INPUT_CLASS, 'w-full h-7 text-xs')}
                          value={entry.label}
                          placeholder="Custom label"
                          onChange={e => updateEntry(i, 'label', e.target.value)}
                        />
                        <button
                          className="text-muted-foreground hover:text-foreground p-0.5"
                          title="Switch to preset"
                          onClick={() => updateEntry(i, 'label', '')}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <select
                        className={cn(INPUT_CLASS, 'w-full h-7 text-xs pr-6 appearance-none')}
                        value={selectValue}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === CUSTOM_TYPE) {
                            updateEntry(i, 'label', getDisplayLabel(entry));
                          } else {
                            updateEntry(i, 'activity_type', val);
                            updateEntry(i, 'label', '');
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

                  {/* Act (if any exist) */}
                  {acts.length > 0 && (
                    <select
                      className={cn(INPUT_CLASS, 'h-7 text-xs min-w-0 flex-1')}
                      value={entry.act_participant_id}
                      onChange={e => updateEntry(i, 'act_participant_id', e.target.value)}
                    >
                      <option value="">—</option>
                      {acts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.organization?.name || 'Act'}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Expand toggle */}
                  <button
                    className={cn(
                      'shrink-0 p-1 rounded hover:bg-muted/50 text-muted-foreground',
                      entry._showMore && 'text-foreground',
                    )}
                    title="End time, date, notes"
                    onClick={() => updateEntry(i, '_showMore', !entry._showMore)}
                  >
                    <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', entry._showMore && 'rotate-180')} />
                  </button>

                  {/* Delete */}
                  <button
                    className="shrink-0 p-1 rounded text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeEntry(i)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Expanded section: end time, date, notes */}
                {entry._showMore && (
                  <div className="mt-1.5 pl-5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-muted-foreground w-10 shrink-0">End</label>
                      <div className="relative shrink-0 w-[5.5rem]">
                        <input
                          type="time"
                          className={cn(INPUT_CLASS, 'w-full h-7 text-xs opacity-0 absolute inset-0 cursor-pointer')}
                          value={endTime}
                          onChange={e => {
                            if (!e.target.value) {
                              updateEntry(i, 'end_time', '');
                              return;
                            }
                            const date = endDate || startDate || new Date().toISOString().slice(0, 10);
                            updateEntry(i, 'end_time', combineDateTime(date, e.target.value));
                          }}
                        />
                        <div className={cn(
                          INPUT_CLASS,
                          'w-full h-7 text-xs flex items-center pointer-events-none tabular-nums',
                          !endTime && 'text-muted-foreground/50',
                        )}>
                          {formatTimeAmPm(entry.end_time) || 'Optional'}
                        </div>
                      </div>
                      {endTime && (
                        <button
                          className="text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => updateEntry(i, 'end_time', '')}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-muted-foreground w-10 shrink-0">Date</label>
                      <input
                        type="date"
                        className={cn(INPUT_CLASS, 'h-7 text-xs w-36')}
                        value={startDate}
                        onChange={e => {
                          const time = startTime || '00:00';
                          updateEntry(i, 'start_time', combineDateTime(e.target.value, time));
                          if (endTime) {
                            updateEntry(i, 'end_time', combineDateTime(e.target.value, endTime));
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-muted-foreground w-10 shrink-0">Notes</label>
                      <input
                        type="text"
                        className={cn(INPUT_CLASS, 'h-7 text-xs flex-1')}
                        placeholder="Optional"
                        value={entry.notes}
                        onChange={e => updateEntry(i, 'notes', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
