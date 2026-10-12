### Purchases field mapping (CSV assets import)

Files are read by header name, so columns can come in any order. The template (Import → **Download Template**) lists them in three groups (#183 D, mockup 11): what the item is, the unit or lot we own, and the purchase line. **Download Example** gives a worked file: a microphone purchase that goes into a kit (`src/config/import-examples/mic-kit-purchase.csv`, which the tests import too).

Every row of the file, valid or not, is grouped into purchases in file order: an invoice row (`source` 0) starts one; the rows after it join it, matched by date + vendor or else the last invoice; a line with a total of its own is a purchase by itself. Each purchase is saved whole or not at all by `create_purchase_transaction_v2`, then rows that name a kit get their kit lines.

**Only complete purchases import** (#183 D review). An import always creates new rows and never rewrites saved ones; it is meant to seed a new account (Cameron, 10-12).

- A purchase with an invalid row (its invoice row or any line) is held back: its total isn't allocated and nothing of it is saved. Its valid rows show "Held: fix row N". The button reads "Import N Complete Purchase(s)".
- An invoice row with no lines is refused ("The invoice on row N has no lines. Put its lines on the rows after it, or delete the row."), so no purchase is saved without lines.
- **Re-validate Fixed Rows** re-checks the whole file (imported rows included), so a fixed row goes back on its own invoice. A fixed row whose invoice was already imported is refused ("Row N belongs to the invoice on row M, which was already imported. Imports never add lines to a saved invoice: add it on the purchase screen."); the saved purchase is never sent again. Rows of a purchase that failed to save are ready again.
- **Retry N Failed Purchase(s)** re-sends only the purchases whose save failed (nothing of them was saved), never one with a row already imported.

**What it is (the item).** Rows match a stored item by `manufacturer_model` + `category` (trimmed, spaces collapsed, any case: `equipment_match_key`). A match is reused and never changed; the preview notes "Differs from the stored item (…)" when the row's type, description or insurance class differ. Otherwise the import makes a new item from the first row that names it.

| Column | Writes | Notes |
| --- | --- | --- |
| `manufacturer_model` | item; line `description` | Required on equipment rows |
| `category` | item; line `category` | Required on equipment and expense rows |
| `type` | item (new only) | Old sheets' `equipment_type`, `sub-category` are read as this |
| `description` | item (new only) | Old sheets' `notes` is read as this |
| `insurance_class` | item (new only) | Old `insurance_category` is read as this |

**What we own (the unit or lot).** Equipment rows only (`source` 1). Every unit and lot is Active.

| Column | Writes | Notes |
| --- | --- | --- |
| `quantity` | line `quantity`; the lot's quantity | A whole number (spaces around it are fine; 3.5, 1e1 or 1,000 are refused). Blank: 1, or the number of serials/tags listed (shown as "Qty 3 (from serials)") |
| `serial_number` | each unit's `serial_number` | One per unit, separated by `;` |
| `tag_number` | each unit's `tag_number` | One per unit, separated by `;`. Serials and tags pair by position; the longer list is the number of units, which must equal the quantity. Neither: a lot |
| `kit` | `kit_components` (`asset_id` lines) | Each unit (quantity 1), or the lot with its quantity, becomes its own line in the kit, found by name (any case) or created (category "Imported"). Not allowed on invoice or expense rows |
| `replacement_value` | each unit's or the lot's `replacement_value` | Per piece |
| `insured` | `insurance_policy_added` | yes / true / y / 1 |
| `recovery_period` | `recovery_period` | 5, 7 or 15; depreciated lines only; blank: the category's default. Old `service_life` is read as this |

**The purchase line.**

| Column | Writes | Notes |
| --- | --- | --- |
| `acquisition_date` | header and line `purchase_date`; units' `acquisition_date` | Lines without one take the invoice's |
| `vendor` | header and line `vendor` | Lines without one take the invoice's |
| `source` | — | `0-Invoice`: header. `1-Asset`: a depreciated line with units or a lot. `2-Expense`: an expensed line, no equipment |
| `total_inv_amount` | header `total_inv_amount` | Lines are scaled to add up to it ([financials.md](financials.md)) |
| `payment_method` | header `payment_method` | |
| `line_amount`, `item_price` | line | Printed price; scaled by the invoice's total |
| `line_cost`, `item_cost` | line; units' `item_cost` | Given costs are kept as they are |

**Checks.** One serial or tag on a line of more than one is refused with how to fix it ("1 serial number for quantity 4. Give 4 serial numbers separated by ";" (4 units), or clear the serial number (a lot of 4)."). A unit with neither, or a serial or tag listed twice in a row or on two rows of the file, is refused in the same words as the Equipment details pop-up; a row already imported keeps its serials and tags ("Tag MIC-1 is also on row 4, which was already imported.").

**No longer read.** `kit` stays (Cameron, 10-11). `status` was dropped (Cameron, 10-12: "Import is meant to initially seed a new account"): every imported unit and lot is Active. `retired_on` and `liquidation_amt` were dropped (Cameron, 10-11). Old files with any of these still import, with one notice: "These columns aren’t imported: status, retired_on, liquidation_amt. Imported equipment is Active. Record sales and retirements on the equipment page." (naming only the columns the file has). `service_life` and `dep_method` were dropped earlier (#125).
