# Product Requirements Document (PRD) - Database Consolidation

## 1. Overview
The goal of this task is to simplify and standardize the database management for GigManager. Currently, the project has many incremental migrations, which makes it difficult to set up fresh environments or local development instances. We will consolidate these migrations, improve the local development workflow, and centralize documentation.

## 2. Objectives
- **Consolidate Migrations**: Combine all existing Supabase migrations into a single, clean initialization file.
- **Local Development Support**: Establish a reliable process for running a local Supabase instance that matches the production schema.
- **Data Seeding**: Create and verify a `seed.sql` file that can populate a fresh database with a working set of data.
- **Documentation Centralization**: Merge fragmented database and setup instructions into a single, logical `setup-guide.md`.

## 3. Scope

### 3.1 Database Consolidation
- Use the existing `supabase/dump/schema_dump.sql` (or generate a fresh one) to create a new "base" migration.
- Remove old migration files to prevent clutter and confusion.
- Ensure the consolidated migration includes all necessary extensions, schemas, tables, views, functions, triggers, and RLS policies.

### 3.2 Local Development Environment
- Verify `supabase/config.toml` is correctly configured for local development.
- Provide clear instructions for:
  - Starting the local Supabase stack.
  - Applying the consolidated schema.
  - Seeding the database.
  - Switching between local and production environments in the frontend.

### 3.3 Data Seeding
- Generate a `seed.sql` file using `supabase/dump/dump_data.sh`.
- Iteratively test and fix `seed.sql` to ensure it can be applied to a fresh database without foreign key or constraint violations.
- Ensure `seed.sql` includes `ON CONFLICT DO NOTHING` or similar logic where appropriate for idempotency.

### 3.4 Documentation Restructuring
- **Move Content**: Relocate the 'Testing & Troubleshooting' section from `docs/technical/database.md` to `docs/technical/setup-guide.md`.
- **Consolidate Guides**: Merge `docs/technical/supabase-guide.md` into `docs/technical/setup-guide.md`.
- **Organize**: Structure `setup-guide.md` to follow a logical flow: Prerequisites -> Local Setup -> Production Setup -> Troubleshooting.
- **Reduce Redundancy**: Remove duplicate instructions and ensure consistent naming/commands across all documents.

## 4. Non-Functional Requirements
- **Reliability**: Recreating the database from scratch must result in a functional application.
- **Clarity**: Documentation must be easy to follow for new developers.
- **Security**: Ensure RLS policies are correctly captured in the consolidated schema.

## 5. Assumptions & Constraints
- We assume `supabase/dump/schema_dump.sql` is a faithful representation of the production schema.
- We assume the user has Supabase CLI installed and configured.
- Local development requires Docker.
- Manual verification of "recreating the current cloud database" might be limited to local testing unless the user provides a staging environment.
