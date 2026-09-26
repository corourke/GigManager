import type { GigStaffSlotView } from '../../../utils/supabase/types';

export const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

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
        pay: a.fee != null ? `${money(Number(a.fee))} fee` : a.rate != null ? `${money(Number(a.rate))} / hr` : undefined,
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

