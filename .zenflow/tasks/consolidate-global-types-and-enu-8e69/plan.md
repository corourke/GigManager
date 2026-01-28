# Spec and build

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

### [x] Step: Technical Specification

Assess the task's difficulty, as underestimating it leads to poor outcomes.
- easy: Straightforward implementation, trivial bug fix or feature

Created technical specification in `spec.md`.

---

### [ ] Step: Phase 1: Establish the Source of Truth
1. Create `src/utils/supabase/constants.ts` with consolidated enums and metadata.
2. Update `src/utils/supabase/types.tsx` with aliases and joined types.
3. Verify that `types.tsx` and `constants.ts` are internally consistent.

### [ ] Step: Phase 2: Refactor App and Core Utilities
1. Refactor `src/App.tsx` to use centralized types and constants.
2. Delete `src/utils/org-icons.tsx`.
3. Update `src/utils/api.ts` (and any other core utils) if they have redundant types.

### [ ] Step: Phase 3: Refactor UI Components
1. Update `src/components/TeamScreen.tsx`.
2. Update `src/components/OrganizationSelector.tsx`.
3. Update `src/components/OrganizationScreen.tsx`.
4. Update `src/components/gig/GigParticipantsSection.tsx`.

### [ ] Step: Phase 4: Global Cleanup and Verification
1. Global search for remaining redundant imports or local type definitions.
2. Run `npm run typecheck` and fix any issues.
3. Final manual verification of UI labels and colors.
