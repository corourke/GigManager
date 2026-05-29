# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: 44998dd7-686f-4da8-996f-068a3ee56421 -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Focus on **what** the feature should do and **why**, not **how** it should be built. Do not include technical implementation details, technology choices, or code-level decisions — those belong in the Technical Specification.

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification
<!-- chat-id: 1a152cbf-ebd1-415b-9bc6-ddbd72647026 -->

Create a technical specification based on the PRD in `{@artifacts_path}/requirements.md`.

1. Review existing codebase architecture and identify reusable components
2. Define the implementation approach

Do not include implementation steps, phases, or task breakdowns — those belong in the Planning step.

Save to `{@artifacts_path}/spec.md` with:
- Technical context (language, dependencies)
- Implementation approach referencing existing code patterns
- Source code structure changes
- Data model / API / interface changes
- Verification approach using project lint/test commands

### [x] Step: Planning
<!-- chat-id: adb18449-d514-42b1-b3e5-89dcd6cd9c2e -->

Create a detailed implementation plan based on `{@artifacts_path}/spec.md`.

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint). Avoid steps that are too granular (single function) or too broad (entire feature).

Important: unit tests must be part of each implementation task, not separate tasks. Each task should implement the code and its tests together, if relevant.

If the feature is trivial and doesn't warrant full specification, update this workflow to remove unnecessary steps and explain the reasoning to the user.

Save to `{@artifacts_path}/plan.md`.

### [x] Step 1: Data layer — types, service function, and service tests
<!-- chat-id: 2b7311c2-4713-42d7-aaf5-dfa5475a44a7 -->

Add the `GigAccountingSummary` interface and `PaymentHealth` type to `src/utils/supabase/types.tsx`, then implement `getAllGigAccountingSummaries(organizationId)` in `src/services/gig.service.ts`, and add unit tests to `src/services/gig.service.test.ts`.

**Types to add** (see spec §4.1):
- `export type PaymentHealth = 'all-clear' | 'revenue-outstanding' | 'payments-due' | 'both'`
- `export interface GigAccountingSummary { ... }` — all fields from spec §4.1

**Service function** (see spec §2.2–2.3):
- 4 fixed Supabase queries regardless of gig count: gig participants → gig IDs, gigs, gig_financials, staff assignments joined with staff slots
- In-memory grouping and per-gig computation following the financial calculation logic in spec §2.3:
  - Revenue: contractAmount (Contract Signed > Bid Accepted > Informal Terms priority), received, outstandingRevenue
  - Costs: actualCosts, expectedStaffCosts (Confirmed/Requested unfinished assignments), expectedSubContractCosts (Submitted + Signed), totalCosts
  - paymentsToMake: Sub-Contract Signed (not Settled) + completed staff assignments where linked financial record has paid_at IS NULL
  - profit, margin, paymentHealth derivation
- Returns `[]` for org with no gigs; uses `handleApiError` for Supabase errors

**Unit tests** in `gig.service.test.ts` (new `describe` block):
- Returns empty array when org has no gigs
- Correctly groups financials by gig across multiple gigs
- Contract priority: Contract Signed > Bid Accepted > Informal Terms (no double-counting)
- Sub-contract cost classification: Submitted/Signed = expected, Settled = actual, Rejected/Cancelled = excluded
- `paymentsToMake` computation: Sub-Contract Signed + unpaid completed staff
- `paymentHealth` derivation for all four states ('all-clear', 'revenue-outstanding', 'payments-due', 'both')

**Verification**: `npm run build && npm run test:run`

### [x] Step 2: GigAccountingFilters component
<!-- chat-id: ba941180-6972-40f3-8672-b40e7cc47749 -->

Implement `src/components/financials/GigAccountingFilters.tsx` — the filter bar rendered above the summary bar and table.

**Props** (see spec §4.3 `GigAccountingFiltersProps`):
- searchQuery, statusFilters, showSettled, dateFrom, dateTo, viewMode, activeQuickFilter
- onChange handlers and onClearFilters

**UI elements**:
- Search `Input` (gig name), styled as in the Purchases tab search pattern in `FinancialsScreen.tsx`
- Status multi-select using `Select` or checkboxes (GigStatus values: Completed, Booked, Proposed, DateHold, Settled, Cancelled)
- Date range: two `Input[type=date]` fields (From / To) — mirror the date filter pattern in FinancialsScreen
- "Show Settled" toggle (`Button` variant="outline" toggled state) 
- View mode toggle: Table / Card icons (`TableIcon`, `LayoutGrid` from lucide-react)
- "Clear Filters" `Button` (only shown when any non-default filter is active)
- Quick filter chips row below main filters — five chips (Needs Attention, Upcoming, This Year, Unsettled Revenue, Payments Due); active chip uses filled/primary styling, inactive uses outline. Selecting a chip applies the filter combination from spec §5.2 and sets `activeQuickFilter`.

