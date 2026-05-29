# PRD: Gig Accounting View (Financials Screen)

**Feature**: Gig Accounting sub-tab in the Financials screen  
**Status**: Draft  
**Date**: 2026-05-26

---

## 1. Overview

### Problem Statement

GigManager's Financials screen has a "Gig Accounting" tab that is currently a placeholder ("Coming Soon"). Users — primarily Admins — have no cross-gig financial visibility from the Financials screen. They must open each gig individually to see its profitability summary, making it impossible to:

- Quickly identify which completed gigs still need financial settlement
- See at a glance which upcoming gigs have outstanding deposits, contracts, or staff payments to manage
- Understand overall organizational financial health across the gig portfolio

### Goal

Provide a single, filterable financial accounting view that shows every gig's financial position — revenue, expenses by category, outstanding amounts, and profit — prioritized so the most actionable items (completed-but-unsettled gigs) appear first.

### Users

- **Primary**: Admins only (per existing access control: "View and edit gig financials" is Admin-only)
- **Not in scope**: Managers, Staff, Viewers — no changes to role permissions

---

## 2. Gig Display Priority and Grouping

The view is organized into three sections, rendered in this order:

### Section 1: Needs Attention — Completed (Not Settled)

Gigs with `status = Completed`. These have been worked but not yet financially closed. They are the highest-priority action items: revenue may be outstanding, staff payments may need to be sent, or the gig needs to be marked Settled.

### Section 2: Upcoming Gigs

Gigs with `status` in `[Booked, Proposed, DateHold]` that have a `start` date in the future. These show projected/expected financials so the user can track contract status and prepare for upcoming costs.

### Section 3: Past & Settled Gigs

Gigs with `status = Settled`, or gigs with status `Completed`/`Cancelled` whose `start` date is in the past and are fully resolved. Settled gigs are shown last as historical reference.

**Display decision**: Within each section, gigs are sorted by `start` date descending (most recent first).

---

## 3. Financial Data Per Gig

For each gig row/card, the following financial figures are displayed. These extend the existing `getGigProfitabilitySummary` service function logic with clearer expected vs. actual classification.

### Expected vs. Actual Framework

The view distinguishes between **expected** figures (what we anticipate) and **actual** figures (what has been realized). This distinction applies to both revenue and costs, and changes as the gig progresses through its lifecycle.

| Classification | Revenue side | Cost side |
|---------------|-------------|-----------|
| **Expected** | Contract Signed / Bid Accepted / Informal Terms | Sub-Contract Submitted, Sub-Contract Signed, unfinished staff assignments |
| **Actual** | Deposit Received, Payment Received | Expense Incurred, Payment Sent, Deposit Sent, Sub-Contract Settled, completed staff assignments (as Labor ledger entries) |

Staff costs and sub-contract costs both start as **expected** and become **actual** after the gig — when a staff assignment is marked completed (creating a Labor ledger entry) or when a sub-contract is marked Settled.

### Revenue

- **Expected Revenue**: The formal agreed amount — Contract Signed, falling back to Bid Accepted, then Informal Terms (priority order to prevent double-counting). Represents what the client has agreed to pay.
- **Actual Revenue Received**: Sum of Deposit Received + Payment Received records — money actually in hand.
- **Outstanding Revenue**: `max(0, expectedRevenue − actualReceived)` — client money still owed to the organization.

### Costs

- **Expected Costs**: Costs anticipated but not yet realized. Includes:
  - Sub-Contract Submitted amounts — vendor proposals sent but not yet signed (soft expectation)
  - Sub-Contract Signed amounts — committed vendor agreements where payment is obligated but not yet made
  - Unfinished staff assignments (Confirmed or Requested, not yet completed) — fees/rates per assignment

- **Actual Costs**: Costs already incurred and recorded in the ledger. Includes:
  - Expense Incurred ledger entries (direct expenses, miscellaneous, and completed staff Labor entries)
  - Payment Sent and Deposit Sent records
  - Sub-Contract Settled records — vendor has been paid

- **Total Costs**: `actualCosts + expectedCosts`

