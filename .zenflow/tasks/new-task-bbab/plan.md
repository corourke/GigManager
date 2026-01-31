# Fix bug

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Workflow Steps

### [x] Step: Investigation and Planning (Tracing Phase)
<!-- chat-id: a83c0776-30e8-45ee-a4f1-4770afb9aa6f -->

Analyze the bug report and design a solution with tracing.

1. [x] Add detailed `[TRACE]` logging to `AuthContext.tsx` and `user.service.ts`.
2. [x] Remove the 5-second timeout band-aid from `AuthContext.tsx`.
3. [x] Audit RLS policies and identify additional recursion points in `gig` tables.
4. [x] Create `20260130000003_fix_gig_security_functions.sql` to convert gig helpers to `plpgsql`.
5. [x] Present findings and refined migration plan for approval.

### [ ] Step: Implementation
Read `{@artifacts_path}/investigation.md`
Implement the bug fix after approval.

1. Apply the migration `20260130000001_fix_rls_recursion.sql`.
2. Apply the migration `20260130000002_fix_rpc_recursion.sql`.
3. Apply the migration `20260130000003_fix_gig_security_functions.sql`.
4. Verify the logs in the application to confirm no hangs occur during login.
5. Run all existing tests to ensure no regressions.

If blocked or uncertain, ask the user for direction.
