---
title: Receipts and invoices
description: The three places to scan an invoice, the review screen, and attaching files without scanning.
sidebar:
  order: 2
---

A **purchase** is one invoice or receipt. GigWrangler stores the invoice total and one line per item, and keeps the file with it.

## Scanning: three places

Scanning reads a PDF or photo and fills in the vendor, date, total and line items for you. Nothing is saved until you've checked it.

### 1. Financials → Purchases → Scan invoices

Use this for a stack of invoices.

1. Click **Add invoices**, or drag files onto the page. You can add several at once.
2. They're read in the background. Each takes 10 to 30 seconds, and you can keep working on other tabs meanwhile. The **Scan queue** shows each file as **Waiting**, **Scanning…**, **Ready to review** or **Failed**.
3. The first invoice that's ready opens for review. Check it, then click **Save Purchase**. The next one opens.

**Discard** deletes the file and saves nothing. **Retry** tries a failed file again.

The queue belongs to your organization, so another Admin or Manager can pick up where you left off. The **Scan invoices** tab shows how many invoices are waiting for review.

### 2. A gig → Financials → Upload Receipt

Use this for a receipt that belongs to one gig, such as a van rental for that show.

1. Open the gig, go to its **Financials** tab and click **Edit Financials**.
2. Click **Upload Receipt** and choose one file.
3. Check the purchase and save it.

Saving creates the purchase and adds the receipt's total to the gig's **money out**.

:::caution
Today this adds the **whole** receipt to the gig, including any equipment on it. If the receipt has equipment on it, scan it from **Purchases** instead, then link only the expense lines to the gig (see [Purchases](/financials/purchases/#linking-a-line-to-a-gig)).
:::

### 3. Equipment → Upload Invoice

Use this when you've bought equipment. It works like Scan invoices, for one file.

If the file can't be scanned, you're taken to manual entry.

## The review screen

The same screen appears for every scan, for **Add manually**, and when you edit a saved purchase.

- **Purchase Summary:**
  - **Vendor**, **Date**, **Description / Notes**.
  - **Invoice Total**, which is the total you actually paid, including tax and shipping.
- **Line Items:** one row per item, with **Description**, **Item Price**, **Qty**, **Line Amt** and **Unit Cost**.
  - **Unit Cost** is calculated: the invoice total is spread across the lines (see [Cost allocation](/financials/cost-allocation/)).
  - **Add Item** adds a line; the trash icon removes one.
- **Two questions on every line** (see [Tax treatment and equipment](/financials/tax-treatment/)):
  - **Expense | Depreciate:** how the item counts for tax. It's set for you from the item's cost: **Expense** under $200, **Depreciate** over $2,500. Between those you choose; the **(?)** explains. **Save Purchase** waits until every line has one.
  - **Equipment:** the switch under the line. Turn it on (it turns blue) for gear you look after. Saving then creates an equipment record you can tag and put in kits. The arrow at the start of the row shows **Type**, **Kit name**, **Serial #**, **Tag #** and **Replace Value**.
- **Categories**, picked from lists:
  - **Expense:** for an expensed item, the heading it goes under at tax time (Small audio parts, Supplies, Software subscriptions, Insurance, …).
  - **Equip.:** for anything tracked as equipment, its equipment category (Audio, Lighting, Cases/Bags, …). Choose **Add new category…** at the bottom to type a new one. **Save Purchase** waits until every new piece of equipment has one.
  - A depreciated item has only the equipment category. An expensed item tracked as equipment has both.
  - Each line also has a free-text **Sub-cat**.
- **Reconciled / Mismatch:** at the bottom, GigWrangler compares the lines with the invoice total. **Mismatch** means they differ by more than 5¢. Fix the total or the lines before saving.

The scan suggests which lines are equipment and suggests categories; for expensed items it picks the matching heading (a scanned "Audio" becomes **Small audio parts**). Change anything that's wrong.

When you **edit** a saved purchase and the change also affects a linked equipment record or a gig's money out, GigWrangler lists those changes first and asks you to **Confirm & Save**.

## Attaching a file without scanning

| Where | Button | The file goes with |
|---|---|---|
| Purchases report, on an invoice | **Attach Doc** (then **View Doc**) | The purchase |
| A gig → Financials, on a money row | Paperclip → **Receipts & documents** → **Upload** | That money row |
| A gig → **Expense / Mileage** → **Simple Expense** | **Receipt (optional)** | The new expense |
| Phone: a gig's transaction → **Receipts & Documents** | **Upload** | That money row |
| An asset's page or edit form | **Asset Attachments** → **Upload** | The equipment (manuals, photos) |

:::tip
**Add manually** has no file upload. Save the purchase, then use **Attach Doc** on it in the Purchases report.
:::

## Importing a spreadsheet

**Equipment → Import → CSV Import** creates purchases and equipment from a spreadsheet of past purchases. Imported purchases aren't linked to gigs and have no files attached; link and attach them afterwards from the Purchases report.
