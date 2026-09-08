# Gig Accounting — Manual Testing & Verification Checklist

**Feature**: Gig Accounting sub-tab in the Financials screen  
**Spec**: `.zenflow/tasks/in-the-full-web-version-of-the-a-4bb1/spec.md`  
**PRD**: `.zenflow/tasks/in-the-full-web-version-of-the-a-4bb1/requirements.md`

---

## Prerequisites

Before running these tests, ensure the test account has:
- An organization with gigs in **all statuses**: Booked, Proposed, DateHold, Completed, Settled, Cancelled
- At least one **Completed** gig that has financial records (Contract Signed / Bid Accepted, Deposits, Payments, Staff assignments in various states, at least one Sub-Contract record)
- At least one **Upcoming** gig (future start date, status Booked/Proposed/DateHold) with a financial record
- At least one **Settled** gig with full financial history
- A second user account with a **non-Admin role** (Manager or Staff) to verify access control

---

## 1. Access Control

- [ ] Logging in as an **Admin** shows the Gig Accounting tab content (data loads, not blocked)
- [ ] Logging in as a **Manager** shows an access-denied alert: "Financial data is restricted to Admins."
- [ ] Logging in as a **Staff** member shows the same access-denied alert
- [ ] The "Gig Accounting" tab label is **visible** in the Financials tab list for all roles (tab itself is not hidden)
- [ ] The access-denied alert does not show a spinner or skeleton loader — it renders immediately

---

## 2. Navigation & Entry Point

- [ ] Navigating to **Financials → Gig Accounting** loads the view without a full-page error
- [ ] The tab is active/highlighted when selected
- [ ] Navigating away (e.g., to Purchases tab) and back restores the Gig Accounting view correctly
- [ ] The browser back button correctly returns to the previous screen
- [ ] Clicking a gig row or "View Gig" button navigates to the gig's detail screen
- [ ] After navigating to gig detail, clicking "Back" returns to the Financials screen (not the gig list)

---

## 3. Initial Load & Loading States

- [ ] A loading spinner or skeleton cards appear while data is being fetched
- [ ] The loading state does not persist indefinitely (resolves within ~3 seconds on normal connection)
- [ ] If the organization has **no gigs**, the empty state message is shown: "No gigs found. Create your first gig to start tracking financials."
- [ ] An API error (e.g., simulated by going offline then loading) shows an error alert with a descriptive message rather than a blank screen

---

## 4. Section Grouping & Display

### 4.1 Needs Attention (Completed, Not Settled)

- [ ] All gigs with `status = Completed` appear in the "Needs Attention" section
- [ ] The section header is styled in **amber/orange** to draw visual attention
- [ ] The section is **expanded by default**
- [ ] The section header shows the gig count, e.g., "Needs Attention (3 gigs)"
- [ ] Settled gigs do **not** appear in this section
- [ ] Clicking the section header collapses and re-expands it correctly

### 4.2 Upcoming

- [ ] All gigs with `status` in `[Booked, Proposed, DateHold]` and a **future** start date appear in "Upcoming"
- [ ] The section header is styled in **blue**
- [ ] The section is **expanded by default**
- [ ] Gigs with a Booked status and a **past** start date do **not** appear in Upcoming (they fall into Past & Settled)
- [ ] The section header shows the correct gig count

### 4.3 Past & Settled

- [ ] Settled gigs appear in "Past & Settled"
- [ ] Gigs with status Completed or Cancelled whose start date is in the past appear here (if not in Needs Attention)
- [ ] The section header is styled in **gray**
- [ ] The section is **collapsed by default**
- [ ] Expanding the section correctly reveals the gig rows
- [ ] The section header shows the correct gig count

### 4.4 Sort Order

- [ ] Within each section, gigs are sorted by **start date descending** (most recent first)
- [ ] A gig starting next week appears above a gig starting next month in Upcoming
- [ ] A gig that ended last month appears above one that ended last year in Past & Settled

---

## 5. Summary Bar

