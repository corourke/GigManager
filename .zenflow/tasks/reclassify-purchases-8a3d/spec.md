# Technical Specification: Reclassify Purchases — Expense to Asset

**Based on**: `requirements.md`  
**Date**: 2026-06-06

---

## 1. Technical Context

### Stack
- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix UI primitives)
- **Backend**: Supabase (PostgreSQL 15, Row-Level Security, SECURITY DEFINER RPC functions)
- **State**: Local component state + direct Supabase calls via service layer (`src/services/`)
- **Notifications**: `sonner` (toast), `@radix-ui/react-alert-dialog` (confirmation dialogs)
- **Test framework**: Vitest + React Testing Library

### Key dependencies already in use
- `@radix-ui/react-alert-dialog` — `AlertDialog` component already in `src/components/ui/alert-dialog.tsx`
- `sonner` — `toast` already used throughout `FinancialsScreen.tsx`
- `lucide-react` — icons throughout the app

---

## 2. Data Model

### Tables involved

| Table | Relevant columns | Role in this feature |
|---|---|---|
| `purchases` | `id`, `parent_id`, `row_type`, `asset_id`, `gig_id` (on header), `organization_id`, `purchase_date`, `vendor`, `description`, `category`, `sub_category`, `quantity`, `item_price`, `item_cost`, `line_amount`, `line_cost` | Source of truth for the expense item being reclassified |
| `assets` | `id`, `purchase_id`, `organization_id`, `manufacturer_model`, `acquisition_date`, `vendor`, `category`, `sub_category`, `quantity`, `item_price`, `item_cost`, `status` | New record created during reclassification |
| `gig_financials` | `id`, `purchase_id` | Deleted (if present) when the purchase header has a `gig_id` |

### Field mapping — expense item → asset (mirrors import pipeline)

| `purchases` item field | → `assets` field |
|---|---|
| `description` | `manufacturer_model` |
| `purchase_date` | `acquisition_date` |
| `vendor` | `vendor` |
| `category` | `category` |
| `sub_category` | `sub_category` |
| `quantity` | `quantity` |
| `item_price` | `item_price` |
| `item_cost` | `item_cost` |
| `organization_id` | `organization_id` |
| header `id` | `purchase_id` |
| _(hardcoded)_ | `status = 'Active'` |

### Purchase item update after reclassification
- `row_type`: `'item'` → `'asset'`
- `asset_id`: `NULL` → new asset's `id`

### Gig financials cleanup
If the purchase header's `gig_id` is not null, delete the `gig_financials` row where `purchase_id = <header_id>`.

---

## 3. Backend Changes

### 3.1 New Supabase migration

**File**: `supabase/migrations/20260607000000_reclassify_expense_as_asset_rpc.sql`

Creates a `SECURITY DEFINER` RPC function `reclassify_expense_as_asset(p_purchase_item_id uuid)` that atomically:

1. Fetches the purchase item record. Raises an exception if `row_type != 'item'` (guard against double-reclassification).
2. Fetches the parent header via `parent_id` to obtain `gig_id` and `id`.
3. Inserts an `assets` row using the field mapping above, setting `purchase_id = header.id`, `status = 'Active'`, `created_by = auth.uid()`, `updated_by = auth.uid()`.
4. Updates the `purchases` item row: `row_type = 'asset'`, `asset_id = <new_asset_id>`, `updated_by = auth.uid()`.
5. If the header's `gig_id IS NOT NULL`, deletes the `gig_financials` row where `purchase_id = header.id`.
6. Returns `jsonb_build_object('asset_id', v_asset_id)`.

The function is owned by the postgres role and has `SECURITY DEFINER` to operate within the existing RLS framework (matching the pattern of `create_purchase_transaction_v1`).

### 3.2 No schema changes
No new columns or tables. The existing `purchases.asset_id`, `purchases.row_type`, `assets.purchase_id`, and `gig_financials.purchase_id` columns already support this operation.

---

## 4. Frontend Changes

### 4.1 New service function — `src/services/purchase.service.ts`

Add `reclassifyExpenseAsAsset(purchaseItemId: string): Promise<{ asset_id: string }>`:

```typescript
export async function reclassifyExpenseAsAsset(purchaseItemId: string) {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase.rpc('reclassify_expense_as_asset', {
    p_purchase_item_id: purchaseItemId,
  });
  if (error) throw error;
  return data as { asset_id: string };
}
```