**Verification**: `npm run build` (no dedicated unit test needed — logic lives in parent; component is presentational)

### [x] Step 3: GigAccountingSummaryBar component
<!-- chat-id: 47112742-75a8-46d4-93ff-09f8e720bd60 -->

Implement `src/components/financials/GigAccountingSummaryBar.tsx` — six metric cards displayed at the top of the Gig Accounting tab.

**Props** (see spec §4.3 `GigAccountingSummaryBarProps`):
- `summaries: GigAccountingSummary[]` — the already-filtered list

**Aggregations** (computed inline with `useMemo`):
- Total Expected Revenue: `sum(contractAmount)`
- Total Received: `sum(received)`
- Total Outstanding: `sum(outstandingRevenue)` — amber if > 0, else green
- Total Costs: `sum(totalCosts)`
- Total Payments Due: `sum(paymentsToMake)` — red if > 0, else green
- Net Profit: `sum(profit)` — green if ≥ 0, red if < 0

**Layout**: horizontal flex row of 6 `Card` components, each with a label and a formatted currency value. Follow the visual style of `GigProfitabilitySummary.tsx` (same `Intl.NumberFormat` currency format). Responsive: wraps to 2 rows on narrow screens (use `flex-wrap` or a 3-col grid).

**Verification**: `npm run build`

### [x] Step 4: GigAccountingTable and GigAccountingRowDetail components
<!-- chat-id: 7972e130-1d75-4f72-bc18-ea9c2c7a79cf -->

Implement the grouped collapsible table view: `src/components/financials/GigAccountingTable.tsx` and `src/components/financials/GigAccountingRowDetail.tsx`.

**GigAccountingTable** (see spec §4.3 `GigAccountingTableProps` / `GigSection`):
- Accepts `sections: GigSection[]` (pre-grouped and filtered) and `onNavigateToGigDetail?`
- Renders three `Collapsible` sections (from `src/components/ui/collapsible`) using the same pattern as `GigFinancialsSection.tsx`:
  - **Needs Attention**: amber/orange header, expanded by default
  - **Upcoming**: blue header, expanded by default  
  - **Past & Settled**: gray header, collapsed by default
- Section header shows chevron icon + label + count badge
- Inside each section: `Table` / `TableHeader` / `TableBody` with columns (see spec §5.4):
  - **Gig**: name (bold) + formatted date range + status `Badge`
  - **Revenue**: contractAmount (primary) + "Rcvd: $X / Due: $Y" sub-detail in smaller text
  - **Costs**: totalCosts (primary) + "Actual: $X / Staff: $Y / Sub: $Z" sub-detail
  - **Profit**: dollar amount + margin % pill (green if ≥ 0, red if < 0, using `Badge` or styled span)
  - **Health**: PaymentHealth icon badge — use `CheckCircle2` (all-clear), `AlertCircle` (revenue-outstanding), `CreditCard` (payments-due), `AlertTriangle` (both) from lucide-react, with appropriate color
  - **→**: expand row toggle (ChevronDown/ChevronRight) — clicking expands `GigAccountingRowDetail`
- Clicking the row (except the expand chevron) calls `onNavigateToGigDetail(gigId)`
- Empty state per section: a subtle "No gigs" row spanning all columns

**GigAccountingRowDetail** (see spec §5.5):
- Rendered as an additional `TableRow` with a single `TableCell colSpan={6}` containing a styled detail panel
- On first expand, lazily fetches full financial records via existing `getGigFinancials(gigId)` (already in `gig.service.ts`)
- Displays:
  - Revenue breakdown: Contract Signed, Deposits Received, Payments Received — each as a labeled line with amount
  - Expense breakdown by category from `gig_financials` (Labor/Expense Incurred, Sub-Contract records, Payment/Deposit Sent)
  - Sub-contract status: type, amount, paid_at indicator
  - "View Gig Financials" `Button` (variant="outline") → calls `onNavigateToGigDetail(gigId)`
- Shows a skeleton/spinner while loading

**Verification**: `npm run build`

### [x] Step 5: GigAccountingCardView component
<!-- chat-id: 271692b4-6d7a-4d76-8bfb-01b2aa5987e3 -->

Implement `src/components/financials/GigAccountingCardView.tsx` — the card-grid alternative to the table view.

