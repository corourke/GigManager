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

| Col | CSV Column Name | Req? | Type | Example | `purchases` Table (Header) | `purchases` Table (Item) | `assets` Table | Notes |
|---|---|---|---|---|---|---|---|---|
| A | `acquisition_date` | Yes | Date | 2025-10-10 | `purchase_date` | `purchase_date` | `acquisition_date` | YYYY-MM-DD |
| B | `source` | Yes | Enum | 1-Asset | `row_type` (0 -> header) | `row_type` (2 -> item) | (1-Asset) | 0, 1, or 2 |
| C | `vendor` | Yes* | String | Amazon | `vendor` | `vendor` | `vendor` | *Req for Header |
| D | `total_inv_amount` | Yes* | Number | 106.05 | `total_inv_amount` | | | *Req for Header |
| E | `payment_method` | No | String | Visa | `payment_method` | | | |
| F | `line_amount` | No* | Number | 87.98 | | `line_amount` | | *Req for Item |
| G | `line_cost` | No | Number | 95.24 | | `line_cost` | | Computed if empty |
| H | `quantity` | Yes | Integer | 2 | | `quantity` | `quantity` | Default: 1 |
| I | `item_price` | No | Number | 43.99 | | `item_price` | `item_price` | |
| J | `item_cost` | No | Number | 47.62 | | `item_cost` | `item_cost` | |
| K | `manufacturer_model` | Yes* | String | Shure SM58 | | `description` | `manufacturer_model` | *Req for Asset |
| L | `category` | Yes* | String | Sound | | `category` | `category` | *Req for Asset/Item |
| M | `sub_category` | No | String | Microphones | | `sub_category` | `sub_category` | |
| N | `type` | No | String | Dynamic Mic | | | `type` | |
| O | `kit` | No | String | Mic Pack A | | | | Add to named kit |
| P | `serial_number` | No | String | SN12345 | | | `serial_number` | |
| Q | `tag_number` | No | String | TAG-001 | | | `tag_number` | |
| R | `description` | No | String | Black finish | | | `description` | |
| S | `insured` | No | Boolean | TRUE | | | `insurance_policy_added` | |
| T | `insurance_class` | No | String | Class A | | | `insurance_class` | |
| U | `replacement_value` | No | Number | 150.00 | | | `replacement_value` | |
| V | `retired_on` | No | Date | 2029-12-31 | | | `retired_on` | YYYY-MM-DD |
| W | `liquidation_amt` | No | Number | 20.00 | | | `liquidation_amt` | |
| X | `service_life` | No | Integer | 5 | | | `service_life` | Years |
| Y | `dep_method` | No | String | MACRS | | | `dep_method` | |
| Z | `status` | No | Enum | Active | | | `status` | |


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

### 3.6 AI Scanning & Receipt Upload
- **PDF/Image Upload**: Allow users to upload invoices or receipts (PDF/JPG/PNG) directly from the Asset List screen.
- **AI Extraction**: Use an LLM to extract structured header and line item data from the uploaded files.
- **File Storage**: Store the original invoice/receipt in Supabase Storage and create an `attachments` record.
- **Asset Association**: Associate the uploaded attachment with all created `assets` and the `purchases` record.
- **UI Linking**: Provide a clear link back to the original invoice from the Asset Detail and Purchase Detail screens.

## 4. Success Criteria
- Successful AI extraction and review workflow in both Gig and Asset screens.
- 100% accurate mapping and calculation of burdened costs from A-Z spreadsheets.
- Clean separation between purchase-related data and gig financial events.
