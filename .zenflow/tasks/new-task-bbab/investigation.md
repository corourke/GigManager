# Bug Investigation: Application Hang on Login (Update: Root Cause Identified)

## Bug Summary
The application hangs when a bearer token is present in Local Storage. This occurs during the initial auth check and during manual login. The hang is specifically at the database level when calling RPC functions that query the `organization_members` or `users` tables.

## Root Cause Analysis (Confirmed)
The primary cause is **RLS Infinite Recursion** in the database schema:

1.  **`organization_members` Recursion**:
    *   The `SELECT` policy for `organization_members` is: 
        `USING (user_id = auth.uid() OR organization_id IN (SELECT organization_id FROM user_organization_ids(auth.uid())))`
    *   The function `user_organization_ids(user_uuid)` is:
        `SELECT organization_id FROM organization_members WHERE user_id = user_uuid;`
    *   When an authenticated user tries to select from `organization_members`, the policy triggers `user_organization_ids`, which tries to select from `organization_members`, which triggers the policy again, and so on.
    *   Since `get_user_organizations_secure` is used in `AuthContext` (and it calls `organization_members`), it hangs indefinitely.

2.  **`users` Recursion**:
    *   The `users` table also has a policy that uses `user_organization_ids`, which queries `organization_members`. If `organization_members` is locked by recursion, any query to `users` that involves this policy will also hang.

3.  **Authentication Path**:
    *   When no token is present, `auth.uid()` is null, and the recursive paths are often bypassed or return quickly.
    *   When a token is present, `auth.uid()` is set, the policies are evaluated, and the recursion triggers.

## Affected Components
*   **Database Schema**: `organization_members` and `users` table policies.
*   **AuthContext.tsx**: Hangs because the RPC calls never return.
*   **user.service.ts**: Hangs during `getUserProfile` and `getUserOrganizations`.

## Proposed Solution
1.  **Database Migration**:
    *   Simplify the `organization_members` SELECT policy to avoid calling functions that query the same table. A simple `user_id = auth.uid()` for self-access and a optimized non-recursive check for other members.
    *   Actually, the simplest non-recursive policy for `organization_members` is:
        `USING (user_id = auth.uid() OR organization_id IN (SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()))`
        Wait, even this can be recursive. The standard way to avoid this in Supabase is to use `auth.uid()` directly or `(select 1 from ...)` with care.
        Actually, using a `SECURITY DEFINER` function like `user_organization_ids` *should* bypass RLS if it's called *inside* the policy, but if the function itself is just a wrapper for a SELECT on the same table, Postgres might still apply RLS if not careful.
    *   **Fix**: Update `organization_members` policy to use a more direct check or a specifically designed non-recursive helper.

2.  **Frontend Robustness (Already Implemented)**:
    *   Keep the `AuthContext` changes that reset the `isRefreshing` lock, as it allows the UI to at least recover and show the login screen if a timeout occurs, rather than being permanently deadlocked in the UI state.

## Proposed Migration
```sql
-- Fix recursion in organization_members
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
CREATE POLICY "Users can view members of their organizations" ON organization_members
  FOR SELECT USING (
    -- Direct check for self
    user_id = auth.uid() 
    OR 
    -- Use a subquery that Postgres can optimize better or a non-recursive helper
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  );
```
Actually, even better is to use the `SECURITY DEFINER` functions we already have, but ensuring they are used correctly to break the loop.

## Tracing and Re-evaluation (Update)
As part of a deeper investigation, the following steps were taken:
1.  **Tracing**: Added detailed `[TRACE]` logs with timestamps to `AuthContext.tsx` and `user.service.ts` to identify the exact point of the hang in the production/development environment.
2.  **Timeout Removal**: Removed the 5-second timeout "band-aid" from `AuthContext.tsx` to ensure the tracing captures the full extent of the hang and that we don't prematurely mask the issue during diagnostics.
3.  **Deeper Policy Audit**: Identified additional recursive paths in `gig` related tables. Functions like `user_has_access_to_gig`, `user_can_manage_gig`, and `user_is_admin_of_gig` were using `LANGUAGE sql`, allowing them to be inlined into RLS policies and potentially cause infinite loops when queried during the auth flow (since `AuthContext` triggers profile/org fetches which might touch these tables).

## Refined Analysis (Sequential Tracing)
Sequential tracing revealed that both `get_user_profile_secure` and `get_user_organizations_secure` continue to hang even after converting core helpers to `plpgsql`. 

**Critical Discovery**: 
The `users` table has redundant, overlapping policies from multiple migrations. Specifically, the policy `"Users can view other user profiles"` (from `schema_dump.sql` L1290) was using a recursive `LANGUAGE sql` helper and was **NOT** dropped by later migrations. In PostgreSQL RLS, multiple policies for the same action are OR-ed together. Even if one policy is safe, a single recursive policy on the same table can cause the entire query to hang.

## Final Proposed Solution
1.  **Cleanup Migration (`20260130000004_cleanup_recursive_policies.sql`)**: 
    - Explicitly drops the legacy `"Users can view other user profiles"` and `"Users can view their own profile"` policies.
    - Re-establishes the unified, non-recursive `"Users can view profiles in their organizations"` policy.
    - Re-establishes the clean `"Users can view members of their organizations"` policy on `organization_members`.
2.  **Sequential Execution**: Keep the sequential call order in `AuthContext.tsx` temporarily to ensure that if a hang persists, we know exactly which table/query is responsible.
3.  **Comprehensive plpgsql Conversion**: Ensure all security-related functions are `LANGUAGE plpgsql`.
