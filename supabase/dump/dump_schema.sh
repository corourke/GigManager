#!/bin/bash

# Navigate to the project root
cd "$(git rev-parse --show-toplevel)"

supabase db dump -f schema_dump.sql --schema public
mv -f schema_dump.sql supabase/dump
