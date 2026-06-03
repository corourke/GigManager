# Technical Specification: Mileage Recording & Quick Financial Actions

## 1. Technical Context
- **Language/Framework**: TypeScript, React (Web), React (Mobile/PWA), Supabase (PostgreSQL).
- **Existing Components**:
  - `GigFinancialsSection.tsx`: Web component for managing gig financials.
  - `MobileGigDetail.tsx`: Mobile component for gig details.
  - `gig.service.ts`: Service for interacting with gig-related data.
  - `constants.ts`: Central location for enums and configurations.

## 2. Implementation Approach

### 2.1 Centralized Mileage Logic
Create a new utility file `src/utils/financials.utils.ts` to house the mileage calculation logic and official IRS rates.
- **IRS_MILEAGE_RATES**: A constant mapping years to rates (e.g., `2024: 0.67`).
- **calculateMileageAmount(distance: number, year: number)**: Function to compute total amount.
- **formatMileageNotes(distance: number, rate: number)**: Returns `"X miles @ $Y/mile"`.

### 2.2 Web: Quick Action Buttons
Refactor the header of `GigFinancialsSection.tsx` to replace the "Add Record" button with:
- **"Agreement" Button**: Initiates a flow for `Informal Terms` (default), `Bid Accepted`, or `Contract Signed`.
- **"Payment" Button**: Initiates a flow for `Payment Received` (default) or `Deposit Received`.
- **"Expense / Mileage" Button**: 
  - Sub-menu for `Simple Expense` or `Mileage`.
  - **Mileage Modal**: Includes fields for `Date`, `Distance` (miles), `Start Odometer`, `End Odometer`, and `Description`.
  - Automatic calculation of `Amount` based on `Distance` (or `End - Start`).
- **"Other" Button**: Opens the existing full financial entry modal.

### 2.3 Mobile: Financials Section
Implement `MobileGigFinancials.tsx` (a new component) and integrate it into `MobileGigDetail.tsx`.
- **Summary Cards**: Match web logic (Contract, Received, Costs).
- **Transaction List**: Simplified list showing key transactions (Revenue, Payments, High-level Expenses).
- **Quick Action Buttons**: Same logic as web, optimized for mobile touch targets.
- **Access Control**: Wrap the section in a check for `Admin` or `Manager` roles.

### 2.4 Data Model & API Changes
A new migration is required to store the raw mileage distance on `gig_financials`.

**New migration** `supabase/migrations/YYYYMMDDHHMMSS_add_mileage.sql`:

```sql
ALTER TABLE public.gig_financials
  ADD COLUMN IF NOT EXISTS mileage NUMERIC(5, 2) DEFAULT NULL;
```

**Updated TypeScript interface** `src/utils/supabase/types.tsx` — add to `DbGigFinancial`:
```ts
mileage?: number | null;
```

**Mileage record field mapping**:
- `type`: `Expense Incurred`
- `category`: `Car and truck expenses`
- `mileage`: raw distance in miles (e.g. `42.5`)
- `amount`: calculated result of `mileage * rate` (dollar value stored for reporting)
- `notes`: auto-generated `"42.5 miles @ $0.67/mile"` prefixed to any user notes

## 3. Source Code Structure Changes
- `src/utils/financials.utils.ts`: (New) Mileage and financial utilities.
- `src/components/gig/QuickActionButtons.tsx`: (New) Shared UI for the quick action buttons.
- `src/components/mobile/MobileGigFinancials.tsx`: (New) Mobile-specific financials view.
- `src/components/gig/GigFinancialsSection.tsx`: (Updated) Integrated Quick Action buttons.
- `src/components/mobile/MobileGigDetail.tsx`: (Updated) Integrated `MobileGigFinancials`.

## 4. Verification Approach
- **Lint/Typecheck**: Run `npm run lint` and `npm run typecheck`.
- **Unit Tests**:
  - Add tests for `calculateMileageAmount` in `financials.utils.test.ts`.
  - Update `GigFinancialsSection.test.tsx` to verify quick action buttons.
  - Add `MobileGigFinancials.test.tsx` for mobile view verification.
- **Manual Verification**:
  - Verify mileage calculation on both Web and Mobile.
  - Verify role-based visibility on Mobile.
  - Verify that "Agreement" button correctly handles the "upgrade" logic from informal to formal terms.
