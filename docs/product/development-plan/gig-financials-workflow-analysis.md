# Gig Financials Workflow — Design & Implementation Plan

## Codebase Summary

After reading all specified files, here is what exists:

### Schema
- **`gig_financials`**: Tracks financial events per gig. Fields: `gig_id`, `organization_id`, `amount`, `date`, `type` (fin_type enum — 24 values), `category` (fin_category enum — 8 values), `counterparty_id`, `external_entity_name`, `currency`, `description`, `due_date`, `paid_at`, `reference_number`, `notes`.
- **`purchases`**: Header/item tree structure for invoices/receipts. Fields: `organization_id`, `gig_id` (nullable), `parent_id`, `row_type` (header/item/asset), `vendor`, `total_inv_amount`, `line_amount`, `line_cost`, `description`, `category`. Created via CSV import or AI receipt scanning.
- **`gig_staff_assignments`**: Has `rate` (numeric) and `fee` (numeric) columns. Status: Open/Requested/Confirmed/Declined.
- **`gig_staff_slots`**: Has `gig_id`, `staff_role_id`, `organization_id`, `required_count`.
- **`gigs`**: Status enum: DateHold, Proposed, Booked, Completed, Cancelled, Settled.

### UI Components
- **`GigFinancialsSection`**: Admin-only. Shows a flat table of financial records with Date, Type, Amount, Description. Add/Edit via modal with all fields. Defaults to `Bid Submitted` type and `Other` category. Auto-saves. No summary/totals.
- **`GigPurchaseExpenses`**: Admin-only. Queries `purchases` where `gig_id` matches AND `row_type = 'header'`. Shows headers (Date, Vendor, Description, Amount). Allows AI receipt upload. Shows attachments. **Problem confirmed**: it shows invoice headers, not line items.
- **`GigStaffSlotsSection`**: Shows role slots with assignments. Each assignment has user selector, status dropdown, compensation_type (rate/fee), and dollar amount. **Rate/fee IS captured in UI** but **never surfaces in any financial summary**.

### Constants
- `FIN_TYPE_CONFIG`: All 24 fin_type values with labels. Labels are just the enum value itself (no grouping, no icons, no color).
- `FIN_CATEGORY_CONFIG`: 8 categories: Labor, Equipment, Transportation, Venue, Production, Insurance, Rebillable, Other.

---

## Design Questions — Answers

### Q1: `gig_financials` vs. `purchases` — What's the right boundary?

**The rule:**

> **`gig_financials`** is the ledger — it records every financial event for a gig: what you'll be paid, what you owe, what you've spent. It's the single source of truth for gig profitability.
>
> **`purchases`** is the receipt box — it records invoices and receipts from vendors, with line-item detail, attachments, and links to assets. Purchases are created through AI scanning or CSV import.

**How they relate:**

When a purchase is linked to a gig (`gig_id` is set), the purchase's total amount should be surfaced as an expense in the gig's financial summary. But the purchase itself is not duplicated into `gig_financials` — that would create double-entry confusion. Instead, the profitability calculation queries both tables.

**Concrete scenarios:**
- "Rented a subwoofer for $200 for this gig" → The user adds this as a `gig_financials` record with type `Expense Incurred`, category `Equipment`. Quick and simple. No need to create a purchase record unless there's a receipt to attach.
- "I scanned a receipt from Bob's Audio for $200" → This creates a `purchases` record linked to the gig. It appears in the financial summary automatically because the purchase has a `gig_id`.
- "Bought a new mic for $150 and assigned it to this gig" → This is a capital purchase (asset acquisition), not a gig expense. It should NOT appear in gig profitability. Purchases with `row_type = 'asset'` that are linked to a gig are asset deployments, not expenses.

**The simple rule for users:** "If you want to quickly log a cost, add it in the Financials section. If you have a receipt or invoice to scan, upload it in Purchase Expenses and it'll be counted too."

### Q2: Should staff costs live in `gig_staff_assignments` or `gig_financials`?

**Answer: Staff costs should be read from `gig_staff_assignments` and surfaced in the profitability calculation — not duplicated into `gig_financials`.**

