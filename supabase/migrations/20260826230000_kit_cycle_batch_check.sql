-- Batched cycle check for the kit component picker: lets the UI flag a
-- candidate kit as "would create a circular reference" right on its row,
-- before the user ever tries to add it — rather than only finding out from
-- the kit_components_prevent_cycle trigger's rejection at save time.
-- Wraps the existing per-pair kit_would_create_cycle() function (unchanged,
-- still the trigger's own check) across a batch of candidates in one call.

CREATE OR REPLACE FUNCTION public.kits_that_would_cycle(p_parent_kit_id uuid, p_candidate_kit_ids uuid[])
RETURNS TABLE(kit_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT c.id AS kit_id
  FROM unnest(p_candidate_kit_ids) AS c(id)
  WHERE public.kit_would_create_cycle(p_parent_kit_id, c.id);
$$;