Follows the exact same pattern as `createPurchaseTransaction` — calls an RPC, propagates errors.

### 4.2 UI changes — `src/components/FinancialsScreen.tsx`

#### New imports
- `reclassifyExpenseAsAsset` from `'../services/purchase.service'`
- `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogTrigger` from `'./ui/alert-dialog'`
- `RefreshCw` from `'lucide-react'` (for loading state on the button)

#### New state
- `reclassifyingItemId: string | null` — tracks which item is being reclassified (for loading indicator)

#### Access guard
The "Reclassify as Asset" button renders only when:
```
item.row_type === 'item' && (userRole === 'Admin' || userRole === 'Manager')
```

`userRole` is already available in `FinancialsScreen` via the `userRole?: UserRole` prop.

#### Placement
Inside the existing expanded item detail `TableRow` (`colSpan={7}` cell, in the `grid` div alongside the existing metadata fields). The button appears as an additional element below the metadata grid in the expanded panel.

#### Confirmation dialog
Uses `AlertDialog` wrapping the button. The dialog description explains:
- The item will be registered as a capital asset in inventory
- If the purchase is linked to a gig, the linked gig expense record will be removed

#### Handler logic (`handleReclassifyAsAsset`)
```
1. Set reclassifyingItemId = item.id
2. Call reclassifyExpenseAsAsset(item.id)
3. On success: toast.success(...), call loadPurchases() to refresh state, collapse expandedItemId
4. On error: toast.error(...)
5. Finally: set reclassifyingItemId = null
```

`loadPurchases()` already exists in the component and re-fetches the full purchases list, causing the reclassified item to re-render with the blue "Asset" badge and no action button.

#### No changes to badge rendering
The existing badge logic `(item.asset_id || item.row_type === 'asset')` already correctly renders the blue "Asset" badge after reclassification, since both `row_type` and `asset_id` are updated by the RPC.

---

## 5. Source Code Structure Changes

```
supabase/migrations/
  └── 20260607000000_reclassify_expense_as_asset_rpc.sql   [NEW]

src/services/
  └── purchase.service.ts                                   [MODIFIED — add reclassifyExpenseAsAsset]
  └── purchase.service.test.ts                              [MODIFIED — add test for reclassifyExpenseAsAsset]

src/components/
  └── FinancialsScreen.tsx                                  [MODIFIED — UI + handler]
```

No new component files. The confirmation dialog is inline within `FinancialsScreen.tsx` following the existing pattern used elsewhere in the app (e.g. delete confirmations in `GigFinancialsSection.tsx`).

---

## 6. Verification Approach

```bash
npm run build && npm run test:run
```

### Unit tests to add (`purchase.service.test.ts`)
- `reclassifyExpenseAsAsset` — happy path: calls `rpc('reclassify_expense_as_asset', ...)` and returns the asset ID
- `reclassifyExpenseAsAsset` — error path: propagates Supabase errors via `handleApiError`

### Manual verification checklist
1. Expense item row shows orange "Expense" badge and "Reclassify as Asset" button (Admin/Manager only)
2. Staff/Viewer roles do not see the button
3. Clicking button opens AlertDialog with correct description text
4. Confirming reclassification: badge changes to blue "Asset", action button disappears, success toast shown
5. New asset visible immediately in Assets screen with correct `manufacturer_model`, `acquisition_date`, `vendor`, `category`
6. For purchases linked to a gig: `gig_financials` record is removed (verify in gig Financials tab — expense no longer appears)
7. Cancelling the dialog makes no changes

---

## 7. Assumptions & Constraints

- The purchase item must have a valid `parent_id` (pointing to a header row). Orphaned items without a parent are not shown as individual rows in the current UI and are excluded from the action by the RPC guard.
- The `gig_financials` deletion targets the record where `purchase_id = header.id`. This is consistent with how import creates a single `gig_financials` row per purchase header (not per item).
- No migration is needed for RLS policies: the RPC runs as `SECURITY DEFINER` (same pattern as `create_purchase_transaction_v1`), and the calling user's session is validated via `requireAuth()` in the service layer before the RPC call.
- The `assets` table does not require `purchase_id` to be unique, so reclassifying multiple items from the same header each creates a separate asset, each with `purchase_id = header.id` (consistent with the import pipeline which does the same).
