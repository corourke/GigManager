-- Category lists per organization, each with a starter set (10-06, #125).
--
--   schedule_c_lines      the IRS Schedule C Part II lines; read-only reference
--   expense_categories    an organization's expense categories, each filed on a line
--   equipment_categories  an organization's equipment categories (assets.category)
--
-- Rows with no organization are the starter sets. Only platform moderators see or
-- edit them. ensure_org_categories() copies them into an organization the first
-- time it needs a list, and from then on its Admins edit their own copy.
-- purchases.category and assets.category keep storing the category name.

-- 1. Platform moderator check ---------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_platform_moderator()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT platform_moderator FROM public.users WHERE id = auth.uid()), false);
$$;
GRANT EXECUTE ON FUNCTION public.is_platform_moderator() TO authenticated;

-- 2. Schedule C lines -------------------------------------------------------------

CREATE TABLE public.schedule_c_lines (
  code text PRIMARY KEY,
  label text NOT NULL,
  sort_order smallint NOT NULL
);
COMMENT ON TABLE public.schedule_c_lines IS 'IRS Schedule C Part II expense lines (reference; changed by migration).';
ALTER TABLE public.schedule_c_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read Schedule C lines" ON public.schedule_c_lines
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.schedule_c_lines TO authenticated;

INSERT INTO public.schedule_c_lines (code, label, sort_order) VALUES
  ('8',   'Advertising', 8),
  ('9',   'Car and truck expenses', 9),
  ('10',  'Commissions and fees', 10),
  ('11',  'Contract labor', 11),
  ('12',  'Depletion', 12),
  ('13',  'Depreciation and section 179', 13),
  ('14',  'Employee benefit programs', 14),
  ('15',  'Insurance (other than health)', 15),
  ('16a', 'Interest: mortgage', 16),
  ('16b', 'Interest: other', 17),
  ('17',  'Legal and professional services', 18),
  ('18',  'Office expense', 19),
  ('19',  'Pension and profit-sharing plans', 20),
  ('20a', 'Rent or lease: vehicles, machinery and equipment', 21),
  ('20b', 'Rent or lease: other business property', 22),
  ('21',  'Repairs and maintenance', 23),
  ('22',  'Supplies', 24),
  ('23',  'Taxes and licenses', 25),
  ('24a', 'Travel', 26),
  ('24b', 'Deductible meals', 27),
  ('25',  'Utilities', 28),
  ('26',  'Wages', 29),
  ('27a', 'Energy efficient commercial buildings deduction', 30),
  ('27b', 'Other expenses (Part V)', 31);

-- 3. Expense categories become per organization -------------------------------------

ALTER TABLE public.expense_categories
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  DROP CONSTRAINT expense_categories_name_key,
  ADD CONSTRAINT expense_categories_schedule_c_line_fkey
    FOREIGN KEY (schedule_c_line) REFERENCES public.schedule_c_lines(code);