- **Payments to Make**: Money the organization has committed to pay but has not yet paid. Includes:
  - Completed staff Labor entries where `paid_at` is null (work done, payment pending)
  - Sub-Contract Signed records not yet Settled (committed to vendor, payment pending)

### Sub-Contract Cost Lifecycle

A sub-contract is a vendor agreement where the organization is the buyer, hiring an external company or contractor for the gig. Sub-contract records move through expected → actual as the gig progresses:

| `fin_type` value | Stage | Cost classification |
|-----------------|-------|---------------------|
| Sub-Contract Submitted | Proposal sent, not yet signed | **Expected** (soft — not committed) |
| Sub-Contract Signed | Agreement finalized; payment obligated | **Expected** (committed) + Payments to Make |
| Sub-Contract Settled | Vendor paid; obligation fulfilled | **Actual** (replaces Signed in cost total) |
| Sub-Contract Rejected / Cancelled | Did not proceed | Excluded from all cost calculations |

### Profit

- **Profit/Loss**: `expectedRevenue − totalCosts`
- **Margin**: `profit / expectedRevenue × 100` (shown as percentage)
- Before the gig, this reflects projected profitability. After the gig (when staff and sub-contracts are actual), it reflects realized profitability.

### Status Indicators

Each gig row shows its current gig status (Completed, Booked, etc.) and a payment health indicator:
- **All Clear**: No outstanding revenue, no unpaid expenses (ready to settle)
- **Revenue Outstanding**: Client owes money
- **Payments Due**: Organization owes money to staff/vendors
- **Both**: Revenue outstanding AND payments due

---

## 4. Summary Bar (Page-Level Totals)

At the top of the Gig Accounting view (above the sections), a summary bar shows aggregated totals across all visible (filtered) gigs:

| Metric | Description |
|--------|-------------|
| Total Expected Revenue | Sum of contractAmount across all visible gigs |
| Total Received | Sum of received across all visible gigs |
| Total Outstanding | Sum of outstandingRevenue (money still owed to org) |
| Total Costs | Sum of totalCosts across all visible gigs |
| Total Payments Due | Sum of payments org still needs to make |
| Net Profit | Sum of profit across all visible gigs |

The summary bar is visually prominent (cards or a horizontal metric strip) so the user can see the big picture without scrolling.

---

## 5. Filters and Controls

### Filter Options

| Filter | Description | Default |
|--------|-------------|---------|
| **Date Range** | Filter gigs by their start date | "All Time" (no filter) |
| **Status** | Multi-select: All, Completed, Booked, Proposed, DateHold, Settled, Cancelled | All except Cancelled |
| **Show Settled** | Toggle to include/exclude fully settled gigs | Excluded by default |
| **Gig Name Search** | Text search on gig name | Empty |
| **View Mode** | Table or Card view | Table |

### Default Behavior

On initial load, the view shows:
- All gigs **except** Cancelled (hidden by default to reduce noise)
- Settled gigs hidden by default (but easily toggled in)
- Grouped into the three priority sections

### Preset Filters ("Quick Filters")

Quick-filter chips above the table for common tasks:
- **Needs Attention**: Shows only Completed (not Settled) gigs
- **Upcoming**: Shows only Booked/Proposed/DateHold gigs
- **This Year**: Limits date range to current calendar year
- **Unsettled Revenue**: Shows gigs with `outstandingRevenue > 0`
- **Payments Due**: Shows gigs with unpaid expenses > 0

---

## 6. Layout and Visual Design

### Primary Layout: Table View

A dense, scannable table where each row is one gig. Columns:

| Column | Content |
|--------|---------|
| Gig | Name, date, status badge |
| Revenue | Contract amount (with "Received / Outstanding" sub-detail) |
| Expenses | Total costs (with "Actual / Projected Staff / Sub-Contracts" sub-detail) |
| Profit | Dollar amount + margin % with green/red color |
| Action | Link to gig detail (jump directly to financials section) |

Rows are grouped under collapsible section headers:
- "⚠ Needs Attention (N gigs)" — expanded by default, with amber/orange header
- "Upcoming (N gigs)" — expanded by default, with blue header
- "Past & Settled (N gigs)" — collapsed by default, with gray header

