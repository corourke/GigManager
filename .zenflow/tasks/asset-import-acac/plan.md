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
- [x] Implement grouping logic for Source `0` (Header), `1` (Asset), and `2` (Expense/Item).
- [x] Implement `Cost Allocation Factor` utility for pro-rata tax/shipping distribution.
- [x] Implement transactional commit for bulk imports.

### [ ] Step 4: AI Extraction Pipeline
- [ ] Create/Update Edge Function for AI scanning.
- [ ] Refine LLM prompt for detailed extraction (Vendor, Date, Items, Tax/Shipping).
- [ ] Implement legacy classification logic ($100/$50 rule).

### [ ] Step 5: Frontend UI Enhancements
- [ ] **Gig Screen**: Add "Upload Receipt" button and `GigPurchaseExpenses` section.
- [ ] **Asset Screen**: Add "Upload Invoice" button in List view.
- [ ] **Review Dialog**: Create a unified review/adjust component for scanned data.
- [ ] **Attachment Management**: Implement `AttachmentManager` for multi-file support.
- [ ] **Purchase Management UI**: Create `PurchaseTransactionView` for viewing and editing complete transactions.
- [ ] **CSV Template**: Update `generateAssetTemplate` function to output 26 columns (A-Z).

### [ ] Step 6: Verification & Documentation
- [ ] Verify cost reconciliation (Sum of Line Costs == Invoice Total).
- [ ] Run `lint`, `typecheck`, and `test`.
- [ ] Update `scripts/README.md` with final mapping and logic.

### [ ] Step: User Testing

Create a checklist for manual user testing that covers all the areas that have been touched by this task.
