# Investigation Report - Invite User Bug

## Bug Summary
When attempting to invite a new team member in the Team screen, the application fails with a `PGRST202` error: "Could not find the function public.invite_user_to_organization in the schema cache".

## Root Cause Analysis
1.  **Missing Database Function**: The function `invite_user_to_organization` is defined in a migration file `supabase/migrations/20260131100000_invite_user_rpc.sql`, but it is missing from the actual database schema (confirmed by searching `supabase/dump/schema_dump.sql`).
2.  **Migration Not Applied**: The entire migration file `20260131100000_invite_user_rpc.sql` (which also contains `convert_pending_user_to_active`) seems not to have been applied to the current environment.
3.  **Function Signature**: The frontend code in `src/services/organization.service.ts` calls the function with 5 named parameters: `p_organization_id`, `p_email`, `p_role`, `p_first_name`, and `p_last_name`. The migration defines these parameters, but since the function is missing, PostgREST cannot find it.

## Affected Components
-   **Database**: Missing `invite_user_to_organization` and `convert_pending_user_to_active` functions.
-   **Frontend**: `src/services/organization.service.ts` (the `inviteUserToOrganization` function).

## Proposed Solution
1.  Create a new migration file that ensures the `invite_user_to_organization` and `convert_pending_user_to_active` functions are created in the `public` schema.
2.  Explicitly use the `public.` prefix in the function definition to avoid any `search_path` issues.
3.  Ensure the parameter names and types match exactly what the frontend is sending.
4.  Ask the user to apply the new migration.

## Implementation Notes
- Created a regression test in `src/services/organization.service.test.ts` that simulates the `PGRST202` error and verifies successful handling when the function exists.
- Created a new migration `supabase/migrations/20260201000000_invite_user_rpc_v2.sql` with explicit `public.` schema prefixes and `SET search_path = public` to ensure the functions are correctly created and accessible by PostgREST.
- Added `public.convert_pending_user_to_active` to the same migration for consistency.

## Test Results
- `src/services/organization.service.test.ts`: Passed (2 tests)
- All existing tests: Passed (95 tests)

