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

### [x] Step 4: AI Extraction Pipeline
<!-- chat-id: b1e166bf-dc0c-464e-9bb7-6a3a53d84f0f -->
- [x] Create/Update Edge Function for AI scanning.
- [x] Refine LLM prompt for detailed extraction (Vendor, Date, Items, Tax/Shipping).
- [x] Implement legacy classification logic ($100/$50 rule).

### [ ] Step 5: Frontend UI Enhancements
- [ ] **Gig Screen**: Add "Upload Receipt" button and `GigPurchaseExpenses` section.
- [ ] **Asset Screen**: Add "Upload Invoice" button in List view.
- [ ] **Review Dialog**: Create a unified review/adjust component for scanned data.
- [ ] **Attachment Management**: Implement `AttachmentManager` for multi-file support.
- [ ] **Purchase Management UI**: Create `PurchaseTransactionView` for viewing and editing complete transactions.
- [x] **CSV Template**: Update `generateAssetTemplate` function to output 26 columns (A-Z).

### [ ] Step 6: Verification & Documentation
- [ ] Verify cost reconciliation (Sum of Line Costs == Invoice Total).
- [ ] Run `lint`, `typecheck`, and `test`.
- [ ] Update `scripts/README.md` with final mapping and logic.

### [ ] Step: User Testing

Create a checklist for manual user testing that covers all the areas that have been touched by this task.
