# Gig Financials Implementation — Coding Prompt

Use this prompt with a coding agent to implement the gig financial management system.

---

## Prompt

```
Implement the gig financials workflow as specified in the project documentation. Work through four phases, making sure each phase is working before moving to the next.

Read these documents thoroughly before starting:
- docs/product/development-plan/gig-financials-workflow-analysis.md — the design analysis with UI mockups, implementation plan, and verification checklist
- docs/technical/gig-financials.md — technical reference with architecture, data boundaries, ER diagram, schema DDL
- docs/product/requirements.md — Section 7 (Expense Management & Gig Profitability) and the Financials sub-section under Core Features > Gig Management

Read these source files to understand the current implementation:
- supabase/dump/schema_dump.sql — current database schema (look at gig_financials, purchases, gig_staff_assignments, gig_staff_slots tables)
- src/services/gig.service.ts — gig service including financial CRUD
- src/services/purchase.service.ts — purchase service
- src/components/gig/GigFinancialsSection.tsx — current financials UI
- src/components/gig/GigPurchaseExpenses.tsx — current purchase expenses UI (will be removed — functionality moves to GigFinancialsSection)
- src/components/gig/GigStaffSlotsSection.tsx — staff assignments UI
- src/utils/supabase/types.tsx — TypeScript types
- src/utils/supabase/constants.ts — FIN_TYPE_CONFIG, FIN_CATEGORY_CONFIG

## Key Architecture: Single-Ledger Model with Two-Way Linking

gig_financials is the SINGLE SOURCE OF TRUTH for gig profitability. All financial events (revenue, expenses, staff labor) are rows in this table. Other tables are source documents with two-way links:
- purchases → receipt archive. Links: gig_financials.purchase_id → purchases.id, purchases.gig_id → gigs.id (keep gig_id on purchases for tracking).
- gig_staff_assignments → labor planning. Links: gig_financials.staff_assignment_id → gig_staff_assignments.id, gig_staff_assignments.gig_financial_id → gig_financials.id. Costs enter the ledger when assignments are marked complete.

This mirrors the existing purchases ↔ assets pattern. Two-way linking throughout: purchases ↔ assets, purchases ↔ gig_financials, gig_staff_assignments ↔ gig_financials.

## Phase 1: Schema Changes + Profitability Summary

Database (create a new migration file):
1. Add purchase_id (nullable UUID FK to purchases.id) to gig_financials
2. Add staff_assignment_id (nullable UUID FK to gig_staff_assignments.id) to gig_financials
3. Add completed_at (nullable timestamptz) to gig_staff_assignments
4. Add units_completed (nullable numeric(10,2)) to gig_staff_assignments
5. Add gig_financial_id (nullable UUID FK to gig_financials.id) to gig_staff_assignments
6. Keep gig_id on purchases (no change needed — it stays for tracking)
7. Update RLS policies if needed for the new columns
8. Update schema_dump.sql to reflect changes

Types: Update src/utils/supabase/types.tsx for the new columns.

Service: Add getGigProfitabilitySummary(gigId, organizationId) to gig.service.ts:
- Query gig_financials grouped by type to get revenue vs costs
- Revenue types: Contract Signed, Bid Accepted
- Cost types: Expense Incurred, Payment Sent, Deposit Sent
- Query uncompleted staff assignments (completed_at IS NULL) for projected staff costs
- Return: { contractAmount, received, outstandingRevenue, actualCosts, projectedStaffCosts, totalCosts, profit, margin }

Component: Create src/components/gig/GigProfitabilitySummary.tsx:
- Three cards: Contract (received/outstanding), Total Costs (actual + projected), Profit (with margin %)
- Green/amber/gray coloring for contract card based on payment status
- Green/red for profit card
- Render at top of GigFinancialsSection

## Phase 2: Grouped Records + Simplified Type Picker

Constants: Add FIN_TYPE_GROUPS to constants.ts:
- revenue: [Contract Signed, Bid Accepted, Deposit Received, Payment Recieved]
- cost: [Expense Incurred, Payment Sent, Deposit Sent]
- tracking: [Invoice Issued, Invoice Settled]
- (remaining types are "advanced")

Component updates to GigFinancialsSection.tsx:
- Group records into "Revenue" and "Expenses" sections based on FIN_TYPE_GROUPS
- Show paid/unpaid indicator on each row (based on paid_at field)
- Show source indicator: "Manual" (no purchase_id or staff_assignment_id), "Receipt" (has purchase_id), "Staff" (has staff_assignment_id)
- Simplify Add/Edit modal type picker: show common types (Contract Signed, Bid Accepted, Deposit Received, Payment Recieved, Expense Incurred, Payment Sent) at top, "All Types" expander for the rest
- Default new record type to Contract Signed instead of Bid Submitted
- Default category to Production instead of Other

## Phase 3: Staff Completion Flow

Service additions to gig.service.ts:
- completeStaffAssignment(assignmentId, unitsCompleted?): sets completed_at, creates gig_financials record (type=Expense Incurred, category=Labor, amount=fee or rate*units, staff_assignment_id=assignmentId), then sets gig_financial_id on the assignment back to the new record
- completeAllStaffAssignments(gigId, organizationId): bulk completion for all confirmed fee-based assignments that haven't been completed yet. Creates two-way links for each.

Component updates to GigStaffSlotsSection.tsx:
- Show completion status per assignment: "Done" (completed_at set) or "Pending"
- Add "Finalize All" button that calls completeAllStaffAssignments
- For rate-based uncompleted assignments, show a "Complete" button that prompts for units_completed
- Add footer row: Total Staff Cost with breakdown (Finalized: $X · Projected: $Y)

Component updates to GigFinancialsSection.tsx:
- Add a "Projected Staff" sub-section below the Expenses group showing uncompleted assignments with fees
- These are NOT gig_financials records — they're read from gig_staff_assignments where completed_at IS NULL

## Phase 4: Receipt Upload Integration + Cleanup

Update receipt scanning flow:
- When uploading a receipt from a gig page (via GigFinancialsSection), create BOTH the purchases record (with gig_id set) AND a gig_financials record (type=Expense Incurred, purchase_id=new purchase id, amount=total_inv_amount)
- When uploading from global purchases page, create only the purchases record (no gig_financials)

Component changes:
- Remove GigPurchaseExpenses.tsx entirely — receipt expenses now show in GigFinancialsSection as rows with "Receipt" source indicator
- Add "Upload Receipt" button to GigFinancialsSection header (triggers the existing AI receipt scan flow)
- Receipt-linked expense rows should link to the original purchase record for viewing line items and attachments
- Update all imports and references that pointed to GigPurchaseExpenses

## Important Notes

- The fin_type enum has a typo: "Payment Recieved" (not Received). This is permanent — use the misspelled version in code.
- "Bid Accepted" is an existing enum value — use it for informal/verbal agreements (alternative to Contract Signed).
- Existing test data can be wiped — no migration needed for existing records.
- All financial UI is Admin and manager only (preserve existing access control).
- gig_financials supports attachments via the existing entity_attachments system.
- Each gig_financials record has both a type (what happened) and a category (what it's for — Labor, Equipment, etc.).
- Follow existing code patterns: use createClient(), handleApiError(), requireAuth() from existing service files.
- Follow existing component patterns: Shadcn/ui components, Tailwind CSS, Lucide icons.
```
