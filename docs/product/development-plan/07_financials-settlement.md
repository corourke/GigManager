# Technical Detail: Gig Financial Management & Profitability

This document specifies the gig financial workflow, profitability tracking, and settlement process for GigManager. It focuses on **flat gigs** and the **single-org sound company** use case (the company is the vendor, managing its own books). Multi-tenant bid workflows and hierarchical rollups are noted as future extensions.

**Last Updated**: 2026-03-18

---

## 1. Core Concepts

### 1.1 Two Data Sources, One Financial Picture

GigManager has two tables that contribute to gig costs:

| Table | Purpose | Created By | Contains |
|-------|---------|------------|----------|
| `gig_financials` | The gig ledger — all financial events | Manual entry via Financials UI | Contracts, deposits, payments, manual expenses |
| `purchases` | The receipt box — invoices with line items | AI receipt scan or CSV import | Vendor invoices with item-level detail, attachments |

**The boundary rule**: Use `gig_financials` for quick manual entries (expenses, payments, contracts). Use `purchases` when you have a receipt or invoice to scan. Both contribute to the gig's profitability calculation, but data is never duplicated between them.

Additionally, **staff costs** are read from `gig_staff_assignments` (which stores rate/fee per person) and surfaced in the profitability view. They are not copied into `gig_financials`.

### 1.2 Financial Type Groupings

The `fin_type` enum has 24 values to support future multi-tenant workflows. For the single-org sound company, the UI groups types into practical categories:

**Revenue** (money coming in):
- `Contract Signed` — agreed fee for the gig
- `Deposit Received` — client deposit payment
- `Payment Recieved` — client payment (note: enum typo is permanent)

**Cost** (money going out):
- `Expense Incurred` — gig-related spending (rentals, travel, supplies)
- `Payment Sent` — payment to freelancer or vendor

**Tracking** (informational):
- `Invoice Issued` — sent invoice to client
- `Invoice Settled` — invoice was paid

**Advanced** (bid/contract workflow — future use):
- All `Bid *`, `Contract *`, and `Sub-Contract *` types

The Add Financial Record modal shows "Common" types prominently and the full list via an expandable section.

### 1.3 Profitability Calculation

```
CONTRACT AMOUNT  = SUM(gig_financials WHERE type IN (Contract Signed))
RECEIVED         = SUM(gig_financials WHERE type IN (Deposit Received, Payment Recieved))
OUTSTANDING REV  = CONTRACT AMOUNT - RECEIVED

STAFF COSTS      = SUM(gig_staff_assignments.fee) for Confirmed + Requested assignments
MANUAL EXPENSES  = SUM(gig_financials WHERE type IN (Expense Incurred, Payment Sent, Deposit Sent))
PURCHASE EXPENSES= SUM(purchases.total_inv_amount WHERE gig_id matches AND row_type='header'
                       AND NOT all child items are row_type='asset')
TOTAL COSTS      = STAFF COSTS + MANUAL EXPENSES + PURCHASE EXPENSES

PROFIT           = CONTRACT AMOUNT - TOTAL COSTS
MARGIN           = PROFIT / CONTRACT AMOUNT × 100
```

**Exclusions**: Capital asset purchases (where all line items are `row_type = 'asset'`) are NOT gig expenses. They are inventory acquisitions that happen to be linked to a gig for tracking purposes.

---

## 2. User Workflow

The following workflow describes the sound company's financial lifecycle for a gig, from booking through settlement.

### Step 1: Book the Gig
Create a gig or change status to Booked. No financial records yet.

### Step 2: Record the Contract
In the Financials section, add a record: type = `Contract Signed`, amount = the agreed fee, external_entity_name = client name. This establishes the expected revenue.

### Step 3: Record Deposits
When the client pays a deposit, add a record: type = `Deposit Received`, amount = deposit amount, paid_at = today. The Profitability Summary immediately reflects the received amount.

### Step 4: Assign Staff and Set Fees
In the Staff Assignments section, add slots and assign people. Set each person's fee (flat) or rate (hourly/daily). These costs automatically appear in the Profitability Summary under "Staff Costs."

### Step 5: Add Expenses
Two paths:
- **Quick manual entry**: In the Financials section, add a record: type = `Expense Incurred`, category = Equipment/Transportation/etc., amount, description. Use for simple expenses like "rented a sub for $200."
- **Receipt scanning**: In the Purchase Expenses section, upload a receipt image. The AI extracts vendor, date, items, and amounts. Review and confirm. The purchase is linked to the gig and counted in profitability.

### Step 6: Monitor Profitability
The Profitability Summary at the top of the Financials section shows three cards: Contract Amount (with received/outstanding), Total Costs (staff + expenses + purchases), and Projected Profit (with margin percentage). This updates in real-time as records are added.

### Step 7: Receive Final Payment
After the gig, add a record: type = `Payment Recieved`, amount = remaining balance, paid_at = today. The Outstanding Revenue drops to $0.

### Step 8: Settle the Gig
Change gig status to `Settled`. This signals that all financial activity is complete. The profitability number is now final.

---

## 3. UI Specifications

### 3.1 Profitability Summary (New Component)

Three cards displayed at the top of the Financials section:

**Contract Card**: Shows Contract Amount, Received, Outstanding. Green when fully paid, amber when partial, gray when nothing received.