**Reasoning:**
- `gig_staff_assignments` already captures rate/fee per person, and the UI already supports entering these values. Creating duplicate `gig_financials` records would mean two places to update if a fee changes.
- The profitability view should compute staff costs by summing fees from confirmed (and optionally requested) assignments. This is a read-time calculation, not a write-time copy.
- If a freelancer is paid differently than their stated rate, the user can update the assignment's fee/rate directly. If they need to record an actual payment event (e.g., "Paid John $300 via Venmo"), they can add a `Payment Sent` record in `gig_financials` — but this is about tracking the payment, not defining the cost.

**What about unconfirmed staff?**
- The profitability view should show two numbers: "Committed Staff Costs" (Confirmed assignments only) and "Projected Staff Costs" (Confirmed + Requested). This gives the user visibility into best-case and worst-case labor costs.

### Q3: What's the right simplification of `fin_type` for a single-org sound company?

**Answer: Keep the existing enum values (they're in the database), but create a display-layer grouping that shows only the relevant types for the sound-company workflow.**

The 24-value enum covers multi-tenant bid/contract workflows that aren't built yet. For a sound company managing their own books, the practical types are:

**Revenue types (money coming IN):**
- `Contract Signed` — "We agreed to do this gig for $X" (the deal)
- `Deposit Received` — "Client paid us a deposit"
- `Payment Recieved` — "Client paid us" (note: typo in enum is permanent)

**Cost types (money going OUT):**
- `Expense Incurred` — "We spent money on this gig" (equipment rental, travel, misc)
- `Payment Sent` — "We paid someone" (freelancer, rental company, etc.)

**Tracking types (informational):**
- `Invoice Issued` — "We sent an invoice to the client"
- `Invoice Settled` — "Our invoice was paid"

**The implementation approach:**
- Add a `FIN_TYPE_GROUPS` constant that organizes types into "Revenue", "Cost", and "Tracking" groups.
- The Add Financial modal should show a simplified type picker that defaults to the common types. Advanced/bid/sub-contract types can be in a collapsible "More types" section.
- No schema change needed. No enum change needed.

### Q4: What should the "gig profitability" calculation include?

**Revenue** = Sum of `gig_financials` where type IN (`Contract Signed`, `Deposit Received`, `Payment Recieved`, `Bid Accepted`). These represent money the client has committed or paid.

But there's a nuance: `Contract Signed` is the committed amount, while `Deposit Received` and `Payment Recieved` are actual cash in. The summary should show both:
- **Contract Amount**: Sum of `Contract Signed` records (what you're owed)
- **Received**: Sum of `Deposit Received` + `Payment Recieved` records (what you've actually been paid)
- **Outstanding Revenue**: Contract Amount - Received

**Costs** = Staff costs + Manual expenses + Purchase expenses
- **Staff Costs**: Sum of `fee` (or `rate` × estimated hours, but hours aren't tracked yet, so fee is the practical field) from `gig_staff_assignments` where status IN (`Confirmed`, `Requested`)
- **Manual Expenses**: Sum of `gig_financials` where type IN (`Expense Incurred`, `Payment Sent`, `Deposit Sent`)
- **Purchase Expenses**: Sum of `purchases.total_inv_amount` where `gig_id` matches AND `row_type = 'header'` AND the purchase items are NOT all `row_type = 'asset'` (exclude pure asset purchases)

**Profit** = Contract Amount - Total Costs

**Outstanding Costs**: Expenses/payments where `paid_at` IS NULL but `due_date` is set.

---

## Workflow Design (Step 3)

### The Sound Company's Gig Financial Lifecycle

```
1. BOOK THE GIG
   User action: Creates a new gig (or updates from DateHold/Proposed to Booked)
   UI location: Gig creation form or gig detail page status dropdown
   Data recorded: Gig record with status = Booked, title, dates, venue, act

2. RECORD THE CONTRACT
   User action: Clicks "Add Financial Record" in the Financials section.
              Selects type "Contract Signed", enters the agreed fee.
              Optionally enters the client name in External Entity.
   UI location: Gig Detail → Financials section → Add modal
   Data recorded: gig_financials record: type=Contract Signed,
                  amount=contract fee, category=Production,
                  external_entity_name=client name

3. RECORD A DEPOSIT
   User action: When the client pays a deposit, adds a financial record.
              Selects type "Deposit Received", enters the deposit amount,
              sets paid_at to today.
   UI location: Gig Detail → Financials section → Add modal
   Data recorded: gig_financials record: type=Deposit Received,
                  amount=deposit, paid_at=today

4. ASSIGN STAFF AND SET FEES
   User action: Adds staff slots (Sound Engineer ×2, Stage Hand ×3).
              Assigns specific people to each slot.
              Sets each person's fee or rate.
   UI location: Gig Detail → Staff Assignments section
   Data recorded: gig_staff_slots + gig_staff_assignments with
                  fee or rate values

5. ADD EXPENSES (MANUAL)
   User action: Rented a sub from Bob's Audio for $200.
              Clicks "Add Financial Record", selects "Expense Incurred",
              category "Equipment", enters amount and description.
   UI location: Gig Detail → Financials section → Add modal
   Data recorded: gig_financials record: type=Expense Incurred,
                  category=Equipment, amount=200,
                  description="Sub rental from Bob's Audio"

6. ADD EXPENSES (RECEIPT SCAN)
   User action: Has a receipt for gas/tolls. Uploads it via
              "Upload Receipt" in Purchase Expenses section.
              Reviews the AI-extracted data, confirms, links to gig.
   UI location: Gig Detail → Purchase Expenses section → Upload
   Data recorded: purchases header + items with gig_id set

7. MONITOR PROFITABILITY
   User action: Glances at the Profitability Summary card at the top
              of the Financials section. Sees contract amount, total
              costs, projected profit. Sees what's been paid vs. owed.
   UI location: Gig Detail → Financials section → Summary card
   Data recorded: Nothing — this is a read-only calculation

8. RECEIVE FINAL PAYMENT
   User action: After the gig, records the final payment.
              Adds "Payment Received" record with the remaining amount.
   UI location: Gig Detail → Financials section → Add modal
   Data recorded: gig_financials record: type=Payment Recieved,
                  amount=remaining balance, paid_at=today

9. SETTLE THE GIG
   User action: Once all payments are collected and all costs paid,
              changes gig status to "Settled".
   UI location: Gig Detail → Status dropdown
   Data recorded: gigs.status = Settled
```

---

## UI Designs (Step 4)

### 4a. Gig Financials Section (Redesigned)

The current section is a flat table. The redesign adds a **Profitability Summary** at the top and groups records by type.

```
┌─────────────────────────────────────────────────────────────┐
│ 💰 Gig Financials                              [+ Add Record]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ CONTRACT      │  │ TOTAL COSTS  │  │ PROJECTED    │      │
│  │ $5,000.00     │  │ $2,450.00    │  │ PROFIT       │      │
│  │               │  │              │  │ $2,550.00    │      │
│  │ Received:     │  │ Staff: $1,500│  │              │      │
│  │ $2,000.00     │  │ Expenses:$750│  │ 51% margin   │      │
│  │ Outstanding:  │  │ Purchases:$200│ │              │      │
│  │ $3,000.00     │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  REVENUE                                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Date       │ Type             │ Amount   │ Desc      │   │
│  │ Jan 15     │ Contract Signed  │ $5,000   │ Sound pkg │   │
│  │ Jan 20     │ Deposit Received │ $2,000   │ 40% dep   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  EXPENSES                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Date       │ Type             │ Amount   │ Desc      │   │
│  │ Feb 01     │ Expense Incurred │ $200     │ Sub rental│   │
│  │ Feb 03     │ Expense Incurred │ $150     │ Cables    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  STAFF COSTS (from Staff Assignments — read-only here)       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Person          │ Role           │ Fee     │ Status  │   │
│  │ Mike Johnson    │ Sound Engineer │ $500    │Confirmed│   │
│  │ Sarah Lee       │ Sound Engineer │ $500    │Confirmed│   │
│  │ Chris Davis     │ Stage Hand     │ $250    │Requested│   │
│  │                 │                │ ──────  │         │   │
│  │                 │ TOTAL          │ $1,250* │         │   │
│  │ * $1,000 confirmed, $250 pending                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  LINKED PURCHASES                                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Date       │ Vendor      │ Items           │ Amount  │   │
│  │ Feb 02     │ Shell Gas   │ Gas, tolls      │ $85.00  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- The three summary cards at top are the hero — they answer "am I making money on this gig?"
- Records are grouped by direction: Revenue vs. Expenses
- Staff costs appear as a read-only summary pulled from `gig_staff_assignments` — not editable here
- Linked purchases show items (not headers) with vendor info
- The "+ Add Record" button opens the existing modal, but with a simplified type picker

### 4b. Staff Costs Integration

The existing `GigStaffSlotsSection` already captures rate/fee per assignment. No changes to its UI are needed.

**What changes:** The Financials section reads staff assignment data and displays a "Staff Costs" sub-section (read-only). This creates a clear link between "I assigned people and set their pay" and "here's what that costs me."

A small enhancement to `GigStaffSlotsSection`: add a subtle total at the bottom showing aggregate staff cost across all assignments.

```
Staff Assignments                                    [+ Add Slot]
┌─────────────────────────────────────────────────────────────┐
│ Sound Engineer  Required: 2                        [Notes][X]│
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Mike Johnson   │ Confirmed │ Fee │ $500.00  │[Notes]│    │
│  │ Sarah Lee      │ Confirmed │ Fee │ $500.00  │[Notes]│    │
│  └─────────────────────────────────────────────────────┘    │
│ Stage Hand  Required: 1                            [Notes][X]│
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Chris Davis    │ Requested │ Fee │ $250.00  │[Notes]│    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                        Total Staff Cost: $1,250.00           │
│                        (Confirmed: $1,000 · Pending: $250)   │
└─────────────────────────────────────────────────────────────┘
```

### 4c. Expense Entry (Fixing GigPurchaseExpenses)

**Problem:** Currently shows purchase headers. Should show purchase line items with their parent's vendor info.

**Fix approach:** Change the query to fetch items (not headers) where `parent_id` references a header with the matching `gig_id`. Or better: fetch headers, then expand to show their items inline.

**Additionally:** The section already has "Upload Receipt" for AI scanning. We do NOT need a separate manual purchase entry flow here — manual expenses go through the Financials section's "Add Record" button with type = `Expense Incurred`. This keeps the boundary clean: Financials for quick manual entries, Purchase Expenses for scanned receipts.

**Redesigned Purchase Expenses section:**

```
┌─────────────────────────────────────────────────────────────┐
│ 🧾 Purchase Expenses                       [Upload Receipt] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Shell Gas Station — Feb 02, 2026                    $85.00  │
│    ├─ Gas fill-up                              $65.00        │
│    └─ Toll charges                             $20.00        │
│                                                              │
│  Bob's Audio Rentals — Feb 01, 2026                 $200.00  │
│    └─ Subwoofer rental (1 day)                $200.00        │
│                                                              │
│  ─────────────────────────────────────────────               │
│  Total Purchase Expenses: $285.00                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4d. Gig Profitability Summary

This is the three-card summary shown at the top of the Financials section (see 4a above). Implementation details:

**Contract Card:**
- Contract Amount: Sum of `Contract Signed` amounts from `gig_financials`
- Received: Sum of `Deposit Received` + `Payment Recieved`
- Outstanding: Contract - Received
- Color: Green when fully paid, amber when partially paid, gray when nothing received

**Total Costs Card:**
- Staff: Sum of fees from `gig_staff_assignments` (Confirmed + Requested)
- Expenses: Sum of `Expense Incurred` + `Payment Sent` from `gig_financials`
- Purchases: Sum of `purchases.total_inv_amount` for non-asset headers linked to gig
- Color: Neutral (blue/gray)

**Profit Card:**
- Amount: Contract Amount - Total Costs
- Margin: (Profit / Contract Amount) × 100
- Color: Green when positive, red when negative

---

## Implementation Plan (Step 5)

### Phase 1: Profitability Summary Card (Highest Value, Smallest Change)

**Why first:** This is purely additive — a read-only calculation displayed on an existing page. No schema changes, no breaking changes. Immediately useful.

**Database changes:** None.

**Service layer changes:**
- New function `getGigProfitabilitySummary(gigId, organizationId)` in `gig.service.ts` that:
  1. Queries `gig_financials` for the gig, groups by type
  2. Queries `gig_staff_assignments` (via slots) for the gig to sum fees
  3. Queries `purchases` headers linked to the gig (excluding pure asset purchases)
  4. Returns `{ contractAmount, received, outstandingRevenue, staffCosts, manualExpenses, purchaseExpenses, totalCosts, profit, margin }`

**Component changes:**
- New component: `src/components/gig/GigProfitabilitySummary.tsx` — three-card layout
- Modified: `GigFinancialsSection.tsx` — render `GigProfitabilitySummary` at the top of the card, passing gigId and organizationId

**What to test:**
- Gig with no financials → shows $0 across all cards
- Gig with a contract and no costs → shows full profit
- Gig with staff assignments → staff costs reflected
- Gig with linked purchases → purchase costs reflected
- Gig with both manual expenses and purchases → no double counting

---

### Phase 2: Grouped Financial Records & Simplified Type Picker

**Why second:** Improves the existing Financials section without schema changes. Makes it usable for the sound-company workflow.

**Database changes:** None.

**Service layer changes:** None (data already loaded).

**Component changes:**
- Modified: `GigFinancialsSection.tsx`
  - Group records into "Revenue" and "Expenses" sections based on type
  - Add `FIN_TYPE_GROUPS` to `constants.ts`:
    ```ts
    export const FIN_TYPE_GROUPS = {
      revenue: ['Contract Signed', 'Deposit Received', 'Payment Recieved', 'Bid Accepted'],
      cost: ['Expense Incurred', 'Payment Sent', 'Deposit Sent'],
      tracking: ['Invoice Issued', 'Invoice Settled'],
      bid: ['Bid Submitted', 'Bid Accepted', 'Bid Rejected'],
      contract: ['Contract Submitted', 'Contract Revised', 'Contract Signed', 'Contract Rejected', 'Contract Cancelled', 'Contract Settled'],
      subcontract: ['Sub-Contract Submitted', 'Sub-Contract Revised', 'Sub-Contract Signed', 'Sub-Contract Rejected', 'Sub-Contract Cancelled', 'Sub-Contract Settled'],
    }
    ```
  - Simplify the type picker in the Add/Edit modal: show "Common" types (Contract Signed, Deposit Received, Payment Received, Expense Incurred, Payment Sent) prominently, with "All Types" as an expandable section
  - Default new record type to `Contract Signed` (instead of `Bid Submitted`)

**What to test:**
- Existing records display correctly in grouped view
- New records default to sensible types
- All 24 types still accessible via "All Types"
- Type grouping correctly classifies revenue vs. cost

---

### Phase 3: Staff Costs in Financials View + Staff Section Total

**Why third:** Connects staff assignments to financial visibility. No schema changes.

**Database changes:** None.

**Service layer changes:**
- New function `getGigStaffCostSummary(gigId, organizationId)` in `gig.service.ts`:
  - Queries staff slots → assignments for the gig
  - Returns array of `{ userName, role, fee, rate, status }` plus totals

**Component changes:**
- New component: `src/components/gig/GigStaffCostsSummary.tsx` — read-only table showing staff costs, rendered inside `GigFinancialsSection`
- Modified: `GigStaffSlotsSection.tsx` — add a footer row showing total staff cost (confirmed vs. pending)

**What to test:**
- Staff with fees → shows in financial summary
- Staff with rates but no hours → shows rate with note "hours TBD"
- No staff → section hidden or shows "No staff assigned"
- Mix of confirmed and requested → correct totals

---

### Phase 4: Fix Purchase Expenses Display

**Why fourth:** Fixes a known bug. Small, contained change.

**Database changes:** None.

**Service layer changes:**
- New function `getGigPurchaseExpenseDetails(gigId, organizationId)` in `purchase.service.ts`:
  - Fetches purchase headers linked to the gig
  - For each header, fetches its items (children where `parent_id` = header.id)
  - Returns headers with nested items
  - Excludes headers where all items are `row_type = 'asset'` (capital purchases, not expenses)

**Component changes:**
- Modified: `GigPurchaseExpenses.tsx`
  - Use the new service function
  - Render headers as collapsible groups with items nested underneath
  - Show item-level description and amount
  - Add a total at the bottom

**What to test:**
- Purchase with 3 items → shows header with 3 items nested
- Purchase with only asset items → excluded from display
- Purchase with mix of items and assets → shows only non-asset items
- No purchases → empty state unchanged

---

### Phase 5: Documentation Updates

Update `07_financials-settlement.md` and `requirements.md` as specified.

---

## Future Extensions (Not in Scope)

- **Hierarchical gig rollups**: Sum financials across parent/child gigs (Sprint 4+)
- **Multi-tenant bid workflow**: Vendor submits bid → producer accepts (requires the bid management architecture in doc 07)
- **Hours tracking**: Staff rate × hours for more accurate labor costing
- **Recurring expenses**: Templates for common gig expenses
- **Financial reports page**: Cross-gig profitability, outstanding payments across all gigs
