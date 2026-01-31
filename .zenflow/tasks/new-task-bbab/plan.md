# Fix bug

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Workflow Steps

### [x] Step: Investigation and Planning
<!-- chat-id: a83c0776-30e8-45ee-a4f1-4770afb9aa6f -->

Analyze the bug report and design a solution.

1. Review the bug description, error messages, and logs
2. Clarify reproduction steps with the user if unclear
3. Check existing tests for clues about expected behavior
4. Locate relevant code sections and identify root cause
5. Propose a fix based on the investigation
6. Consider edge cases and potential side effects

Save findings to `{@artifacts_path}/investigation.md` with:
- Bug summary
- Root cause analysis
- Affected components
- Proposed solution

### [ ] Step: Implementation
Read `{@artifacts_path}/investigation.md`
Implement the bug fix.

1. Create `src/contexts/AuthContext.test.tsx` with tests that simulate hanging database calls to verify frontend robustness.
2. Apply the refined SQL migration (`20260130000002_fix_rpc_recursion.sql`) to convert secure RPCs to `plpgsql`.
3. Verify that the login hang is resolved in the application.
4. Run all existing tests to ensure no regressions.
5. Update `{@artifacts_path}/investigation.md` with implementation notes and test results.

If blocked or uncertain, ask the user for direction.
