#!/bin/bash

# Change to supabase directory unless already in it
if [ "$(basename "$(pwd)")" != "supabase" ]; then
    cd supabase
fi

supabase db dump -f schema_dump.sql --schema public
cd ..
