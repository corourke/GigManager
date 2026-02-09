# Technical Specification - Database Consolidation

## 1. Technical Context
- **Database**: PostgreSQL 15+ (hosted on Supabase)
- **Tooling**: Supabase CLI, Docker, Bash, Python
- **Environment**: Node.js frontend, Supabase Edge Functions (Deno)

## 2. Implementation Approach

### 2.1 Schema Consolidation
1. **Preparation**:
   - Back up current migrations by moving them to `supabase/migrations_archive`.
   - Ensure `supabase/dump/schema_dump.sql` is up to date (manually verified or re-run if possible).
2. **Consolidation**:
   - Create a single migration file: `supabase/migrations/20260209000000_initial_schema.sql`.
   - Clean the `schema_dump.sql` content:
     - Remove `ALTER ... OWNER TO ...` statements that refer to specific Supabase internal users (e.g., `supabase_admin`, `authenticator`) unless they are standard roles like `postgres` or `anon`.
     - Ensure all extensions (like `uuid-ossp`, `pg_net`) are included.
     - Ensure RLS policies, triggers, and functions are preserved.
3. **Verification**:
   - Initialize a local Supabase instance using `supabase init` if `config.toml` is missing.
   - Run `supabase db reset` locally to apply the consolidated migration.
   - Check for any SQL errors during application.

### 2.2 Seed Data Optimization
1. **Generation**:
   - Run `supabase/dump/dump_data.sh` to generate a raw data dump.
2. **Refinement**:
   - Process the raw dump through `convert_seed.py` to create `supabase/seed.sql`.
   - Manually inspect and correct `seed.sql`:
     - Wrap in `BEGIN; ... COMMIT;` with `SET session_replication_role = replica;` to bypass FK checks during seeding.
     - Ensure tables are seeded in the correct order or FKs are disabled.
3. **Verification**:
   - Run `supabase db reset` locally and verify that data is correctly populated.

### 2.3 Documentation Consolidation
1. **Target**: `docs/technical/setup-guide.md`
2. **Move Content**:
   - Move 'Testing & Troubleshooting' from `docs/technical/database.md`.
   - Incorporate all unique and relevant content from `docs/technical/supabase-guide.md`.
3. **Structure**:
   - **Prerequisites**: Node, Docker, Supabase CLI.
   - **Local Development**: `supabase start`, `db reset`, switching frontend API URL.
   - **Production Deployment**: `supabase link`, `db push`, `functions deploy`.
   - **Troubleshooting**: Common errors, RLS issues, sync issues.
4. **Cleanup**:
   - Remove `docs/technical/supabase-guide.md`.
   - Update `docs/technical/database.md` to focus strictly on schema/entity definitions.

### 2.4 Verification Plan
- **Lint/Typecheck**: Run `npm run lint` and `npm run typecheck` to ensure no documentation or configuration changes broke the build.
- **Local Test**: `supabase db reset` must pass without errors and populate the DB.
- **Manual Verification**: Verify that the app can connect to the local DB if Docker is available in the environment.
