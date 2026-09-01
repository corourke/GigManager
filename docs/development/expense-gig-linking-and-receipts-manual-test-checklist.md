# Expense↔Gig Linking & Expense Receipts — Manual Test Checklist

**What this covers:** the five commits that (1) fix wrong gig profitability numbers when a
purchase line's gig assignment changes, (2) let you attach receipts/documents to an individual
gig expense on web and mobile, (3) let you assign a whole receipt (or a single line) to a gig
after the fact and pull it into the ledger, and (4) clean up attachment records when an expense
or gig is deleted.

**How to read a step:**

- **🐛 REGRESSION CHECK** — this is verifying a bug that was fixed. If the "after" number is
  wrong, that's a regression and should block a merge.
- **✨ NEW FEATURE** — this is exercising something new. A failure here is a new-feature bug.
- Every step ends with a concrete thing to look at — a dollar amount, a badge, a count, a
  dialog. For the profitability steps, the **Costs** and **Profit** tiles at the top of a gig's
  Financials section are the scoreboard; write down what they read before and after.

**Roles:** everything below works for an **Admin** *or* a **Manager**. A **Staff** or **Viewer**
account does not see the Financials section or the Purchases tab at all — spot-check that once
(Step 0.6) and otherwise run as Admin.

---

## Environment notes

- Run against the deployed app (or a local dev server) with the **two new database migrations
  applied** (`20260831000000_allow_gig_financial_attachments` and
  `20260831000100_cleanup_entity_attachments_on_delete`). If attaching a file to an expense
  fails with a database/constraint error, the first migration is not applied.
- **AI receipt scanning** ("Upload Invoice" on the Purchases tab, "Upload Receipt" in a gig's
  Financials section) needs the AI-scan service configured. **If it is not available, use
  "Add New" on the Purchases tab instead** — it opens the same purchase editor with an empty
  form, which is all the setup steps need. Every step in this checklist is written to work with
  manual "Add New" purchases; the scan path is only mentioned as an alternative.
- **Orphan cleanup (Part 6)** is mostly a database-level guarantee. The checklist gives you the
  UI-visible symptoms to look for; confirming *zero* leftover rows needs a database query and is
  called out where it applies.

---

## Part 0 — Setup

Do these in order; later parts reuse this data.

- [x] **0.1** Create a test gig. Gigs → **New Gig** (or **Add Gig**). Title it `SMOKE — Gig A`,
      give it any dates, status **Booked**. Save.
- [x] **0.2** Create a second gig the same way, titled `SMOKE — Gig B`.
- [x] **0.3** Open **SMOKE — Gig A**, scroll to the **Financials** section. Click **Edit
      Financials**. Add one revenue record so the gig has a baseline: click **Agreement**,
      choose type **Contract Signed**, amount **1000**, save. The **Revenue** tile should now
      read **$1,000.00**, **Costs** **$0.00**, **Profit** **$1,000.00**. **Write these down** —
      this is Gig A's baseline.
- [x] **0.4** Do the same on **SMOKE — Gig B**: Contract Signed **$1,000**. Baseline: Revenue
      $1,000, Costs $0, Profit $1,000.
- [x] **0.5** Create a manual purchase with two line items:
      - Go to **Financials → Purchases** tab.
      - Click **Add New**. In the "Create Purchase Entry" dialog set Vendor `SMOKE Vendor`,
        a purchase date, **Invoice Total `300`**.
      - Click **Add Item**: description `Van rental`, quantity `1`, price `200`.
      - Click **Add Item** again: description `Fuel`, quantity `1`, price `100`.
      - Click **Save Purchase**.
      - Expected: a new receipt card appears for `SMOKE Vendor` with **Invoice Total $300.00**
        and two rows — `Van rental` (Expense, $200.00) and `Fuel` (Expense, $100.00). Neither
        row shows a "Gig Details" button (not linked to any gig yet).
- [ ] **0.6** *(one-time role check)* Log in as a **Staff** or **Viewer** user, open a gig →
      there is **no Financials section**. Go to Financials → the **Purchases** tab shows no
      "Add New" / data. Log back in as Admin/Manager.
- [ ] **0.7** Have a small **PDF file** on hand to use as a receipt (any PDF, a page or two).

---

## Part 1 — Correctness bugs (🐛 REGRESSION CHECK)

These are the whole point of the change. Each one is about a gig's **Costs** / **Profit** tiles
reading the right number.

### 1.1 — First assignment creates one ledger entry

- [x] Financials → **Purchases** tab. Expand the **`Van rental`** row (click it). In the line
      detail, use the **Assign Gig** picker and choose **SMOKE — Gig A**.
- [x] A dialog **"Create gig expense record?"** appears, mentioning **$200.00** and Gig A.
      Click **Create record**.
