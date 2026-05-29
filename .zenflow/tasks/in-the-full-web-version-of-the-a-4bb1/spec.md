# Technical Specification: Gig Accounting View

**Feature**: Gig Accounting sub-tab in the Financials screen  
**PRD**: `requirements.md`  
**Date**: 2026-05-26

---

## 1. Technical Context

### Language & Runtime
- **TypeScript** (strict mode)
- **React 18.3.1** — functional components, hooks
- **Vite 6.3.5** build system

### Key Dependencies Already Available
| Package | Usage |
|---------|-------|
| `@supabase/supabase-js` | Database access via `createClient()` |
| `@radix-ui/react-collapsible` | Collapsible section headers |
| `@radix-ui/react-tabs` | Already used in `FinancialsScreen` |
| `lucide-react` | Icons |
| `shadcn/ui` (via Radix) | `Card`, `Table`, `Badge`, `Button`, `Input`, `Select` |
| `date-fns` | Date formatting and comparison |
| `sonner` | Toast notifications |
| `vitest` + `@testing-library/react` | Unit testing |

### Existing Patterns to Follow
- **Service layer**: Pure async functions in `src/services/gig.service.ts`, using `createClient()` directly for reads and `requireAuth()` for writes.
- **Error handling**: `handleApiError()` wrapper in all service functions.
- **UI components**: Shadcn/ui components from `src/components/ui/` — always prefer existing components over new primitives.
- **Type definitions**: `src/utils/supabase/types.tsx` and constants `src/utils/supabase/constants.ts`.
- **Data tables**: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` from `src/components/ui/table`.
- **Collapsible groups**: `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `src/components/ui/collapsible` — used in `GigFinancialsSection.tsx`.
- **Currency formatting**: `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)` — same as `GigProfitabilitySummary.tsx`.
- **Testing pattern**: Co-located `*.test.tsx` files; Supabase mocked in `src/test/setup.ts`.

---

## 2. Implementation Approach

### 2.1 No Database Migration Required

All required data is available in existing tables:
- `gig_participants` — org membership and gig association
- `gigs` — status, title, start/end dates
- `gig_financials` — all financial records (type, amount, paid_at)
- `gig_staff_slots` — slot-level org scoping
- `gig_staff_assignments` — fee/rate, status, completed_at, paid_at

### 2.2 Bulk Service Function (Performance-Critical)

The existing `getGigProfitabilitySummary()` makes 2 Supabase calls per gig. For N gigs this is O(N) round-trips. A new bulk function `getAllGigAccountingSummaries()` will issue a fixed 4 queries regardless of gig count:

1. **Gig IDs**: `gig_participants` WHERE `organization_id = orgId` → list of gig IDs
2. **Gigs**: `gigs` WHERE `id IN (gigIds)` → full gig rows (title, status, start, end)
3. **Financials**: `gig_financials` WHERE `gig_id IN (gigIds) AND organization_id = orgId` → all financial records (type, amount, paid_at, staff_assignment_id)
4. **Staff assignments**: `gig_staff_assignments` JOIN `gig_staff_slots` WHERE `slot.gig_id IN (gigIds) AND slot.organization_id = orgId` → fee, rate, status, completed_at, gig_financial_id

In-memory grouping and per-gig computation follows the same logic as `getGigProfitabilitySummary()` but extended for sub-contracts and the richer expected/actual framework from the PRD.

### 2.3 Financial Calculation Logic

Each gig summary is computed from its financial records:

**Revenue:**
- `contractAmount` = Contract Signed amount (fallback: Bid Accepted, then Informal Terms). Same priority logic as existing `getGigProfitabilitySummary`.
- `received` = sum of Deposit Received + Payment Received
- `outstandingRevenue` = `max(0, contractAmount − received)`

**Costs (extended from existing logic to include sub-contracts):**
- `actualCosts` = sum of Expense Incurred + Payment Sent + Deposit Sent + Sub-Contract Settled records
- `expectedStaffCosts` = sum of fee/rate for Confirmed/Requested assignments where `completed_at IS NULL` (same as existing `projectedStaffCosts`)
- `expectedSubContractCosts` = sum of Sub-Contract Submitted + Sub-Contract Signed amounts
- `totalCosts` = `actualCosts + expectedStaffCosts + expectedSubContractCosts`

**Payments to Make:**
- `paymentsToMake` = sum of Sub-Contract Signed amounts not yet Settled + sum of staff Labor financial entries where `paid_at IS NULL` (completed staff assignments linked to a `gig_financial_id` with type `Expense Incurred` / Labor)
  - **Practical implementation**: For staff, look for `gig_staff_assignments` where `completed_at IS NOT NULL` and the linked `gig_financials` row has `paid_at IS NULL`. For sub-contracts, use `gig_financials` records with `type = 'Sub-Contract Signed'` minus any corresponding `Sub-Contract Settled` for the same counterparty.

