-- #180 (part of #162): separate what a piece of equipment IS from what we OWN.
--
--   equipment_items   what it is: category, manufacturer & model, type, description,
--                     insurance class. One per organization per model + category
--                     (Cameron, 10-08), matched case- and whitespace-insensitively.
--   assets            what we own: units (serial or tag, quantity 1) and lots
--                     (neither, any quantity). Each points at its item.
--
-- Transition: the app keeps writing assets the old way until the screens move
-- (#182-#186). A trigger finds or creates the item from a record's model and
-- category; assets keeps its category/model/type/description/insurance_class
-- columns until a later migration drops them. purchases.asset_id stays too, and
-- is mirrored into the new assets.purchase_line_id.
--
--   kit_components    a line is a specific unit or lot (asset_id), N x any of an
--                     item (equipment_item_id), or a kit (child_kit_id).
--   kit_flattened_item_cache  the "any" lines flattened per item, beside the
--                     existing per-unit kit_flattened_cache (which its readers key on asset_id).
--   inventory_tracking.quantity  a scan can record N from a lot.

-- 1. Items ---------------------------------------------------------------------------

-- Matching key for a model or category name: trimmed, inner whitespace collapsed, lower case.
CREATE OR REPLACE FUNCTION public.equipment_match_key(p text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT lower(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g')) $$;

-- A name as shown: trimmed, inner whitespace (line breaks included) collapsed.
CREATE OR REPLACE FUNCTION public.equipment_tidy_name(p text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g') $$;

CREATE TABLE public.equipment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (btrim(category) <> ''),
  manufacturer_model text NOT NULL CHECK (btrim(manufacturer_model) <> ''),
  type text,
  description text,
  insurance_class text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.equipment_items IS
  'What a piece of equipment is (#162). Units and lots in assets point here. One per organization per manufacturer_model + category (equipment_match_key).';
CREATE UNIQUE INDEX equipment_items_org_model_category_key ON public.equipment_items
  (organization_id, public.equipment_match_key(manufacturer_model), public.equipment_match_key(category));
CREATE TRIGGER update_equipment_items_updated_at BEFORE UPDATE ON public.equipment_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.equipment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their organization's equipment items" ON public.equipment_items
  FOR SELECT TO authenticated USING (public.user_is_member_of_org(organization_id, auth.uid()));
CREATE POLICY "Admins and Managers can manage equipment items" ON public.equipment_items
  FOR ALL TO authenticated
  USING (public.user_is_admin_or_manager_of_org(organization_id, auth.uid()))
  WITH CHECK (public.user_is_admin_or_manager_of_org(organization_id, auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_items TO authenticated;

-- The item for a model + category in an organization, created if there is none.
-- SECURITY DEFINER: the asset trigger runs it for whoever writes the record.
CREATE OR REPLACE FUNCTION public.equipment_item_for(
  p_org uuid, p_model text, p_category text,
  p_type text DEFAULT NULL, p_description text DEFAULT NULL, p_insurance_class text DEFAULT NULL,
  p_user uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.equipment_items
   WHERE organization_id = p_org
     AND public.equipment_match_key(manufacturer_model) = public.equipment_match_key(p_model)
     AND public.equipment_match_key(category) = public.equipment_match_key(p_category);
  IF v_id IS NULL THEN
    -- Insert, or (when an item already matches, e.g. created earlier in the same
    -- statement or by a concurrent writer) take that one: DO UPDATE always returns its id.
    INSERT INTO public.equipment_items (organization_id, category, manufacturer_model, type, description, insurance_class, created_by, updated_by)
    VALUES (p_org, public.equipment_tidy_name(p_category), public.equipment_tidy_name(p_model),
            NULLIF(btrim(p_type), ''), NULLIF(btrim(p_description), ''), NULLIF(btrim(p_insurance_class), ''), p_user, p_user)
    ON CONFLICT (organization_id, public.equipment_match_key(manufacturer_model), public.equipment_match_key(category))
    DO UPDATE SET organization_id = EXCLUDED.organization_id
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.equipment_item_for(uuid, text, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;

-- 2. Assets: item, purchase line ------------------------------------------------------
ALTER TABLE public.assets
  ADD COLUMN equipment_item_id uuid REFERENCES public.equipment_items(id) ON DELETE RESTRICT,
  ADD COLUMN purchase_line_id uuid REFERENCES public.purchases(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.assets.equipment_item_id IS 'The item this unit or lot is (#162).';
COMMENT ON COLUMN public.assets.purchase_line_id IS
  'The purchase line this unit or lot came from (#162). Mirrors purchases.asset_id until the writers move (#183).';
CREATE INDEX idx_assets_equipment_item_id ON public.assets (equipment_item_id);
CREATE INDEX idx_assets_purchase_line_id ON public.assets (purchase_line_id);

-- Backfill (data only, so the asset triggers stay out): one item per model + category,
-- named after the earliest record; every record linked; purchase lines mirrored.
ALTER TABLE public.assets DISABLE TRIGGER USER;
INSERT INTO public.equipment_items (organization_id, category, manufacturer_model, type, description, insurance_class, created_by, updated_by, created_at)
SELECT DISTINCT ON (a.organization_id, public.equipment_match_key(a.manufacturer_model), public.equipment_match_key(a.category))
       a.organization_id, public.equipment_tidy_name(a.category), public.equipment_tidy_name(a.manufacturer_model),
       NULLIF(btrim(a.type), ''), NULLIF(btrim(a.description), ''), NULLIF(btrim(a.insurance_class), ''),
       u.id, u.id, a.created_at
  FROM public.assets a
  LEFT JOIN public.users u ON u.id = a.created_by
 ORDER BY a.organization_id, public.equipment_match_key(a.manufacturer_model), public.equipment_match_key(a.category), a.created_at, a.id;
UPDATE public.assets a SET equipment_item_id = i.id
  FROM public.equipment_items i
 WHERE i.organization_id = a.organization_id
   AND public.equipment_match_key(i.manufacturer_model) = public.equipment_match_key(a.manufacturer_model)
   AND public.equipment_match_key(i.category) = public.equipment_match_key(a.category);
UPDATE public.assets a SET purchase_line_id = l.id
  FROM (SELECT DISTINCT ON (asset_id) asset_id, id FROM public.purchases
         WHERE asset_id IS NOT NULL ORDER BY asset_id, created_at, id) l
 WHERE l.asset_id = a.id;
ALTER TABLE public.assets ENABLE TRIGGER USER;
ALTER TABLE public.assets ALTER COLUMN equipment_item_id SET NOT NULL;

-- Until the screens move: link a record to its item from its model and category.
-- An item set directly is kept, as long as it belongs to the record's organization.
CREATE OR REPLACE FUNCTION public.assets_link_equipment_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.equipment_item_id IS NOT DISTINCT FROM OLD.equipment_item_id
     AND (public.equipment_match_key(NEW.manufacturer_model) <> public.equipment_match_key(OLD.manufacturer_model)
          OR public.equipment_match_key(NEW.category) <> public.equipment_match_key(OLD.category)
          OR NEW.organization_id IS DISTINCT FROM OLD.organization_id) THEN
    NEW.equipment_item_id := NULL;  -- the record now describes another item
  END IF;

  IF NEW.equipment_item_id IS NULL THEN
    NEW.equipment_item_id := public.equipment_item_for(NEW.organization_id, NEW.manufacturer_model, NEW.category,
      NEW.type, NEW.description, NEW.insurance_class, COALESCE(auth.uid(), NEW.created_by));
  ELSIF NOT EXISTS (SELECT 1 FROM public.equipment_items
                     WHERE id = NEW.equipment_item_id AND organization_id = NEW.organization_id) THEN
    RAISE EXCEPTION 'Equipment must use an item of its own organization' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER assets_a_link_equipment_item
  BEFORE INSERT OR UPDATE OF manufacturer_model, category, organization_id, equipment_item_id ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.assets_link_equipment_item();

-- 3. A serial number or tag is one physical thing: quantity 1 -----------------------------
-- Checked when a record is added or its serial, tag or quantity changes, so an older
-- record that breaks the rule can still be edited otherwise until it is fixed.
CREATE OR REPLACE FUNCTION public.assets_unit_quantity_rule()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (btrim(coalesce(NEW.serial_number, '')) <> '' OR btrim(coalesce(NEW.tag_number, '')) <> '')
     AND coalesce(NEW.quantity, 1) <> 1 THEN
    RAISE EXCEPTION 'Equipment with a serial number or tag is one item: its quantity must be 1. Record a lot without a serial or tag instead.'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER assets_unit_quantity_rule
  BEFORE INSERT OR UPDATE OF serial_number, tag_number, quantity ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.assets_unit_quantity_rule();

-- 4. purchases.asset_id -> assets.purchase_line_id, until the writers move (#183) --------
CREATE OR REPLACE FUNCTION public.purchases_mirror_purchase_line()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.asset_id IS NOT NULL AND OLD.asset_id IS DISTINCT FROM NEW.asset_id THEN
    UPDATE public.assets SET purchase_line_id = NULL WHERE id = OLD.asset_id AND purchase_line_id = NEW.id;
  END IF;
  IF NEW.asset_id IS NOT NULL THEN
    UPDATE public.assets SET purchase_line_id = NEW.id
     WHERE id = NEW.asset_id AND purchase_line_id IS DISTINCT FROM NEW.id;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER purchases_mirror_purchase_line
  AFTER INSERT OR UPDATE OF asset_id ON public.purchases
  FOR EACH ROW WHEN (NEW.row_type <> 'header')
  EXECUTE FUNCTION public.purchases_mirror_purchase_line();

-- 5. Kit lines: a unit or lot, N x any of an item, or a kit --------------------------------
ALTER TABLE public.kit_components
  ADD COLUMN equipment_item_id uuid REFERENCES public.equipment_items(id) ON DELETE RESTRICT,
  DROP CONSTRAINT kit_components_exactly_one_target,
  ADD CONSTRAINT kit_components_exactly_one_target CHECK (num_nonnulls(asset_id, equipment_item_id, child_kit_id) = 1);
COMMENT ON COLUMN public.kit_components.equipment_item_id IS
  'N x any unit of this item (#162); quantity is N. Otherwise asset_id (a specific unit or lot) or child_kit_id.';
CREATE UNIQUE INDEX kit_components_kit_item_key ON public.kit_components (kit_id, equipment_item_id) WHERE equipment_item_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.kit_components_item_same_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.equipment_item_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.equipment_items i JOIN public.kits k ON k.organization_id = i.organization_id
        WHERE i.id = NEW.equipment_item_id AND k.id = NEW.kit_id) THEN
    RAISE EXCEPTION 'A kit can only use its own organization''s items' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER kit_components_item_same_org
  BEFORE INSERT OR UPDATE OF equipment_item_id, kit_id ON public.kit_components
  FOR EACH ROW EXECUTE FUNCTION public.kit_components_item_same_org();

CREATE TABLE public.kit_flattened_item_cache (
  kit_id uuid NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
  equipment_item_id uuid NOT NULL REFERENCES public.equipment_items(id) ON DELETE CASCADE,
  total_quantity integer NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (kit_id, equipment_item_id)
);
COMMENT ON TABLE public.kit_flattened_item_cache IS
  'Each kit''s "N x any of an item" lines flattened through nested kits (#162). Specific units stay in kit_flattened_cache.';
CREATE INDEX idx_kit_flattened_item_cache_item ON public.kit_flattened_item_cache (equipment_item_id);
ALTER TABLE public.kit_flattened_item_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view the item cache for their organization's kits" ON public.kit_flattened_item_cache
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.kits k WHERE k.id = kit_flattened_item_cache.kit_id
            AND public.user_is_member_of_org(k.organization_id, auth.uid())));
GRANT SELECT ON public.kit_flattened_item_cache TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_kit_flattened_cache(p_kit_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM kits WHERE id = p_kit_id) THEN
    RETURN; -- kit is mid-delete; ON DELETE CASCADE on the caches handles cleanup
  END IF;

  DELETE FROM kit_flattened_cache WHERE kit_id = p_kit_id;
  DELETE FROM kit_flattened_item_cache WHERE kit_id = p_kit_id;

  INSERT INTO kit_flattened_cache (kit_id, asset_id, total_quantity)
  WITH RECURSIVE flat AS (
    SELECT asset_id, child_kit_id, quantity AS effective_quantity
    FROM kit_components WHERE kit_id = p_kit_id
    UNION ALL
    SELECT kc.asset_id, kc.child_kit_id, kc.quantity * f.effective_quantity
    FROM kit_components kc
    JOIN flat f ON kc.kit_id = f.child_kit_id
  )
  SELECT p_kit_id, asset_id, SUM(effective_quantity)::integer
  FROM flat WHERE asset_id IS NOT NULL GROUP BY asset_id;

  INSERT INTO kit_flattened_item_cache (kit_id, equipment_item_id, total_quantity)
  WITH RECURSIVE flat AS (
    SELECT equipment_item_id, child_kit_id, quantity AS effective_quantity
    FROM kit_components WHERE kit_id = p_kit_id
    UNION ALL
    SELECT kc.equipment_item_id, kc.child_kit_id, kc.quantity * f.effective_quantity
    FROM kit_components kc
    JOIN flat f ON kc.kit_id = f.child_kit_id
  )
  SELECT p_kit_id, equipment_item_id, SUM(effective_quantity)::integer
  FROM flat WHERE equipment_item_id IS NOT NULL GROUP BY equipment_item_id;
END;
$$;

-- 6. Scans count -------------------------------------------------------------------------
ALTER TABLE public.inventory_tracking
  ADD COLUMN quantity integer NOT NULL DEFAULT 1 CONSTRAINT inventory_tracking_quantity_positive CHECK (quantity > 0);
COMMENT ON COLUMN public.inventory_tracking.quantity IS 'How many were scanned: 1 for a unit, N from a lot (#162).';
