# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: 7af95192-d987-424a-a29f-870bfc4865e6 -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Focus on **what** the feature should do and **why**, not **how** it should be built. Do not include technical implementation details, technology choices, or code-level decisions — those belong in the Technical Specification.

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification
<!-- chat-id: aa95be53-eb6f-4b4b-aa1c-37e52601aaa0 -->

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
<!-- chat-id: d8b38a4a-8257-4061-8b7d-dedc156fc3b6 -->

Create a detailed implementation plan based on `{@artifacts_path}/spec.md`.

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint). Avoid steps that are too granular (single function) or too broad (entire feature).

Important: unit tests must be part of each implementation task, not separate tasks. Each task should implement the code and its tests together, if relevant.

If the feature is trivial and doesn't warrant full specification, update this workflow to remove unnecessary steps and explain the reasoning to the user.

Save to `{@artifacts_path}/plan.md`.

### [x] Step: Database Migration & Types
<!-- chat-id: 4cf97b56-0bc5-4909-a1d6-5df02ba180e0 -->
- Add `mileage` column to `gig_financials` table (NUMERIC(10,2)).
- Update `DbGigFinancial` interface in `src/utils/supabase/types.tsx`.
- **Verification**: Run `npm run typecheck` and check migration success.

### [x] Step: Financial Utilities
<!-- chat-id: 92d4af45-7cb2-41a4-9888-1b74fbf54ef2 -->
- Create `src/utils/financials.utils.ts` with IRS rates and calculation logic.
- Add `calculateMileageAmount` and `formatMileageNotes` functions.
- Write unit tests in `src/utils/financials.utils.test.ts`.
- **Verification**: Run `npm run test:run` for the new utility tests.

### [x] Step: Shared UI - Quick Action Buttons
<!-- chat-id: 61d6908e-7d9f-4670-8774-36e9bce625e8 -->
- Create `src/components/gig/QuickActionButtons.tsx`.
- Implement sub-flow for "Expense / Mileage" with distance/odometer fields.
- Ensure automatic calculation of amount and notes generation.
- **Verification**: Verify buttons and mileage modal logic in isolation or temporary view.

### [x] Step: Web Integration
<!-- chat-id: 01669522-1be2-45e5-985d-b6706e5ae236 -->
- Replace "Add Record" button in `GigFinancialsSection.tsx` with `QuickActionButtons`.
- Ensure new records are correctly saved to Supabase.
- **Verification**: Manually test adding mileage and expenses on the web gig detail page.

### [x] Step: Mobile Implementation
<!-- chat-id: 7b7a35de-c8a5-4a7f-92cf-81fb8342dd0b -->
- Create `MobileGigFinancials.tsx` component.
- Implement summary cards (Contract, Received, Costs).
- Implement simplified transaction list.
- Add `QuickActionButtons` for mobile entry.
- Integrate into `MobileGigDetail.tsx`.
- **Verification**: Manually test financial visibility and entry on mobile view (Admin/Manager roles).

### [x] Step: Final Verification
<!-- chat-id: b475e92a-47b9-412e-9545-cc19ddce3c52 -->
- Run full build and test suite: `npm run build && npm run test:run`.
- Perform final manual pass on both Web and Mobile.
- Check role-based access control for financials on mobile.

### [x] Step: Refactor Financial Summary
- Refactored `MobileGigFinancials.tsx` for compact layout.
- Limited summary width in `GigFinancialsSection.tsx`.
- Simplified `GigProfitabilitySummary.tsx` tiles.
- Fixed IRS mileage rates in `financials.utils.ts`.
- **Verification**: Run `npm run test:run`.

### [x] Step: UI Refinements
- Reduced typography size significantly in `GigProfitabilitySummary.tsx`.
- Wrapped `MobileGigFinancials.tsx` in a titled section to match other cards.
- Standardized labels to "Revenue, Costs, Profit" on mobile.
- Tightened layout for maximum compactness on both platforms.
- **Verification**: Run `npm run build && npm run test:run`.
