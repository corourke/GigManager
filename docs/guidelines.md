### Project-Specific Backend Setup

This is NOT a standard Figma Make prototype. This is a full production application with:

- Complete Supabase PostgreSQL database with custom schema
- Multiple custom tables (users, organizations, gigs, assets, etc.)
- Existing migration files in `/supabase/migrations/`
- Direct Supabase database access outside of Figma Make environment
- Custom RLS policies managed at application layer

Database modifications:
- You CAN write migration files to `/supabase/migrations/`
- You CAN provide DDL statements for the Supabase SQL Editor
- You SHOULD update migration documentation when schema changes are needed
- The KV store limitations DO NOT apply to this project

Migration workflow:
- Create migration SQL files in `/supabase/migrations/`
- Update documentation files (RLS_FIX_SUMMARY.md, APPLY_DATABASE_FIXES.md, etc.)
- Provide instructions for running migrations in Supabase SQL Editor



### UI guidelines

* Don't create separate components for Add and Update screens, use one form component with logic to correctly handle both Create and Update operations. 
* Only use absolute positioning when necessary. Opt for responsive and well structured layouts that use flexbox and grid by default.
* Refactor code as you go to keep code clean.
* Keep file sizes small and put helper functions and components in their own files.

### Data handling guidelines

* When updating data in the database through a user edit action (whether on a form, or inline editing
  in a table) ensure that we ONLY update database columns (including rows in related tables) for 
  values that have been changed in the UI. We should not make changes to column values that have not 
  changed to avoid triggering change logic in the back-end.
* It is not necessary to include code to gracefully handle the case where a table 
  doesn't exist as we will always assume that migrations will be run. 
* Do not add or maintain any code to handle mock data -- we are using a live database. 