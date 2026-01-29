# Supabase Procedures and Guide

### 1. Applying migrations to the remote database

To apply migrations from your local setup to a remote Supabase database, first ensure your local project is linked to the remote project. This process uses the Supabase CLI and assumes you have migrations in the `supabase/migrations` directory (created via `supabase migration new <name>` or other methods).

- Install the Supabase CLI if not already done (e.g., via `npm install -g supabase`).
- Link your local project to the remote one:  
  `supabase link --project-ref <project-id>`  
  (Replace `<project-id>` with your project's reference from the Supabase dashboard URL, e.g., `https://supabase.com/dashboard/project/<project-id>`).
- Apply the migrations:  
  `supabase db push`  
  This pushes all unapplied local migrations to the linked remote database. Use `--dry-run` to preview changes without applying them.
- Optionally, include seed data:  
  `supabase db push --include-seed`  
  This applies migrations and runs any seed scripts from `supabase/seed.sql`.

After pushing, verify changes in the Supabase dashboard under the Database section or Migrations view.

### 2. Check the status of migrations

Use the Supabase CLI to view the migration history and status for both local and remote databases.

- List migrations:  
  `supabase migration list`  
  This shows a table of migration versions, their names, and applied status (e.g., "Applied" or "Pending"). It compares local files in `supabase/migrations` with the database's migration history table (`supabase_migrations.schema_migrations`).
- For remote-specific checks after linking:  
  Run `supabase db push --dry-run` to see what would be applied without changes.
- In the Supabase dashboard: Navigate to Database > Migrations to view the history visually.

If the output shows discrepancies, it may indicate sync issues (see point 3).

### 3. Fixing migration sync issues if there is an error applying a migration

Migration errors can arise from schema drift, permission issues, SQL syntax problems, or history mismatches. Here's a step-by-step troubleshooting process:

- **Identify the error**: Run `supabase db push --dry-run` to preview issues. Check logs in the Supabase dashboard under Branches > Logs if using branching.
- **Common fixes**:
  - **Syntax or dependency errors**: Review the failing migration file in `supabase/migrations` for valid SQL. Ensure dependencies (e.g., tables referenced) exist in prior migrations. Test locally with `supabase db reset` (resets local DB and reapplies all migrations).
  - **Permission errors** (e.g., "must be owner of table"): Run ownership alterations in a migration, like `ALTER TABLE <table> OWNER TO postgres;`. This is common when schemas differ.
  - **History out of sync**: Use `supabase migration repair --status applied <timestamp>` (or `--status reverted`) to manually mark migrations in the remote history table. Replace `<timestamp>` with the migration file name (e.g., `20230101123456`). Run this after confirming with `supabase migration list`.
  - **Schema drift**: Pull remote changes with `supabase db pull` to create a new migration file capturing differences, then apply locally with `supabase migration up` or `supabase db reset`.
  - **Lock timeouts**: Increase the lock timeout in the migration file, e.g., `SET lock_timeout = '10s';`.
- **Severe cases**: Delete the migration history table on remote (`DROP SCHEMA supabase_migrations CASCADE;`), then reset with `supabase db remote set <connection-string>` and `supabase db pull` to rebuild. Warning: This can lose history; back up first.
- After fixes, re-run `supabase db push` and verify with `supabase migration list`.

### 4. Keeping a `schema.sql` file up to date that can be used to accurately re-create the state of the database (minus data)

Use the Supabase CLI's dump command to export the schema. This captures tables, views, functions, RLS policies, etc., without data.

- Dump the schema:  
  `supabase db dump -f schema.sql`  
  This connects to your linked database (local or remote) and outputs to `schema.sql`.
- For remote databases: Specify `--db-url <connection-string>` if not linked. The connection string is from Supabase dashboard > Settings > Database > Connection string (use the URI format).
- Exclude data explicitly: Add `--data-only false` (though default is schema-focused; use `--role-only` if needed for roles).
- To include specific schemas (e.g., `auth`, `storage`): `--schema <schema-name>`.
- Best practice: Run this after any schema changes, commit `schema.sql` to version control, and use it to recreate via `psql -d <connection-string> -f schema.sql` on a new DB. Edit the file if needed to remove Supabase-specific owners like `supabase_admin` to avoid permission issues during restore.

### 5. How to dump all the data in the database, to create a SQL file that I can later run to re-populate a newly created database?

Export data using the CLI's dump command, which generates INSERT statements or COPY for efficiency.

- Dump data only:  
  `supabase db dump --data-only -f data.sql --use-copy`  
  This outputs data as COPY commands (faster for large datasets) to `data.sql`.
- For remote: Add `--db-url <connection-string>`.
- Exclude specific tables: `--exclude <schema.table>`.
- To restore: First apply schema (from point 4), then `psql -d <connection-string> --single-transaction --variable ON_ERROR_STOP=1 -f data.sql`. Use `--clean --if-exists` in dump for DROP statements if overwriting.
- For full backup (schema + data): Omit `--data-only`, but for data-only repopulation, combine with schema dump.
- If creating a `supabase/seed.sql` file, you may want to add the `ON CONFLICT DO NOTHING` clause to insert statements to make the statements safe to run without duplicates.

### 6. Instructions for using a local development database

Supabase provides a local stack via the CLI, running Postgres, Auth, Storage, etc., on Docker. 

Start with `supabase init` to set up.

#### 6.1. What files do I need to maintain (i.e. .env or .env.local)

- `supabase/config.toml`: Core config file created by `supabase init`. Edit for custom settings like Auth providers, storage buckets, or API ports.
- `.env` or `.env.local`: Store secrets like API keys (e.g., `SUPABASE_AUTH_GITHUB_CLIENT_ID`). The CLI loads these for substitution in commands. Use `.env.local` for overrides not committed to git.
- `supabase/migrations/`: SQL migration files.
- `supabase/seed.sql`: Optional for seeding data during resets.
- `.gitignore`: Add `.env` and `.supabase` temp files.

#### 6.2. How do I know which database I'm connecting to in the CLI?

- Local by default: Commands like `supabase db reset` target the local stack started with `supabase start` (DB at `postgresql://postgres:postgres@localhost:54322/postgres`).
- Remote after linking: `supabase link --project-ref <project-id>` sets the remote target. Commands like `supabase db push` or `supabase db pull` then interact with remote. Check link status with `supabase projects list` or look in `.supabase/.temp/project-ref`.
- Explicit: Use `--db-url <connection-string>` for any command to override.
- Studio: Local dashboard at `http://localhost:54323`; remote via Supabase web.

#### 6.3. How do I check migration status of the local (vs. remote) database?

- Local: `supabase migration list --local` (or just `supabase migration list` without remote link; it scans local files and DB).
- Remote: After linking, `supabase migration list` includes remote status. Compare columns for local vs. remote applied.
- Apply/test local: `supabase migration up` (applies latest) or `supabase db reset` (full reapply).

#### 6.4. How do I keep the remote and local database schemas synchronized?

- **Remote to local**: `supabase db pull` (creates a new migration file like `<timestamp>_remote_schema.sql` capturing differences). Review/edit, then apply with `supabase migration up` or `supabase db reset`.
- **Local to remote**: `supabase db push` after changes.
- Specific schemas: `supabase db pull --schema auth` (e.g., for Auth/Storage).
- Storage buckets: Define in `supabase/config.toml` under `[storage.buckets]`, sync with `supabase seed buckets`.
- Best practice: Always test locally first (`supabase start`, make changes, `supabase db diff -f <name>` to generate migration), commit to git, then push. Use CI/CD (e.g., GitHub Actions) for automated sync.



### Steps to Reset Your Remote Database

Supabase does not allow you to directly drop the entire remote database (as it's a managed Postgres instance), but you can effectively **reset** it to a fresh state—dropping all user-created objects (tables, functions, etc., typically in the `public` schema and others you've created)—while preserving core Supabase system schemas like `auth`, `storage`, and `realtime`.

The recommended and official way to do this is using the Supabase CLI's `db reset` command with the `--linked` flag.

1. **Ensure your project is linked** (if not already):  
   
   ```
   supabase link --project-ref <your-project-ref>
   ```
   - Get `<your-project-ref>` from your project's dashboard URL (e.g., `https://supabase.com/dashboard/project/<your-project-ref>`).
   
2. **Backup first (strongly recommended)**:  
   This is destructive and irreversible. Dump your current schema and/or data:  
   ```
   supabase db dump --schema-only -f backup-schema.sql
   supabase db dump --data-only -f backup-data.sql
   ```
   - Or for a full dump: `supabase db dump -f full-backup.sql`.

3. **Reset the remote database**:  
   ```
   supabase db reset --linked
   ```
   - This:
     - Identifies and drops all user-created entities in the remote database.
     - Reapplies all your local migrations (from `supabase/migrations/`).
     - Runs your `supabase/seed.sql` file if it exists (great for repopulating test data).
   - It will prompt for confirmation (type `y` to proceed). Be careful—this wipes user data and objects!
   - Note: It primarily targets user-created content (e.g., `public` schema tables). Core Supabase schemas (like `auth`) are usually preserved, but test in a non-production project if possible.

4. **Verify**:  
   - Check the Supabase dashboard (Table editor or SQL editor).
   - Run `supabase migration list` to confirm status.
   - Your schema should now match your local migrations, with fresh data from seeds if any.

#### Alternatives If Needed
- **Manual reset via SQL editor** (in Supabase dashboard > SQL):  
  If you only want to reset the `public` schema (common for app tables):  
  ```sql
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
  GRANT ALL ON SCHEMA public TO postgres;
  GRANT ALL ON SCHEMA public TO public;
  -- Optional: AUTHORIZE for auth if needed
  ```
  Then run `supabase db push` to reapply migrations.

- **Full project nuke** (if you want everything gone, including auth users, keys, etc.):  
  Delete the entire project in the dashboard (Settings > General > Delete project), then create a new one. This gives a completely fresh database but loses all project settings.

The `db reset --linked` method is the cleanest for most development/reset scenarios, especially since you're using migrations. If you encounter issues (e.g., auth tables affected unexpectedly), check the latest CLI docs or GitHub discussions for your CLI version. Let me know how it goes!