### Dumping Your Supabase Database Schema and Data

Supabase's `db dump` command is a wrapper around PostgreSQL's `pg_dump` tool, but it has some Supabase-specific behaviors and limitations. I'll break this down step by step based on your commands and issues, then provide recommendations for getting a complete, restorable backup.

#### 1. **Why Your Default Dump Has No Data**
- The command `supabase db dump > schema.sql` (or with `-f schema.sql`) **dumps only the schema** (table structures, indexes, functions, etc.) by default. It explicitly excludes data and custom roles unless you add flags like `--data-only` or `--role-only`.
- There is no `--schema-only` flag because the default *is* schema-only. The implication you mentioned (that data should be included) comes from standard `pg_dump` behavior, but Supabase CLI overrides this to avoid accidentally dumping sensitive data from managed schemas (e.g., `auth`, `storage`).
- If your tables are empty, the schema dump will look the same either way. Check the output file for `CREATE TABLE` statements to confirm it's working—data would appear as `INSERT` or `COPY` statements after the schema.


```bash
# Schema only
supabase db dump --schema public -f schema.sql

# Data only – you’ll still get the circular FK warning, but the file is created
supabase db dump --data-only --schema public --use-copy -f data.sql
```

To actually restore `data.sql` later without FK errors, 
wrap the entire contents of `data.sql` in a replication-role block (manual edit):

```sql
BEGIN;
SET session_replication_role = replica;   -- disables FK checks

-- paste the entire contents of data.sql here --

COMMIT;
RESET session_replication_role;
```

