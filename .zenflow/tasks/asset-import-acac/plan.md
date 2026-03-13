# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: a5f4d3dc-b8d4-4606-a78c-a1bd2adb52ef -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification

Create a technical specification based on the PRD in `{@artifacts_path}/requirements.md`.

1. Review existing codebase architecture and identify reusable components
2. Define the implementation approach

Save to `{@artifacts_path}/spec.md` with:
- Technical context (language, dependencies)
- Implementation approach referencing existing code patterns
- Source code structure changes
- Data model / API / interface changes
- Delivery phases (incremental, testable milestones)
- Verification approach using project lint/test commands

### [x] Step: Planning

Create a detailed implementation plan based on `{@artifacts_path}/spec.md`.

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint). Avoid steps that are too granular (single function) or too broad (entire feature).

Important: unit tests must be part of each implementation task, not separate tasks. Each task should implement the code and its tests together, if relevant.

If the feature is trivial and doesn't warrant full specification, update this workflow to remove unnecessary steps and explain the reasoning to the user.

Save to `{@artifacts_path}/plan.md`.

### [ ] Step 1: Database Schema & Storage
- Create a migration to add columns to `assets` table.
- Create a migration to make `gig_id` nullable in `gig_financials` and add `payment_method`.
- Create a migration for the `attachments` table with RLS.
- Define Storage bucket `attachments` and set up RLS.

### [ ] Step 2: Backend Services & Types
- Update `DbAsset` and `DbGigFinancial` types in `types.ts`.
- Update `asset.service.ts` to support new fields in `createAsset` and `updateAsset`.
- Update `financial.service.ts` to support new fields and nullable `gig_id`.
- Create `attachment.service.ts` for uploading, linking, and fetching files.

### [ ] Step 3: CSV Import Logic Enhancement
- Update `AssetRow` and `validateAssetRow` in `csvImport.ts` to support 23 columns.
- Implement `Source` column handling (Invoice Header, Asset, Expense).
- Implement pro-rata cost allocation logic in `csvImport.ts`.
- Add validation for new fields (e.g., numeric checks for `liquidation_amt`).

### [ ] Step 4: AI Import Backend (Supabase Edge Function)
- Create `supabase/functions/invoice-import/index.ts`.
- Implement PDF/Image text extraction.
- Implement LLM prompt and parsing logic.
- Implement pro-rata allocation on the server side.

### [ ] Step 5: Import Screen UI Improvements
- Update `ImportScreen.tsx` to handle the expanded CSV format.
- Add "Import from Invoice" tab with file upload zone.
- Create `InvoicePreviewTable.tsx` for reviewing and editing AI-extracted items.
- Implement Gig search/linking for expenses in the preview table.

### [ ] Step 6: Attachment UI Components
- Create `AttachmentList.tsx` component.
- Integrate `AttachmentList` into `AssetDetailScreen.tsx`.
- Integrate `AttachmentList` into `GigFinancialsSection.tsx` (or similar financial view).

### [ ] Step 7: Reporting & Admin UI
- Create `ReportsScreen.tsx` for organization admins.
- Implement "Business Expense Report" with filters.
- Implement "Insurance Report" based on `replacement_value` and `insurance_class`.

### [ ] Step 8: Final Documentation & Cleanup
- Update `scripts/README.md` with the latest allocation logic and import workflow details.
- Perform final linting and type checking.
