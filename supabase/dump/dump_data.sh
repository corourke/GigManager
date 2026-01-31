#!/bin/bash

# Change to supabase directory unless already in it
if [ "$(basename "$(pwd)")" != "supabase" ]; then
    cd supabase
fi

supabase db dump --data-only --schema public --use-copy -f supabase/data_dump.sql
python3 convert_seed.py

cd ..