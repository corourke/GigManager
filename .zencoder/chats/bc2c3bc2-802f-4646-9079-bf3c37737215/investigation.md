# Investigation: Replace fin_category Enum

## Bug Summary

Replace the existing `fin_category` Postgres enum (currently IRS Schedule C long-form values) with a new simplified 13-value set:

```
Insurance, Labor, Legal, Meals, Office, Production, Promotion, Repairs,
Supplies, Taxes, Travel, Venue, Other
```

No data migration of existing rows is required.

---

## Current fin_category Enum Values (Live DB)

From `backups/dev-schema-backup-20260520-070135.sql` (dev) and `supabase/dump/schema_dump.sql`:

```sql
CREATE TYPE "public"."fin_category" AS ENUM (
    'Advertising',
    'Car and truck expenses',
    'Commissions and fees',
    'Contract labor',
    'Depreciation',
    'Insurance',
    'Legal and professional services',
    'Office expense',
    'Rent or lease',
    'Repairs and maintenance',
    'Supplies',
    'Taxes and licenses',
    'Travel',
    'Meals',
    'Utilities',
    'Wages',
    'Other expenses',
    'Production'          -- added in a prior migration but absent from dump
);
```

> Note: the `supabase/dump/schema_dump.sql` shows 17 values (no `'Production'`). The dev-schema backup shows 18 values (includes `'Production'`). The live prod backup should be checked; but the task says no data migration is needed, so the exact current values don't matter for the migration strategy.

---

## Migration History

| File | What it did |
|---|---|
| `20260209000000_initial_schema.sql` | Created original `fin_category` with `'Labor'`, `'Equipment'`, `'Transportation'` |
| `20260328000001_update_fin_categories.sql` | Replaced with IRS-abbreviated names (had a bug: missing comma merged `'Transportation'` and `'Travel'`) |
| `20260512000000_fix_fin_categories.sql` | Replaced again with full IRS Schedule C names (current state) |
| `20260513000000_make_fin_category_nullable.sql` | Made `category` nullable on `gig_financials` |
| `20260520000000_drop_fin_defaults.sql` | Dropped DEFAULT from `type` and `category` columns |

---

## Affected Components

### 1. Database migration (new file required)
The migration must replace the enum type using the established drop-and-recreate pattern (same pattern used in `20260512000000_fix_fin_categories.sql` and `20260328000001_update_fin_categories.sql`):
1. Create `fin_category_new` with the 13 new values
2. `ALTER TABLE gig_financials ALTER COLUMN category TYPE text`
3. `DROP TYPE public.fin_category CASCADE`
4. `ALTER TYPE fin_category_new RENAME TO fin_category`
5. `ALTER TABLE gig_financials ALTER COLUMN category TYPE public.fin_category USING category::public.fin_category`

> **Important:** Step 5 will fail at runtime for any existing rows whose text value does not match one of the 13 new enum labels — but since no data migration is required, existing rows may be set to NULL or left as-is (the column is already nullable). We will need to handle this by either NULLing out non-matching values before re-casting, or using a `CASE` expression in the `USING` clause. Since the task says "no migration needed", the simplest approach is: set all existing category values to NULL before re-casting (they are nullable), then cast back.

### 2. `supabase/dump/schema_dump.sql`
Contains the `CREATE TYPE "public"."fin_category"` block — **must be updated** to reflect new values so local dev seeds are correct.

### 3. `src/utils/supabase/constants.ts`
- `FIN_CATEGORY_CONFIG` object (lines 107–125): keys and labels must be replaced with the 13 new values.
- `FinCategory` type is derived from `keyof typeof FIN_CATEGORY_CONFIG` — will update automatically.

### 4. `src/components/gig/GigFinancialsSection.tsx`
- Uses `FIN_CATEGORY_CONFIG` in the category `<Select>` dropdown (line 932): dynamically iterates the config object — **no hardcoded values**, will update automatically once `constants.ts` changes.
- Imports `FinCategory` type — will update automatically.

### 5. `src/services/gig.service.ts`
- Imports `FinCategory` type from `types.tsx` — will update automatically.
- No hardcoded old category string values.

