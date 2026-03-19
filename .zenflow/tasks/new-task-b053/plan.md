# Auto

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

Ask the user questions when anything is unclear or needs their input. This includes:
- Ambiguous or incomplete requirements
- Technical decisions that affect architecture or user experience
- Trade-offs that require business context

Do not make assumptions on important decisions — get clarification first.

---

## Workflow Steps

### [x] Step: Investigation & Refactoring
<!-- chat-id: fb60852b-35f6-4a8a-918f-38978135ab06 -->

1.  **Investigation**: [x]
    *   Scan files changed in the past 7 days for unused imports, dead code, and deprecated API usage.
    *   Analyze complexity (cyclomatic complexity, parameter count) of modified functions.
    *   Identify the highest-impact improvement.
2.  **Refactoring**: [x]
    *   Fixed redundant `setIsUploading` calls in `AttachmentManager.tsx`.
    *   Refactored `importPurchases` in `purchase.service.ts` into cleaner helper functions.
    *   Removed dead `handleLogin` code and `onLogin` prop from `App.tsx` and `LoginScreen.tsx`.
    *   Added remaining findings to `plan.md` for future tasks.
3.  **Verification**: [x]
    *   Run `npm run build && npm run test:run` to ensure no regressions.

### [x] Step: Future Refactoring Items
<!-- chat-id: 97c31960-f639-4585-aabc-6718a1cfff07 -->
1.  **Refactor `parseDate` in `src/utils/csvImport.ts`**: [x] Streamline the multiple regex checks and date parsing logic.
2.  **Simplify `validateGigRow` in `src/utils/csvImport.ts`**: [x] Extract specific validation blocks (start/end dates, timezone, status) into smaller helper functions to reduce cyclomatic complexity.
3.  **Improve Supabase Type Safety**: [x] Define a comprehensive `Database` type in `src/utils/supabase/types.tsx` and use it in `createClient` to eliminate the need for `as any` when calling `supabase.from()`.
4.  **Refactor `NavigationMenu` Props**: [x] Group navigation callbacks into a single `navigation` or `actions` object to reduce the number of props (currently 6).

**Debug requests, questions, and investigations:** answer or investigate first. Do not create a plan upfront — the user needs an answer, not a plan. A plan may become relevant later once the investigation reveals what needs to change.

**For all other tasks**, before writing any code, assess the scope of the actual change (not the prompt length — a one-sentence prompt can describe a large feature). Scale your approach:

- **Trivial** (typo, config tweak, single obvious change): implement directly, no plan needed.
- **Small** (a few files, clear what to do): write 2–3 sentences in `plan.md` describing what and why, then implement. No substeps.
- **Medium** (multiple components, design decisions, edge cases): write a plan in `plan.md` with requirements, affected files, key decisions, verification. Break into 3–5 steps.
- **Large** (new feature, cross-cutting, unclear scope): gather requirements and write a technical spec first (`requirements.md`, `spec.md` in `{@artifacts_path}/`). Then write `plan.md` with concrete steps referencing the spec.

**Skip planning and implement directly when** the task is trivial, or the user explicitly asks to "just do it" / gives a clear direct instruction.

To reflect the actual purpose of the first step, you can rename it to something more relevant (e.g., Planning, Investigation). Do NOT remove meta information like comments for any step.

Rule of thumb for step size: each step = a coherent unit of work (component, endpoint, test suite). Not too granular (single function), not too broad (entire feature). Unit tests are part of each step, not separate.

Update `{@artifacts_path}/plan.md`.