- [x] Toast confirms the entry was created.
- [x] Open **SMOKE — Gig A** → Financials. **Costs** now reads **$200.00** and **Profit**
      reads **$800.00** (baseline $1,000 − $200). The Expenses list has **exactly one** row
      for `Van rental`, $200.00, with a **Receipt** badge.

### 1.2 — 🐛 Reassign Gig A → Gig B moves the ledger entry (no stranded row)

*This is the stranded-row bug. Before the fix, Gig A stayed at $200 forever.*

- [x] Back on **Purchases**, expand `Van rental` again. Change the **Assign Gig** picker from
      Gig A to **SMOKE — Gig B**.
- [x] Toast reads approximately **"Moved to SMOKE — Gig B — its ledger entry moved too"**
      (a *move*, not a new prompt to create a record).
- [x] Open **SMOKE — Gig A** → Financials. **Costs** is back to **$0.00**, **Profit** back to
      **$1,000.00**. The `Van rental` expense row is **gone** from Gig A.
- [x] Open **SMOKE — Gig B** → Financials. **Costs** reads **$200.00**, **Profit** **$800.00**,
      and there is **exactly one** `Van rental` expense row. (Not two, and Gig A + Gig B costs
      total $200, not $400.)

### 1.3 — 🐛 Clearing a line's gig asks first, then removes the entry (no orphan)

*Before the fix, clearing the gig silently left the $200 expense on Gig B forever.*

- [x] On **Purchases**, expand `Van rental`. In the **Assign Gig** picker, click the **✕ / clear**
      control to unassign the gig.
- [x] A confirmation dialog **"Remove gig association and its ledger entry?"** appears,
      mentioning **$200.00**. Click **Keep linked** (cancel it).
- [x] Nothing changed: the line is still assigned to Gig B; **SMOKE — Gig B** Costs still
      **$200.00**.
- [x] Clear the gig again — this time click **Unlink and delete entry**.
- [x] Toast confirms removal. Open **SMOKE — Gig B** → Financials: **Costs** back to **$0.00**,
      **Profit** back to **$1,000.00**, the `Van rental` row is gone.
- [x] Back on Purchases, the `Van rental` line shows no "Gig Details" button (fully unlinked).

### 1.4 — 🐛 Dedup: a full cycle never produces a second entry

*Exercises the guard that prevents an unassign/reassign cycle from double-counting.*

- [x] Starting from the unlinked `Van rental` line: assign it to **SMOKE — Gig A**, click
      **Create record** on the prompt. Gig A **Costs $200.00**.
- [x] Reassign the line to **SMOKE — Gig B** (move). Gig A **Costs $0.00**, Gig B **Costs $200.00**.
- [x] Reassign the line back to **SMOKE — Gig A** (move). Gig A **Costs $200.00**, Gig B **Costs $0.00**.
- [x] Clear the gig → **Unlink and delete entry**. Gig A **Costs $0.00**.
- [x] Assign it to **SMOKE — Gig A** once more → **Create record**.
- [x] **Final check:** **SMOKE — Gig A** Financials shows **Costs $200.00**, **Profit $800.00**,
      and its Expenses list has **exactly one** `Van rental` row. At no point in the cycle did
      Gig A show **$400**, and Gig A + Gig B costs never summed to more than **$200**.
- [x] Leave `Van rental` assigned to **Gig A** with its ledger entry — Part 6 uses it.

---

## Part 2 — Attach a receipt to a gig expense, on web (✨ NEW FEATURE)

- [ ] Open **SMOKE — Gig A** → Financials. Find the `Van rental` expense row. It has a
      **paperclip** icon button in the row's action area (visible whether or not the section is
      in edit mode).
- [ ] Click the paperclip. A **"Receipts & Documents"** dialog opens showing "No attachments
      found" and an **Upload** button. (Any Admin/Manager can attach — you do **not** need to
      click "Edit Financials" first. A Staff/Viewer never reaches this screen at all.)
- [ ] Upload your PDF (Step 0.7). It appears in the list with its filename and today's date.
- [ ] Close the dialog (**Done**). The paperclip button on the `Van rental` row now shows a
      small **"1"** count next to it.
- [ ] Re-open the paperclip dialog, click the **eye / view** icon on the file — the PDF opens
      in a new tab.
- [ ] In the dialog, remove the attachment (**✕ / remove**, confirm the prompt). The row's
      paperclip count goes back to no number.
