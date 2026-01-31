#!/bin/bash

# Navigate to the project root
cd "$(git rev-parse --show-toplevel)"

# Navigate to the supabase directory
cd supabase
echo `pwd`

supabase db dump -f schema_dump.sql --schema public
mv -f ../schema_dump.sql . 