**Profit:**
- `profit` = `contractAmount − totalCosts`
- `margin` = `contractAmount > 0 ? (profit / contractAmount) * 100 : 0`

**Payment Health Indicator:**
- `'all-clear'`: `outstandingRevenue === 0 && paymentsToMake === 0`
- `'revenue-outstanding'`: `outstandingRevenue > 0 && paymentsToMake === 0`
- `'payments-due'`: `outstandingRevenue === 0 && paymentsToMake > 0`
- `'both'`: `outstandingRevenue > 0 && paymentsToMake > 0`

### 2.4 Client-Side Grouping

After bulk fetch, gig summaries are partitioned into 3 sections via `useMemo`:

- **Section 1 — Needs Attention**: `status === 'Completed'`
- **Section 2 — Upcoming**: `status in ['Booked', 'Proposed', 'DateHold']` AND `start > now()`
- **Section 3 — Past & Settled**: `status === 'Settled'` OR any remaining gig (Completed/Cancelled whose start is past)

Within each section, sorted by `start` descending (most recent first).

Filters are applied client-side via `useMemo` on the grouped data before passing to the table.

### 2.5 Access Control

Check `userRole === 'Admin'` in `GigAccountingTab`. If not Admin, render an `<Alert>` with "Financial data is restricted to Admins." The tab itself stays visible in the TabsList (no change to `FinancialsScreen.tsx` tab list rendering).

---

## 3. Source Code Structure Changes

### New Files

```
src/
  components/
    financials/
      GigAccountingTab.tsx          # Main tab container; owns all state and data fetching
      GigAccountingFilters.tsx      # Filter bar + quick-filter chips
      GigAccountingSummaryBar.tsx   # Page-level aggregate metric cards
      GigAccountingTable.tsx        # Grouped, collapsible table view
      GigAccountingRowDetail.tsx    # Inline expanded row detail panel
      GigAccountingCardView.tsx     # Card-grid alternative view
      GigAccountingTab.test.tsx     # Component unit tests
  services/
    (gig.service.ts — new function appended)
    gig.service.test.ts             # New test cases for bulk function (file already exists)
```

### Modified Files

| File | Change |
|------|--------|
| `src/components/FinancialsScreen.tsx` | Replace "Coming Soon" placeholder in `gig-accounting` TabsContent with `<GigAccountingTab .../>` |
| `src/services/gig.service.ts` | Add `getAllGigAccountingSummaries(organizationId)` export |
| `src/utils/supabase/types.tsx` | Add `GigAccountingSummary` interface |

---

## 4. Data Model / Interface Changes

### 4.1 New TypeScript Interface (in `types.tsx`)

```ts
export type PaymentHealth = 'all-clear' | 'revenue-outstanding' | 'payments-due' | 'both';

export interface GigAccountingSummary {
  gigId: string;
  gigTitle: string;
  gigStatus: GigStatus;
  gigStart: string;   // ISO DateTime
  gigEnd: string;     // ISO DateTime

  // Revenue
  contractAmount: number;
  received: number;
  outstandingRevenue: number;

  // Costs
  actualCosts: number;
  expectedStaffCosts: number;
  expectedSubContractCosts: number;
  totalCosts: number;

  // Obligations
  paymentsToMake: number;

  // Profit
  profit: number;
  margin: number;

  // Status
  paymentHealth: PaymentHealth;
}
```

### 4.2 New Service Function Signature

```ts
// In gig.service.ts
export async function getAllGigAccountingSummaries(
  organizationId: string
): Promise<GigAccountingSummary[]>
```

Returns an array of `GigAccountingSummary` objects, one per gig the organization participates in. Returns `[]` (not throws) if the org has no gigs. Uses `handleApiError` for Supabase errors.

### 4.3 Component Props

```ts
// GigAccountingTab.tsx
interface GigAccountingTabProps {
  organization: Organization;
  userRole?: UserRole;
  onNavigateToGigDetail?: (gigId: string) => void;
}

// GigAccountingFilters.tsx
interface GigAccountingFiltersProps {
  searchQuery: string;
  statusFilters: GigStatus[];
  showSettled: boolean;
  dateFrom: string;
  dateTo: string;
  viewMode: 'table' | 'card';
  activeQuickFilter: string | null;
  onSearchChange: (v: string) => void;
  onStatusFiltersChange: (v: GigStatus[]) => void;
  onShowSettledChange: (v: boolean) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onViewModeChange: (v: 'table' | 'card') => void;
  onQuickFilter: (key: string | null) => void;
  onClearFilters: () => void;
}

// GigAccountingSummaryBar.tsx
interface GigAccountingSummaryBarProps {
  summaries: GigAccountingSummary[];  // already-filtered list
}

// GigAccountingTable.tsx
interface GigAccountingTableProps {
  sections: GigSection[];  // pre-grouped and filtered
  onNavigateToGigDetail?: (gigId: string) => void;
}

interface GigSection {
  id: 'needs-attention' | 'upcoming' | 'past-settled';
  label: string;
  gigs: GigAccountingSummary[];
  defaultCollapsed: boolean;
}
```