- [ ] Six metric cards appear at the top of the page above the filter controls
- [ ] **Total Expected Revenue**: matches the sum of `contractAmount` for all visible gigs
- [ ] **Total Received**: matches the sum of all Deposit Received + Payment Received records across visible gigs
- [ ] **Total Outstanding**: matches `max(0, totalRevenue − totalReceived)` across visible gigs; card turns **amber** if > $0, **green** if $0
- [ ] **Total Costs**: matches the sum of `totalCosts` (actual + expected staff + expected sub-contract) across visible gigs
- [ ] **Total Payments Due**: matches unpaid staff labor + Sub-Contract Signed (unsettled) across visible gigs; card turns **red** if > $0, **green** if $0
- [ ] **Net Profit**: matches `sum(contractAmount) − sum(totalCosts)`; card is **green** if ≥ 0, **red** if negative
- [ ] All values are formatted as USD currency (e.g., `$1,250.00`, not `1250`)
- [ ] Summary bar **updates immediately** when filters are changed (numbers reflect only visible gigs)
- [ ] With **no gigs visible** (all filtered out), summary bar shows all $0.00

---

## 6. Financial Calculations per Gig

Use a known test gig with specific financial records to verify the following. Create a gig with:
- A **Contract Signed** record for $5,000
- A **Deposit Received** for $1,500
- A **Payment Received** for $1,000
- An **Expense Incurred** for $300
- A **Sub-Contract Signed** for $800 (not Settled)
- A staff assignment with fee $500 (Confirmed, not yet completed)
- A staff assignment with fee $200 (Completed, `paid_at IS NULL` — i.e., work done but payment pending)

Expected values:

| Metric | Expected Value | Basis |
|--------|---------------|-------|
| Contract Amount | $5,000 | Contract Signed |
| Received | $2,500 | $1,500 + $1,000 |
| Outstanding Revenue | $2,500 | $5,000 − $2,500 |
| Actual Costs | $300 | Expense Incurred only |
| Expected Staff Costs | $500 | Confirmed assignment (unfinished) |
| Expected Sub-Contract Costs | $800 | Sub-Contract Signed |
| Total Costs | $1,600 | $300 + $500 + $800 |
| Payments to Make | $1,000 | $800 (Sub-Contract Signed) + $200 (completed, unpaid staff) |
| Profit | $3,400 | $5,000 − $1,600 |
| Margin | 68% | $3,400 / $5,000 |

Verify:
- [ ] Contract Amount row shows $5,000
- [ ] Revenue "Received" sub-detail shows $2,500 received
- [ ] Revenue "Outstanding" sub-detail shows $2,500 outstanding
- [ ] Costs row shows $1,600 total
- [ ] Costs sub-detail shows "Actual: $300 / Staff: $500 / Sub: $800"
- [ ] Profit shows $3,400 with a green color indicator
- [ ] Margin shows 68%

### Contract Amount Priority

- [ ] If a gig has **only** a Bid Accepted record (no Contract Signed), the contract amount uses the Bid Accepted amount
- [ ] If a gig has **only** an Informal Terms record, it uses that amount
- [ ] If a gig has both Contract Signed **and** Bid Accepted, only the Contract Signed amount is used (no double-counting)
- [ ] If a gig has both Bid Accepted **and** Informal Terms (but no Contract Signed), only Bid Accepted is used

### Sub-Contract Lifecycle

- [ ] A **Sub-Contract Submitted** record appears in expected costs but NOT in payments to make
- [ ] A **Sub-Contract Signed** record appears in expected costs AND in payments to make
- [ ] A **Sub-Contract Settled** record appears in actual costs and is **removed** from payments to make
- [ ] A **Sub-Contract Rejected** or **Cancelled** record is **excluded** from all cost figures

---

## 7. Payment Health Indicator

For each gig row:

- [ ] **All Clear** (✓ green check icon): shown when `outstandingRevenue = 0` AND `paymentsToMake = 0`
- [ ] **Revenue Outstanding** (amber alert icon): shown when `outstandingRevenue > 0` AND `paymentsToMake = 0`
- [ ] **Payments Due** (credit card icon): shown when `outstandingRevenue = 0` AND `paymentsToMake > 0`
- [ ] **Both** (red triangle icon): shown when both `outstandingRevenue > 0` AND `paymentsToMake > 0`
- [ ] A gig with a fully received contract and all sub-contracts settled shows All Clear
- [ ] Icons are visually distinct and color-coded appropriately (green, amber, orange/credit-card, red)

---

## 8. Table View

- [ ] Table renders with columns: Gig, Revenue, Costs, Profit, Health, expand (→)
- [ ] **Gig column**: shows gig name in bold, formatted date range below, status badge
- [ ] **Revenue column**: shows `contractAmount` prominently; "Rcvd: $X / Due: $Y" sub-detail in smaller text
- [ ] **Costs column**: shows `totalCosts` prominently; "Actual: $X / Staff: $Y / Sub: $Z" sub-detail
- [ ] **Profit column**: shows dollar amount; a margin % pill next to it is **green** for positive, **red** for negative
- [ ] **Health column**: shows the correct payment health icon (see section 7)
- [ ] **Expand column (→)**: clicking the chevron expands the row detail panel (see section 10)
- [ ] Clicking a row (anywhere except the expand chevron) navigates to the gig detail screen
- [ ] A section with **no gigs** shows a subtle "No gigs" empty-state row spanning all columns
- [ ] Table scrolls horizontally on narrow screens without breaking layout

