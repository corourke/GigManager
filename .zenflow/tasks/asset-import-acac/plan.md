# Implementation Plan: Asset & Purchase Import

## Configuration
- **Artifacts Path**: `.zenflow/tasks/asset-import-acac`

---

## Workflow Steps

### [x] Step: Requirements
Create a Product Requirements Document (PRD) for the new `purchases` table and A-Z mapping.
- Status: Completed.

### [x] Step: Technical Specification
Define the database schema for `purchases`, `assets` updates, and polymorphic `attachments`.
- Status: Completed.

### [x] Step: Planning
Create a detailed implementation plan for the UI components and template updates.
- Status: Completed.

### [x] Step 1: Database Schema & Migration
<!-- chat-id: fb97d8da-cbd9-44a6-be38-ff0646e1e368 -->
- [x] Create migration for `public.purchases` table.
- [x] Create migration for `public.attachments` and `public.entity_attachments`.
- [x] Create migration to update `public.assets`:
    - Rename `cost` to `item_cost`.
    - Add `item_price`, `retired_on`, `purchase_id`, `tag_number`, etc.
- [x] Configure RLS for new tables and Storage buckets.

### [x] Step 2: Backend Services & Type Definitions
<!-- chat-id: 878fec0b-3c3e-4f9e-93d6-7aeba7abecc6 -->
- [x] Update `types.tsx` (found in `src/utils/supabase/types.tsx`) with new `Purchase`, `Asset`, and `Attachment` schemas.
- [x] Create `purchase.service.ts` for handling header/item logic.
- [x] Create `attachment.service.ts` for file management and polymorphic linking.
- [x] Update `asset.service.ts` to support acquisition via `purchase_id`.

### [x] Step 3: Enhanced CSV Parsing (A-Z)
<!-- chat-id: a4f1b3c6-18a7-42a3-a159-74d41e2da93f -->
- [x] Update CSV parser to handle 26 columns (A-Z).
- [x] Implement grouping logic for Source `0` (Header), `1` (Asset), and `2` (Expense/Item) by Date + Vendor.
- [x] Implement atomic transaction logic via `create_purchase_transaction_v1` RPC.
- [x] Implement robust `Cost Allocation Factor` with Price vs Cost path logic and penny reconciliation.
- [x] Implement transactional commit for bulk imports using grouping.
- [x] Create purchase audit rows for assets and link via `asset_id`.
- [x] Propagate `vendor` and `acquisition_date` from headers to child rows.
- [x] Rename `description` back to `description` in `purchases` table and prefer `manufacturer_model` mapping.
- [x] Relax validation to allow flexible financial field combinations.
- [x] Update UI table display for asset imports.
- [x] Handle standalone assets/expenses with `total_inv_amount` by synthesizing headers.
- [x] Implement find-or-create kit logic for assets with a kit name.
- [x] Enforce non-negative costs and normalize MM/DD/YYYY date formats.
- [x] Implement import-wide cost reconciliation check.
- [x] Fix duplicate kit creation using shared `kitCache`.
- [x] Fix `line_amount` fallback to `NULL` (undefined) instead of `0.00`.
- [x] Implement **Financials Tab** with sub-tabs for Purchases, Gig Accounting, and Reporting.
- [x] Create **Purchase Management UI** with compact grouped layout, filters, and totals.

### [x] Step 4: AI Extraction Pipeline
<!-- chat-id: b1e166bf-dc0c-464e-9bb7-6a3a53d84f0f -->
- [x] Create/Update Edge Function for AI scanning.
- [x] Refine LLM prompt for detailed extraction (Vendor, Date, Items, Tax/Shipping).
- [x] Implement legacy classification logic ($100/$50 rule).

### [x] Step 5: Frontend UI Enhancements
<!-- chat-id: 7d199086-351f-41e3-833a-324f69166fae -->
- [x] **Gig Screen**: Add "Upload Receipt" button and `GigPurchaseExpenses` section.
- [x] **Asset Screen**: Add "Upload Invoice" button in List view.
- [x] **Review Dialog**: Create a unified review/adjust component for scanned data.
- [x] **Attachment Management**: Implement `AttachmentManager` for multi-file support.
- [x] **Gig Attachments**: Add `AttachmentManager` to Gig Detail and Gig Edit screens for general document support.
- [x] **Financials Tab**: New top-level navigation for organization-wide financial management.
- [x] **Purchase Management UI**: Create `FinancialsScreen` with grouped transactions, filtering, and totals.
- [x] **CSV Template**: Update `generateAssetTemplate` function to output 26 columns (A-Z).

### [x] Step 6: Verification & Documentation
<!-- chat-id: 2572f803-699a-4235-a7bd-9cfa4a1483c7 -->
- [x] Document all steps user needs to take to implement backend AI scanning
- [x] Verify that cohesive functionality has been built, especially that there is adequate UI to expose all new features
- [x] Ensure adequate test coverage
- [x] Verify cost reconciliation (Sum of Line Costs == Invoice Total).
- [x] Plan a user documentation task with expert prompts for covering all functionality and place it in docs/development for later implementation
- [x] Ensure that `docs/technical/setup-guide.md` has been updated with all the latest setup steps needed to configure and deploy the application (in a development environment for now)
- [x] Run `lint`, `typecheck`, and `test`.
- [x] Update `scripts/README.md` with final mapping and logic.

### [x] Step: User Testing
<!-- chat-id: 10fa25c1-a139-45c2-995a-3b3c6b3806a9 -->

- [x] Create a checklist for manual user testing that covers all the areas that have been touched by this task.
- [x] Prompt the user for issues to fix until there aren't any more issues reported by the user. 
- [x] Refine AI scan error handling and status codes.
- [x] Implement manual entry fallback and automatic receipt attachment upload.
- [x] Enhanced manual fallback with side-by-side document preview (zoomable).
- [x] Automated burdened cost calculation and invoice reconciliation.
- [x] Updated technical documentation regarding Anthropic API Tiers for PDF support.
- [x] Added `curl` test command to verify Anthropic PDF access level.
- [x] Link receipts from asset detail screens.
- [x] Upgrade to **Claude 4.6 Sonnet** (latest stable model).
- [x] Added `x-diagnostic: true` mode to Edge Function for connectivity troubleshooting.
- [x] Expand fallback dialog to 98vw/98vh with zoomable document preview.
- [x] Fix number field clearing behavior.
- [x] Updated `setup-guide.md` with Supabase connectivity tests and model IDs.

- [x] Implemented Anthropic connectivity test in diagnostic mode.
- [x] Corrected model IDs to Claude 3.5 Sonnet (4.6 ID) and updated fallback logic.
- [x] Fix unit cost computation for initial AI scanned data.
- [x] Ensure dialog width and vertical scrolling work correctly by forcing flex layout.
- [x] Renamed "Line Total" to "Line Amount" in review UI.
- [x] Implement asset creation in both tables during form submission.
- [x] Add disclosure arrow for additional asset-specific fields.
- [x] Polish layout and tighten UI spacing.
- [x] Fix decimal point entry in NumericInput.
