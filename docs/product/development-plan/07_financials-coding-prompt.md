# Gig Financials Implementation — Coding Prompt

Use this prompt with a coding agent to implement the gig financial management system.

---

## Prompt

```
Implement the gig financials workflow as specified in the project documentation. Work through four phases, making sure each phase is working before moving to the next.

Read these documents thoroughly before starting:
- docs/product/development-plan/07_financials-settlement.md — the full technical spec
- docs/product/development-plan/gig-financials-workflow-analysis.md — the design analysis with UI mockups
- docs/product/requirements.md — Section 7 (Expense Management & Gig Profitability) and the Financials sub-section under Core Features > Gig Management

Read these source files to understand the current implementation:
- supabase/dump/schema_dump.sql — current database schema (look at gig_financials, purchases, gig_staff_assignments, gig_staff_slots tables)
- src/services/gig.service.ts — gig service including financial CRUD
- src/services/purchase.service.ts — purchase service
- src/components/gig/GigFinancialsSection.tsx — current financials UI
- src/components/gig/GigPurchaseExpenses.tsx — current purchase expenses UI (broken — shows headers not items)
- src/components/gig/GigStaffSlotsSection.tsx — staff assignments UI
- src/utils/supabase/types.tsx — TypeScript types
- src/utils/supabase/constants.ts — FIN_TYPE_CONFIG, FIN_CATEGORY_CONFIG

## Key Architecture: Single-Ledger Model

gig_financials is the SINGLE SOURCE OF TRUTH for gig profitability. All financial events (revenue, expenses, staff labor) are rows in this table. Other tables are source documents:
- purchases → receipt archive. Linked via gig_financials.purchase_id (new column).
- gig_staff_assignments → labor planning. Linked via gig_financials.staff_assignment_id (new column). Costs enter the ledger when assignments are marked complete.

## Phase 1: Schema Changes + Profitability Summary

Database (create a new migration file):
1. Add purchase_id (nullable UUID FK to purchases.id) to gig_financials
2. Add staff_assignment_id (nullable UUID FK to gig_staff_assignments.id) to gig_financials
3. Add completed_at (nullable timestamptz) to gig_staff_assignments
4. Add units_completed (nullable numeric(10,2)) to gig_staff_assignments
5. Drop gig_id from purchases
6. Update RLS policies if needed for the new columns
7. Update schema_dump.sql to reflect changes

Types: Update src/utils/supabase/types.tsx for the new columns.

Service: Add getGigProfitabilitySummary(gigId, organizationId) to gig.service.ts:
- Query gig_financials grouped by type to get revenue vs costs
- Query uncompleted staff assignments (completed_at IS NULL) for projected staff costs
- Return: { contractAmount, received, outstandingRevenue, actualCosts, projectedStaffCosts, totalCosts, profit, margin }

Component: Create src/components/gig/GigProfitabilitySummary.tsx:
- Three cards: Contract (received/outstanding), Total Costs (actual + projected), Profit (with margin %)
- Green/amber/gray coloring for contract card based on payment status
- Green/red for profit card
- Render at top of GigFinancialsSection

## Phase 2: Grouped Records + Simplified Type Picker

Constants: Add FIN_TYPE_GROUPS to constants.ts:
- revenue: [Contract Signed, Deposit Received, Payment Recieved, Bid Accepted]
- cost: [Expense Incurred, Payment Sent, Deposit Sent]
- tracking: [Invoice Issued, Invoice Settled]
- (remaining types are "advanced")

Component updates to GigFinancialsSection.tsx:
- Group records into "Revenue" and "Expenses" sections based on FIN_TYPE_GROUPS
- Show paid/unpaid indicator on each row (based on paid_at field)
- Show source indicator: "Manual" (no purchase_id or staff_assignment_id), "Receipt" (has purchase_id), "Staff" (has staff_assignment_id)
- Simplify Add/Edit modal type picker: show common types (Contract Signed, Deposit Received, Payment Recieved, Expense Incurred, Payment Sent) at top, "All Types" expander for the rest
- Default new record type to Contract Signed instead of Bid Submitted
- Default category to Production instead of Other

## Phase 3: Staff Completion Flow

Service additions to gig.service.ts:
- completeStaffAssignment(assignmentId, unitsCompleted?): sets completed_at, creates gig_financials record (type=Expense Incurred, category=Labor, amount=fee or rate*units, staff_assignment_id=assignmentId)
- completeAllStaffAssignments(gigId, organizationId): bulk completion for all confirmed fee-based assignments that haven't been completed yet

Component updates to GigStaffSlotsSection.tsx:
- Show completion status per assignment: "Done" (completed_at set) or "Pending"
- Add "Finalize All" button that calls completeAllStaffAssignments
- For rate-based uncompleted assignments, show a "Complete" button that prompts for units_completed
- Add footer row: Total Staff Cost with breakdown (Finalized: $X · Projected: $Y)

Component updates to GigFinancialsSection.tsx:
- Add a "Projected Staff" sub-section below the Expenses group showing uncompleted assignments with fees
- These are NOT gig_financials records — they're read from gig_staff_assignments where completed_at IS NULL

## Phase 4: Fix Purchase Receipts Display

Service: Add getGigPurchaseReceipts(gigId, organizationId) to purchase.service.ts:
- Join gig_financials (where purchase_id IS NOT NULL and gig_id matches) to purchases
- For each purchase header, fetch its items (children where parent_id = header.id)
- Return headers with nested items array

Update receipt scanning flow:
- When uploading a receipt from a gig page, create BOTH the purchases record AND a gig_financials record (type=Expense Incurred, purchase_id=new purchase id, amount=total_inv_amount)
- When uploading from global purchases page, create only the purchases record (no gig_financials)

Component: Rename GigPurchaseExpenses.tsx to GigPurchaseReceipts.tsx:
- Update all imports and references
- Show purchase headers with nested line items (not just headers)
- Each entry shows link to its gig_financials record
- Remove standalone totaling (the Financials section handles totals)
- Keep "Upload Receipt" button working with the dual-record creation

## Important Notes

- The fin_type enum has a typo: "Payment Recieved" (not Received). This is permanent — use the misspelled version in code.
- Existing test data can be wiped — no migration needed for existing records.
- All financial UI is Admin-only (preserve existing access control).
- Follow existing code patterns: use createClient(), handleApiError(), requireAuth() from existing service files.
- Follow existing component patterns: Shadcn/ui components, Tailwind CSS, Lucide icons.
```