---

## 9. Card View

- [ ] Clicking the **grid/card icon** in the view mode toggle switches to card view
- [ ] Clicking the **table icon** switches back to table view
- [ ] The active view mode toggle button is visually highlighted
- [ ] Cards render in a responsive grid: 1 column on mobile, 2 on tablet, 3 on desktop
- [ ] Each card shows:
  - [ ] Gig name (bold) and date range in the header
  - [ ] Status badge
  - [ ] Payment health indicator icon (top-right corner of card)
  - [ ] Three metric tiles: Revenue, Costs, Profit
  - [ ] Sub-detail row: "Rcvd $X | Due $Y | Pay $Z" in small text
  - [ ] A "View Gig" button at the bottom that navigates to the gig detail
- [ ] Section headers (Needs Attention, Upcoming, Past & Settled) appear above each card group
- [ ] Cards for each section only contain the appropriate gigs (no cross-section contamination)
- [ ] Empty sections show a subtle empty state message (no crash)

---

## 10. Expanded Row Detail Panel

- [ ] Clicking the **expand chevron (→)** on a table row opens an inline detail panel below the row
- [ ] A **loading spinner** is shown while the detail data is fetched
- [ ] The panel does **not** fetch data until the row is first expanded (lazy loading)
- [ ] Expanding a second row collapses any previously open row, OR multiple rows can be open simultaneously (verify the actual behavior is consistent)
- [ ] Clicking the chevron again collapses the detail panel

The panel shows:
- [ ] **Revenue breakdown**: each line item (Contract Signed, Deposits Received, Payments Received) with amounts
- [ ] **Expense breakdown**: organized by category (Labor, Sub-Contracts, direct expenses)
- [ ] **Sub-contract status**: vendor/counterparty name, amount, current status (Signed vs. Settled), outstanding amount highlighted if unpaid
- [ ] **"View Gig Financials" button**: navigates to the gig's detail screen (financials tab)
- [ ] A gig with no financial records shows a "No financial records" state in the panel (not a crash or blank)

---

## 11. Filters

### Search

- [ ] Typing in the search field filters gigs by name in real time (no submit button needed)
- [ ] Search is **case-insensitive** (searching "jazz" finds "Jazz Festival 2026")
- [ ] Clearing the search field restores all gigs
- [ ] The summary bar updates to reflect only the matching gigs

### Status Filter

- [ ] Default state: Completed, Booked, Proposed, DateHold are selected; Cancelled and Settled are excluded
- [ ] Selecting "Cancelled" adds cancelled gigs to the view
- [ ] Deselecting "Completed" removes completed gigs from the view
- [ ] Selecting all statuses shows all gigs including Cancelled and Settled
- [ ] Deselecting all statuses shows an empty state (no gigs visible)

### Show Settled Toggle

- [ ] Default: Settled gigs are hidden
- [ ] Enabling "Show Settled" adds Settled gigs to the view (they appear in Past & Settled section)
- [ ] Disabling "Show Settled" again hides them
- [ ] The "Show Settled" toggle correctly interacts with the status filter (both independently control visibility)

### Date Range

- [ ] Setting a **From** date hides gigs whose start is before that date
- [ ] Setting a **To** date hides gigs whose start is after that date
- [ ] Setting both From and To filters to the same date shows only gigs starting on that date
- [ ] Clearing the date fields restores all gigs

### Clear Filters

- [ ] A "Clear Filters" button appears **only** when any non-default filter is active (search text, date range, status change, etc.)
- [ ] Clicking "Clear Filters" resets all filters to their defaults: status = [Completed, Booked, Proposed, DateHold], showSettled = false, date range cleared, search cleared
- [ ] After clearing, the active quick filter chip is also deselected

---

## 12. Quick Filter Chips

- [ ] Five chips appear below the main filter controls: "Needs Attention", "Upcoming", "This Year", "Unsettled Revenue", "Payments Due"
- [ ] The **active chip** is filled/primary styled; inactive chips use outline styling
- [ ] Only **one chip** can be active at a time (selecting a second chip deactivates the first)
- [ ] Clicking an **active chip** deactivates it and restores previous filters

