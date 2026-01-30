# Fix bug

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Workflow Steps

### [x] Step: Investigation and Planning
<!-- chat-id: f4fa5169-c7a9-4d3c-ad70-df6dacbc1f36 -->

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

### [x] Step: Implementation
Read `{@artifacts_path}/investigation.md`
Implement the bug fix.

1. Add/adjust regression test(s) that fail before the fix and pass after
2. Implement the fix
3. Run relevant tests
4. Update `{@artifacts_path}/investigation.md` with implementation notes and test results

If blocked or uncertain, ask the user for direction.

### [x] Step: Debug Issues From Policy Refactor
<!-- chat-id: 66de5688-2cde-4784-8cf5-e330a1d2108d -->
We need to continue debugging issues from the security refactoring that 
included adding RLS to additional tables. These will be driven by manual tests and observations. 
- No need to reopen the branch (which has been deleted). OK to do the work on the main branch. 
- Be sure you understand the problem fully before proceeding. Ask if not sure. 
- Consult docs/development/ZENFLOW.md
- Add at least one failing regression test BEFORE fixing the issue.
- Propose a solution and get approval.
- Fix the issue and then prompt for additional observations and issues from the user. 
<!-- agent: grok -->