CREATE UNIQUE INDEX expense_categories_org_name_key ON public.expense_categories
  (COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
COMMENT ON TABLE public.expense_categories IS
  'Expense categories per organization (organization_id NULL = the starter set). Expensed purchase lines store the name in purchases.category.';

-- The 2025 headings were the only list so far: organizations that already record
-- purchases keep them as their own.
INSERT INTO public.expense_categories (organization_id, name, schedule_c_line, sort_order, active)
SELECT o.id, c.name, c.schedule_c_line, c.sort_order, c.active
  FROM public.expense_categories c
 CROSS JOIN (SELECT DISTINCT organization_id AS id FROM public.purchases) o
 WHERE c.organization_id IS NULL;
DELETE FROM public.expense_categories WHERE organization_id IS NULL;

-- The starter set: what a sound, lighting or production company typically uses.
INSERT INTO public.expense_categories (name, schedule_c_line, sort_order) VALUES
  ('Advertising and marketing',                    '8',   10),
  ('Website and online listings',                  '8',   20),
  ('Car and truck expenses',                       '9',   30),
  ('Parking and tolls',                            '9',   40),
  ('Commissions and booking fees',                 '10',  50),
  ('Contract labor (crew, techs, stagehands)',     '11',  60),
  ('Insurance (equipment, liability)',             '15',  70),
  ('Interest',                                     '16b', 80),
  ('Legal and professional services',              '17',  90),
  ('Office expenses',                              '18',  100),
  ('Vehicle and truck rental',                     '20a', 110),
  ('Equipment and backline rental',                '20a', 120),
  ('Storage and shop rent',                        '20b', 130),
  ('Repairs and maintenance',                      '21',  140),
  ('Expendables and supplies',                     '22',  150),
  ('Taxes, licenses and permits',                  '23',  160),
  ('Travel',                                       '24a', 170),
  ('Travel meals',                                 '24b', 180),
  ('Phone and internet',                           '25',  190),
  ('Wages',                                        '26',  200),
  ('Small audio parts',                            '27b', 210),
  ('Small lighting parts',                         '27b', 220),
  ('Small power and networking parts',             '27b', 230),
  ('Cases and bags',                               '27b', 240),
  ('Software subscriptions',                       '27b', 250),
  ('Training and education',                       '27b', 260),
  ('Dues and memberships',                         '27b', 270),
  ('Bank and payment fees',                        '27b', 280),
  ('Freight and shipping',                         '27b', 290);

-- Those organizations also get the starter categories they don't have, turned off.
INSERT INTO public.expense_categories (organization_id, name, schedule_c_line, sort_order, active)
SELECT o.id, s.name, s.schedule_c_line, 1000 + s.sort_order, false
  FROM public.expense_categories s
 CROSS JOIN (SELECT DISTINCT organization_id AS id FROM public.expense_categories WHERE organization_id IS NOT NULL) o
 WHERE s.organization_id IS NULL
   AND NOT EXISTS (SELECT 1 FROM public.expense_categories x
                    WHERE x.organization_id = o.id AND lower(x.name) = lower(s.name));

DROP POLICY "Signed-in users read expense categories" ON public.expense_categories;
CREATE POLICY "Expense categories: org Admins+Managers, or moderators, read"
  ON public.expense_categories FOR SELECT TO authenticated
  USING (CASE WHEN organization_id IS NULL THEN public.is_platform_moderator()
              ELSE public.user_is_admin_or_manager_of_org(organization_id, auth.uid()) END);
CREATE POLICY "Expense categories: org Admins, or moderators (starter) write"
  ON public.expense_categories FOR ALL TO authenticated
  USING (CASE WHEN organization_id IS NULL THEN public.is_platform_moderator()
              ELSE public.user_is_admin_of_org(organization_id, auth.uid()) END)
  WITH CHECK (CASE WHEN organization_id IS NULL THEN public.is_platform_moderator()
                   ELSE public.user_is_admin_of_org(organization_id, auth.uid()) END);
GRANT INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;

-- 4. Equipment categories ----------------------------------------------------------

CREATE TABLE public.equipment_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (btrim(name) <> ''),
  sort_order smallint NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX equipment_categories_org_name_key ON public.equipment_categories
  (COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
COMMENT ON TABLE public.equipment_categories IS
  'Equipment categories per organization (organization_id NULL = the starter set). Assets store the name in assets.category.';

INSERT INTO public.equipment_categories (name, sort_order) VALUES
  ('Audio', 10), ('Lighting', 20), ('Video', 30), ('Rigging and Truss', 40), ('Staging', 50),
  ('Power', 60), ('Networking', 70), ('Communications', 80), ('Backline', 90), ('Effects', 100),
  ('Cases and Bags', 110), ('Rack', 120), ('Computer', 130), ('Software', 140), ('Tools', 150),
  ('Vehicles and Trailers', 160), ('Misc', 170);

-- Organizations with equipment keep the categories they already use.
INSERT INTO public.equipment_categories (organization_id, name, sort_order)
SELECT organization_id, category, (row_number() OVER (PARTITION BY organization_id ORDER BY category) * 10)::smallint
  FROM (SELECT DISTINCT organization_id, btrim(category) AS category FROM public.assets
         WHERE btrim(COALESCE(category, '')) <> '') a;

ALTER TABLE public.equipment_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipment categories: org members, or moderators (starter) read"
  ON public.equipment_categories FOR SELECT TO authenticated
  USING (CASE WHEN organization_id IS NULL THEN public.is_platform_moderator()
              ELSE public.user_is_member_of_org(organization_id, auth.uid()) END);
CREATE POLICY "Equipment categories: org Admins, or moderators (starter) write"
  ON public.equipment_categories FOR ALL TO authenticated
  USING (CASE WHEN organization_id IS NULL THEN public.is_platform_moderator()
              ELSE public.user_is_admin_of_org(organization_id, auth.uid()) END)
  WITH CHECK (CASE WHEN organization_id IS NULL THEN public.is_platform_moderator()
                   ELSE public.user_is_admin_of_org(organization_id, auth.uid()) END);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_categories TO authenticated;

-- 5. First use: copy the starter sets into an organization ---------------------------

CREATE OR REPLACE FUNCTION public.ensure_org_categories(p_org uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.user_is_member_of_org(p_org, auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('ensure_org_categories:' || p_org::text));

  IF NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE organization_id = p_org) THEN
    INSERT INTO public.expense_categories (organization_id, name, schedule_c_line, sort_order, active)
    SELECT p_org, name, schedule_c_line, sort_order, active
      FROM public.expense_categories WHERE organization_id IS NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.equipment_categories WHERE organization_id = p_org) THEN
    INSERT INTO public.equipment_categories (organization_id, name, sort_order, active)
    SELECT p_org, name, sort_order, active
      FROM public.equipment_categories WHERE organization_id IS NULL;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.ensure_org_categories(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_org_categories(uuid) TO authenticated;
