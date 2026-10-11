### Purchases field mapping (CSV assets import)

Files are read by header name, so columns can come in any order. The template (Import → **Download Template**) lists them in three groups (#183 D, mockup 11): what the item is, the unit or lot we own, and the purchase line. **Download Example** gives a worked file: a microphone purchase that goes into a kit (`src/config/import-examples/mic-kit-purchase.csv`, which the tests import too).

Rows are grouped into purchases in file order: an invoice row (`source` 0) starts one; the rows after it join it, matched by date + vendor or else the last invoice; a line with a total of its own is a purchase by itself. Each purchase is saved whole or not at all by `create_purchase_transaction_v2`, then rows that name a kit get their kit lines.

**What it is (the item).** Rows match a stored item by `manufacturer_model` + `category` (trimmed, spaces collapsed, any case: `equipment_match_key`). A match is reused and never changed; the preview notes "Differs from the stored item (…)" when the row's type, description or insurance class differ. Otherwise the import makes a new item from the first row that names it.

| Column | Writes | Notes |
| --- | --- | --- |
| `manufacturer_model` | item; line `description` | Required on equipment rows |
| `category` | item; line `category` | Required on equipment and expense rows |
| `type` | item (new only) | Old sheets' `equipment_type`, `sub-category` are read as this |
| `description` | item (new only) | Old sheets' `notes` is read as this |
| `insurance_class` | item (new only) | Old `insurance_category` is read as this |

**What we own (the unit or lot).** Equipment rows only (`source` 1).

| Column | Writes | Notes |
| --- | --- | --- |
| `quantity` | line `quantity`; the lot's quantity | Blank: 1, or the number of serials/tags listed (shown as "Qty 3 (from serials)") |
| `serial_number` | each unit's `serial_number` | One per unit, separated by `;` |
| `tag_number` | each unit's `tag_number` | One per unit, separated by `;`. Serials and tags pair by position; the longer list is the number of units, which must equal the quantity. Neither: a lot |
| `kit` | `kit_components` (`asset_id` lines) | Each unit (quantity 1), or the lot with its quantity, becomes its own line in the kit, found by name (any case) or created (category "Imported"). Not allowed on invoice or expense rows |
| `replacement_value` | each unit's or the lot's `replacement_value` | Per piece |
| `status` | `status` | Active, Inactive, Maintenance, Disposed or Returned (any case); blank: Active. Missing is refused: only a write-off sets it |
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

**Checks.** One serial or tag on a line of more than one is refused with how to fix it ("1 serial number for quantity 4. Give 4 serial numbers separated by ";" (4 units), or clear the serial number (a lot of 4)."). A unit with neither, or a serial or tag listed twice in a row or on two rows of the file, is refused in the same words as the Equipment details pop-up.

**No longer read.** `kit` stays (Cameron, 10-11). `retired_on` and `liquidation_amt` were dropped (Cameron, 10-11): old files still import, with a notice to record sales and retirements on the equipment page. `service_life` and `dep_method` were dropped earlier (#125).
