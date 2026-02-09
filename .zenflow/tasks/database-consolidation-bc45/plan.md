# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: b4a3cc53-4732-42cd-9a39-7c2fef545ce2 -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification

Create a technical specification based on the PRD in `{@artifacts_path}/requirements.md`.

1. Review existing codebase architecture and identify reusable components
2. Define the implementation approach

Save to `{@artifacts_path}/spec.md` with:
- Technical context (language, dependencies)
- Implementation approach referencing existing code patterns
- Source code structure changes
- Data model / API / interface changes
- Delivery phases (incremental, testable milestones)
- Verification approach using project lint/test commands

### [x] Step: Planning

Create a detailed implementation plan based on `{@artifacts_path}/spec.md`.

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint, write tests for a module). Avoid steps that are too granular (single function) or too broad (entire feature).

If the feature is trivial and doesn't warrant full specification, update this workflow to remove unnecessary steps and explain the reasoning to the user.

Save to `{@artifacts_path}/plan.md`.

### [ ] Step: Consolidate Database Migrations
1. Archive current migrations in `supabase/migrations_archive`.
2. Create `supabase/migrations/20260209000000_initial_schema.sql` from `supabase/dump/schema_dump.sql`.
3. Clean the new migration file (owners, extensions, etc.).
4. Run `supabase init` to create `config.toml` if missing.

### [ ] Step: Create and Test Seed Data
1. Run `supabase/dump/dump_data.sh`.
2. Verify/Correct `supabase/seed.sql` with replication-role block.
3. Test seeding with `supabase db reset`.

### [ ] Step: Document Restructuring
1. Move 'Testing & Troubleshooting' from `database.md` to `setup-guide.md`.
2. Merge `supabase-guide.md` into `setup-guide.md`.
3. Reorganize `setup-guide.md` and remove redundancy.
4. Update references to database setup in other docs.

### [ ] Step: Verification and Cleanup
1. Run lint and typecheck.
2. Delete `supabase-guide.md` and `migrations_archive`.
3. Final review of documentation and scripts.
