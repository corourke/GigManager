# Data Import & Export Workflows

**Purpose**: This document describes all workflows related to bulk data import/export via CSV files and other data transfer mechanisms.

**Last Updated**: 2026-01-18

---

## Overview

These workflows enable users to efficiently manage large volumes of data through CSV import/export functionality, including validation, error handling, and template downloads.

---

## Asset Import/Export Flows

### Flow 11A: Bulk Import/Export Assets

**Bulk Import**

**User Journey:**
1. User navigates to Assets list (`/org/[orgId]/assets`)
2. User clicks "Import" button
3. User downloads CSV template (optional) to understand format
4. User uploads CSV file with asset data
5. System validates:
   - CSV format (correct columns)
   - Row data (required fields, data types, constraints)
6. If validation fails:
   - System shows detailed error message
   - Indicates which rows/columns have errors
   - Provides guidance on how to fix errors
   - User corrects CSV and re-uploads
7. If validation succeeds:
   - System imports ALL rows (atomic transaction)
   - Success message with count of imported assets
   - User redirected to asset list showing new assets

**Bulk Export**

**User Journey:**
1. User navigates to Assets list (`/org/[orgId]/assets`)
2. User optionally sets filters (category, insurance status, etc.)
3. User clicks "Export" or "Download" button
4. System generates CSV file with all filtered assets
5. Browser downloads CSV file
6. User can open in spreadsheet application

**Screens Required:**
- **Import Modal/Page**
  - "Download Template" button
  - File upload dropzone
  - Upload progress indicator
  - Validation error display with row/column details
  - Success confirmation
  
- **Export Configuration**
  - Current filter summary
  - Export format selector (CSV, Excel)
  - Column selection (optional)
  - "Download" button

**CSV Template Format:**

The asset import CSV should include these columns:
- `category` (required)
- `manufacturer_model` (required)
- `serial_number` (optional, must be unique if provided)
- `acquisition_date` (optional, ISO 8601 date)
- `vendor` (optional)
- `cost` (optional, decimal)
- `replacement_value` (optional, decimal)
- `insurance_added` (optional, boolean: true/false)
- `description` (optional, text)

**Validation Rules:**
- **Required fields**: Must have values in every row
- **Unique constraints**: serial_number must be unique within organization
- **Data types**: Dates must be ISO 8601, numbers must be valid decimals, booleans must be true/false
- **Row validation**: All-or-nothing import (if any row fails, entire import fails)

**Error Messages:**
- "Row 5: 'category' is required but missing"
- "Row 12: 'serial_number' must be unique (duplicate found in row 8)"
- "Row 23: 'acquisition_date' must be in YYYY-MM-DD format"
- "Row 15: 'cost' must be a valid number"

---

## General Import/Export Patterns

### CSV Import Best Practices

**Template Download:**
- Provide downloadable CSV template with:
  - Correct column headers
  - Sample row with example data
  - Comments/notes explaining field requirements

**Upload UI:**
- Drag-and-drop file upload
- File type validation (only .csv allowed)
- File size limits with clear messaging
- Preview of first 5 rows before import

**Validation:**
- Frontend validation: File format, size, basic structure
- Backend validation: Business rules, constraints, duplicates
- Clear error messages with row/column references
- Option to download error report as CSV

**Progress Indicators:**
- Upload progress bar
- Validation progress
- Import progress
- Success/failure summary

### CSV Export Best Practices

**Export Options:**
- Apply current filters to export
- Select which columns to include
- Choose file format (CSV, Excel, JSON)
- Date format preferences

**Export UI:**
- "Export" button in list view toolbar
- Export configuration modal
- Download progress indicator
- Success notification with file name

**File Naming:**
- Include entity type: `assets_export_2026-01-18.csv`
- Include organization name (sanitized)
- Include timestamp for version tracking

---

## Future Import/Export Enhancements

**Planned Enhancements:**
- Import gigs from CSV
- Import organization contacts from CSV
- Import staff roles from CSV
- Export gig calendar to ICS format
- Export reports to PDF
- Batch update via CSV (import existing records with updates)

**Integration Opportunities:**
- Google Sheets integration
- Excel Online integration
- Sync with accounting software (QuickBooks, Xero)
- Integration with equipment rental platforms

---

## Common UI Patterns

### Import Flow Pattern

```typescript
// Example import flow structure
1. Click "Import" button
2. Show import modal:
   - Download template link
   - File upload dropzone
   - "Upload" button (disabled until file selected)
3. User selects file
   - Show file name and size
   - Enable "Upload" button
4. User clicks "Upload"
   - Show upload progress
   - Show validation progress
5a. Validation fails:
   - Show error list with details
   - Offer "Download Error Report" button
   - Keep file selected for retry after fixes
5b. Validation succeeds:
   - Show import progress
   - Show success message with count
   - Close modal, refresh list
```

### Export Flow Pattern

```typescript
// Example export flow structure
1. User sets filters in list view (optional)
2. User clicks "Export" button
3. Show export modal:
   - Current filter summary
   - Column selection checkboxes
   - Format selector (CSV/Excel)
   - "Download" button
4. User clicks "Download"
   - Show generation progress
   - Browser downloads file
   - Show success toast
   - Close modal
```

---

## Responsive Design

**Desktop:**
- Import/Export buttons in toolbar
- Modal dialogs for configuration
- Inline error display with scrollable lists

**Mobile:**
- Bottom sheet for import/export options
- File picker integration
- Simplified column selection
- Error display in expandable cards

---

## Related Documentation

- **Requirements**: See [requirements.md](../requirements.md) Section 3: CSV Import Feature Requirements
- **Asset Workflows**: See [4-equipment-management-workflows.md](./4-equipment-management-workflows.md) for asset management flows
- **Database Schema**: See [technical/database.md](../../technical/database.md) for data model and constraints
- **Coding Guide**: See [development/ai-agents/coding-guide.md](../../development/ai-agents/coding-guide.md) for implementation patterns