- [ ] Re-attach the PDF (you'll want it there for Part 6). Count shows **1** again.
- [ ] **Also confirm the entry-form is unchanged:** click **Add Record** / the pencil to edit
      the `Van rental` row — the edit dialog has **no** file field (attachments are only via the
      paperclip). Cancel out.

---

## Part 3 — Attach a receipt to a gig expense, on mobile (✨ NEW FEATURE)

Use a phone, or your browser's device-emulation mode, and sign in as Admin/Manager.

- [ ] Bottom nav → **Gigs** → open **SMOKE — Gig A**.
- [ ] Scroll to the **Financials** card. It shows Revenue / Costs / Profit and a
      **"View N Transactions"** button. Tap it.
- [ ] In the transactions list, the `Van rental` entry shows a small **paperclip** icon next to
      its amount (because Part 2 left a file on it). Entries with no attachment show no paperclip.
- [ ] Tap the `Van rental` transaction. The detail view opens, and near the bottom there is a
      **"Receipts & Documents"** area listing the PDF you attached on web.
- [ ] Tap the file — it opens.
- [ ] Tap **Upload** and add the PDF a second time (any file). It appears in the list; back on
      the transaction list the paperclip is still shown.
- [ ] Remove that second copy so the entry is back to one attachment.
- [ ] *(Note: creating a brand-new expense on mobile still needs the pencil / Edit control on
      the gig; attaching to an existing transaction, as above, does not.)*

---

## Part 4 — Assign a whole receipt to a gig (✨ NEW FEATURE)

Uses the `SMOKE Vendor` purchase from Step 0.5, which still has the **`Fuel`** line unlinked.

- [x] First, make sure the receipt has an **unlinked** line: on **Purchases**, the `SMOKE
      Vendor` card should show `Van rental` linked to Gig A (from Part 1) and `Fuel` with no
      gig. If `Van rental` is also unlinked, that's fine too.
- [x] In the `SMOKE Vendor` card **header row** (the grey bar with the vendor name and Invoice
      Total), there is an **"Assign receipt to gig…"** picker. Choose **SMOKE — Gig B**.
- [x] Toast reads approximately **"Assigned receipt and its lines to SMOKE — Gig B"**.
- [x] A dialog **"Add these expenses to the gig ledger?"** appears, naming a count of expense
      lines and Gig B. Click **Add all**.
- [x] Toast confirms N lines added.
- [x] Open **SMOKE — Gig B** → Financials. **Costs** increased by the total of the lines that
      were just linked:
      - If only `Fuel` was unlinked: **Costs $100.00** (Profit $900.00), one new `Fuel` row.
      - If both lines were unlinked: **Costs $300.00** (Profit $700.00), two rows.
      `Van rental` — which was already on Gig A — should **not** have been stolen onto Gig B;
      it's still on Gig A.
- [x] Back on Purchases, the `SMOKE Vendor` header now shows a **"Gig Details"** button, and the
      newly linked line(s) show one too.

---

## Part 5 — The persistent "Add to gig ledger" button, incl. CSV import (✨ NEW FEATURE)

This is the recovery path: a line linked to a gig but **not** in that gig's ledger.

### 5.1 — Recovering a skipped prompt

- [x] On **Purchases**, click **Add New**. Vendor `SMOKE Vendor 2`, Invoice Total `50`, one
      item: `Parking`, qty 1, price `50`. **Save Purchase**.
- [x] Expand the `Parking` line. In **Assign Gig**, choose **SMOKE — Gig A**.
- [x] On the **"Create gig expense record?"** prompt, click **Skip** this time.
- [x] The line is now linked to Gig A (it has a "Gig Details" button) but the line detail also
      shows a green **"Add to gig ledger"** button — because the ledger entry was skipped.
- [x] Confirm the skip really left the ledger alone: **SMOKE — Gig A** Financials **Costs** is
      unchanged (still whatever Part 1/4 left it at — no +$50).
- [x] Back on Purchases, expand `Parking`, click **"Add to gig ledger"**. Toast confirms.
- [x] The **"Add to gig ledger"** button is now **gone** from that line.
- [x] **SMOKE — Gig A** Financials → **Costs** increased by **$50.00**, and a `Parking`
      expense row is present.
- [x] Expand `Parking` again — clicking the assign picker's value shows it's still Gig A, and
      there's still **no** "Add to gig ledger" button (entry exists, so it can't be added twice).

### 5.2 — CSV-imported expense (🐛-adjacent: imported expenses never auto-create a ledger entry)

- [x] Go to the **Asset List** screen → **Import** → select type **Assets** → **Download
      Template** if you want the column layout.
- [x] Prepare a tiny CSV with one **expense** row: `source` = `2` (Expense), an
      `acquisition_date`, `vendor` = `SMOKE Import`, `line_amount` = `75`, `category` =
      `Supplies` (or any category), `manufacturer_model`/description = `Gaffer tape`.
- [x] Upload it, import the valid row.
- [x] Go to **Financials → Purchases**. There is a new `SMOKE Import` card with a `Gaffer tape`
      expense line (possibly under a "synthesized" header). It has **no gig** and **no** ledger
      entry anywhere.
