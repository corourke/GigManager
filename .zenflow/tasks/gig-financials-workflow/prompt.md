# Task: Gig Financials Workflow Design & Implementation Plan

## Your Role

You are a product and technical architect. Your job is to deeply understand the current GigManager implementation, identify problems and gaps in the financial tracking workflow, and produce two deliverables:

1. **A workflow specification** — what the user experience should look like, including proposed UI screens/sections
2. **An implementation plan** — concrete database, backend, and frontend changes required

You must read the codebase before forming any opinions. Do not make assumptions about what exists or doesn't exist.

---

## Context: The Problem

GigManager needs a clear, practical financial workflow for a **sound/lighting company** being hired to do a gig. The primary user is an owner/operator managing their business — not an accountant. They need to track:

- What the gig will pay them (the contract amount)
- Deposits received and final payment
- Staff they need to hire for the gig and what they'll pay them
- Equipment rental costs and other out-of-pocket expenses
- Whether outstanding amounts have been paid
- The overall gig profit: revenue minus all costs

### Known Problems to Investigate

1. **Two expense systems, unclear boundary**: `gig_financials` can record expenses, and `purchases` can also be linked to a gig via `gig_id`. It's not clear when to use which, or how they relate for financial reporting.

2. **Staff costs not surfaced**: `gig_staff_assignments` has `rate` and `fee` columns, but these don't appear anywhere in the financial summary. Staff labor is a real gig cost.

3. **Purchase Expenses card is broken**: The `GigPurchaseExpenses` component on the gig detail page currently shows purchase *headers* (invoices) instead of purchase *items* (line items). This isn't useful — a user wants to see what was actually bought/spent.

4. **No manual expense entry into purchases**: Purchases are created only via CSV import or AI receipt scanning. There's no UI for manually logging a simple expense (e.g., "rented a subwoofer from Bob's Audio, $200").

5. **No profitability view**: There's no place that shows revenue vs. total costs vs. net profit for a gig.

6. **`fin_type` enum complexity**: The current enum (`Bid Submitted`, `Bid Accepted`, `Bid Rejected`, `Contract Submitted`...) is designed for a multi-tenant bid workflow that doesn't exist in the UI yet. For a single-org sound company, this is overengineered for their daily use.

---

## Step 1: Read the Codebase

Read the following files thoroughly before forming any recommendations. Understand what each does, what data it works with, and where the current gaps are.

### Schema
- `supabase/dump/schema_dump.sql`

### Services
- `src/services/gig.service.ts` — All gig-related DB operations, including `getGigFinancials`, `createGigFinancial`, `updateGigFinancials`, `deleteGigFinancial`
- `src/services/purchase.service.ts` — Purchase CRUD and the `PurchaseWithItems` type

### Components
- `src/components/gig/GigFinancialsSection.tsx` — The current financial UI on the gig detail page (admin-only). Understand what `fin_type` values it supports, how it renders, and what the form captures.
- `src/components/gig/GigPurchaseExpenses.tsx` — The "Purchase Expenses" card. Understand exactly what query it's running and why it shows headers instead of items.
- `src/components/gig/GigStaffSlotsSection.tsx` — The staff slots UI. Understand whether `rate`/`fee` fields are exposed in the UI.

### Types & Constants
- `src/utils/supabase/types.tsx` — All TypeScript types. Look at `GigFinancial`, `DbPurchase`, `PurchaseWithItems`, `GigStaffAssignment`, `GigStaffSlot`.
- `src/utils/supabase/constants.ts` — `FIN_TYPE_CONFIG`, `FIN_CATEGORY_CONFIG` and any related display configuration.

### Existing Product Documentation
- `docs/product/requirements.md` — Particularly the "Expense Management" and "Gig Financials" sections
- `docs/product/development-plan/07_financials-settlement.md` — Existing financial planning doc (currently a mix of flat-gig and hierarchy concerns)

---

## Step 2: Answer Key Design Questions

After reading the codebase, reason through and answer each of these explicitly before writing your recommendations.

### Q1: `gig_financials` vs. `purchases` — what's the right boundary?

The system has two tables that can track costs associated with a gig:
- `gig_financials`: Tracks financial *events* (bids, contracts, payments, expenses) with a `fin_type` enum, `category`, `counterparty_id`, `amount`, `due_date`, `paid_at`
- `purchases`: Tracks *receipts and invoices* from vendors, with a header/item structure, linked to assets and attachments

Consider:
- A sound company rents a subwoofer for $200. Does this go in `gig_financials` or `purchases`?
- A sound company buys a new mic for $150 and assigns it to this gig. It's a capital purchase, not an expense. Does it appear in gig financials at all?
- The AI receipt scanning creates `purchases` records. Should the financial summary include both?
- If both tables contribute to "gig expenses," how does the profitability calculation work?

Propose a clear, simple rule that a non-technical user could understand.

### Q2: Should staff costs live in `gig_staff_assignments` or `gig_financials`?

`gig_staff_assignments` already has `rate` (hourly/daily rate) and `fee` (flat fee). But these aren't part of any financial summary.

Consider:
- If a sound engineer is assigned with a `fee` of $250, should that automatically appear as a Labor expense in the financial summary?
- Or should the user manually create a `gig_financials` record for it?
- What happens if the same person is assigned but the fee hasn't been confirmed yet?
- What if a freelancer is paid differently than their stated rate?

Propose which approach to use, and why.

### Q3: What's the right simplification of `fin_type` for a single-org sound company?

