### Manual Testing Checklist

Below is the checklist to verify the implementation.

#### Setup Steps
1. **Apply Migration**: Ensure the latest migration is applied to your local database:

   ```bash
   npx supabase migration up
   ```

   

2. **Verify Manual Types**: Check that `src/utils/supabase/types.tsx` correctly defines the new columns:

   - **`DbGigStaffAssignment`**: should have `completed_at`, `units_completed`, and `gig_financial_id`.
   - **`DbGigFinancial`**: should have `purchase_id` and `staff_assignment_id`.

3. **Check `schema_dump.sql`**: Verify that `supabase/dump/schema_dump.sql` now contains the new columns and their respective foreign keys.

#### 1. Gig Profitability Summary
- [x] Navigate to a Gig page and open the **Financials** tab.
- [x] Verify the **Contract**, **Total Costs**, and **Profit/Loss** cards appear at the top.
- [ ] Check that the coloring updates correctly:
  - **Contract**: Green if fully received, Amber if outstanding.
  - **Profit**: Green for profit, Red for loss.
- [x] Verify that **Projected Staff** costs (including rate-based assignments) are included in the **Total Costs** card.

#### 2. Financials Section (Grouped Records)
- [x] Verify that financial records are grouped into **Revenue** and **Expenses** sections.
- [x] Check each row for:
  - **Paid/Unpaid Badge**: Reflects the `paid_at` status.
  - **Source Badge**: Shows "Manual", "Receipt" (for purchase-linked), or "Staff" (for labor-linked).
- [x] Open the **Add Record** modal and verify:
  - The type picker shows common types at the top.
  - The "All Types" expander works.
  - Default type is "Contract Signed" and default category is "Production".

#### 3. Staff Completion Flow
- [x] Navigate to the **Staff** tab of a gig.
- [x] Verify that assignments show a **"Pending"** or **"Done"** status.
- [x] For a **fee-based** assignment, click **"Finalize"** (or use **"Finalize All"** in the footer).
- [x] For a **rate-based** assignment, click **"Complete"** and enter the units completed.
- [x] Verify that finalizing an assignment:
  - Sets `completed_at` on the assignment and creates a linked **Financials** record.
  - The row in the Financials table shows the "Staff" source badge.
- [x] Verify the **Staff Cost Summary** footer in the Staff tab shows the breakdown of Finalized vs Projected costs.

#### 4. Receipt Upload Integration
- [x] In the **Financials** tab, click the **"Upload Receipt"** button.
- [x] Upload a receipt and verify that both a `purchases` and a `gig_financials` record are created.
- [x] Verify the row in the Financials table shows the "Receipt" source badge and links back to the purchase.

#### 5. Projected Staff Subsection
- [x] In the **Financials** tab, verify a **"Projected Staff"** subsection appears below Expenses for uncompleted confirmed/requested assignments.