---

## 5. UI Component Design Reference

### 5.1 GigAccountingTab — State Ownership

Owns all filter, view mode, and loading state. Calls `getAllGigAccountingSummaries` on mount and when `organization.id` changes. Uses `useMemo` for filtering, grouping, and summary bar aggregation.

Default filter state:
```ts
statusFilters: ['Completed', 'Booked', 'Proposed', 'DateHold']  // Cancelled excluded; Settled excluded unless showSettled = true
showSettled: false
dateFrom: ''
dateTo: ''
searchQuery: ''
viewMode: 'table'
activeQuickFilter: null
```

### 5.2 Quick Filters (chips above table)

| Key | Effect |
|-----|--------|
| `needs-attention` | statusFilters = ['Completed'], showSettled = false |
| `upcoming` | statusFilters = ['Booked', 'Proposed', 'DateHold'] |
| `this-year` | dateFrom = Jan 1 of current year, dateTo = Dec 31 |
| `unsettled-revenue` | post-filter: show only gigs where outstandingRevenue > 0 |
| `payments-due` | post-filter: show only gigs where paymentsToMake > 0 |

### 5.3 Section Headers (collapsible)

- **Needs Attention** (amber/orange header): expanded by default
- **Upcoming** (blue header): expanded by default
- **Past & Settled** (gray header): collapsed by default

Implementation uses `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent` from `src/components/ui/collapsible` (same as `GigFinancialsSection.tsx`).

### 5.4 Table Columns

| Column | Content |
|--------|---------|
| Gig | Name + formatted date + status Badge |
| Revenue | contractAmount (primary) + "Rcvd / Outstanding" sub-detail |
| Costs | totalCosts (primary) + "Actual / Staff / Sub-Cont" sub-detail |
| Profit | Dollar amount + margin % pill (green if positive, red if negative) |
| Health | PaymentHealth badge icon |
| → | Expand row / Navigate to gig |

### 5.5 Expanded Row Panel

Clicking a row expands `GigAccountingRowDetail` (inline `<tr>` with `colSpan={N}`):
- **Revenue breakdown**: Contract Signed, Deposits, Payments Received lines
- **Expense breakdown by category**: Labor, sub-contracts, direct expenses
- **Sub-contract status**: vendor name, amount, status, outstanding
- **Staff payment status**: who is paid / unpaid
- **"View Gig Financials"** button → `onNavigateToGigDetail(gigId)`

The expanded row detail panel reads from the pre-loaded `GigAccountingSummary` data and additionally fetches the per-gig `gig_financials` details (using the existing `getGigFinancials`) lazily on first expand.

### 5.6 Summary Bar Layout

Six metric cards in a horizontal flex row, styled similarly to `GigProfitabilitySummary.tsx`:
- Total Expected Revenue (green accent)
- Total Received (green)
- Total Outstanding (amber if > 0, else green)
- Total Costs (blue accent)
- Total Payments Due (red if > 0, else green)
- Net Profit (green/red based on sign)

---

## 6. Verification Approach

### Build & Type Check
```bash
npm run build
# TypeScript is compiled; any type errors will fail the build

npm run typecheck  # tsc --noEmit
```

### Unit Tests
```bash
npm run test:run
```

**Tests to add:**

1. `src/services/gig.service.test.ts` — new cases for `getAllGigAccountingSummaries`:
   - Returns empty array for org with no gigs
   - Correctly groups financials by gig
   - Contract priority: Contract Signed > Bid Accepted > Informal Terms
   - Sub-contract cost classification (Submitted/Signed as expected, Settled as actual)
   - `paymentsToMake` computation (Sub-Contract Signed + unpaid completed staff)
   - `paymentHealth` derivation for each of the four states

2. `src/components/financials/GigAccountingTab.test.tsx`:
   - Shows access-denied message for non-Admin
   - Renders loading state
   - Renders three sections with correct gig counts
   - Quick filter "Needs Attention" filters to Completed only
   - Summary bar totals match visible gigs
   - Clicking a row navigates to gig detail (via `onNavigateToGigDetail` mock)

### Manual Verification Steps (for implementer to document)
After implementation, the user should:
1. Open the app in dev mode (`npm run dev`)
2. Log in as an Admin for an org with gigs across different statuses
3. Navigate to Financials → Gig Accounting
4. Verify: three sections appear with correct gigs, summary bar updates with filters, row expansion shows breakdown, clicking "View Gig Financials" navigates correctly
5. Log in as a non-Admin and verify the access-denied message
