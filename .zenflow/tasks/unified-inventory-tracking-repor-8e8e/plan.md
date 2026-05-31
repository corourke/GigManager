

## Workflow Steps

### [x] Step: Fix errors and issues

<!-- agent: zencoder-default -->
#### Summary
The changes introduce a unified inventory tracking system with location support. While the implementation is largely consistent with requirements, there is a critical database interaction issue and several performance bottlenecks in data processing.

#### Findings

| Priority | Issue | Location |
|----------|-------|----------|
| P1 | Database crash due to `upsert` on non-unique columns | `./src/services/inventoryManagement.service.ts:352` |
| P2 | Quadratic complexity bottleneck in summary generation | `./src/services/inventoryManagement.service.ts:595` |
| P2 | Potential multi-tenant data leak (missing organization check) | `./src/services/inventoryManagement.service.ts:429` |
| P2 | Broken table layout in print mode | `./src/components/inventory/InventoryReports.tsx:1853` |
| P3 | Inefficient date parsing in hot loops | `./src/services/inventoryManagement.service.ts:123` |

#### Details

##### P1 Issue
**File:** `./src/services/inventoryManagement.service.ts:352`

The `createManualTrackingRecord` function uses `.upsert(..., { onConflict: 'gig_id,kit_id,asset_id' })`. However, a previous migration dropped the unique constraint on these columns to support cumulative history. Calling `upsert` with an `onConflict` clause on columns without a unique index will cause a PostgreSQL exception. The service should use `.insert` instead.

##### P2 Issue
**File:** `./src/services/inventoryManagement.service.ts:595`

`getKitTrackingSummary` performs nested iteration over kits and records, leading to $O(K \times L)$ complexity. This will cause UI lag as data grows. Pre-grouping records into a `Map` by `kit_id` would reduce this to $O(K + L)$.

#### Recommendation
1. Replace `.upsert` with `.insert` in `./src/services/inventoryManagement.service.ts` to align with the cumulative tracking architecture.
2. Optimize inventory data processing by using `Map` lookups instead of nested array searches.
3. Tighten RLS-equivalent filters in `./src/services/inventoryManagement.service.ts` to ensure organization boundaries are strictly enforced.
