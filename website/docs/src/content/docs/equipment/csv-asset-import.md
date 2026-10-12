---
title: Importing equipment from a spreadsheet
description: Load the equipment you already own from a CSV file, as purchases with units, lots and kits, when you set up GigWrangler.
sidebar:
  order: 8
---

If you're moving to GigWrangler from a spreadsheet, you don't have to enter your gear
one item at a time. Put your purchases in a CSV file and import them: GigWrangler
creates the items, the units and lots you own, the purchases they came from, and the
kits they go in. It's meant for setting up a new account. An import only adds; it never
changes what's already there.

Admins and Managers import from **Equipment → Items → Import**. Choose **Assets** under
**Import Type**.

## Start from the example

Select **Download Example** for a small, complete file: one Sweetwater invoice for
4 Shure SM58s (with serial numbers), 2 Beta 52As (with tags), 10 mic clips and a pack of
AA batteries. The mics and clips all go into a kit called "Mic Kit 1"; the batteries
are expensed. Import it as it is to see what an import makes, then use
**Download Template** for an empty file with the same columns.

## The file

Each purchase is an invoice row followed by its lines. The **source** column says which
is which:

- **0-Invoice**: the invoice itself: **acquisition_date**, **vendor**,
  **total_inv_amount** and **payment_method**.
- **1-Asset**: equipment you'll track.
- **2-Expense**: something you expense, such as batteries. It isn't tracked.

The columns come in three groups:

| Group | Columns |
|---|---|
| The item | manufacturer_model, category, type, description, insurance_class |
| Your units or lot | quantity, serial_number, tag_number, kit, replacement_value, insured, recovery_period |
| The purchase line | acquisition_date, vendor, source, total_inv_amount, payment_method, line_amount, line_cost, item_price, item_cost |

GigWrangler reads columns by their names, so their order doesn't matter.

### Units and lots

- **Units:** list one serial number or tag per unit, separated by `;`, such as
  `2NC0412;2NC0413;2NC0414;2NC0415`. Four serials make four units. Give each unit a
  serial or a tag; either will do.
- **A lot:** leave both blank. "Mic Clip", quantity 10, makes a lot of 10.
- **quantity** can be left blank when you list serials or tags; it's the number of
  entries.

Everything imports as **Active**. Record sales and retirements on the equipment's page
afterwards. An older file with **status**, **retired_on** or **liquidation_amt**
columns still imports; you'll see a notice that those columns aren't imported.

### Kits

Put a kit's name in **kit** to add the line to it. If no kit has that name, GigWrangler
creates it. Each unit, or the lot with its quantity, becomes a line in the kit. Only
equipment (**1-Asset**) rows can go in a kit.

### Items you already have

If a row matches an item you already have (the same model and category), GigWrangler
uses that item and leaves it as it is. The preview notes any differences, such as
"Differs from the stored item…".

## Checking and importing

1. Drop the file on **Upload CSV File**, or click to choose it.
2. The **Import Summary** counts **Valid rows** and **Invalid rows**. Valid rows show
   their kit, such as "Mic Kit 1 (new kit)", and notes, such as "Qty 3 (from serials)".
3. Fix any invalid rows. Each lists its errors, such as "Unit 2 needs a serial number or
   a tag (either will do).", and you can edit the fields right there. Then select
   **Re-validate Fixed Rows**.
4. Select **Import N Complete Purchase(s)**.

A purchase with an invalid row is held back whole, so it never imports half-done. Its
lines show "Held: fix row N" until you fix that row. The other purchases import.

If a purchase fails to save, select **Retry N Failed Purchase(s)**. It sends only the
purchases that failed, never one that already saved.

## Related

- [Purchases](/financials/purchases/)
- [Assigning equipment to a gig](/equipment/assigning-to-a-gig/)
