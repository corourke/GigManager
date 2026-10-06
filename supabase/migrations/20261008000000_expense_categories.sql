-- #125 / #133: one shared list of expense categories, the headings Cameron filed on
-- his 2025 Schedule C. Every organization uses the same list; nobody edits it from
-- the app (a migration adds or renames a category).
--
-- purchases.category stays free text: an expensed line stores one of these names,
-- a depreciated line stores its equipment category (the same as its asset's).
-- schedule_c_line is the line it was filed on. All of the 2025 headings were listed
-- under Part V (line 48), which totals onto line 27b.

CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  schedule_c_line text,
  sort_order smallint NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.expense_categories IS
  'Shared expense categories (the 2025 Schedule C headings). Expensed purchase lines store the name in purchases.category.';
COMMENT ON COLUMN public.expense_categories.schedule_c_line IS
  'Schedule C line the category is filed on (27b = other expenses, Part V). Null: not deducted.';

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read expense categories" ON public.expense_categories
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.expense_categories TO authenticated;

INSERT INTO public.expense_categories (name, schedule_c_line, sort_order) VALUES
  ('Small audio parts',                 '27b',  10),
  ('Small lighting parts',              '27b',  20),
  ('Small networking parts',            '27b',  30),
  ('Small power parts and consumables', '27b',  40),
  ('Other small parts',                 '27b',  50),
  ('Cases and bags',                    '27b',  60),
  ('Supplies',                          '27b',  70),
  ('Software subscriptions',            '27b',  80),
  ('Training',                          '27b',  90),
  ('Marketing and website',             '27b', 100),
  ('Insurance',                         '27b', 110),
  ('Car and truck expenses',            '27b', 120),
  ('Contract labor',                    '27b', 130),
  ('Travel',                            '27b', 140),
  ('Travel meals',                      '27b', 150),
  ('Reimbursable (not deducted)',       NULL,  900);
