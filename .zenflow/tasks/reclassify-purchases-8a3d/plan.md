# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: 3b0a3198-c81a-48c9-8faa-46f54a6c2cae -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Focus on **what** the feature should do and **why**, not **how** it should be built. Do not include technical implementation details, technology choices, or code-level decisions — those belong in the Technical Specification.

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification
<!-- chat-id: 34f9a91b-d5d6-487b-94ae-b3ff4e693e36 -->

Create a technical specification based on the PRD in `{@artifacts_path}/requirements.md`.

1. Review existing codebase architecture and identify reusable components
2. Define the implementation approach

Do not include implementation steps, phases, or task breakdowns — those belong in the Planning step.

Save to `{@artifacts_path}/spec.md` with:
- Technical context (language, dependencies)
- Implementation approach referencing existing code patterns
- Source code structure changes
- Data model / API / interface changes
- Verification approach using project lint/test commands

### [x] Step: Planning
<!-- chat-id: 698c18db-76e9-4076-b69a-87f2db32cfdb -->

Create a detailed implementation plan based on `{@artifacts_path}/spec.md`.

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

### [x] Step: Database migration — reclassify_expense_as_asset RPC
<!-- chat-id: 60174ef3-8204-45c0-94fe-15d8ea417c2f -->

Create `supabase/migrations/20260607000000_reclassify_expense_as_asset_rpc.sql`.

The migration adds a single `SECURITY DEFINER` PostgreSQL function `reclassify_expense_as_asset(p_purchase_item_id uuid)` that atomically:

1. Fetches the purchase item. Raises an exception if `row_type != 'item'` (prevents double-reclassification).
2. Fetches the parent header via `parent_id` to obtain `gig_id` and `id`.
3. Inserts an `assets` row using the field mapping from `spec.md` section 2 (`description` → `manufacturer_model`, `purchase_date` → `acquisition_date`, direct copies for vendor/category/sub_category/quantity/item_price/item_cost/organization_id; `purchase_id` = header `id`; `status = 'Active'`; `created_by = auth.uid()`, `updated_by = auth.uid()`).
4. Updates the purchases item row: `row_type = 'asset'`, `asset_id = <new_asset_id>`, `updated_by = auth.uid()`.
5. If the header's `gig_id IS NOT NULL`, deletes the `gig_financials` row where `purchase_id = header.id`.
6. Returns `jsonb_build_object('asset_id', v_asset_id)`.

Follow the same ownership/grant pattern as `create_purchase_transaction_v1` in the existing migrations.

Verification: `npm run build` (migration is SQL-only; no TypeScript changes in this step).

### [x] Step: Service layer — reclassifyExpenseAsAsset + unit tests
<!-- chat-id: 2af8c204-fb93-4fe3-97b8-c1fbea0a8af9 -->

Modify `src/services/purchase.service.ts`:
- Add exported async function `reclassifyExpenseAsAsset(purchaseItemId: string): Promise<{ asset_id: string }>` that calls `supabase.rpc('reclassify_expense_as_asset', { p_purchase_item_id: purchaseItemId })` via `requireAuth()`, throws on error, and returns `data as { asset_id: string }`. Follow the exact same pattern as `createPurchaseTransaction`.

Modify `src/services/purchase.service.test.ts`:
- Add `reclassifyExpenseAsAsset` to the import line.
- Add a `describe('reclassifyExpenseAsAsset', ...)` block with two tests:
  - **Happy path**: `mockSupabase.rpc` resolves with `{ data: { asset_id: 'asset-1' }, error: null }` → verify `rpc` called with `'reclassify_expense_as_asset'` and `{ p_purchase_item_id: 'item-1' }`, and result equals `{ asset_id: 'asset-1' }`.
  - **Error path**: `mockSupabase.rpc` resolves with `{ data: null, error: { message: 'DB error' } }` → verify the function throws.

Verification: `npm run build && npm run test:run` — both new tests must pass.

### [x] Step: UI — Reclassify as Asset button in FinancialsScreen
<!-- chat-id: acedca27-e637-441c-b06e-20741bcae386 -->

Modify `src/components/FinancialsScreen.tsx`:

1. **Imports**: Add `reclassifyExpenseAsAsset` from `'../services/purchase.service'`; add `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogTrigger` from `'./ui/alert-dialog'`; add `RefreshCw` from `'lucide-react'`.

2. **State**: Add `const [reclassifyingItemId, setReclassifyingItemId] = useState<string | null>(null)`.

3. **Handler**: Add `handleReclassifyAsAsset(itemId: string)` async function:
   - Sets `reclassifyingItemId = itemId`
   - Calls `reclassifyExpenseAsAsset(itemId)`
   - On success: `toast.success('Item reclassified as asset')`, calls `loadPurchases()` to refresh, clears `expandedItemId`
   - On error: `toast.error(err.message || 'Failed to reclassify item')`
   - Finally: `setReclassifyingItemId(null)`

4. **Button placement**: Inside the existing expanded item detail `TableRow` (the `colSpan={7}` cell, inside the `grid` div or immediately after it). Render only when `item.row_type === 'item' && (userRole === 'Admin' || userRole === 'Manager')`.

5. **Confirmation dialog**: Wrap the button in an `AlertDialog`. Dialog description text: "This will register the item as a capital asset in inventory. If this purchase is linked to a gig, the linked gig expense record will also be removed. This action cannot be undone." Confirm button text: "Reclassify as Asset". Show a `RefreshCw` spinner icon on the confirm button while `reclassifyingItemId === item.id`.

Verification: `npm run build && npm run test:run`.
