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
| `organization_id` | UUID | The organization that owns the record (FK to `organizations`, NOT NULL) |
| `counterparty_id` | UUID | The target organization (FK to `organizations`, NULLable) |
| `external_entity_name` | TEXT | For external parties (when counterparty_id is null) |
| `type` | `financial_type` | Type of record (NOT NULL) |
| `category` | `financial_category` | Category (NOT NULL) |
| `status` | `financial_status` | Status (NOT NULL) |
| `reference_number` | TEXT | Invoice #, contract #, bid #, etc. |
| `description` | TEXT | Item description |
| `amount` | DECIMAL(12, 2) | Amount (NOT NULL) |
| `currency` | TEXT | Default 'USD' |
| `payment_method` | TEXT | e.g., 'Credit Card', 'Wire', 'Check' |
| `date` | DATE | Record date |
| `due_date` | DATE | Payment due date |
| `paid_at` | TIMESTAMPTZ | Payment timestamp |
| `notes` | TEXT | Internal notes |
| `created_by` | UUID | FK to `users` |
| `updated_by` | UUID | FK to `users` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### 3.3. Table `gigs`
- Drop column `amount_paid`.

## 4. System-wide Capabilities
### 4.1. File Attachments
File attachments should be implemented as a uniform, system-wide capability rather than a one-off for this table. Implementation of this general capability is considered part of the broader architecture, but `gig_financials` will be designed to integrate with it.

## 5. Security (RLS)
The new RLS policies for `gig_financials` will ensure:
- Users can only see records where their organization is the `organization_id` or `counterparty_id`.
- Project owners (Admins/Managers of participating orgs) might need broader access, but for Phase 1 we will stick to explicit matching to prevent vendors from seeing each other's bids.

## 6. Verification Plan
- **Database**: Run migration and verify table structure and RLS.
- **Service**: Update `gig.service.ts` and run existing tests or new tests for financials.
- **Frontend**: Verify that `GigDetailScreen` still shows relevant info (will likely need updates to handle the new table).
- **Edge Functions**: Verify that the server function still works after `amount_paid` is moved.
