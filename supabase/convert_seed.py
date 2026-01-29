#!/usr/bin/env python3
"""
Script to convert PostgreSQL COPY FROM stdin statements to INSERT statements
for Supabase seed.sql compatibility.

Usage: python3 convert_seed.py
This will modify seed.sql in place, converting all COPY statements to INSERT statements.
"""

import re

def convert_copy_to_inserts(content):
    # Pattern to match COPY statements with their data
    copy_pattern = r'COPY "public"\."([^"]+)" \(([^)]+)\) FROM stdin;\n(.*?)\n\\.\n'

    def replace_copy(match):
        table_name = match.group(1)

        columns_str = match.group(2)
        data_block = match.group(3)

        # Parse columns, adding quotes for reserved keywords
        reserved_keywords = {'end'}  # Add more as needed
        columns = []
        for col in columns_str.split(','):
            col = col.strip().strip('"')
            if col in reserved_keywords:
                columns.append(f'"{col}"')
            else:
                columns.append(col)

        # Parse data lines
        data_lines = [line for line in data_block.split('\n') if line.strip()]

        inserts = []
        for data_line in data_lines:
            values = data_line.split('\t')
            if len(values) == len(columns):
                # Process values
                processed_values = []
                for val in values:
                    if val == '\\N':
                        processed_values.append('NULL')
                    else:
                        # Escape single quotes
                        escaped = val.replace("'", "''")
                        processed_values.append(f"'{escaped}'")

                insert = f'INSERT INTO {table_name} ({", ".join(columns)}) VALUES ({", ".join(processed_values)});'
                inserts.append(insert)

        return '\n'.join(inserts) + '\n'

    # Replace all COPY statements
    result = re.sub(copy_pattern, replace_copy, content, flags=re.DOTALL)
    return result

if __name__ == '__main__':
    # Read the data dump file
    with open('data_dump.sql', 'r') as f:
        content = f.read()

    # Convert COPY to INSERT
    converted_content = convert_copy_to_inserts(content)

    # Write the seed file
    with open('seed.sql', 'w') as f:
        f.write(converted_content)

    print("Converted COPY statements to INSERT statements")