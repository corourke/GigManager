# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: adeb8cf3-3f8c-4b50-8a09-cb3fef1f43dd -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Focus on **what** the feature should do and **why**, not **how** it should be built. Do not include technical implementation details, technology choices, or code-level decisions — those belong in the Technical Specification.

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification
<!-- chat-id: 24f69281-4f96-4c3b-8286-33430ef201bd -->

Create a technical specification based on the PRD in `{@artifacts_path}/requirements.md`.

1. Review existing codebase architecture and identify reusable components
2. Define the implementation approach

Do not include implementation steps, phases, or task breakdowns — those belong in the Planning step.

Save to `{@artifacts_path}/spec.md` with:
- Technical context (language, dependencies)
- Implementation approach referencing existing code patterns
- Source code structure changes
- Data model / API / interface changes
- Verification approach using project lint/test commands

### [x] Step: Planning
<!-- chat-id: c63393a5-62b1-4ca2-b260-e5e50a6df154 -->

Create a detailed implementation plan based on `{@artifacts_path}/spec.md`.

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint). Avoid steps that are too granular (single function) or too broad (entire feature).

Important: unit tests must be part of each implementation task, not separate tasks. Each task should implement the code and its tests together, if relevant.

If the feature is trivial and doesn't warrant full specification, update this workflow to remove unnecessary steps and explain the reasoning to the user.

Save to `{@artifacts_path}/plan.md`.

### [x] Step: Phase 1: Schema Changes + Profitability Summary
<!-- chat-id: 98cea32c-fd0d-4b88-b110-ae760db22919 -->
- Refer to [07_gig-financials-workflow.md](../../../docs/product/development-plan/07_gig-financials-workflow.md) and [gig-financials.md](../../../docs/technical/gig-financials.md) for schema DDL and profitability logic
- Create migration `supabase/migrations/20260319213000_gig_financials_workflow.sql`
- Add `purchase_id` (nullable UUID FK to `purchases.id`) and `staff_assignment_id` (nullable UUID FK to `gig_staff_assignments.id`) to `gig_financials`
- Add `completed_at` (nullable timestamptz), `units_completed` (nullable numeric(10,2)), and `gig_financial_id` (nullable UUID FK to `gig_financials.id`) to `gig_staff_assignments`
- Update RLS policies for the new columns and update `supabase/dump/schema_dump.sql`
- Update TypeScript types in `src/utils/supabase/types.tsx` to include the new columns
- Implement `getGigProfitabilitySummary(gigId, organizationId)` in `src/services/gig.service.ts`
- Create `src/components/gig/GigProfitabilitySummary.tsx` with Contract, Total Costs, and Profit cards
- Integrate `GigProfitabilitySummary` into `src/components/gig/GigFinancialsSection.tsx`

### [x] Step: Phase 2: Grouped Records + Simplified Type Picker
<!-- chat-id: e2b87884-6618-4e3e-a0e6-061d8fefeaf2 -->
- Refer to [07_gig-financials-workflow.md](../../../docs/product/development-plan/07_gig-financials-workflow.md) for UI mockups and `FIN_TYPE_GROUPS`
- Add `FIN_TYPE_GROUPS` to `src/utils/supabase/constants.ts` (revenue, cost, tracking categories)
- Update `GigFinancialsSection.tsx` to group records into "Revenue" and "Expenses" sections
- Display paid/unpaid indicators (based on `paid_at`) and source indicators ("Manual", "Receipt", "Staff") for each row
- Simplify the Add/Edit modal type picker to prioritize common types and add an "All Types" expander
- Set default type to `Contract Signed` and default category to `Production` for new records

### [x] Step: Phase 3: Staff Completion Flow
<!-- chat-id: 1cdcbc47-4d24-48fe-aff0-f06bac451563 -->
- Refer to [07_gig-financials-workflow.md](../../../docs/product/development-plan/07_gig-financials-workflow.md) and [gig-financials.md](../../../docs/technical/gig-financials.md) for the staff completion state machine
- Implement `completeStaffAssignment(assignmentId, unitsCompleted?)` and `completeAllStaffAssignments(gigId, organizationId)` in `src/services/gig.service.ts`
- Update `GigStaffSlotsSection.tsx` to show completion status ("Done" vs "Pending") and add a "Finalize All" button
- Add "Complete" button for rate-based assignments that prompts for `units_completed`
- Implement staff cost summary footer in `GigStaffSlotsSection.tsx` (Finalized vs Projected)
- Add a "Projected Staff" subsection to `GigFinancialsSection.tsx` for uncompleted assignments with fees

### [x] Step: Phase 4: Receipt Upload Integration + Cleanup
<!-- chat-id: 31184283-1a4b-48e7-86eb-c9458731bcef -->
- Refer to [requirements.md](../../../docs/product/requirements.md) (Section 7) and [07_gig-financials-workflow.md](../../../docs/product/development-plan/07_gig-financials-workflow.md) for receipt scanning logic
- Update receipt scanning flow to create both `purchases` and `gig_financials` records when uploading from a gig page
- Add "Upload Receipt" button to the `GigFinancialsSection.tsx` header
- Ensure receipt-linked expense rows in `GigFinancialsSection.tsx` link back to the original purchase records
- Remove `src/components/gig/GigPurchaseExpenses.tsx` entirely and update all imports/references
- Run final verification with `npm run build && npm run test:run`

### [x] Step: Manual testing
<!-- chat-id: 5c6afc9c-cef5-4757-b96c-ff5cb0b6432d -->

Create a manual testing checklist and fix bugs.
- [x] Create for the user a checklist of manual tests to carry out that cover the changes made in this sprint. Start with any setup steps that the user needs to perform like running migrations or checking in code or re-running the schema dump. 
