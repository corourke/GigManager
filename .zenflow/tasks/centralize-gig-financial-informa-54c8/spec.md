# Technical Specification: Centralize Gig Financial Information

## 1. Context
Currently, gig financial information is split between the `gig_bids` table and the `gigs.amount_paid` column. This makes enforcing granular security difficult and doesn't support a full financial workflow (expenses, invoices, etc.).

## 2. Objective
- Centralize all gig-related financial records into a single table.
- Rename `gig_bids` to `gig_financials`.
- Support multiple types of financial records: Bids, Contracts, Expenses, Invoices, and Revenue.
- Implement strict RLS to ensure data isolation between organizations.
- Remove `amount_paid` from the `gigs` table.

## 3. Data Model Changes

### 3.1. New Enums
```sql
CREATE TYPE financial_type AS ENUM (
  'Bid',
  'Contract',
  'Expense',
  'Invoice',
  'Revenue'
);

CREATE TYPE financial_category AS ENUM (
  'Labor',
  'Equipment',
  'Transportation',
  'Venue',
  'Production',
  'Insurance',
  'Rebillable',
  'Other'
);

CREATE TYPE financial_status AS ENUM (
  'Draft',
  'Pending',
  'Approved',
  'Rejected',
  'Active',
  'Paid',
  'Cancelled',
  'Settled'
);
```

### 3.2. Table `gig_financials` (renamed from `gig_bids`)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `gig_id` | UUID | FK to `gigs.id` (NOT NULL) |
| `type` | `financial_type` | Type of record (NOT NULL) |
| `category` | `financial_category` | Category (NOT NULL) |
| `status` | `financial_status` | Status (NOT NULL) |
| `description` | TEXT | Item description |
| `amount` | DECIMAL(12, 2) | Amount (NOT NULL) |
| `currency` | TEXT | Default 'USD' |
| `date` | DATE | Record date |
| `due_date` | DATE | Payment due date |
| `paid_at` | TIMESTAMPTZ | Payment timestamp |
| `from_org_id` | UUID | Originating Org (FK to `organizations`) |
| `to_org_id` | UUID | Target Org (FK to `organizations`) |
| `external_entity_name` | TEXT | For external parties |
| `notes` | TEXT | Internal notes |
| `attachments` | TEXT[] | File URLs |
| `created_by` | UUID | FK to `users` |
| `updated_by` | UUID | FK to `users` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### 3.3. Table `gigs`
- Drop column `amount_paid`.

## 4. Security (RLS)
The new RLS policies for `gig_financials` will ensure:
- Users can only see records where their organization is either the `from_org_id` or `to_org_id`.
- Project owners (Admins/Managers of participating orgs) might need broader access, but for Phase 1 we will stick to explicit `from`/`to` matching to prevent vendors from seeing each other's bids.

## 5. Verification Plan
- **Database**: Run migration and verify table structure and RLS.
- **Service**: Update `gig.service.ts` and run existing tests (if any) or new tests for financials.
- **Frontend**: Verify that `GigDetailScreen` still shows relevant info (will likely need updates to handle the new table).
- **Edge Functions**: Verify that the server function still works after `amount_paid` is moved.
