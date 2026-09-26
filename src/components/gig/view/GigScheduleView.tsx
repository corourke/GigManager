import { SCHEDULE_ACTIVITY_CONFIG } from '../../../utils/supabase/constants';
import { formatInTimeZone } from '../../../utils/dateUtils';
import type { GigScheduleEntry } from '../../../utils/supabase/types';
import GigSection from './GigSection';

interface GigScheduleViewProps {
  entries: GigScheduleEntry[];
  timeZone?: string;
  /** Maps act participant id → act name. */
  actNames?: Record<string, string>;
}

const time = (iso: string, tz?: string) => formatInTimeZone(iso, tz, { hour: 'numeric', minute: '2-digit', hour12: true });
const day = (iso: string, tz?: string) => formatInTimeZone(iso, tz, { weekday: 'short', month: 'short', day: 'numeric' });
const tzName = (iso: string, tz?: string) =>
  formatInTimeZone(iso, tz, { timeZoneName: 'short' }).split(' ').pop() ?? '';

/** Read-only run of show (#12): one dense row per item, grouped by day in the gig's time zone. */
export default function GigScheduleView({ entries, timeZone, actNames = {} }: GigScheduleViewProps) {
  const sorted = [...entries].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const days = [...new Set(sorted.map((e) => day(e.start_time, timeZone)))];

  return (
    <GigSection
      title="Schedule"
      summary={sorted.length > 0 ? `${days.join(' – ')} · times ${tzName(sorted[0].start_time, timeZone)}` : undefined}
    >
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No schedule yet</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {sorted.map((e, i) => {
              const newDay = days.length > 1 && (i === 0 || day(sorted[i - 1].start_time, timeZone) !== day(e.start_time, timeZone));
              const who = [e.act_participant_id ? actNames[e.act_participant_id] : null, e.notes].filter(Boolean).join(' · ');
              return [
                newDay ? (
                  <tr key={`${e.id}-day`}>
                    <td colSpan={3} className="pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      {day(e.start_time, timeZone)}
                    </td>
                  </tr>
                ) : null,
                <tr key={e.id} className="border-b border-border/40 last:border-0">
                  <td className="py-1 pr-3 w-36 font-semibold tabular-nums whitespace-nowrap">
                    {time(e.start_time, timeZone)}
                    {e.end_time ? ` – ${time(e.end_time, timeZone)}` : ''}
                  </td>
                  <td className="py-1 pr-3 w-40">{e.label || SCHEDULE_ACTIVITY_CONFIG[e.activity_type]?.label || e.activity_type}</td>
                  <td className="py-1 text-muted-foreground">{who}</td>
                </tr>,
              ];
            })}
          </tbody>
        </table>
      )}
    </GigSection>
  );
}
