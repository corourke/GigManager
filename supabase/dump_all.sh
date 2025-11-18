supabase db dump -f schema_dump.sql --schema public
supabase db dump --data-only --schema public --use-copy -f data_dump.sql
