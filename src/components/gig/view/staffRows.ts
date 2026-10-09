import type { GigStaffSlotView } from '../../../utils/supabase/types';

/** "$1,500" for whole dollars, "$1,582.50" whenever there are cents. */
export const money = (n: number) => {
  const cents = Math.round(n * 100) % 100 !== 0;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 })}`;
};

/** The time unit a rate is paid per (#171). A fee is flat and has none. */
export type RateUnit = 'hour' | 'day' | 'half_day';

/** The units, in picker order, with the suffix a rate shows ("$50 / hr"). */
export const RATE_UNITS: { value: RateUnit; label: string }[] = [
  { value: 'hour', label: '/ hr' },
  { value: 'day', label: '/ day' },
  { value: 'half_day', label: '/ ½ day' },
];

const UNIT_NAMES: Record<RateUnit, [string, string]> = {
  hour: ['hour', 'hours'],
  day: ['day', 'days'],
  half_day: ['half day', 'half days'],
};

/** A stored unit, or hourly when there is none (rows saved before #171 were hourly). */
export const rateUnit = (unit?: string | null): RateUnit =>
  unit === 'day' || unit === 'half_day' ? unit : 'hour';

/** "$50 / hr", "$400 / day", "$225 / ½ day". */
export const formatRate = (rate: number, unit?: string | null) =>
  `${money(rate)} ${RATE_UNITS.find((u) => u.value === rateUnit(unit))!.label}`;

/** The unit's plural name: "hours", "days", "half days". */
export const unitPlural = (unit?: string | null) => UNIT_NAMES[rateUnit(unit)][1];

/** A count of the unit in words: "1 hour", "3 days", "2 half days". */
export function formatUnits(n: number, unit?: string | null): string {
  const [one, many] = UNIT_NAMES[rateUnit(unit)];
  return `${n} ${n === 1 ? one : many}`;
}

/** How an assignment's amount is reached: "3 days × $400 / day", or "Fee". */
export function rateBasis(a: { fee?: number | null; rate?: number | null; rate_unit?: string | null; units_completed?: number | null }): string {
  if (a.fee != null) return 'Fee';
  if (a.rate != null) return `${formatUnits(Number(a.units_completed ?? 1), a.rate_unit)} × ${formatRate(Number(a.rate), a.rate_unit)}`;
  return '';
}

/** Amount for one assignment: a fee, else a rate (× units once completed). */
export function assignmentCost(a: { fee?: number | null; rate?: number | null; units_completed?: number | null }): number {
  if (a.fee != null) return Number(a.fee);
  if (a.rate != null) return Number(a.rate) * Number(a.units_completed ?? 1);
  return 0;
}

export interface StaffRow {
  key: string;
  role: string;
  name?: string;
  phone?: string | null;
  email?: string | null;
  status: string;
  pay?: string;
  notes?: string | null;
}

/** One row per assignment, plus an "Open" row per unfilled place in a slot. */
export function staffRows(slots: GigStaffSlotView[]): StaffRow[] {
  const rows: StaffRow[] = [];
  for (const slot of slots) {
    const role = slot.role || slot.role_info?.name || '';
    const assignments = (slot.staff_assignments ?? slot.assignments ?? []).filter((a) => a.user_id);
    for (const a of assignments) {
      rows.push({
        key: String(a.id),
        role,
        name: a.user ? `${a.user.first_name ?? ''} ${a.user.last_name ?? ''}`.trim() : undefined,
        phone: a.user?.phone,
        email: a.user?.email,
        status: a.status || 'Requested',
        pay: a.fee != null ? `${money(Number(a.fee))} fee` : a.rate != null ? formatRate(Number(a.rate), a.rate_unit) : undefined,
        notes: a.notes,
      });
    }
    const filled = assignments.filter((a) => a.status !== 'Declined').length;
    for (let i = filled; i < (slot.count ?? slot.required_count ?? 0); i++) {
      rows.push({ key: `${slot.id}-open-${i}`, role, status: 'Open' });
    }
  }
  return rows;
}

