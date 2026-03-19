# Technical Detail: Gig Financial Management & Profitability

This document specifies the gig financial workflow, profitability tracking, and settlement process for GigManager. It focuses on **flat gigs** and the **single-org sound company** use case (the company is the vendor, managing its own books). Multi-tenant bid workflows and hierarchical rollups are noted as future extensions.

**Last Updated**: 2026-03-19

---

## 1. Core Architecture: The Single-Ledger Model

### 1.1 Principle

**`gig_financials` is the single source of truth for all gig financial data.** Every financial event — revenue, expense, staff labor cost — is recorded as a row in `gig_financials`. Profitability is calculated by querying this one table (plus uncompleted staff assignments for projected costs).

Other tables serve as **source documents** that feed into the ledger:

| Table | Role | Relationship to Ledger |
|-------|------|----------------------|
| `purchases` | Receipt/invoice archive | When a purchase is a gig expense, a `gig_financials` record is created with `purchase_id` pointing back |
| `gig_staff_assignments` | Staff scheduling + projected costs | When assignment is completed, a `gig_financials` record is created with `staff_assignment_id` pointing back |

This mirrors how `assets` already works: a purchase creates an asset record (the effect), and the asset links back to the purchase (the source document). The pattern is consistent: **source document → ledger entry → financial reporting**.

### 1.2 Schema Changes

**`gig_financials` — add two FK columns:**
```sql
ALTER TABLE gig_financials ADD COLUMN purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL;
ALTER TABLE gig_financials ADD COLUMN staff_assignment_id UUID REFERENCES gig_staff_assignments(id) ON DELETE SET NULL;
```

**`gig_staff_assignments` — add completion tracking:**
```sql
ALTER TABLE gig_staff_assignments ADD COLUMN completed_at TIMESTAMPTZ;
ALTER TABLE gig_staff_assignments ADD COLUMN units_completed NUMERIC(10,2);
```

**`purchases` — remove gig linkage (linkage now goes through `gig_financials`):**
```sql
ALTER TABLE purchases DROP COLUMN gig_id;
```

### 1.3 Financial Type Groupings

The `fin_type` enum has 24 values to support future multi-tenant workflows. For the single-org sound company, the UI groups types into practical categories:

**Revenue** (money coming in):
- `Contract Signed` — agreed fee for the gig
- `Deposit Received` — client deposit payment
- `Payment Recieved` — client payment (note: enum typo is permanent)

**Cost** (money going out):
- `Expense Incurred` — gig-related spending (rentals, travel, supplies, completed staff labor)
- `Payment Sent` — payment to freelancer or vendor

**Tracking** (informational):
- `Invoice Issued` — sent invoice to client
- `Invoice Settled` — invoice was paid

**Advanced** (bid/contract workflow — future use):
- All `Bid *`, `Contract *`, and `Sub-Contract *` types

The Add Financial Record modal shows common types prominently; the full list is accessible via an expander.

### 1.4 Profitability Calculation

```
CONTRACT AMOUNT  = SUM(gig_financials.amount) WHERE type IN (Contract Signed)
RECEIVED         = SUM(gig_financials.amount) WHERE type IN (Deposit Received, Payment Recieved)
OUTSTANDING REV  = CONTRACT AMOUNT - RECEIVED

ACTUAL COSTS     = SUM(gig_financials.amount) WHERE type IN (Expense Incurred, Payment Sent, Deposit Sent)
PROJECTED STAFF  = SUM(gig_staff_assignments.fee) WHERE completed_at IS NULL
                   AND status IN (Confirmed, Requested)
TOTAL COSTS      = ACTUAL COSTS + PROJECTED STAFF

PROFIT           = CONTRACT AMOUNT - TOTAL COSTS
MARGIN           = PROFIT / CONTRACT AMOUNT × 100
```

All settled/actual financials come from one table. Projected staff costs are the only read-time calculation from another table, and those go away as assignments are completed into ledger entries.

---

## 2. Data Boundaries

### 2.1 `gig_financials` vs. `purchases`

**`purchases`** is the receipt box — it stores invoices and receipts with line-item detail and file attachments. Created via AI receipt scanning or CSV import.

**`gig_financials`** is the ledger — it records the financial effect of that purchase as a gig expense.

**When a receipt is scanned on a gig page**, the system creates both:
1. A `purchases` record (header + items) — the archive
2. A `gig_financials` record (type = `Expense Incurred`, `purchase_id` → purchases.id) — the ledger entry

**When a receipt is scanned outside a gig context** (general business receipt), only the `purchases` record is created. No ledger entry.

**Capital asset purchases** (where items create `assets` records) do NOT create `gig_financials` entries. Asset purchases are inventory acquisitions, not gig expenses.

### 2.2 `gig_financials` vs. `gig_staff_assignments`

**`gig_staff_assignments`** holds the plan — who's working, what they'll be paid.

**`gig_financials`** holds the actuals — what you actually owe/paid.

**Lifecycle:**
1. Staff assigned with fee → shows as **projected cost** (from assignments table)
2. Assignment marked complete → `gig_financials` record created (type = `Expense Incurred`, category = `Labor`, `staff_assignment_id` link) → becomes **actual cost**
3. Freelancer paid → `Payment Sent` record added → cost is **settled**

For rate-based assignments, completion requires entering `units_completed`. The ledger amount = rate × units_completed.

---

## 3. User Workflow

### Step 1: Book the Gig
Create a gig or change status to Booked. No financial records yet.

### Step 2: Record the Contract
In the Financials section, add a record: type = `Contract Signed`, amount = the agreed fee. This establishes the expected revenue.

### Step 3: Record Deposits
When the client pays a deposit, add: type = `Deposit Received`, amount, paid_at = today. The Profitability Summary immediately reflects the received amount.