### 6. `src/utils/supabase/types.tsx`
- Re-exports `FinCategory` from `constants.ts` — will update automatically.

### 7. `supabase/functions/ai-scan/index.ts`
- `EXPENSE_CATEGORY_HINTS` constant (lines 26–45) contains a prompt that lists old IRS Schedule C category names (`Advertising`, `Commissions`, `Labor`, `Legal/Accounting`, etc.) to guide the AI.
- These are **freeform text in a prompt**, not enum values — but they should be updated to match the new 13 categories so the AI produces values that are valid enum entries. This is a correctness concern.

---

## Proposed Solution

### Files to change

| # | File | Change |
|---|---|---|
| 1 | `supabase/migrations/<new>.sql` | New migration: drop & recreate enum, NULL-out non-matching existing rows |
| 2 | `supabase/dump/schema_dump.sql` | Update `CREATE TYPE "public"."fin_category"` block |
| 3 | `src/utils/supabase/constants.ts` | Replace `FIN_CATEGORY_CONFIG` keys and labels with 13 new values |
| 4 | `supabase/functions/ai-scan/index.ts` | Update `EXPENSE_CATEGORY_HINTS` prompt to list the 13 new categories |

### Migration SQL skeleton

```sql
-- Migration: Simplify fin_category enum
-- Replaces IRS Schedule C long-form values with simplified 13-value set.
-- No data migration: existing category values are NULLed out (column is nullable).

-- 1. Create new enum
CREATE TYPE public.fin_category_new AS ENUM (
  'Insurance',
  'Labor',
  'Legal',
  'Meals',
  'Office',
  'Production',
  'Promotion',
  'Repairs',
  'Supplies',
  'Taxes',
  'Travel',
  'Venue',
  'Other'
);

-- 2. Convert column to text
ALTER TABLE public.gig_financials
  ALTER COLUMN category TYPE text;

-- 3. NULL out any values that won't cast to the new enum
UPDATE public.gig_financials
  SET category = NULL
  WHERE category NOT IN (
    'Insurance','Labor','Legal','Meals','Office','Production',
    'Promotion','Repairs','Supplies','Taxes','Travel','Venue','Other'
  );

-- 4. Replace old enum
DROP TYPE public.fin_category CASCADE;
ALTER TYPE public.fin_category_new RENAME TO fin_category;

-- 5. Restore column type
ALTER TABLE public.gig_financials
  ALTER COLUMN category TYPE public.fin_category USING category::public.fin_category;
```

### constants.ts change

Replace `FIN_CATEGORY_CONFIG` with:

```ts
export const FIN_CATEGORY_CONFIG = {
  'Insurance':   { label: 'Insurance' },
  'Labor':       { label: 'Labor' },
  'Legal':       { label: 'Legal' },
  'Meals':       { label: 'Meals' },
  'Office':      { label: 'Office' },
  'Production':  { label: 'Production' },
  'Promotion':   { label: 'Promotion' },
  'Repairs':     { label: 'Repairs' },
  'Supplies':    { label: 'Supplies' },
  'Taxes':       { label: 'Taxes' },
  'Travel':      { label: 'Travel' },
  'Venue':       { label: 'Venue' },
  'Other':       { label: 'Other' },
} as const;
```

### ai-scan/index.ts change

Replace `EXPENSE_CATEGORY_HINTS` to guide the AI toward the 13 new simplified labels so scanned receipts produce values that are valid enum entries.

---

## Edge Cases / Notes

1. **Existing data**: The `UPDATE … SET category = NULL` in the migration safely handles any rows with old category values. Since the column is already nullable and there is no NOT NULL constraint, this is safe.
2. **`supabase/dump/schema_dump.sql`**: This is used for local dev seeding. It must be updated manually; it is not auto-generated.
3. **`stage-plot-app/`** (mobile): No references to `fin_category` found — no changes needed there.
4. **No tests** reference fin_category values — no test changes needed.
5. **Migration filename**: Should use next available timestamp, e.g. `20260521000000_simplify_fin_categories.sql`.
6. **`ai-scan` function**: Updating the prompt ensures future AI-scanned receipts produce category values that match the new enum. Old scanned records already in the DB are handled by step 3 (NULL-out).
