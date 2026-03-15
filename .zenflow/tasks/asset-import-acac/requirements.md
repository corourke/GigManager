# Product Requirements Document: Asset & Purchase Import

## 1. Overview
The goal of this project is to enhance asset and expense tracking by introducing a dedicated `purchases` table for invoices, receipts, and general/gig-specific expenses, while extending the `assets` table to support detailed acquisition data. This system will support both a comprehensive 26-column spreadsheet (A-Z) and AI-powered scanning of invoices and receipts.

## 2. Goals
- **Separation of Concerns**: Use `gig_financials` only for financial events (bids, contracts, customer invoices, etc.). Use `purchases` for all acquisitions and expenses.
- **Full Data Support**: Support the new 26-column (A-Z) asset spreadsheet.
- **AI-Powered Extraction**: Enable receipt/invoice scanning in both Gig and Asset contexts.
- **Accurate Costing**: Differentiate between `Price` (selling price on invoice) and `Cost` (burdened cost including tax/shipping).
- **Audit Trail**: Maintain links between files (attachments), purchase records, and the resulting assets/expenses.

## 3. Requirements

### 3.1 AI Scanning & Workflow
- **Gig Entry Screen**: Button to "Upload Receipt".
    - AI scans receipt -> `purchases` (Header), `purchases` (Item/Expense).
    - Review dialog shows extracted lines; user adjusts details. Expenses are linked to gig.
- **Asset List Screen**: Button to "Upload Invoice".
    - AI scans invoice -> breaks out headers, general (non-gig expenses) and assets.
- **Review Dialog**: 
    - Display line items with AI-suggested classification (Asset vs Expense).
    - Allow manual adjustment of categories, quantities, and prices.
    - Automatic cost allocation (pro-rata shipping/tax).

### 3.2 Spreadsheet Import (Columns A-Z)
The system must map columns from the legacy Act4Audio format (Source types: `0-Invoice`, `1-Asset`, `2-Expense`):

| Col  | Input Field           | `purchases` Table, row_type = "header"                       | `purchases` Table, row_type = "item"                         | `assets` Table                          | Notes                    |
| ---- | --------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | --------------------------------------- | ------------------------ |
| A    | Acquisition Date      | `purchase_date`                                              | `purchase_date`                                              | `acquisition_date`                      | Scanned                  |
| B    | Source                | `row_type`<br />(On spreadsheet import Map: "0-Invoice" -> "header") | `row_type`<br />(On spreadsheet import Map: "2-Expense" -> "item") | (On spreadsheet import, Select: 1-Asset |                          |
| C    | Vendor                | `vendor`                                                     | `vendor`                                                     | `vendor`                                | Scanned                  |
| D    | Inv Amount            | `total_inv_amount`                                           |                                                              |                                         | Scanned                  |
| E    | Paid Via              | `payment_method`                                             |                                                              |                                         | Scanned                  |
| F    | Line Amount           |                                                              | `line_amount`                                                |                                         | Scanned                  |
| G    | Line Cost             |                                                              | `line_cost`                                                  |                                         | Computed using factor    |
| H    | Quantity              |                                                              | `quantity`                                                   | `quantity`                              | Scanned                  |
| I    | Item Price            |                                                              | `item_price`                                                 | `item_price`                            | `line_amount / quantity` |
| J    | Item Cost             |                                                              | `item_cost`                                                  | `item_cost`                             | `line_cost / quantity`   |
| K    | Manufacturer/Model    |                                                              | `description`                                                | `manufacturer_model`                    | Scanned                  |
| L    | Category              |                                                              | `category`                                                   | `category`                              |                          |
| M    | Sub-cat               |                                                              | `sub-category`                                               | `sub_category`                          |                          |
| N    | Equipment Type        |                                                              |                                                              | `type`                                  |                          |
| O    | Kit                   |                                                              |                                                              |                                         | Add asset to named kit   |
| P    | Serial Number         |                                                              |                                                              | `serial_number`                         |                          |
| Q    | Tag Number            |                                                              |                                                              | `tag_number`                            |                          |
| R    | Notes                 |                                                              |                                                              | `description`                           |                          |
| S    | Insured               |                                                              |                                                              | `insurance_policy_added`                |                          |
| T    | Ins Class             |                                                              |                                                              | `insurance_class`                       |                          |
| U    | Replacement Value     |                                                              |                                                              | `replacement_value`                     |                          |
| V    | Retired On            |                                                              |                                                              | `retired_on`                            |                          |
| W    | Liquidation Amt       |                                                              |                                                              | `liquidation_amt`                       |                          |
| X    | Expected Service Life |                                                              |                                                              | `service_life`                          |                          |
| Y    | Depreciation Method   |                                                              |                                                              | `dep_method`                            |                          |
| Z    | Status                |                                                              |                                                              | `status`                                |                          |


### 3.3 Cost Allocation Logic
- **Input**: Invoice Total (`Inv Amount`), List of items with `Item Price` and `Quantity`.
- **Factor**: `Inv Amount / Sum(Item Price * Quantity)`.
- **Calculations**:
    - `Line Cost = (Item Price * Quantity) * Factor`
    - `Item Cost = Line Cost / Quantity`
- **Reconciliation**: Adjust the final line item's cost to ensure `Sum(Line Cost) == Inv Amount`.

### 3.4 Data Integrity & Linking
- **Purchase ID**: Assets and Expense items must link back to their parent Purchase Header record.
- **Attachments**: Link the original PDF/Image to the Purchase record and all its child items (Assets/Expenses).
- **Organization Scoping**: All records must belong to an `organization_id`.

### 3.5 Unified Views & UI
- **Purchase Management**: Unified screen to view complete purchase transactions (Header + Items + Assets) grouped by invoice/receipt.
- **Correction UI**: Ability to inspect and correct existing purchases (headers and items) after import.
- **Gig Expense Integration**: Gig detail screens must display purchase expenses alongside existing financial events.
- **Multi-Attachment UI**: Specific components for uploading, viewing, and deleting multiple attachments for assets, purchases, and gigs.
- **CSV Template**: Update the downloadable asset import template to support all 26 columns (A-Z).

## 4. Success Criteria
- Successful AI extraction and review workflow in both Gig and Asset screens.
- 100% accurate mapping and calculation of burdened costs from A-Z spreadsheets.
- Clean separation between purchase-related data and gig financial events.
