# Product Requirements Document: Gig Financials Workflow (Comprehensive)

## 1. Purpose
The goal of this feature is to implement a robust, single-ledger financial management system for gigs. This system will provide production companies with clear visibility into gig profitability by consolidating all revenue, expenses, and labor costs into a single source of truth while maintaining traceability to source documents like receipts and staff assignments.

## 2. Core Architecture: The Single-Ledger Model
- **Single Source of Truth**: The `gig_financials` table is the authoritative ledger for ALL gig financial data. Profitability is calculated primarily from this table.
- **Source Documents**: `purchases` (receipt archive) and `gig_staff_assignments` (labor planning) feed into the ledger.
- **Two-Way Linking (Critical)**:
    - **Purchases**: `gig_financials.purchase_id` ↔ `purchases.id`. The `purchases` record also retains `gig_id` for tracking.
    - **Staff**: `gig_financials.staff_assignment_id` ↔ `gig_staff_assignments.id`. The assignment record also gains `gig_financial_id` back-link.

## 3. Functional Requirements

### Phase 1: Profitability Summary & Schema
- **Schema Updates**:
    - `gig_financials`: Add `purchase_id` (UUID FK), `staff_assignment_id` (UUID FK).
    - `gig_staff_assignments`: Add `completed_at` (TIMESTAMPTZ), `units_completed` (NUMERIC), `gig_financial_id` (UUID FK).
- **Profitability Calculation Logic**:
    - **Total Revenue**: `SUM(amount)` WHERE type IN (`Contract Signed`, `Bid Accepted`).
    - **Received Revenue**: `SUM(amount)` WHERE type IN (`Deposit Received`, `Payment Recieved`).
    - **Outstanding Revenue**: `Total Revenue` - `Received Revenue`.
    - **Actual Costs**: `SUM(amount)` WHERE type IN (`Expense Incurred`, `Payment Sent`, `Deposit Sent`).
    - **Projected Staff Costs**: `SUM(fee or rate*units)` WHERE `completed_at` IS NULL AND status IN (`Confirmed`, `Requested`).
    - **Total Costs**: `Actual Costs` + `Projected Staff Costs`.
    - **Profit**: `Total Revenue` - `Total Costs`.
    - **Margin**: `Profit` / `Total Revenue` * 100.
- **UI Summary Cards (Top of Financials Section)**:
    - **Contract Card**: Show total, received, and outstanding.
        - **Colors**: Green (fully paid), Amber (partial), Gray (nothing received).
    - **Total Costs Card**: Show actual + projected staff costs. Neutral blue/gray.
    - **Profit Card**: Show profit amount and margin %.
        - **Colors**: Green (positive), Red (negative).

### Phase 2: Grouped Records & Simplified Entry
- **Ledger Grouping**: Divide `GigFinancialsSection` into **Revenue** and **Expenses** sections based on `FIN_TYPE_GROUPS`.
- **Source Indicators**: Each row must display its source:
    - **Manual**: No purchase/staff link.
    - **Receipt**: Has `purchase_id` (links to original purchase for line items/attachments).
    - **Staff**: Has `staff_assignment_id`.
- **Payment Status**: Show paid/unpaid indicator on each row based on the `paid_at` field.
- **Add/Edit Modal Enhancements**:
    - **Prioritized Types**: Show common types prominently (`Contract Signed`, `Bid Accepted`, `Deposit Received`, `Payment Recieved`, `Expense Incurred`, `Payment Sent`).
    - **Expander**: "All Types" section for the remaining of the 24 `fin_type` values.
    - **Defaults**: New records default to `Contract Signed` (Type) and `Production` (Category).

### Phase 3: Staff Completion Flow
- **Individual Completion**: Add "Complete" button to assignments in `GigStaffSlotsSection`.
    - For fee-based: Sets `completed_at` and creates ledger entry.
    - For rate-based: Prompts for `units_completed` before creating ledger entry (Amount = `rate * units`).
- **Bulk Completion**: Add "Finalize All" button to complete all confirmed fee-based assignments in one action.
- **Ledger Integration**: Completion creates `gig_financials` record with type `Expense Incurred` and category `Labor`.
- **Staff Summary Footer**: Add footer to `GigStaffSlotsSection` showing "Total Staff Cost (Finalized: $X · Projected: $Y)".
- **Projected Sub-section**: In `GigFinancialsSection`, show a "Projected Staff" list below Expenses for uncompleted assignments with fees. These disappear from projections once completed into the ledger.

### Phase 4: Receipt Scanning & Integration
- **Unified Upload**: Add "Upload Receipt" button to `GigFinancialsSection` header.

- **Dual Record Creation (Gig Context)**: When scanning from a gig page:
    
    - Create `purchases` header
    
    - For each receipt line item:
    
        - Create a `purchases` record with `gig_id` set.
    
        - Create `gig_financials` record with `purchase_id` set and `amount = line_cost`. Also add the quantity and item_price to the notes. 
    
        - Expense categories should match the IRS Schedule C Part II categories as defined in supabase/functions/ai-scan/index.ts
            ```
            const EXPENSE_CATEGORY_HINTS = `
            EXPENSE categories (IRS Schedule C Part II — use for non-durable / consumable items):
            Advertising, Car and truck expenses, Commissions and fees, Contract labor,
            Depreciation, Insurance, Legal and professional services, Office expense,
            Rent or lease, Repairs and maintenance, Supplies, Taxes and licenses,
            Travel, Meals, Utilities, Wages, Other expenses
            `;
            ```
    
- **Global Context**: Scanning from general purchases (assets) page creates ONLY the `purchases` record (no `gig_financials` ledger entry).

- **Cleanup**: Remove the separate `GigPurchaseExpenses.tsx` component. All receipt-based expenses now live in the main ledger.

## 4. User Experience & Access Control
- **Role Restriction**: Financial UI remains strictly restricted to **Admin** and **Manager** roles.
- **Auto-Save**: Preserve existing auto-save patterns for all financial forms.
- **Attachments**: Support file attachments via `entity_attachments` for all `gig_financials` records.

## 5. Verification Checklist
- [ ] Schema: FKs and completion fields correctly implemented.
- [ ] Summary: Logic correctly handles empty states, negative profit, and partial payments.
- [ ] Two-Way Linking: Verify links exist from ledger → source and source → ledger.
- [ ] Staff Flow: Bulk finalize correctly skips unconfirmed assignments or assignments with no rate or fee.
- [ ] Receipt Flow: Scan from gig page creates linked records; scan from global does not.
- [ ] UI: Paid/unpaid indicators, source labels, and grouping match mockups.
- [ ] Access: Verify non-admins cannot see or access financial sections.