| Chip | Verified Behavior |
|------|------------------|
| **Needs Attention** | - [ ] Shows only Completed gigs (statusFilters = ['Completed'], showSettled = false) |
| **Upcoming** | - [ ] Shows only Booked/Proposed/DateHold gigs |
| **This Year** | - [ ] Sets dateFrom = Jan 1 of current year, dateTo = Dec 31; all statuses remain |
| **Unsettled Revenue** | - [ ] Further filters to show only gigs where outstandingRevenue > 0 |
| **Payments Due** | - [ ] Further filters to show only gigs where paymentsToMake > 0 |

- [ ] After applying a quick filter, editing the main filters (e.g., adding a search term) keeps the quick filter active and applies both constraints
- [ ] The summary bar reflects only the gigs visible after applying quick filter + any additional filters

---

## 13. Empty States

| Condition | Expected Behavior |
|-----------|------------------|
| No gigs in org | - [ ] Shows "No gigs found. Create your first gig to start tracking financials." with a link/button to the Gigs screen |
| Filters result in no matches | - [ ] Shows "No gigs match your current filters. Try adjusting the date range or status filters." (not a blank page) |
| A specific section has no gigs | - [ ] The section is hidden or shows a subtle "No gigs" row (not an error) |
| A gig exists but has no financials | - [ ] The gig row shows $0.00 for all financial columns with no crash |

---

## 14. Performance

- [ ] The initial data load for an org with **10–20 gigs** completes within 3 seconds
- [ ] Filters and quick filters respond **instantly** (< 100ms) — they are client-side, not new network requests
- [ ] Switching between table and card view is **instant** (no re-fetch)
- [ ] Expanding a row detail fetches and renders within 2 seconds
- [ ] No visible jank or layout shift when sections expand/collapse

---

## 15. Responsiveness & Layout

- [ ] On a narrow viewport (< 768px), the summary bar wraps to 2–3 rows without overflow
- [ ] The table scrolls horizontally on mobile rather than breaking
- [ ] Card view renders as a single column on mobile
- [ ] Filter controls stack vertically on narrow screens
- [ ] All text remains readable; no truncation of currency values

---

## 16. Console & Error Checks

- [ ] No unhandled React errors in the browser console on initial load
- [ ] No React "key" prop warnings in the gig rows or sections
- [ ] No `undefined` or `NaN` values rendered in the UI (all currency values are formatted numbers)
- [ ] No console errors when expanding/collapsing sections
- [ ] No errors thrown when applying quick filters in rapid succession
- [ ] No errors when navigating to a gig detail and returning to the Gig Accounting tab
- [ ] No memory leaks: navigating away and back does not create duplicate data fetches (check Network tab)

---

## 17. Edge Cases

- [ ] A gig with **both** Bid Accepted and Contract Signed uses only Contract Signed for `contractAmount`
- [ ] A gig with **no contract record** of any type shows $0 for contract amount with no crash
- [ ] A gig with `contractAmount = 0` and costs > 0 shows a **negative profit** correctly (red, not NaN or $0)
- [ ] A gig whose `received` amount **exceeds** `contractAmount` (overpayment) shows $0 for outstanding (not a negative number)
- [ ] A gig with **only Cancelled sub-contracts** shows $0 for sub-contract costs
- [ ] A gig with **multiple Sub-Contract Signed** records shows the correct total in payments to make
- [ ] A Sub-Contract Settled record correctly **reduces** the paymentsToMake by its amount (not adds to it)
- [ ] A staff assignment with `completed_at IS NOT NULL` and `paid_at IS NOT NULL` (already paid) does **not** appear in paymentsToMake
- [ ] A staff assignment with `completed_at IS NULL` (still in progress) does **not** appear in paymentsToMake
- [ ] Only a **Confirmed** or **Requested** unfinished assignment contributes to `expectedStaffCosts` (not Invited/Declined)
- [ ] An organization that participates in a gig as a **Venue** (not organizer) correctly includes/excludes that gig based on the org's `gig_participants` entry
- [ ] Date filter edge case: a gig starting **on** the `dateFrom` date is included (inclusive range)
- [ ] Date filter edge case: a gig starting **on** the `dateTo` date is included (inclusive range)

---

## 18. Sign-off

| Tester | Date | Pass/Fail | Notes |
|--------|------|-----------|-------|
| | | | |
| | | | |

**Overall status**: [ ] Ready for production &nbsp;&nbsp; [ ] Needs fixes (see notes above)
