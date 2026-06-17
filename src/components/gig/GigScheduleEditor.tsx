import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  Clock,
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
  start_time: string;
  end_time: string;
  act_participant_id: string;
  notes: string;
}

function toLocalDatetimeValue(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDatetimeValue(local: string): string {
  if (!local) return '';
  return new Date(local).toISOString();
}

function entryToEditable(entry: GigScheduleEntry): EditableEntry {
  return {
    id: entry.id,
    activity_type: entry.activity_type as ScheduleActivityType,
    label: entry.label || '',
    start_time: toLocalDatetimeValue(entry.start_time),
    end_time: toLocalDatetimeValue(entry.end_time),
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

const INPUT_CLASS = 'h-9 px-2 text-sm bg-background rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-ring/30';

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
    const valid = entriesToSave.filter(e => e.start_time && e.end_time);
    const incomplete = entriesToSave.filter(e => !e.start_time || !e.end_time);
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
          end_time: fromLocalDatetimeValue(e.end_time),
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

  const updateEntry = (index: number, field: keyof EditableEntry, value: string) => {
    setEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      debouncedSave(updated);
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

  // Build conflict set for highlighting — use the same temp ID scheme as the render loop
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
        <Button variant="outline" size="sm" onClick={addEntry} className="gap-1 h-8 text-xs">
          <Plus className="w-3.5 h-3.5" />
          Add Entry
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-4 text-center">
          No schedule entries. Click "Add Entry" to build a schedule.
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => {
            const tempId = entry.id || `new-${i}`;
            const hasConflict = conflictIds.has(tempId);
            const config = SCHEDULE_ACTIVITY_CONFIG[entry.activity_type];

            return (
              <div
                key={tempId}
                className={cn(
                  'rounded-lg border p-3 space-y-2',
                  hasConflict ? 'border-orange-300 bg-orange-50/50' : 'border-border'
                )}
              >
                {hasConflict && (
                  <div className="flex items-center gap-1.5 text-orange-600 text-xs font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Schedule conflict with same act
                  </div>
                )}

                <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                  {/* Activity Type */}
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase mb-1 block">Type</label>
                    <select
                      className={cn(INPUT_CLASS, 'w-full')}
                      value={entry.activity_type}
                      onChange={e => updateEntry(i, 'activity_type', e.target.value)}
                    >
                      {SCHEDULE_ACTIVITY_TYPES.map(t => (
                        <option key={t} value={t}>{SCHEDULE_ACTIVITY_CONFIG[t].label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Start Time */}
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase mb-1 block">Start</label>
                    <input
                      type="datetime-local"
                      className={cn(INPUT_CLASS, 'w-full')}
                      value={entry.start_time}
                      onChange={e => updateEntry(i, 'start_time', e.target.value)}
                    />
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase mb-1 block">End</label>
                    <input
                      type="datetime-local"
                      className={cn(INPUT_CLASS, 'w-full')}
                      value={entry.end_time}
                      onChange={e => updateEntry(i, 'end_time', e.target.value)}
                    />
                  </div>

                  {/* Remove */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:bg-destructive/10"
                    onClick={() => removeEntry(i)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-[1fr_1fr] gap-2">
                  {/* Act */}
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase mb-1 block">Act</label>
                    <select
                      className={cn(INPUT_CLASS, 'w-full')}
                      value={entry.act_participant_id}
                      onChange={e => updateEntry(i, 'act_participant_id', e.target.value)}
                    >
                      <option value="">None</option>
                      {acts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.organization?.name || 'Unknown Act'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Label */}
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase mb-1 block">Label</label>
                    <input
                      type="text"
                      className={cn(INPUT_CLASS, 'w-full')}
                      placeholder={config?.label || 'Custom label'}
                      value={entry.label}
                      onChange={e => updateEntry(i, 'label', e.target.value)}
                    />
                  </div>
                </div>

                {/* Notes (collapsible or always visible for simplicity) */}
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase mb-1 block">Notes</label>
                  <input
                    type="text"
                    className={cn(INPUT_CLASS, 'w-full')}
                    placeholder="Optional notes"
                    value={entry.notes}
                    onChange={e => updateEntry(i, 'notes', e.target.value)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
