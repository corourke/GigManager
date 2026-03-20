# Technical Specification: Gig Financials Workflow

This specification defines the implementation details for the Gig Financials Workflow, transitioning from separate receipt tracking to a single-ledger model with two-way linking.

## Technical Context

- **Language**: TypeScript (React, Node.js)
- **Database**: Supabase (PostgreSQL)
- **UI Framework**: Shadcn/ui (Tailwind CSS, Lucide Icons, Radix UI)
- **State Management**: React Hook Form, Zod for validation

## Architecture: Single-Ledger Model

`gig_financials` is the SINGLE SOURCE OF TRUTH for gig profitability. All financial events (revenue, expenses, staff labor) are rows in this table. Other tables serve as source documents with two-way links:

1. **Purchases ↔ Ledger**:
   - `gig_financials.purchase_id` → `purchases.id`
   - `purchases.gig_id` → `gigs.id` (stays for tracking)
2. **Staff Assignments ↔ Ledger**:
   - `gig_financials.staff_assignment_id` → `gig_staff_assignments.id`
   - `gig_staff_assignments.gig_financial_id` → `gig_financials.id`
   - Costs enter the ledger ONLY when assignments are marked complete.

## Implementation Details

### 1. Database Schema Changes

A new migration file will be created to:

- Add `purchase_id` (UUID, nullable, FK to `purchases.id`) to `gig_financials`.
- Add `staff_assignment_id` (UUID, nullable, FK to `gig_staff_assignments.id`) to `gig_financials`.
- Add `completed_at` (timestamptz, nullable) to `gig_staff_assignments`.
- Add `units_completed` (numeric(10,2), nullable) to `gig_staff_assignments`.
- Add `gig_financial_id` (UUID, nullable, FK to `gig_financials.id`) to `gig_staff_assignments`.
- Update RLS policies to allow reading/writing these new columns.
- Update `supabase/dump/schema_dump.sql` to reflect these changes.

### 2. TypeScript Types

Update `src/utils/supabase/types.tsx` to include the new columns in `DbGigFinancial`, `DbGigStaffAssignment`, and `DbPurchase`.

### 3. Constants

Add `FIN_TYPE_GROUPS` to `src/utils/supabase/constants.ts`:
- `revenue`: ['Contract Signed', 'Bid Accepted', 'Deposit Received', 'Payment Recieved']
- `cost`: ['Expense Incurred', 'Payment Sent', 'Deposit Sent']
- `tracking`: ['Invoice Issued', 'Invoice Settled']

### 4. Service Layer Updates (`src/services/gig.service.ts`)

#### `getGigProfitabilitySummary(gigId: string, organizationId: string)`
- Query `gig_financials` grouped by type.
- Revenue: `Contract Signed`, `Bid Accepted`.
- Actual Costs: `Expense Incurred`, `Payment Sent`, `Deposit Sent`.
- Query `gig_staff_assignments` where `completed_at` is null and status is 'Confirmed' or 'Requested' for projected costs.
- Calculate: `contractAmount`, `received`, `outstandingRevenue`, `actualCosts`, `projectedStaffCosts`, `totalCosts`, `profit`, `margin`.

#### `completeStaffAssignment(assignmentId: string, unitsCompleted?: number)`
- Set `completed_at` to current time.
- Set `units_completed` if provided.
- Create `gig_financials` record:
  - `type`: 'Expense Incurred'
  - `category`: 'Labor'
  - `amount`: `fee` (if present) or `rate * units_completed`.
  - `staff_assignment_id`: `assignmentId`.
- Set `gig_financial_id` on the assignment back to the new record.

#### `completeAllStaffAssignments(gigId: string, organizationId: string)`
- Bulk complete all confirmed fee-based assignments that are not yet completed.

### 5. Component Updates

#### `src/components/gig/GigProfitabilitySummary.tsx` (New)
- Show three cards: Contract (received/outstanding), Total Costs (actual + projected), Profit (with margin %).
- Use green/amber/gray for contract and green/red for profit.

#### `src/components/gig/GigFinancialsSection.tsx`
- Render `GigProfitabilitySummary` at the top.
- Group records into "Revenue" and "Expenses" using `FIN_TYPE_GROUPS`.
- Add "Projected Staff" section below Expenses.
- Simplified Type Picker in Add/Edit modal.
- "Upload Receipt" button triggering AI flow.
- Add source indicators ("Manual", "Receipt", "Staff").

#### `src/components/gig/GigStaffSlotsSection.tsx`
- Show "Done" (with completed_at) or "Pending" status.
- Add "Finalize All" button.
- For rate-based, prompt for `units_completed` on completion.
- Footer with Total Staff Cost (Finalized vs Projected).

#### `src/components/ReviewScannedDataDialog.tsx`
- If `gigId` is present, create BOTH `purchases` and `gig_financials` records.

### 6. Cleanup
- Delete `src/components/gig/GigPurchaseExpenses.tsx`.
- Update all references to `GigPurchaseExpenses`.

## Verification Approach

- **Schema**: Run migration and verify with `supabase status`.
- **Services**: Unit tests for `getGigProfitabilitySummary` and `completeStaffAssignment`.
- **UI**:
  - Verify grouping in `GigFinancialsSection`.
  - Verify "Finalize All" in `GigStaffSlotsSection`.
  - Verify AI receipt scan creates ledger entry.
- **Build**: Run `npm run build && npm run test:run`.
