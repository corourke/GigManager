# Technical Specification - Database Documentation Review

## Technical Context
- **Database**: PostgreSQL 15+ (Supabase)
- **Documentation**: Markdown (`docs/technical/database.md`)
- **Codebase**: TypeScript/React, Supabase client
- **Type Definitions**: `src/utils/supabase/types.tsx`

## Implementation Approach
The goal is to synchronize the database documentation and TypeScript types with the current `supabase/schema.sql`.

### 1. Update `docs/technical/database.md`
- **Enum Types**: Document `organization_type`, `user_role`, and `gig_status`.
- **Table Definitions**: 
    - Update all existing table definitions to include missing columns (e.g., `users.user_status`, `organization_members.default_staff_role_id`, `assets.insurance_class`, `assets.quantity`).
    - Add `NOT NULL` and `UNIQUE` constraint information where applicable.
    - Add missing tables: `invitations`, `kv_store_de012ad4`.
- **Row-Level Security (RLS)**: Correct the RLS section to explicitly state which tables have RLS ENABLED vs DISABLED, as per `schema.sql`.
- **Helper Functions & Triggers**: Add a new section detailing the SECURITY DEFINER helper functions and the automated triggers.
- **Indexes**: Update the indexes section to list all indexes defined in `schema.sql`.
- **Mermaid Diagram**: Ensure the entity-relationship diagram includes the new `invitations` table and reflects the `default_staff_role_id` link.

### 2. Update `src/utils/supabase/types.tsx`
- Add `user_status` to `DbUser`.
- Add `default_staff_role_id` to `DbOrganizationMember`.
- Remove `updated_at` from `DbOrganizationMember`.
- Remove `DbOrgAnnotation` as it is not present in the schema.
- Add `DbInvitation` interface.
- Add `DbKvStore` interface (optional, but good for completeness).

## Source Code Structure Changes
- `docs/technical/database.md`: Content updates.
- `src/utils/supabase/types.tsx`: Type definition updates.

## Verification Approach
- **Manual Review**: Compare the updated `database.md` side-by-side with `schema.sql`.
- **Type Checking**: Run `npm run typecheck` to ensure that removing/updating types in `types.tsx` doesn't break the application.
- **Linting**: Run `npm run lint` to ensure code style consistency.
