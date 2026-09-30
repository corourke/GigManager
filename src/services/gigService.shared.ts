import { createClient } from '../utils/supabase/client';

/**
 * Shared internal helper for the gig service modules (Phase 7, Step 4 split).
 * The gig.service.ts file was split into focused modules
 * (gigParticipant/gigStaff/gigKit/gigFinancial); they share this client getter.
 */
export const getSupabase = () => createClient();

/** Who did it and to which gig, as the gig services log it in activity_log. */
export interface GigActivityCtx {
  organization_id: string | null;
  actor_display_name: string;
  actor_org_name: string;
  gig_title: string;
}

/**
 * What a caller may pass: at least the acting org it knows (e.g. the org the
 * user is working as). Missing fields are looked up.
 */
export type GigActivityCtxInput = Pick<GigActivityCtx, 'organization_id'> & Partial<GigActivityCtx>;

/**
 * Build the activity-log context for a change to a gig (issue #103).
 *
 * The acting org is the one the caller passes; failing that, the user's
 * Admin/Manager membership among the gig's participating orgs (any
 * membership as a last resort), as gigStaff.service does. Gigs have no
 * owning-org column to fall back on. Query errors throw, so the caller
 * reports them instead of logging against no organization.
 *
 * `participantOrgIds` skips the gig_participants query when the caller has
 * already fetched them.
 */
export async function resolveGigActivityCtx(
  supabase: any,
  user: any,
  gigId: string,
  given?: GigActivityCtxInput,
  participantOrgIds?: string[],
): Promise<GigActivityCtx> {
  let gig_title: string;
  if (given?.gig_title !== undefined) {
    gig_title = given.gig_title;
  } else {
    const { data: gigRow, error } = await supabase.from('gigs').select('title').eq('id', gigId).single();
    if (error) throw error;
    gig_title = (gigRow as any)?.title ?? '';
  }

  let organization_id = given?.organization_id ?? null;
  if (!organization_id) {
    let orgIds: string[] = participantOrgIds ?? [];
    if (!participantOrgIds) {
      const { data: participants, error } = await supabase.from('gig_participants').select('organization_id').eq('gig_id', gigId);
      if (error) throw error;
      orgIds = (participants ?? []).map((p: any) => p.organization_id);
    }
    if (orgIds.length > 0) {
      const { data: memberships, error } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .in('organization_id', orgIds);
      if (error) throw error;
      organization_id =
        (memberships ?? []).find((m: any) => m.role === 'Admin' || m.role === 'Manager')?.organization_id ||
        (memberships ?? [])[0]?.organization_id ||
        null;
    }
  }

  let actor_org_name = '';
  if (given?.organization_id && given.actor_org_name !== undefined) {
    actor_org_name = given.actor_org_name;
  } else if (organization_id) {
    const { data: orgRow, error } = await supabase.from('organizations').select('name').eq('id', organization_id).single();
    if (error) throw error;
    actor_org_name = (orgRow as any)?.name ?? '';
  }

  const actor_display_name =
    given?.actor_display_name ??
    (`${user?.user_metadata?.first_name ?? ''} ${user?.user_metadata?.last_name ?? ''}`.trim() || user?.email || '');

  return { organization_id, actor_display_name, actor_org_name, gig_title };
}
