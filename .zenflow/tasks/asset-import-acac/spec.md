# Technical Specification: Asset & Expense Import with Attachments

## 1. Overview
This specification covers the enhancement of asset import, integration of general business expenses, and a centralized attachment system.

## 2. Technical Context
- **Frontend**: React (Vite), TypeScript, Tailwind CSS, Shadcn/UI.
- **Backend**: Supabase (Auth, Postgres, Storage, Edge Functions).
- **AI**: LLM (Claude-haiku via Ollama/Anthropic) for extraction.
- **Dependencies**: `pdf-parse` (or equivalent) for text extraction.

## 3. Data Model Changes

### 3.1 `public.assets` Table Extensions
Update `assets` to support the new 23-column spreadsheet:
- `source`: TEXT (e.g., 'Import', 'Invoice')
- `invoice_amount`: NUMERIC(10,2)
- `paid_via`: TEXT
- `total_cost`: NUMERIC(10,2)
- `retired_on`: DATE
- `liquidation_amt`: NUMERIC(10,2)
- `expected_service_life`: INTEGER
- `depreciation_method`: TEXT
- `status`: Update to include 'Retired', 'Returned' in allowed values.

### 3.2 `public.gig_financials` Table Updates
Modify to support general business expenses:
- `gig_id`: Change to **NULLABLE** to allow non-gig expenses.
- `payment_method`: TEXT.
- `attachment_count`: (Join-based).

### 3.3 `public.attachments` Table (New)
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `organization_id` | `uuid` | FK -> organizations (RLS context) |
| `file_path` | `text` | Path in Supabase Storage bucket |
| `file_name` | `text` | Original filename |
| `content_type` | `text` | MIME type |
| `size_bytes` | `integer` | |
| `entity_type` | `text` | 'asset', 'gig', 'financial' |
| `entity_id` | `uuid` | Target record ID |
| `created_by` | `uuid` | FK -> auth.users |
| `created_at` | `timestamptz` | |

## 4. Implementation Approach

### 4.1 AI Import Pipeline
- **Stage 1 (Upload/Extract)**: Client uploads PDF/Image (max 10MB) to temp storage. Edge function extracts text via `pdf-parse`.
- **Stage 2 (LLM Parsing)**: 
    - LLM returns structured JSON (header + line items).
    - **Classification**: LLM uses provided rules (Asset if >$50 or Serialized; else Expense).
- **Stage 3 (Allocation)**: Calculate `factor = total / sum(subtotals)`. Apply factor to all items.
- **Stage 4 (Preview UI)**: 
    - Display in `InvoicePreviewTable.tsx`.
    - **UI Interactions**: Toggle button for Asset/Expense; Search/Select for Gig linking; Duplicate highlighting.
- **Stage 5 (Commit)**: 
    - Wrap in a **Postgres Transaction**.
    - Insert into `assets` or `gig_financials`.
    - Create `attachments` records linking the file to all items.

### 4.2 UI/UX Flows
- **Mobile flow**: Integration with `capacitor-camera` for direct receipt capture and upload.
- **Error Feedback**: Use a specialized `ImportErrorBoundary` for extraction failures; Provide manual entry grid as fallback.
- **Duplicate Prevention**: Client-side check for existing serial numbers before commit; UI warning on conflicting rows.

## 5. Security & Performance
- **File Security**: RLS policies for `attachments` bucket ensure only organization members with relevant roles (Manager+) can download/view.
- **Scaling**: 
    - Use composite indexes on `entity_type` and `entity_id` for fast attachment rollups.
    - Limit individual invoice parsing to 100 line items to prevent LLM context overflow.
- **Orphan Cleanup**: Implement a periodic background task to remove attachments in Storage that no longer have a corresponding database record (using `pg_cron`).

## 6. Source Code Changes
- **Services**: New `attachment.service.ts`. Updates to `asset.service.ts` and `financial.service.ts`.
- **Components**: New `AttachmentList.tsx`, `InvoicePreviewTable.tsx`.
- **Utils**: Update `csvImport.ts` with allocation and classification logic.
- **Documentation**: Update `scripts/README.md` with explicit cost allocation and pro-rata factor definitions.

## 7. Delivery Phases
1. **Schema & Storage**: Database migrations and Storage bucket configuration.
2. **CSV Import Enhancement**: Support for 23 columns and new row types.
3. **Attachment System**: Core service and UI components for file management.
4. **AI Import Pipeline**: Edge function development and LLM integration.
5. **Reporting & Admin**: Dashboard/Admin views for expense and insurance reports.

## 8. Verification Approach
- **Lint/Typecheck**: `npm run lint`, `npm run typecheck`.
- **Unit Tests**: `npm run test` for cost allocation math and parser logic.
- **Manual QA**: 
    - Verify PDF extraction across various formats.
    - Test mobile receipt capture flow.
    - Confirm transaction rollback on partial failure.
