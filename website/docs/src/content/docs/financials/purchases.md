---
title: Purchases
description: Find, check, fix and link your invoices and their line items.
sidebar:
  order: 3
---

**Financials → Purchases** lists every invoice and receipt you've recorded. Admins and Managers also see two more tabs, **Add manually** and **Scan invoices** (see [Receipts and invoices](/financials/receipts-and-invoices/)).

## The report

**Filters:**
- **Vendor**, **Type** (**All Types**, **Assets**, **Expenses**), and a **From** / **To** date range.
- Quick ranges: **Last 30 days** (the default), **This month**, **Last month**, **This quarter**, **This year**, **Last year**, **All time**.
- **Clear all filters** puts everything back to the defaults.

**Totals.** The box beside the filters shows:
- the total for what's on screen, labelled **Last 30 days** or **Filtered**, with the number of equipment lines (**Assets**) and **Expenses**;
- the **All time** total.

**Views.** The two buttons switch between them:
- **Detailed view:** one card per invoice, with its lines.
- **Summary view:** one row per invoice. A warning icon marks invoices whose lines don't add up to the invoice total. Click a row to jump to that invoice.

## An invoice

Each invoice card shows the date, vendor, description and **Invoice Total**, and these buttons:

- **Assign receipt to gig…**: links the invoice and all its unlinked lines to a gig, then asks **Add these expenses to the gig ledger?** **Add all** records each expense line in the gig's money out.
- **Gig Details**: shows the linked gig.
- **Attach Doc** / **View Doc**: attach the invoice file, or open it.
- **Edit** (pencil): opens the purchase on the review screen. See [Receipts and invoices](/financials/receipts-and-invoices/#the-review-screen).
- **Delete** (trash): deletes the invoice and its lines. A gig's money-out rows and equipment records are **not** deleted with it.

## A line

The line table shows **Type** (**Asset** or **Expense**), **Description / Model**, **Category**, **Qty**, **Price** and **Cost**. **Cost** is the item's share of the invoice total; see [Cost allocation](/financials/cost-allocation/).

Click a line to open it. You'll see its price and cost figures, and these actions:

- **Asset Details**: the equipment record, with **Edit Asset** and **Open Asset**.
- **Gig Details**: the linked gig, with **Open Gig**.
- **Delete Item**: removes the line. Its equipment record, if any, is kept.
- **Reclassify as Asset** (expense lines only): turns the line into equipment and creates its equipment record. This can't be undone. If the purchase is linked to a gig, the gig's matching expense is removed.

### Linking a line to a gig

Use **Assign Gig:** on the line to say it was a cost of a particular gig (a van rental, a replacement cable for that show).

- **First time:** you're asked **Create gig expense record?**
  - **Create record** adds the line's cost to the gig's money out as paid.
  - **Skip** keeps the link without adding it.
- **Moving the line to another gig** moves its expense too.
- **Clearing the gig** asks whether to **Unlink and delete entry** or **Keep linked**.
- **Add to gig ledger** appears on any expense line that's linked to a gig but isn't in its money out yet, for example after you clicked **Skip**.

Equipment lines are never added to a gig's money out. Equipment is bought for the business, not for one show.

## Coming soon: tax treatment and equipment as separate choices

Today a line is either an **Asset** or an **Expense**. Soon each line will ask two separate questions:
- **Track as equipment?** — so it can go in kits.
- **For tax: expense or depreciate?**

So a cable you expensed can still go in a kit.
