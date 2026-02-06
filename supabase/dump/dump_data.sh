#!/bin/bash


# Navigate to the project root
cd "$(git rev-parse --show-toplevel)"

supabase db dump --data-only --schema public --use-copy -f supabase/dump/data_dump.sql
cd supabase/dump
python3 convert_seed.py

