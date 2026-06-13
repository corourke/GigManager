import { supabaseAdmin } from './supabaseAdmin.ts';

/** Get or create a staff role by name; returns its id (or null on failure). */
export async function getOrCreateStaffRole(roleName: string): Promise<string | null> {
  const { data: existingRole } = await supabaseAdmin
    .from('staff_roles').select('id').eq('name', roleName).maybeSingle();
  if (existingRole?.id) return existingRole.id;

  const { data: newRole, error } = await supabaseAdmin
    .from('staff_roles').insert({ name: roleName }).select('id').single();
  if (error || !newRole) {
    console.error('Failed to create staff role:', roleName, error);
    return null;
  }
  return newRole.id;
}
