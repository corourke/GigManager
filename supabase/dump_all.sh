supabase db dump -f schema.sql --schema public
supabase db dump --data-only --schema public --use-copy -f data.sql
