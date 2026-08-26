-- Hierarchical Kits: unify kit_assets into kit_components (mutually-exclusive
-- asset_id/child_kit_id), add cycle prevention, and a write-time-maintained
-- flattened-contents cache. See .zenflow/tasks/i-would-like-kits-to-be-hierarch-21f6/spec.md

-- 1. Unify kit_assets -> kit_components -------------------------------------

ALTER TABLE public.kit_assets RENAME TO kit_components;

ALTER TABLE public.kit_components
  ALTER COLUMN asset_id DROP NOT NULL,
  ADD COLUMN child_kit_id uuid REFERENCES public.kits(id) ON DELETE CASCADE,
  ADD CONSTRAINT kit_components_exactly_one_target CHECK (
    (asset_id IS NOT NULL AND child_kit_id IS NULL) OR
    (asset_id IS NULL AND child_kit_id IS NOT NULL)
  ),
  ADD CONSTRAINT kit_components_no_self_reference CHECK (child_kit_id <> kit_id);

ALTER TABLE public.kit_components DROP CONSTRAINT kit_assets_kit_id_asset_id_key;
CREATE UNIQUE INDEX kit_components_kit_asset_key ON public.kit_components (kit_id, asset_id) WHERE asset_id IS NOT NULL;
CREATE UNIQUE INDEX kit_components_kit_childkit_key ON public.kit_components (kit_id, child_kit_id) WHERE child_kit_id IS NOT NULL;
CREATE INDEX idx_kit_components_child_kit_id ON public.kit_components (child_kit_id) WHERE child_kit_id IS NOT NULL;

-- 2. Cycle prevention ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.kit_would_create_cycle(p_parent_kit_id uuid, p_child_kit_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH RECURSIVE descendants AS (
    SELECT child_kit_id AS kit_id FROM kit_components
    WHERE kit_id = p_child_kit_id AND child_kit_id IS NOT NULL
    UNION
    SELECT kc.child_kit_id FROM kit_components kc
    JOIN descendants d ON kc.kit_id = d.kit_id
    WHERE kc.child_kit_id IS NOT NULL
  )
  SELECT EXISTS (SELECT 1 FROM descendants WHERE kit_id = p_parent_kit_id);
$$;

CREATE OR REPLACE FUNCTION public.prevent_kit_hierarchy_cycle()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF public.kit_would_create_cycle(NEW.kit_id, NEW.child_kit_id) THEN
    RAISE EXCEPTION 'Adding this kit would create a circular reference' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER kit_components_prevent_cycle
  BEFORE INSERT OR UPDATE ON public.kit_components
  FOR EACH ROW WHEN (NEW.child_kit_id IS NOT NULL)
  EXECUTE FUNCTION public.prevent_kit_hierarchy_cycle();

-- 3. Flattened-contents cache, maintained on every kit_components write ------

CREATE TABLE public.kit_flattened_cache (
    kit_id uuid NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
    asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    total_quantity integer NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    PRIMARY KEY (kit_id, asset_id)
);

CREATE INDEX idx_kit_flattened_cache_asset_id ON public.kit_flattened_cache (asset_id);

ALTER TABLE public.kit_flattened_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view flattened cache for their organization's kits" ON public.kit_flattened_cache
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM kits k WHERE k.id = kit_flattened_cache.kit_id
            AND public.user_is_member_of_org(k.organization_id, auth.uid()))
  );

CREATE OR REPLACE FUNCTION public.refresh_kit_flattened_cache(p_kit_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM kits WHERE id = p_kit_id) THEN
    RETURN; -- kit is mid-delete; ON DELETE CASCADE on this table handles cleanup
  END IF;

  DELETE FROM kit_flattened_cache WHERE kit_id = p_kit_id;

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
  FROM flat
  WHERE asset_id IS NOT NULL
  GROUP BY asset_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_kit_flattened_cache_cascade(p_kit_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  affected_kit uuid;
BEGIN
  PERFORM public.refresh_kit_flattened_cache(p_kit_id);

  FOR affected_kit IN
    WITH RECURSIVE ancestors AS (
      SELECT kit_id FROM kit_components WHERE child_kit_id = p_kit_id
      UNION
      SELECT kc.kit_id FROM kit_components kc
      JOIN ancestors a ON kc.child_kit_id = a.kit_id
    )
    SELECT kit_id FROM ancestors
  LOOP
    PERFORM public.refresh_kit_flattened_cache(affected_kit);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_refresh_kit_flattened_cache()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.refresh_kit_flattened_cache_cascade(COALESCE(NEW.kit_id, OLD.kit_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER kit_components_refresh_cache
  AFTER INSERT OR UPDATE OR DELETE ON public.kit_components
  FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_kit_flattened_cache();

-- Backfill: populate the cache for every kit that already has direct assets
-- (existing kit_assets rows, now kit_components rows with asset_id set).
DO $$
DECLARE
  k uuid;
BEGIN
  FOR k IN SELECT DISTINCT kit_id FROM kit_components LOOP
    PERFORM public.refresh_kit_flattened_cache(k);
  END LOOP;
END $$;

-- 4. Hierarchy tree (structure, not flattened — for display only) -----------

CREATE OR REPLACE FUNCTION public.get_kit_hierarchy_tree(p_kit_id uuid)
RETURNS TABLE(parent_kit_id uuid, child_kit_id uuid, quantity integer, depth integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM kits k WHERE k.id = p_kit_id AND public.user_is_member_of_org(k.organization_id, auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized to view this kit' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH RECURSIVE tree AS (
    SELECT kc.kit_id AS parent_kit_id, kc.child_kit_id, kc.quantity, 1 AS depth
    FROM kit_components kc WHERE kc.kit_id = p_kit_id AND kc.child_kit_id IS NOT NULL
    UNION ALL
    SELECT kc.kit_id, kc.child_kit_id, kc.quantity, t.depth + 1
    FROM kit_components kc
    JOIN tree t ON kc.kit_id = t.child_kit_id
    WHERE kc.child_kit_id IS NOT NULL
  )
  SELECT * FROM tree;
END;
$$;

-- 5. RLS on kit_components ----------------------------------------------------

DROP POLICY IF EXISTS "Admins and Managers can manage kit assets" ON public.kit_components;
DROP POLICY IF EXISTS "Users can view kit assets for their organization's kits" ON public.kit_components;

CREATE POLICY "Users can view kit components for their organization's kits" ON public.kit_components
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM kits k WHERE k.id = kit_components.kit_id
            AND public.user_is_member_of_org(k.organization_id, auth.uid()))
  );

CREATE POLICY "Admins and Managers can manage kit components" ON public.kit_components
  FOR ALL USING (
    EXISTS (SELECT 1 FROM kits k WHERE k.id = kit_components.kit_id
            AND public.user_is_admin_or_manager_of_org(k.organization_id, auth.uid()))
    AND (
      child_kit_id IS NULL
      OR EXISTS (SELECT 1 FROM kits k2 WHERE k2.id = kit_components.child_kit_id
                 AND public.user_is_admin_or_manager_of_org(k2.organization_id, auth.uid()))
    )
  );
