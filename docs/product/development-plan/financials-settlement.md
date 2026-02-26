# Technical Detail: Financials & Multi-Tenant Settlement

This document outlines the strategy for implementing hierarchical financial rollups, multi-tenant settlement views, and vendor bid management in GigManager.

## 1. Financial Rollup Algorithms

To support hierarchical gigs (e.g., a Festival parent with multiple Stage children), financials must roll up the tree to provide a holistic view of the event budget and actuals.

### 1.1 Rollup Logic
Financial items in the `gig_financials` table are associated with a specific `gig_id` and owned by an `organization_id`.

- **Direct Financials**: Items explicitly logged against a specific gig.
- **Inherited Rollup**: The sum of all financial items from all child gigs in the subtree.
- **Effective Total**: `Direct + Σ(Child Rollups)`.

### 1.2 Multi-Tenant Visibility Rules
Since GigManager is multi-tenant, visibility depends on the organization context:
- **Production Company (Owner/Producer)**: Sees all financial items they created across the hierarchy, plus "Accepted Bids" from vendors.
- **Vendor (Sound/Lighting/etc.)**: Sees only their own financial items (Bids, Expenses, Invoices) related to their participation.
- **Act (Band)**: Sees their specific contract/bid and any settlement items shared with them by the Producer.

### 1.3 SQL Rollup Function
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

---

## 2. Settlement Views

Settlement is the process of reconciling revenues and expenses to determine final payouts.

### 2.1 Production-Specific View (The "Master Settlement")
Designed for Producers/Production Managers to see the "Big Picture".
- **Top-Level Metrics**: Total Budget vs. Actual, Gross Margin, Total Vendor Spend.
- **Hierarchical Breakdown**: Ability to drill down into specific stages/days to see where costs were incurred.
- **Vendor Rollup**: List of all vendor bids/contracts and their payment status.

### 2.2 Act-Specific View (The "Band Settlement")
Designed for Bands/Agencies to handle their specific slice of the event.
- **Contract Details**: Guaranteed fee, percentage splits (if applicable).
- **Settlement Items**: Deductions (commissions, local tech, catering buy-backs) and additions (merch cuts).
- **Net Payout**: The final amount owed to the act.
- **Shared Documents**: Easy access to the signed contract and settlement sheet.

---

## 3. Vendor Bid Management Architecture

Currently, "bids" are just a status in the `gig_financials` table. We need a more formal workflow.

### 3.1 Bid Workflow
1.  **Request**: Producer creates a "Requested" financial item (or a new `bid_requests` table) for a specific `organization_type` (e.g., Sound).
2.  **Submission**: The Sound Company receives a notification, views the gig technical requirements, and submits a "Bid" (a `gig_financials` record of type `Bid Submitted`).
3.  **Review**: Producer reviews all submitted bids for that slot.
4.  **Acceptance**: Producer changes status to `Bid Accepted`. This automatically:
    - Sets other bids for the same requirement to `Bid Rejected`.
    - Updates the "Budget" rollup for the gig.
5.  **Contracting**: The accepted bid is promoted to a `Contract Submitted`.

### 3.2 Data Model Enhancements
To support this, we need to track "Requirements" that bids fulfill.

**Table: `public.gig_requirements`**
- `id` (UUID)
- `gig_id` (UUID)
- `category` (fin_category)
- `description` (TEXT)
- `estimated_budget` (NUMERIC)
- `assigned_organization_id` (UUID) - Set upon bid acceptance.

**Update `public.gig_financials`**:
- `requirement_id` (UUID) - Foreign key to `gig_requirements`.

---

## 4. Hierarchy-Aware Reporting

### 4.1 Reporting Structures
- **Global Event Report**: All stages, all vendors, all staff costs.
- **Departmental Report**: Audio costs across the entire festival hierarchy.
- **Vendor Statement**: All gigs a specific vendor is working on within a parent event, with consolidated billing.

---

## 5. Verification & Performance
- **Recursive Load**: Test rollups across 5 levels of nesting and 100+ child gigs.
- **Multi-Tenant Leakage**: Rigorous RLS testing to ensure Org A never sees Org B's internal cost notes or unaccepted bids.
- **Real-Time Updates**: Ensure that when a child gig expense is added, the parent's "Actuals" dashboard updates immediately via Supabase Realtime.
