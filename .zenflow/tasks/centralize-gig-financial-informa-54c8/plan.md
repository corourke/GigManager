# Spec and build

## Configuration
- **Artifacts Path**: `.zenflow/tasks/centralize-gig-financial-informa-54c8`

---

## Agent Instructions

Ask the user questions when anything is unclear or needs their input. This includes:
- Ambiguous or incomplete requirements
- Technical decisions that affect architecture or user experience
- Trade-offs that require business context

Do not make assumptions on important decisions — get clarification first.

---

## Workflow Steps

### [x] Step: Technical Specification

Technical specification has been created in `spec.md`.

---

### [ ] Step: Implementation

#### [ ] Database Migration
- Create `financial_type`, `financial_category`, `financial_status` enums.
- Rename `gig_bids` to `gig_financials`.
- Add new columns to `gig_financials`.
- Migrate existing `gig_bids` data.
- Migrate `gigs.amount_paid` to `gig_financials` as `Revenue` records.
- Drop `gigs.amount_paid` column.
- Update `create_gig_complex` RPC function.
- Implement strict RLS policies for `gig_financials`.

#### [ ] TypeScript Types and Constants
- Update `src/utils/supabase/constants.ts` with new enums.
- Update `src/utils/supabase/types.tsx` with `DbGigFinancial` interface and update `DbGig`.

#### [ ] Gig Service Update
- Update `src/services/gig.service.ts` to use `gig_financials` instead of `gig_bids`.
- Handle `amount_paid` by querying/inserting into `gig_financials`.

#### [ ] Edge Functions Update
- Update `supabase/functions/server/index.ts` to use `gig_financials` where `amount_paid` was previously used.

#### [ ] Frontend UI Update
- Update UI components (e.g., `GigDetailScreen`, `GigBasicInfoSection`) to handle the new financial data structure.

#### [ ] Verification
- Run tests and linting.
- Manual verification of financial workflows.