- [x] Expand the `Gaffer tape` line → **Assign Gig** → **SMOKE — Gig B**. (You may or may not
      get the "Create gig expense record?" prompt here — either **Skip** it, or if there's no
      prompt, that's expected for imported lines.)
- [x] The line detail shows the green **"Add to gig ledger"** button. Click it.
- [x] **SMOKE — Gig B** Financials → **Costs** increased by **$75.00**, `Gaffer tape` row
      present. *(Before this change there was no way to get an imported expense into gig
      profitability short of re-typing it by hand.)*

---

## Part 6 — Cleanup when an expense or gig is deleted (🐛 REGRESSION CHECK + ✨)

The database now removes an expense's attachment records when the expense (or its gig) is
deleted. The UI-visible checks:

### 6.1 — Delete a single expense that has an attachment

The only way to delete an individual gig expense is the **row-level trash icon**, and the row
icons (pencil + trash) only appear **while the section is in edit mode**.

- [ ] Precondition: `Van rental` on **SMOKE — Gig A** has one attached PDF (from Part 2) and a
      ledger entry. Note Gig A's current **Costs** figure.
- [ ] Open **SMOKE — Gig A** → Financials. Click **Edit Financials** — the button must now read
      **"Done Editing"** (this is what reveals the per-row action icons; it resets every time
      you re-open the gig, so re-click it if you navigated away).
- [ ] Each expense row now shows, at the right, a **pencil** and a **red trash** icon (plus the
      paperclip and, for receipt-sourced rows, an external-link icon). If you clicked "Edit
      Financials"/"Done Editing" and still see no trash icon on the rows, stop and report that.
- [ ] Click the **trash** icon on the `Van rental` row. Confirm.
- [ ] **Costs** drops by **$200.00**; the `Van rental` row is gone. No error toast.
- [ ] Go to **Financials → Purchases**, expand the original `SMOKE Vendor` → `Van rental` line.
      It should still exist as a purchase line (deleting the *ledger entry* does not delete the
      *receipt*), and it should now be **unlinked from the gig** (no "Gig Details" button), with
      the green **"Add to gig ledger"** button available again.
- [ ] *(Database-level, if you have query access:* there should be **no** `entity_attachments`
      rows and **no** orphaned `attachments` row left for that deleted expense. From the UI
      alone you can only confirm the expense and its paperclip are gone.)*

### 6.2 — Shared file survives

- [ ] On the `SMOKE Vendor` **purchase header**, use **Attach Doc** to attach a PDF to the
      *receipt* itself. (This is the pre-existing purchase-attachment feature.)
- [ ] Assign the `Fuel` line to **SMOKE — Gig A** and **Add to gig ledger**. On that gig's
      `Fuel` expense row, use the paperclip to attach **the same** PDF file.
- [ ] Delete the `Fuel` **expense** from Gig A's Financials (trash icon, confirm).
- [ ] Go to **Purchases** → the `SMOKE Vendor` header still shows its **View Doc** button — the
      shared receipt file was **not** deleted just because one expense that referenced it was
      removed.

### 6.3 — Delete the whole gig

- [x] Attach a PDF to any remaining expense on **SMOKE — Gig B** (paperclip, in Edit mode).
- [x] Delete **SMOKE — Gig B** entirely (gig detail → the delete/remove action, confirm).
- [x] No error. Go to **Financials → Purchases**: the purchase lines that had been linked to
      Gig B still exist as purchase rows, now unlinked (their ledger entries went away with the
      gig). Nothing in the Purchases tab is broken or shows a dangling "Gig Details" button
      pointing at the deleted gig.

---

## Cleanup

- [ ] Delete `SMOKE — Gig A`, the `SMOKE Vendor`, `SMOKE Vendor 2`, and `SMOKE Import`
      purchases, and any imported `Gaffer tape` asset/expense created along the way.

---

## Regression summary — if any of these fail, do not merge

| Step | What it proves |
|------|----------------|
| 1.1  | Assigning a purchase line to a gig creates exactly one ledger entry; gig Costs rises by the line amount |
| 1.2  | Reassigning a line A→B moves its ledger entry — old gig returns to baseline, new gig rises; totals never double |
| 1.3  | Clearing a line's gig confirms first; cancelling changes nothing; confirming removes the entry and returns the gig to baseline |
| 1.4  | A full assign/reassign/clear/reassign cycle still leaves exactly one entry and the correct total — never $400 |
| 6.1  | Deleting an expense removes its ledger amount from the gig and unlinks the source purchase line, no error |
| 6.2  | Deleting one expense does not delete a receipt file that another record still uses |
| 6.3  | Deleting a gig doesn't leave broken links or errors in the Purchases tab |
