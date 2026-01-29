# Investigation Report - Gig List Policy Bug

## Bug Summary
When loading the Gig List screen, the application fails with an error. This is likely due to an infinite recursion in the Row Level Security (RLS) policies for the `gig_participants` table, which is queried during the initial data fetch.

## Root Cause Analysis
The `gig_participants` table has a policy:
```sql
CREATE POLICY "Admins and Managers can manage gig participants" ON gig_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp2
      WHERE gp2.gig_id = gig_participants.gig_id
      AND user_is_admin_or_manager_of_org(gp2.organization_id, auth.uid())
    )
  );
```
Since this is a `FOR ALL` policy, it applies to `SELECT` operations. When a user tries to SELECT from `gig_participants`, Postgres evaluates this policy. The policy itself contains a SELECT on `gig_participants` (`gp2`), which triggers the same policy evaluation, leading to infinite recursion.

Even though there is another SELECT policy:
```sql
CREATE POLICY "Users can view participants for accessible gigs" ON gig_participants
  FOR SELECT USING (user_has_access_to_gig(gig_id, auth.uid()));
```
Postgres combines multiple policies of the same type (SELECT) with OR. If one of them is recursive, the entire query fails.

## Affected Components
- `supabase/schema.sql`: RLS policies for `gig_participants`, `gig_staff_slots`, and `gig_staff_assignments`.
- `src/services/gig.service.ts`: `getGigsForOrganization` and other gig-related fetch functions.
- `src/components/GigListScreen.tsx`: Fails to load data.

## Proposed Solution
1. Replace recursive subqueries in RLS policies with `SECURITY DEFINER` functions.
2. Create a new helper function `user_can_manage_gig(gig_id UUID, user_uuid UUID)` that runs with elevated privileges to check for Admin/Manager roles without triggering RLS.
3. Update policies for `gigs`, `gig_participants`, `gig_staff_slots`, and `gig_staff_assignments` to use these helper functions.
4. Separate `FOR ALL` policies into specific `FOR SELECT`, `FOR INSERT`, etc., where appropriate to avoid unintended side effects.

## Implementation Plan
1. Add `user_can_manage_gig` function to `supabase/schema.sql`.
2. Update `gig_participants` policies to use `user_can_manage_gig`.
3. Update `gig_staff_slots` and `gig_staff_assignments` policies to use `user_can_manage_gig`.
4. Update `gigs` policies to use `user_can_manage_gig` for UPDATE and DELETE.
