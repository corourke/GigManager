# Product Requirements Document: Asset Import Improvements

## 1. Overview
The goal of this project is to enhance the asset import functionality to support a comprehensive set of asset data, ensure parity with the robust gig import workflow, and introduce AI-powered import capabilities from invoices and receipts.

## 2. Goals
- **Full Data Support**: Support all 23 columns present in the new asset spreadsheet.
- **Workflow Parity**: Bring asset import to the same level of robustness and user experience as the gig import.
- **AI-Powered Import**: Enable users to upload an invoice or receipt and have assets automatically extracted and created.
- **Audit Trail & Association**: Maintain a link between imported assets/expenses and the original receipt or invoice via a centralized attachment system.
- **Expense Integration**: Categorize non-asset line items as business expenses, with the option to link them to specific gigs.

## 3. Requirements

### 3.1 Extended Spreadsheet Import
The system must support importing assets and expenses from a CSV with the following columns:
- **Acquisition Date**: Date of purchase (YYYY-MM-DD).
- **Source**: Type of row [0-Invoice (Header), 1-Asset, 2-Expense].
- **Vendor**: Seller of the asset or provider of the service.
- **Inv Amt**: Total amount of the invoice (for header rows).
- **Paid Via**: Payment method.
- **Total Cost**: Total cost including tax/shipping.
- **Item Cost**: Unit cost of the asset or expense amount.
- **Replacement Value**: Value for insurance purposes (assets only).
- **Quantity**: Number of units.
- **Manufacturer/Model**: Make and model (assets only).
- **Equipment Type**: Description of the gear or service.
- **Category**: Primary classification (e.g., Audio, Lighting, Travel, Labor).
- **Sub-cat**: Secondary classification.
- **Serial Number**: Unique identifier (assets only).
- **Kit**: Name of the kit (assets only).
- **Description / Notes**: Additional details.
- **Insured**: Boolean flag (assets only).
- **Ins Class**: Insurance classification (assets only).
- **Retired On**: Date removed from service (assets only).
- **Liquidation Amt**: Disposal amount (assets only).
- **Expected Service Life**: Years of use (assets only).
- **Depreciation Method**: (assets only).
- **Status**: Current status (e.g., Active, Retired, Paid, Pending).

### 3.2 AI-Powered Invoice & Expense Import
- **File Upload**: Users can upload PDF or Image (JPG/PNG) files.
- **LLM Extraction & Classification**:
    - **Header**: Extract Date, Vendor, Total, Payment Method.
    - **Classification Rules**:
        - **Asset**: Items with serial numbers, high-value gear (e.g., >$50), or reusable equipment.
        - **Expense**: Consumables (tape, batteries), services (labor, shipping), or low-value one-time items.
- **Cost Allocation (Pro-rata)**: 
    - `Factor = Invoice Total / Sum(Unit Prices * Quantities)`.
    - Apply this factor to all line items to include hidden costs like tax and shipping in the final asset/expense cost.
- **Review Step**: Unified preview table for user verification and editing.
    - Toggle classification between Asset and Expense.
    - Link expenses to a specific Gig (searchable by title/date).
    - Handle duplicate serial numbers with clear visual warnings.

### 3.3 Error Handling & Fallbacks
- **Extraction Failure**: If AI fails to parse, provide a manual entry form or spreadsheet-style grid for data entry.
- **Partial Failure**: Wrap the entire import in a database transaction to prevent partial data corruption.
- **Validation Feedback**: Provide field-level error messages (e.g., "Invalid Date Format", "Duplicate Serial Number").
- **Conflict Management**: Alert user if an asset with the same serial number already exists in the system.

### 3.4 File Management & Performance
- **Limits**: Maximum file size of 10MB per invoice.
- **Mobile Support**: Optimized upload for mobile cameras (capture and upload flow).
- **Bulk Processing**: Support sequential processing of multiple invoices with a progress indicator.
- **Versioning**: If a duplicate invoice is uploaded, allow the user to replace the existing one or create a new version.

### 3.5 Centralized Storage & Association
- **Supabase Storage**: Store files in an `attachments` bucket, isolated by organization.
- **Polymorphic Linking**: Link a single attachment to multiple Assets, Expenses, or Gigs.
- **UI Integration**: Show "Source Document" links on all related entity screens.

### 3.6 Expense Management
- **General Expenses**: Log expenses not tied to a specific gig.
- **Gig Integration**: Optionally link expenses to gig financial records.
- **Admin Reporting**: New reporting dashboard for Business Expenses and Insurance/Asset valuation.

## 4. Technical Considerations
- **Database Schema**: Update `assets`, update `gig_financials` (nullable `gig_id`), and create `attachments`.
- **LLM Prompting**: Define strict JSON output rules with classification guidelines.
- **Performance**: Use efficient joining/indexing for attachment rollups.

## 5. Success Criteria
- Successful import of the 23-column spreadsheet.
- High accuracy in AI-driven classification (Asset vs. Expense).
- All imported items are correctly linked to their source files.
- Seemless user experience from mobile capture to desktop review.