**Props**: same `sections: GigSection[]` and `onNavigateToGigDetail?` as the table.

**Layout**: for each section, a section header (`<h3>` or styled div) followed by a responsive grid of cards (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`).

**Each card** (using `Card` from `src/components/ui/card`):
- Header: gig name (bold) + date range, status `Badge`, PaymentHealth indicator icon (top-right)
- Three metric tiles in a row: Revenue (`contractAmount`), Costs (`totalCosts`), Profit (`profit`) — reusing the visual style of `GigProfitabilitySummary.tsx`
- Sub-detail row: "Rcvd $X | Due $Y | Pay $Z" in small text
- Footer: "View Gig" `Button` (variant="outline", full-width) → `onNavigateToGigDetail(gigId)`

**Verification**: `npm run build`

### [x] Step 6: GigAccountingTab container, component tests, and FinancialsScreen integration
<!-- chat-id: 11c64589-b93b-420b-aaf5-b4b4600a4dcf -->

Implement `src/components/financials/GigAccountingTab.tsx` as the main container, add unit tests in `src/components/financials/GigAccountingTab.test.tsx`, and wire it into `src/components/FinancialsScreen.tsx`.

**GigAccountingTab** (see spec §4.3 `GigAccountingTabProps`, §5.1):
- Props: `organization`, `userRole?`, `onNavigateToGigDetail?`
- Access control: if `userRole !== 'Admin'`, render `<Alert><AlertDescription>Financial data is restricted to Admins.</AlertDescription></Alert>` and return early (see spec §2.5)
- State: `summaries`, `isLoading`, `error`, plus all filter state with defaults from spec §5.1:
  - `statusFilters: ['Completed', 'Booked', 'Proposed', 'DateHold']`
  - `showSettled: false`, `dateFrom: ''`, `dateTo: ''`, `searchQuery: ''`
  - `viewMode: 'table'`, `activeQuickFilter: null`
- On mount (and when `organization.id` changes): call `getAllGigAccountingSummaries(organization.id)`, set loading/error state
- `useMemo` for filtered summaries:
  - Apply searchQuery (case-insensitive match on gigTitle)
  - Apply statusFilters (include gig if gigStatus in statusFilters; also include Settled if showSettled)
  - Apply dateFrom/dateTo (filter by gigStart)
  - Apply quick filter post-conditions: 'unsettled-revenue' keeps only `outstandingRevenue > 0`; 'payments-due' keeps only `paymentsToMake > 0`
- `useMemo` for sections (grouping per spec §2.4):
  - Section 1 "Needs Attention": `gigStatus === 'Completed'`, sorted by start desc
  - Section 2 "Upcoming": `gigStatus in ['Booked','Proposed','DateHold']` AND `gigStart > now`, sorted by start desc  
  - Section 3 "Past & Settled": `gigStatus === 'Settled'` OR remaining (past Completed/Cancelled), sorted by start desc
  - Each section marked with `defaultCollapsed` per spec §5.3
- `useMemo` for summary bar: pass `filteredSummaries` directly to `GigAccountingSummaryBar`
- Quick filter handler: sets `statusFilters`/`showSettled`/date fields per spec §5.2 and sets `activeQuickFilter`
- Renders: `GigAccountingFilters` → `GigAccountingSummaryBar` → (viewMode === 'table' ? `GigAccountingTable` : `GigAccountingCardView`)
- Loading state: skeleton or spinner centered in a `Card`
- Error state: `Alert` with error message
- Empty state (no gigs at all): "No gigs found. Create your first gig to start tracking financials." with `onNavigateToGigs`-style affordance

**Unit tests** in `GigAccountingTab.test.tsx` (mock `getAllGigAccountingSummaries` from `gig.service`):
- Shows access-denied alert for non-Admin userRole
- Shows loading skeleton while fetching
- Renders three collapsible sections with correct gig counts
- Quick filter "Needs Attention" shows only Completed gigs
- Summary bar totals match the visible filtered gigs
- Clicking a row's navigate action calls `onNavigateToGigDetail` with correct gigId

**FinancialsScreen.tsx integration**:
- Import `GigAccountingTab` from `./financials/GigAccountingTab`
- Replace the "Gig Accounting Coming Soon" `TabsContent` block (lines ~558–567) with `<GigAccountingTab organization={organization} userRole={userRole} onNavigateToGigDetail={onNavigateToGigDetail} />`

**Final verification**: `npm run build && npm run test:run`

### [x] Step: Debugging
<!-- chat-id: 99c222f1-fa01-4e19-a068-11e9e373980e -->
