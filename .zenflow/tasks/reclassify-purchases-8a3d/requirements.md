# PRD: Reclassify Purchases — Expense to Asset

**Feature**: Reclassify a purchase expense item as a capital asset  
**Status**: Draft  
**Date**: 2026-06-06

---

## 1. Background & Problem Statement

Purchases are imported from a spreadsheet and sorted into two categories at import time:
- **Expenses** (`purchases.row_type = 'item'`) — operating costs with no corresponding inventory record
- **Assets** (`purchases.row_type = 'asset'`) — capital equipment that creates an `assets` record and can be added to kits and tracked in inventory

Import-time classification sometimes gets it wrong. A user may realize after import that an item marked as an expense is actually a piece of capital equipment that should be tracked in inventory and included in kits. Currently there is no way to fix this without reimporting data.

---

## 2. Goal

Allow a user to reclassify an existing expense line item on a purchase into a capital asset using the same data that would have been used had it been imported as an asset originally. No additional user input is required — the system uses whatever data is already on the purchase item.

---

## 3. User Story

> As a sound company manager, when I review past purchases in the Financials screen, I want to be able to reclassify an expense line item as an asset with a single action, so it appears in inventory and can be added to kits — without needing to fill out a form.

---

## 4. Scope

### In scope
- A one-click "Reclassify as Asset" action on expense line items in the **Financials screen → Purchases tab**
- Creating the `assets` record using the existing data on the purchase item (same field mapping as the import pipeline)
- Updating the purchase item: `row_type` → `'asset'`, `asset_id` → new asset's ID
- If the purchase header has a `gig_id`, deleting the `gig_financials` record where `purchase_id` matches the header ID

### Out of scope
- Collecting additional asset fields from the user (serial number, tag number, replacement value, etc.) — these can be filled in on the asset record afterwards
- Kit assignment during reclassification
- Reclassifying in the reverse direction (asset → expense)
- Bulk reclassification of multiple items at once
- Reclassifying header-level purchases (only individual line items)

---

## 5. User Experience

### 5.1 Entry Point

In the **Financials screen → Purchases tab**, expense items show an orange "Expense" badge. A **"Reclassify as Asset"** button or action appears on expense item rows (in the expanded detail area or as an inline action).

The action is only available to users with admin or manager roles.

### 5.2 Confirmation

A simple confirmation prompt is shown before executing, describing what will happen:
- The item will be registered as an asset in inventory
- If the purchase is linked to a gig, the linked gig expense record will be removed

On **Confirm**: execute the reclassification, show a success toast.  
On **Cancel**: no changes.

### 5.3 After Reclassification

- The item row immediately shows the blue "Asset" badge instead of the orange "Expense" badge
- The "Reclassify as Asset" action is no longer available on that item
- The new asset is immediately visible in the Assets screen
- The Financials screen's expense count and cost totals update to reflect the change

---

## 6. Business Rules

1. **Only expense items can be reclassified.** Items with `row_type = 'asset'` do not show the action.

2. **Asset is created from available purchase data** using the same field mapping as the import pipeline:
   - `manufacturer_model` ← `description`
   - `acquisition_date` ← `purchase_date`
   - `vendor`, `category`, `sub_category`, `item_price`, `item_cost`, `quantity` ← directly from the purchase item
   - `purchase_id` ← parent header's `id`
   - `organization_id` ← from the purchase item
   - `status` ← `'Active'`

3. **Gig financials removal.** If the purchase header has a `gig_id`, the `gig_financials` record where `purchase_id` = the header's `id` is deleted entirely.

4. **The purchase header is not changed.** The header row (date, vendor, invoice total) remains intact.

5. **The operation is atomic.** Asset creation, purchase item update, and gig_financials deletion (if applicable) all succeed together or not at all.

6. **The reclassification is not reversible through this UI.** Further asset details (serial number, tag number, etc.) can be added by editing the asset record after reclassification.

---

## 7. Assumptions

- The purchase item's `description` field is used as `manufacturer_model` for the new asset, consistent with how the import pipeline maps this data.
- Deleting the `gig_financials` record is the correct behaviour when the purchase is linked to a gig, treating the reclassified purchase as if it had always been an asset (which would not have created a gig_financials entry at import time). This applies to the whole `gig_financials` record for that purchase header, not a partial adjustment.
- Role-based access control follows the existing admin/manager permission model.

---

## 8. Success Criteria

- A user can reclassify an expense item as an asset with a single confirm action
- The reclassified item immediately appears in the Assets list with correct data
- If the purchase was linked to a gig, the gig's linked expense record is removed
- No orphaned or inconsistent data is left in any table after reclassification