### Step 4: Assign Staff and Set Fees
In Staff Assignments, add slots and assign people. Set each person's fee or rate. These appear as projected costs in the Profitability Summary.

### Step 5: Add Expenses
Two paths:
- **Quick manual entry**: Add `Expense Incurred` in Financials — type, amount, category, description.
- **Receipt scanning**: Upload in Purchase Receipts section. System creates both the receipt archive and the ledger entry automatically.

### Step 6: Monitor Profitability
The Summary cards show: Contract Amount (received/outstanding), Total Costs (actual + projected staff), and Profit with margin. Updates in real-time as records are added.

### Step 7: Complete Staff (after gig)
When gig moves to Completed, finalize staff costs. Fee-based: bulk "Finalize All" for confirmed assignments. Rate-based: enter actual units per person. Each completion creates a ledger entry.

### Step 8: Receive Final Payment
Add `Payment Recieved` for the remaining balance.

### Step 9: Pay Freelancers
Add `Payment Sent` records for each person/vendor paid. Now the ledger shows both the expense and the payment.

### Step 10: Settle the Gig
Change gig status to `Settled`. All financial activity is complete.

---

## 4. UI Specifications

### 4.1 Profitability Summary (Three Cards)

Displayed at the top of the Financials section:

**Contract Card**: Contract Amount, Received, Outstanding. Green fully paid, amber partial, gray nothing.

**Total Costs Card**: Actual costs (from ledger), Projected staff (from uncompleted assignments). Neutral blue/gray.

**Profit Card**: Net profit and margin %. Green positive, red negative.

### 4.2 Financials Section (Redesigned)

1. Profitability Summary at top
2. Records grouped into "Revenue" and "Expenses" sections — both sourced from `gig_financials`
3. Each expense row shows a source indicator: Manual, Receipt (linked to purchase), Staff (linked to assignment)
4. Each row shows paid/unpaid status
5. A "Projected Staff" sub-section shows uncompleted assignments (not yet in ledger)
6. Simplified type picker in Add/Edit modal (common types first)
7. Default new record type = `Contract Signed`

### 4.3 Staff Assignments Section (Enhanced)

1. Existing UI unchanged for slot/assignment management
2. New: completion status per assignment (Done / Pending)
3. New: "Finalize All" button for bulk completion of confirmed fee-based assignments
4. New: footer showing total staff cost (Finalized vs. Projected)

### 4.4 Purchase Receipts Section (Fixed + Renamed)

Renamed from "Purchase Expenses" to "Purchase Receipts" to reflect its archive role.

1. Shows purchase headers with nested line items (not just headers)
2. Each entry links to its corresponding `gig_financials` record
3. No standalone totaling — financial totals are in the Financials section
4. "Upload Receipt" continues to work but now creates both purchase + gig_financials records

---

## 5. Implementation Plan

### Phase 1: Schema + Profitability Summary
- Database: Add `purchase_id`, `staff_assignment_id` to `gig_financials`; add `completed_at`, `units_completed` to `gig_staff_assignments`; drop `gig_id` from `purchases`
- Service: `getGigProfitabilitySummary()` querying gig_financials + uncompleted assignments
- Components: New `GigProfitabilitySummary.tsx`, integrate into `GigFinancialsSection`
- Test: Empty gig, contract-only, with costs, negative profit

### Phase 2: Grouped Records + Type Picker
- Constants: `FIN_TYPE_GROUPS` in `constants.ts`
- Components: Group records in `GigFinancialsSection`, simplify modal, show source/paid indicators
- Test: Existing records display, new defaults, all types accessible

### Phase 3: Staff Completion Flow
- Service: `completeStaffAssignment()`, `completeAllStaffAssignments()`
- Components: Completion UX in `GigStaffSlotsSection`, projected-staff section in Financials
- Test: Fee completion, rate completion with units, bulk finalize, projected→actual transition

### Phase 4: Purchase Receipts Display
- Service: `getGigPurchaseReceipts()` joining through gig_financials.purchase_id
- Components: Rename + rewrite `GigPurchaseExpenses` → `GigPurchaseReceipts`, show header/item tree
- Update receipt scanning to create dual records
- Test: Scanned receipt creates both records, items display correctly, link to financials works

---

## 6. Future Extensions

### 6.1 Hierarchical Financial Rollups (Sprint 4+)
When parent/child gig relationships are implemented, financials roll up via recursive CTE on `gig_financials.gig_id`.

### 6.2 Multi-Tenant Settlement Views (Sprint 4+)
Production view (all vendors), Act view (their contract + deductions).

### 6.3 Vendor Bid Management (Sprint 5+)
Formal bid workflow using the existing `Bid *` fin_type values.

### 6.4 Hours Tracking
Rate × hours with clock-in/clock-out for more accurate labor costing.

---

## 7. Verification Checklist

- [ ] Profitability summary correct for: empty gig, contract only, contract + costs, negative profit
- [ ] Staff completion creates gig_financials record with correct amount and staff_assignment_id link
- [ ] Rate-based completion: amount = rate × units_completed
- [ ] "Finalize All" completes only confirmed fee-based assignments
- [ ] Receipt scan from gig page creates both purchase and gig_financials records
- [ ] Receipt scan from global page creates only purchase (no gig_financials)
- [ ] Purchase receipts section shows items (not just headers) with link to financials
- [ ] No double-counting: each cost appears in gig_financials exactly once
- [ ] Projected staff costs disappear from projection as assignments are completed
- [ ] Paid/unpaid status visible on all expense and revenue records
- [ ] All 24 fin_type values still accessible via "All Types" expander
- [ ] Admin-only visibility preserved on Financials section