Clicking any gig row navigates to that gig's detail screen (to the Financials tab), consistent with existing navigation patterns.

### Expanded Row Detail (Optional)

Clicking a row expands an inline detail panel showing:
- Revenue breakdown (Contract Signed, Deposits, Payments Received, each as a line)
- Expense breakdown by category (Labor, Equipment, Transportation, etc.)
- Sub-contract status (vendor name, amount, status — Signed vs. Settled, with outstanding amounts highlighted)
- Staff payment status (who has been paid, who is still owed)
- Quick links: "View Receipt" for purchase-linked expenses

This avoids requiring navigation to the gig for a quick financial check.

### Card View (Alternative)

A card grid where each card is one gig, showing:
- Gig name + date in the header
- Three metric tiles: Revenue, Costs, Profit (reusing the `GigProfitabilitySummary` card style)
- Status badge and payment health indicator
- "View Gig" button

Card view is most useful for the "Needs Attention" section where gigs are few and each needs focused review.

---

## 7. Navigation and Integration

### Entry Point

The Gig Accounting tab is already in the tab list in `FinancialsScreen.tsx`. No navigation changes needed.

### Linking to Gig Detail

Each gig row/card has a direct link (via `onNavigateToGigDetail`) that opens the gig detail screen scrolled/tabbed to the Financials section. This is consistent with how the existing Purchases tab already links to gigs.

### Return Navigation

If arriving at the Gig Accounting tab from a gig detail page (e.g., "view all gig accounting"), the existing `returnGigId` / Back to Gig pattern is available (already in the FinancialsScreen component).

---

## 8. Empty States

| Condition | Message |
|-----------|---------|
| No gigs match filters | "No gigs match your current filters. Try adjusting the date range or status filters." |
| No gigs in organization | "No gigs found. Create your first gig to start tracking financials." with link to Gigs |
| No financials data for a gig | Row shows $0 / $0 / $0 with a "No financial records" note and a link to add them |

---

## 9. Performance Considerations

Loading all gig profitability summaries in one request is the performance-critical path. The current `getGigProfitabilitySummary` fetches per-gig. For the accounting view, this must be a bulk fetch to avoid N+1 queries.

**Assumption**: A new service function will be created to fetch financial summaries for all gigs in one or two queries (join `gig_financials` and `gig_staff_assignments` across all gig IDs in one pass). This function must extend the existing `getGigProfitabilitySummary` logic to also account for sub-contract records (Sub-Contract Signed and Sub-Contract Settled) in the cost calculations. This is a technical decision deferred to the Technical Specification step.

Pagination or lazy loading may be needed for organizations with large gig counts (50+), but an initial implementation can load all gigs with loading indicators.

---

## 10. Access Control

- **Admin only**: The Gig Accounting tab is only visible and accessible to users with the Admin role (consistent with existing `gig_financials` access control in the product requirements)
- **Non-admins**: The tab remains visible in the tab list but shows an access-denied message ("Financial data is restricted to Admins") rather than being hidden — consistent with progressive disclosure principles and user education
- **Assumption**: Existing role checks in `FinancialsScreen` will gate the content; the existing `userRole` prop is already passed to the component

---

## 11. Out of Scope (for this feature)

- Editing financial records from the Gig Accounting view (edit happens in the gig detail)
- Exporting gig accounting data to CSV/PDF (future enhancement)
- Multi-currency aggregation (all amounts treated as USD for now, consistent with existing system)
- Hierarchical gig financial rollups (future, per the roadmap)
- Invoice generation or payment processing integrations
- The Reporting tab (separate future feature)

---

## 12. Success Criteria

1. User can see all completed-but-unsettled gigs with their financial positions in a single view
2. User can quickly identify which gigs have outstanding revenue or unpaid expenses
3. User can navigate directly from a gig row to that gig's financials detail
4. Filtering works correctly: by date, by status, and via quick-filter presets
5. Summary bar accurately reflects the totals of visible gigs
6. The view loads within 3 seconds for organizations with up to 100 gigs
7. Admin-only access is enforced; non-admins see an appropriate message
