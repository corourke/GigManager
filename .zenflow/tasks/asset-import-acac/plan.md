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

### [ ] Step 1: Database Schema & Migration
- [ ] Create migration for `public.purchases` table.
- [ ] Create migration for `public.attachments` and `public.entity_attachments`.
- [ ] Create migration to update `public.assets`:
    - Rename `cost` to `item_cost`.
    - Add `item_price`, `retired_on`, `purchase_id`, `tag_number`, etc.
- [ ] Configure RLS for new tables and Storage buckets.

### [ ] Step 2: Backend Services & Type Definitions
- [ ] Update `types.ts` with new `Purchase`, `Asset`, and `Attachment` schemas.
- [ ] Create `purchase.service.ts` for handling header/item logic.
- [ ] Create `attachment.service.ts` for file management and polymorphic linking.
- [ ] Update `asset.service.ts` to support acquisition via `purchase_id`.

### [ ] Step 3: Enhanced CSV Parsing (A-Z)
- [ ] Update CSV parser to handle 26 columns (A-Z).
- [ ] Implement grouping logic for Source `0` (Header), `1` (Asset), and `2` (Expense/Item).
- [ ] Implement `Cost Allocation Factor` utility for pro-rata tax/shipping distribution.
- [ ] Implement transactional commit for bulk imports.

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
