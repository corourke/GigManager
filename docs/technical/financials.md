# Financial Data — Technical Reference

How GigWrangler records money: purchases (invoices and their lines), equipment (`assets`), the gig ledger (`gig_financials`), staff pay (`gig_staff_assignments`), and filed tax years (`tax_years`). The tables, the rules that join them, how each screen writes them, and how the numbers are counted.

This replaces `gig-financials.md` and `purchases-assets-expenses.md`, which now point here. The user-facing version is the Financials section of the user guide (`website/docs/src/content/docs/financials/`).

**Last Updated**: 2026-10-06 (migration `20261006000000_purchase_tax_treatment`, #133 step 1)

---

## 1. The model in one page

- **A purchase is one invoice.** It is stored in `purchases` as one **header** row plus one row per **line**.
- **Each line answers two independent questions** (#133):
  1. **Tax treatment** (`purchases.tax_treatment`): `expense` or `depreciate`.
  2. **Tracked as equipment?** Yes if the line has an `assets` row (`purchases.asset_id`). Only equipment can go in kits.
- **Rules** (enforced in the database):
  - A depreciated line must be tracked as equipment, and it can never be a gig expense.
  - An expensed line may be tracked as equipment, linked to a gig, both, or neither.
- **The gig ledger** (`gig_financials`) holds every gig's **money in** and **money out**, each row at a **stage**. It answers "did this gig make money?". Rows come from:
  - the gig's own buttons (bookings, payments, quick expenses, mileage);
  - finalized staff pay;
  - purchase lines linked to the gig.
- **Tax reporting** reads two sources, and nothing is counted twice:
  - purchase lines, which carry the tax treatment and category;
  - gig money-out rows with **no** `purchase_id` (quick expenses, mileage, staff pay).

  A gig row that points at a purchase line is for gig accounting only.
- **Filed tax years are locked** (`tax_years`). Purchases dated in a locked year keep their tax fields. Equipment links and descriptions can still change.

```mermaid
flowchart LR
  subgraph Entry
    SI[Scan invoices<br/>Financials → Purchases]
    UR[Upload Receipt<br/>gig → Financials]
    UI[Upload Invoice<br/>Assets list]
    AM[Add manually]
    CSV[CSV import]
    AN[New asset]
    QA[Gig buttons<br/>booking · payment · expense · mileage]
    ST[Finalize staff]
  end
  SI & UR & UI & AM --> RD[Review dialog]
  RD --> P[(purchases<br/>header + lines)]
  CSV --> P
  P -- line tracked as equipment --> A[(assets)]
  AN --> A
  P -- expensed line linked to a gig --> GF[(gig_financials)]
  UR -. whole invoice, today .-> GF
  QA --> GF
  ST --> GF
```

---

## 2. Tables

### 2.1 `purchases`: invoices and their lines

| Column | Meaning |
|---|---|
| `row_type` | `header`, or a line: `item` / `asset`. Until #133 step 3, `asset` means "tracked as equipment"; tax treatment is its own column. |
| `parent_id` | A line's header. Deleting a header deletes its lines. |
| `purchase_date`, `vendor`, `payment_method` | Copied onto every line when the purchase is created. |
| `total_inv_amount` | Header only: the invoice grand total, including tax, shipping and fees. |
| `item_price`, `line_amount` | Unit and line price as printed, before tax and shipping. Empty on CSV-imported lines. |
| `item_cost`, `line_cost` | Unit and line cost **after** tax, shipping and fees are spread across the lines ("burdened"). `line_cost` is the authoritative cost; `item_cost` is the per-item cost the tax thresholds use. |
| `quantity` | Can be fractional. |
| `category`, `sub_category` | Free text for now. Lines inherit the header's when left blank. Replaced by a shared category table in #125. |
| `tax_treatment` | Lines only: `expense` or `depreciate` (§3). NULL on headers. |
| `recovery_period` | Depreciated lines only: 5, 7 or 15 years. The tax program computes depreciation; GigWrangler only records the period. |
| `gig_id` | The gig this line is a cost of. Headers still carry one today (old "assign receipt to gig"); #133 step 3 moves it to the lines. |
| `asset_id` | The line's equipment record, if it is tracked. |

**Cost allocation.** The invoice total includes tax and shipping, but the printed lines don't, so the difference is spread across the lines and the lines' `line_cost` adds up to the header's `total_inv_amount`:
- **Review dialog** (scan, manual, edit): when a price, quantity or the total changes, every line is scaled by `total_inv_amount ÷ Σ(basis × quantity)`. The basis is the line's printed price, or its stored cost if it has no price (CSV imports). Opening a saved purchase changes nothing (#128).
- **CSV import:** lines that give a cost keep it; the rest are scaled to make up the remainder, and the last line absorbs the rounding.
- **Worked example:** a $100 cable and a $300 amp on a $448 invoice ($32 tax, $16 shipping). The factor is 448 ÷ 400 = 1.12, so the cable costs $112 and the amp $336.

**Returns and refunds.**
- A returned **equipment** item keeps its line. Its `assets` row gets status Returned, `retired_on` (the date the refund was issued) and `liquidation_amt` (the refund, net of return shipping).
- A returned **expensed** item gets a negative line on a return invoice dated the refund date. For example, the 2025 Sweetwater shelf.
- Store credit counts as payment: the order's total is the full price, and its payment method names the credit.

### 2.2 `assets`: equipment

| Column | Meaning |
|---|---|
| `manufacturer_model`, `description`, `serial_number`, `tag_number`, `type` | Identity. |
| `category`, `sub_category` | Free text; the form suggests values already in use. |
| `acquisition_date`, `vendor` | When and where it was bought. |
| `item_cost`, `item_price`, `quantity` | Copied from the purchase line when the asset is created; the line stays authoritative for tax. |
| `replacement_value`, `insurance_policy_added`, `insurance_class` | Insurance, per item. |
| `status` | Free text; the UI offers Active, Inactive, Maintenance, Disposed, Returned. |
| `retired_on`, `liquidation_amt` | Date disposed and sale proceeds (or refund). Entering an amount in the form sets the status to Disposed. |
| `service_life`, `dep_method` | Legacy free text, to be dropped after their values move into `purchases.recovery_period` (#125 F2/F7). |
| `purchase_id` | The purchase **header**. The line points the other way, through `purchases.asset_id`. |

The equipment record has **no tax fields of its own**. Disposal is the one exception: it is a physical event, so it lives here, and reports join it back to the purchase line.

Deleting the equipment record of a **depreciated** line is refused. Mark it disposed or returned instead, or change the line to an expense first.

### 2.3 `gig_financials`: the gig ledger

Each row is **money in** (`direction = 'in'`: fees, deposits, reimbursements) or **money out** (`direction = 'out'`: sub-contractors, staff, expenses), and sits at one **stage**.

| Stage | Money in | Money out | Counts toward |
|---|---|---|---|
| `requested` | (not used) | Bid requested | Nothing; no amount needed |
| `quoted` | Quoted | Bid received | Nothing (pipeline) |
| `accepted` | Accepted (incl. verbal / informal) | Accepted | Expected |
| `contract_sent` | Contract sent | Contract sent | Expected |
| `contracted` | Contracted | Contracted | Expected |
| `invoiced` | Invoiced | Owed | Expected; due on its due date |
| `paid` | Paid | Paid | Expected and received/paid, at `amount_settled` |
| `declined`, `cancelled` | Declined, Cancelled | Declined, Cancelled | Nothing |

**Stages.** Every stage except `paid` is optional. A verbal agreement goes from `accepted` straight to `paid`; mileage is created `paid`.

**Fields:**
- `amount`: the agreed amount. NULL only at `requested`.
- `amount_settled`: what actually moved, set when the row is paid.
- `date`: when the item started.
- `due_date`: when payment is due. With none, an unpaid committed row is due once the gig is over.
- `paid_at`: when it was paid.
- `category` (`fin_category`, IRS Schedule C): what a row is for. Money out only in the UI.
- `counterparty_id` / `external_entity_name`: the other party.
- `purchase_id`: the purchase line this cost came from (or a header, for old scan-from-gig rows).
- `staff_assignment_id`: the staff assignment that produced this row.
- `legacy_type`: the pre-2026-10 type, kept for audit.

Check constraints: `amount` is NULL only at `requested`, and a `paid` row has `paid_at` and `amount_settled`.

**One row per payment.** A planned deposit and balance are two rows. An unplanned partial payment splits the row (`recordGigFinancialPayment`): the row becomes paid at what arrived, and a new row keeps the rest at the original stage. Alternatively the user settles for less, which lowers the agreed amount.

**History.** Each write logs one `activity_log` event (`entity_type = 'financial'`): `financial.added`, `financial.updated` (with `field_changes`), `financial.paid`, `financial.removed`. The 2026-10 conversion logged `financial.converted` with the source rows in `context.sources` (migration `20261005000000_fin_direction_stage`, tested by `supabase/tests/conversion/`).

Never send `''` for `category` or the uuid and date columns; the service turns `''` into NULL (issue #71).

### 2.4 `gig_staff_assignments`: staff pay

| Column | Meaning |
|---|---|
| `staff_slot_id`, `user_id` | The role slot on the gig and the person in it. |
| `status` | Requested, Confirmed, … |
| `fee` / `rate` | Flat fee, or a rate per unit. |
| `units_completed` | Units worked, entered when a rate-based assignment is finalized. |
| `completed_at` | Set by "Finalize". |
| `gig_financial_id` | The ledger row created at finalize; the back-link of `gig_financials.staff_assignment_id`. |

The assignment is the **plan** and the ledger row is the **actual**:
1. **Before finalize:** the assignment counts as a projected staff cost (fee, or rate when there is no fee).
2. **Finalize:** a money-out row is created, at stage `invoiced` (Owed), category Contract labor, description "Labor: {role}", amount = fee, or rate × units.
3. **Paid:** the same row moves to `paid`.

"Undo Finalize" deletes the row.

### 2.5 `tax_years`: filed years

| Column | Meaning |
|---|---|
| `organization_id`, `year` | Primary key. One row per filed year per organization. |
| `locked` | Default true. Unlocking (e.g. to amend) re-opens the year. |
| `filed_on`, `notes` | For the record. |

RLS: an organization's Admins and Managers read it; only its Admins add, change or remove rows.

**The lock** (trigger `purchases_c_tax_year_lock`) applies to purchases dated in a locked year. A line with no date uses its invoice's date.
- **Refused:**
  - changes to `tax_treatment`, `recovery_period`, `row_type`, `parent_id`, `organization_id`, `purchase_date`, `total_inv_amount`, `quantity`, `item_price`, `item_cost`, `line_amount`, `line_cost`, `category` and `sub_category`;
  - moving a row into or out of the year;
  - adding or deleting rows.
- **Allowed:** `asset_id` (so expensed gear from a filed year can be tracked and put in kits), `gig_id`, `description`, `vendor` and `payment_method`.

Gig money-out rows in a locked year are not locked yet (follow-up in #133).

### 2.6 Attachments

Files live in the `attachments` table and storage bucket, joined through `entity_attachments` (`entity_type`, `entity_id`).

| `entity_type` | Holds |
|---|---|
| `purchase` | The invoice or receipt, on the purchase **header**. |
| `gig_financial` | A receipt or document for one gig ledger row. |
| `asset` | Manuals, photos and other documents for a piece of equipment. |
| `gig` | General gig documents; not financial. |

`purchase_scan_queue` holds invoices uploaded to Scan invoices that are waiting to be read or reviewed. A row is removed when its purchase is saved or the invoice is discarded. Deleting a row that has attachments runs `trg_cleanup_attachments`.

---

## 3. Tax treatment rules (#133)

| | Expense | Depreciate |
|---|---|---|
| Equipment record (`asset_id`) | optional | **required** (checked at commit) |
| Gig expense (a `gig_financials` row pointing at the line) | optional | **not allowed** |
| `recovery_period` | none | 5, 7 or 15 |
| Headers | no `tax_treatment`, no equipment | |

**How the rules are enforced** (migration `20261006000000`, tests in `supabase/tests/rls/40_tax_treatment.test.sql`):
- **Check constraints** on the values and on "lines only".
- **Default trigger:** a line written without a treatment takes it from `row_type` (`asset` → depreciate, `item` → expense). A `row_type` change that leaves the treatment alone (the old "Reclassify as Asset") moves it too. This keeps today's app working until the UI sets the treatment itself.
- **Deferred constraint trigger** for "depreciate has equipment". `create_purchase_transaction_v1` inserts a line before linking its asset, so the check waits for the end of the transaction.
- **Triggers on both tables** for "never a gig expense": one on `gig_financials` (insert, or a change of `purchase_id`), and one on `purchases` (a change to depreciate).

**Choosing the treatment** (UI, #133 step 2). The user is asked:

> For tax purposes, do you want to mark this item as an expense, or a depreciable asset. (Per-item cost of less than $200 should automatically be expensed. Any item over $2500 should be depreciated. From $200 to $2500 is a grey zone.)

- **Per-item cost** is `item_cost`.
- **Pre-sets:** under $200 is Expense; over $2,500 is Depreciate; nothing is pre-set in between.
- **Changeable** until the year is locked. Whether the de minimis safe harbor is elected is only known at filing, so the app never forces it.

"Track as equipment" is a separate question.

**Backfill.** Asset lines became `depreciate` and item lines `expense`, which reproduces the 2024 and 2025 returns as filed.
- Production at migration time: 193 depreciate, 269 expense, 292 headers.
- One exception is applied by a data fix: Excellines XLR 10-pack (2025-02-14), expensed on the return, becomes `expense` and stays equipment.
- After that fix, 2024 and 2025 are locked.

---

## 4. How each screen writes

| Where (UI) | Writes | Notes |
|---|---|---|
| Financials → Purchases → **Scan invoices** | Header + lines; an `assets` row per line marked as equipment; the file as `purchase` attachment | Several files at once, read in the background two at a time, reviewed one at a time. RPC `create_purchase_transaction_v1`. |
| Financials → Purchases → **Add manually** | Same, without a file | Attach the file afterwards with **Attach Doc** on the report. |
| Gig → Financials → **Upload Receipt** | Same, plus **one** gig money-out row for the whole invoice total (`purchase_id` = header) | Scans one file. Booking the whole invoice, equipment included, is bug #130. |
| Assets list → **Upload Invoice** | Same as Scan invoices, for one file | Opens manual entry if the file can't be scanned. |
| Purchases report → **Attach Doc** | A `purchase` attachment on the header | No scan. |
| Import → **CSV Import** | Headers, lines and assets from rows | No gig links, no attachments. `source` 0 = header, 1 = equipment line + asset, 2 = expense line. See `purchases-field-mapping.md`. |
| Assets → new asset | An `assets` row only | No purchase. |
| Gig → **Booking** / **Payment received** / **Other** | Money-in or money-out rows | |
| Gig → **Expense / Mileage** | One money-out row | Mileage = miles × the IRS rate for the date (`src/utils/financials.utils.ts`; 2025–26 rates wrong, #125 F1). A simple expense can carry a receipt (`gig_financial`). |
| Staffing → **Finalize** | Money-out row at Owed | §2.4 |
| Purchases report → line → **Assign Gig** | Line `gig_id`; then offers a paid money-out row at `line_cost` | Moving the line moves the row; clearing the gig offers to delete it; **Add to gig ledger** covers lines linked earlier. |
| Purchases report → invoice → **Assign receipt to gig** | Header and unlinked lines' `gig_id`; offers rows for the expense lines | Lines already on another gig are left alone. |
| Purchases report → line → **Reclassify as Asset** | Creates the asset; line becomes `asset`/depreciate | One way only. Replaced in #133 step 2 by the two settings. Its ledger cleanup is wrong (#129). |

The AI scan suggests whether each line is equipment (a $50 durable rule) and suggests categories; the user can change both before saving.

---

## 5. Counting

All gig money calculations live in `src/utils/moneyFlow.ts`, so the gig page, Gig Accounting and the CSV export agree.

```
EXPECTED IN   = Σ money in at accepted or later   (paid rows at amount_settled)
RECEIVED      = Σ amount_settled, money in, paid
OWED TO YOU   = Σ amount, money in, accepted … invoiced
DUE NOW       = the part of OWED TO YOU past its due date, or with no due date on a gig that is over

EXPECTED OUT  = Σ money out at accepted or later   (paid rows at amount_settled)
PAID OUT      = Σ amount_settled, money out, paid
YOU OWE       = Σ amount, money out, accepted … invoiced
PROJECTED STAFF = Σ unfinalized Confirmed/Requested assignments (fee, else rate)

TOTAL COSTS   = EXPECTED OUT + PROJECTED STAFF
NET           = EXPECTED IN − TOTAL COSTS        MARGIN = NET / EXPECTED IN
```

**Tax year, cash basis** (Financials → Reporting, #125):

```
EXPENSES  = purchase lines with tax_treatment = expense, by line date
          + gig money-out rows with no purchase_id, by paid date
DEPRECIABLE = purchase lines with tax_treatment = depreciate, by line date
              (cost, recovery period; disposals from the equipment record)
INCOME    = amount_settled of paid money-in rows, by paid date
```

Gig rows **with** a `purchase_id` are skipped, because the line already counts.

---

## 6. Categories and mileage

**Categories today** come from three unconnected lists:
- purchases: free text;
- equipment: free text;
- gig money out: the `fin_category` Schedule C list.

Purchase categories map to `fin_category` only on an exact name match; anything else becomes Other expenses. #125 replaces all three with one shared `expense_categories` table, which gives each category a Schedule C line and a default recovery period.

**Mileage** is recorded only on a gig: miles × the IRS standard rate for the trip's date. The rate table is fixed in #125 F1. It needs 70¢ for 2025, and 72.5¢ to 2026-06-30 then 76¢.

---

## 7. Known problems (2026-10-06)

| # | Problem | Issue |
|---|---|---|
| 1 | Reclassify as Asset deletes ledger rows by the header id: a line's own gig row survives, and a whole-invoice row is deleted. There is no way back. | #129 (largely replaced by #133) |
| 2 | Upload Receipt on a gig books the whole invoice, equipment included, as one gig expense. Later per-line links can count lines twice. | #130 |
| 3 | Editing a purchase's date doesn't reach its lines. Lines added while editing get no date. | #131 |
| 4 | Ledger edits from the purchase dialog use the printed price and don't update the paid amount. | #131 |
| 5 | The review dialog drops the asset Type and the AI's manufacturer/model. | #131 |
| 6 | Duplicating an asset copies its purchase link, serial number and tag. | #131 |
| 7 | **Add manually** and editing a purchase can't attach a file. Use **Attach Doc** on the report. | |
| 8 | Mileage rates for 2025–26; free-text categories and status. | #125 |

Fixed: #128 (editing a cost-only purchase zeroed its costs, 2026-10-05). The 2025 data was reconciled with the filed return on 2026-10-05 (see `WORK_PLAN.md`).

---

## 8. Related documents

- [database.md](database.md): column lists for every table.
- [purchases-field-mapping.md](purchases-field-mapping.md): CSV import mapping.
- `docs/product/development-plan/07_gig-financials-workflow.md`: the original design; describes the older `fin_type` model.
- User guide: `website/docs/src/content/docs/financials/`.