**Total Costs Card**: Shows Staff (from assignments), Expenses (from gig_financials), Purchases (from purchases table). Neutral blue/gray.

**Profit Card**: Shows net Profit and margin percentage. Green when positive, red when negative.

### 3.2 Financials Section (Redesigned)

The existing `GigFinancialsSection` component is updated to:
1. Show the Profitability Summary at top
2. Group financial records into "Revenue" and "Expenses" sections
3. Show a read-only "Staff Costs" sub-section sourced from `gig_staff_assignments`
4. Show a read-only "Linked Purchases" sub-section sourced from `purchases`
5. Simplify the type picker in the Add/Edit modal (common types first)
6. Default new record type to `Contract Signed` instead of `Bid Submitted`

Visibility: Admin-only (unchanged).

### 3.3 Purchase Expenses Section (Fixed)

The existing `GigPurchaseExpenses` component is fixed to:
1. Show purchase headers with their line items nested underneath (not just headers)
2. Exclude headers where all items are `row_type = 'asset'` (capital purchases)
3. Show a total at the bottom
4. Keep the existing "Upload Receipt" functionality unchanged

### 3.4 Staff Assignments Section (Enhanced)

The existing `GigStaffSlotsSection` component is enhanced to:
1. Show a footer row with total staff cost
2. Break down total into "Confirmed" and "Pending" amounts

---

## 4. Implementation Plan

### Phase 1: Profitability Summary Card
- **Service**: New `getGigProfitabilitySummary()` function that queries gig_financials, gig_staff_assignments, and purchases
- **Component**: New `GigProfitabilitySummary.tsx` — three-card layout
- **Integration**: Rendered at top of `GigFinancialsSection`
- **Test**: Gig with no data, gig with only contract, gig with all cost types, negative profit scenario

### Phase 2: Grouped Records & Simplified Type Picker
- **Constants**: Add `FIN_TYPE_GROUPS` to `constants.ts` — maps types into revenue/cost/tracking/advanced
- **Component**: Update `GigFinancialsSection` to group records by direction, simplify modal
- **Test**: Existing records display correctly, new defaults work, all 24 types still accessible

### Phase 3: Staff Costs in Financials + Staff Section Total
- **Service**: New `getGigStaffCostSummary()` function
- **Components**: New `GigStaffCostsSummary.tsx` (read-only, in Financials), update `GigStaffSlotsSection` footer
- **Test**: Staff with fees, staff with rates, no staff, mixed confirmed/requested

### Phase 4: Fix Purchase Expenses Display
- **Service**: New `getGigPurchaseExpenseDetails()` that fetches headers with nested items
- **Component**: Update `GigPurchaseExpenses` to render header/item tree, exclude asset-only purchases
- **Test**: Multi-item purchases, asset-only exclusion, empty state

### Phase 5: Documentation
- Update this document and `requirements.md`

---

## 5. Future Extensions

### 5.1 Hierarchical Financial Rollups (Sprint 4+)

When parent/child gig relationships are implemented, financials roll up the tree:
- **Direct Financials**: Items on a specific gig
- **Inherited Rollup**: Sum of all child gig financials
- **Effective Total**: Direct + child rollups

SQL rollup function using recursive CTE:
```sql
CREATE OR REPLACE FUNCTION public.get_gig_financial_rollup(p_gig_id UUID, p_org_id UUID)
RETURNS TABLE (
    category public.fin_category,
    total_budget NUMERIC,
    total_actual NUMERIC,
    item_count INTEGER
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE hierarchy AS (
        SELECT id FROM public.gigs WHERE id = p_gig_id
        UNION ALL
        SELECT g.id FROM public.gigs g
        JOIN hierarchy h ON g.parent_gig_id = h.id
    )
    SELECT
        gf.category,
        SUM(CASE WHEN gf.type IN ('Bid Accepted', 'Contract Signed') THEN gf.amount ELSE 0 END) as total_budget,
        SUM(CASE WHEN gf.type IN ('Invoice Settled', 'Payment Sent', 'Payment Recieved') THEN gf.amount ELSE 0 END) as total_actual,
        COUNT(gf.id)::INTEGER as item_count
    FROM public.gig_financials gf
    JOIN hierarchy h ON gf.gig_id = h.id
    WHERE gf.organization_id = p_org_id
    GROUP BY gf.category;
END;
$$;
```

### 5.2 Multi-Tenant Settlement Views (Sprint 4+)

**Production View**: Total budget vs. actual, vendor rollup, per-stage/day breakdown.

**Act View**: Contract details, deductions/additions, net payout, signed documents.

### 5.3 Vendor Bid Management (Sprint 5+)

Formal bid request → submission → review → acceptance workflow. Requires a `gig_requirements` table and updates to `gig_financials` with a `requirement_id` FK.

### 5.4 Hours Tracking

Staff rate × hours for labor costing (currently only flat fees are practical since hours aren't tracked).

---

## 6. Verification Checklist

- [ ] Profitability summary shows correct numbers for a gig with contract + staff + expenses + purchases
- [ ] Staff costs from assignments match the summary
- [ ] Purchase expenses exclude asset-only purchases
- [ ] No double-counting between manual expenses and purchases
- [ ] Existing financial records display correctly in grouped view
- [ ] New record defaults are sensible for sound company workflow
- [ ] Admin-only visibility preserved
- [ ] Gig status transitions (Booked → Completed → Settled) work alongside financial tracking