The current `fin_type` enum has 24 values covering a full multi-tenant bid/contract/sub-contract workflow. For a sound company being hired, the practical transaction types are simpler.

Consider what a real user actually needs to log:
- They agreed to do the gig for X dollars (the contract)
- They received a deposit
- They received the final payment
- They paid a freelancer
- They rented some equipment
- They had a travel expense

Does the current enum cover this well? Are the values intuitive? Should we add a simpler "mode" or display layer, or do we need to add/rename enum values? (Note: adding new enum values to PostgreSQL is safe; removing or renaming existing ones requires a migration and data update.)

### Q4: What should the "gig profitability" calculation include?

Define precisely: what is "revenue," what is "cost," and what is "profit" for a gig?

Consider:
- Revenue: payments received? contract amounts? both?
- Costs: staff fees, equipment rentals, travel, other out-of-pocket expenses
- Does it include purchase expenses from the `purchases` table?
- Does it include asset purchases (buying gear for the gig)? Probably not — those are capital expenses, not gig costs.
- How do you handle costs that are committed (staff assigned, contract signed) but not yet paid?

---

## Step 3: Design the Workflow

Write a complete workflow from the sound company's point of view, starting from "I just booked a gig" through "the gig is done and I've been paid."

For each step, describe:
- What the user does
- Where in the UI they do it (which screen/section)
- What data gets recorded

Use this narrative structure:

```
1. BOOK THE GIG
   User action: ...
   UI location: ...
   Data recorded: ...

2. RECORD THE CONTRACT
   User action: ...
   UI location: ...
   Data recorded: ...

[etc.]
```

The workflow should cover at minimum:
- Recording the agreed fee (contract amount)
- Recording a deposit received
- Assigning staff and recording what they'll be paid
- Adding equipment rental or other expenses
- Recording the final payment
- Viewing the running profit/loss as the gig approaches
- Marking the gig as financially settled

---

## Step 4: Design the UI

For each screen or section that needs to change or be created, describe what it looks like and how it works. Use ASCII mockups where helpful. Be specific about:

- What information is displayed
- What actions the user can take
- How the data is grouped or summarized
- What's shown to Admin vs. other roles

### Sections to Design

#### 4a. Gig Financials Section (on Gig Detail page)
This section currently exists (`GigFinancialsSection.tsx`). Propose what it should look like after your changes. Should it show revenue, costs, and profit summary at the top? How should individual records be grouped?

#### 4b. Staff Costs (integration with Staff Slots section)
Should staff rates/fees be visible in or near the Staff Slots section? Or should they feed directly into the financials section? Design this integration.

#### 4c. Expense Entry (replacing/fixing GigPurchaseExpenses)
Propose a simple way to manually log a gig expense. This could be a new "Add Expense" flow, a repurposed section, or an integration with the existing purchase system. Be explicit about which table(s) the data goes into.

#### 4d. Gig Profitability Summary
Design a summary card or section that shows:
- Total Revenue (committed and received)
- Total Costs (staff + expenses)
- Net Profit / Loss
- Outstanding amounts (unpaid to you, unpaid by you)

---

## Step 5: Write the Implementation Plan

Produce a concrete, phased implementation plan. For each phase:

1. **Database changes** (new tables, new columns, new migrations, enum changes, new RLS policies, new SQL functions)
2. **Service layer changes** (new or modified functions in `*.service.ts` files)
3. **Component changes** (new or modified React components, with file paths)
4. **What to test** (specific scenarios to verify)

Phases should be ordered so each is independently shippable and testable. The first phase should be the smallest possible change that delivers real user value.

---

## Step 6: Update the Documentation

After completing your analysis and design, update the following documentation files:

### `docs/product/development-plan/07_financials-settlement.md`
Rewrite this document to reflect your workflow design and implementation plan. Remove hierarchy-specific content (that belongs in docs 05 and 06). This doc should now be a clear, practical spec for gig financial management — focused on flat gigs, a sound company's workflow, and the profitability view. Keep the hierarchical rollup section but clearly mark it as a future extension (Sprint 4+).

### `docs/product/requirements.md`
Update the "Expense Management" section (Section 7 under Major Functionality Enhancements) and any other financial requirements sections to reflect the agreed-upon workflow and data boundaries between `gig_financials` and `purchases`.

---

## Constraints and Guardrails

- **Don't over-engineer**: The goal is production testing with one real organization. Prioritize simple, working flows over comprehensive but unbuilt ones.
- **Focus on workflow and user-experience**: look first at how the existing table structures can be better leveraged in the UI provide a logical workflow, and only look to schema changes if the schema is holding up progress on the user experience. 
- **Backward compatibility**: The `gig_financials` table has existing data. Any schema changes must migrate existing records safely.
- **Hierarchy is out of scope**: Do not design for hierarchical gigs. Design for flat gigs only. Note where hierarchy will extend things later, but don't let it complicate the immediate design.
- **The multi-tenant bid workflow** (vendor submits bid → producer accepts) is also out of scope for now. The sound company IS the vendor; they're managing their own books.
- **Keep the `purchases` table for what it's good at**: AI receipt scanning and CSV import create purchases. Don't eliminate this — just clarify when manual entry goes here vs. `gig_financials`.

---

## Deliverables Summary

When done, you should have produced or updated:

1. Answers to the 4 design questions (inline in your reasoning)
2. A written workflow (Step 3)
3. UI designs/mockups for the 4 sections (Step 4)
4. A phased implementation plan (Step 5)
5. Updated `docs/product/development-plan/07_financials-settlement.md`
6. Updated relevant sections of `docs/product/requirements.md`
