-- #178 (10-08): find an existing person or organization before adding a new one.
--
-- Cameron: "We really want to avoid creating duplicate people (and organizations), so the
-- search should be thorough." Every word typed counts, in any order, a part of a word
-- is enough, and one typo per word is forgiven (two in a long word). Email matches as
-- typed, any case. Phone matches ignoring formatting and a leading country code.
--
-- search_people replaces search_users_secure. It is system-wide on purpose (someone who
-- only belongs to another organization must still turn up, to be linked rather than
-- re-created), so it returns only what the picker shows: the name, a masked email, the
-- names of the person's organizations, and what matched.
--
-- search_organizations does the same matching for organizations. It runs as the caller,
-- so the organizations table's own access rules apply.

CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA extensions;

-- How well every word of p_query matches p_name: 0 = each word is part of the name,
-- 1 = at least one word needed a typo forgiven, NULL = some word doesn't match (or
-- p_query has no words). Case and punctuation are ignored ("obrien" finds O'Brien).
CREATE OR REPLACE FUNCTION public.search_name_rank(p_name text, p_query text)
RETURNS int
LANGUAGE sql IMMUTABLE
SET search_path = public, extensions
AS $$
  WITH q AS (
    SELECT w FROM regexp_split_to_table(lower(COALESCE(p_query, '')), '[^[:alnum:]]+') w WHERE w <> ''
  ), n AS (
    SELECT w FROM regexp_split_to_table(lower(COALESCE(p_name, '')), '[^[:alnum:]]+') w WHERE w <> ''
  ), per_word AS (
    SELECT CASE
      WHEN strpos(regexp_replace(lower(COALESCE(p_name, '')), '[^[:alnum:]]', '', 'g'), q.w) > 0 THEN 0
      WHEN length(q.w) >= 3 AND EXISTS (
        SELECT 1 FROM n
         WHERE extensions.levenshtein(q.w, n.w) <= CASE WHEN length(q.w) >= 7 THEN 2 ELSE 1 END) THEN 1
    END AS r
    FROM q
  )
  SELECT CASE WHEN count(*) = 0 OR count(r) < count(*) THEN NULL ELSE max(r) END FROM per_word;
$$;

CREATE OR REPLACE FUNCTION public.search_people(p_query text, p_email text DEFAULT NULL, p_phone text DEFAULT NULL)
RETURNS TABLE (id uuid, first_name text, last_name text, email_hint text, organization_names text[], matched_on text)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_query text := NULLIF(btrim(COALESCE(p_query, '')), '');
  v_email text := lower(NULLIF(btrim(COALESCE(p_email, '')), ''));
  v_digits text := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  v_tail int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to search for people' USING ERRCODE = '42501';
  END IF;
  IF length(v_query) < 2 THEN v_query := NULL; END IF;
  -- A search box holding a number (no letters) is a phone number.
  IF v_digits = '' AND v_query IS NOT NULL AND v_query !~ '[[:alpha:]]' THEN
    v_digits := regexp_replace(v_query, '\D', '', 'g');
  END IF;
  -- Compare the last 10 digits, or all of them for a 7-digit local number; fewer is too vague.
  v_tail := CASE WHEN length(v_digits) >= 7 THEN least(length(v_digits), 10) END;

  RETURN QUERY
  SELECT u.id, u.first_name, u.last_name,
         CASE WHEN u.email IS NULL OR u.email = '' THEN NULL
              WHEN position('@' IN u.email) > 1
                THEN left(u.email, 1) || '***' || substr(u.email, position('@' IN u.email))
              ELSE left(u.email, 1) || '***' END,
         ARRAY(SELECT o.name FROM organization_members om JOIN organizations o ON o.id = om.organization_id
                WHERE om.user_id = u.id ORDER BY o.name),
         CASE m.rank WHEN 0 THEN 'email' WHEN 1 THEN 'phone' WHEN 2 THEN 'name'
                     WHEN 3 THEN 'similar name' ELSE 'email' END
  FROM users u
  CROSS JOIN LATERAL (
    SELECT least(
      CASE WHEN lower(u.email) IN (v_email, lower(v_query)) THEN 0 END,
      CASE WHEN v_tail IS NOT NULL
            AND length(regexp_replace(COALESCE(u.phone, ''), '\D', '', 'g')) >= v_tail
            AND right(regexp_replace(u.phone, '\D', '', 'g'), v_tail) = right(v_digits, v_tail) THEN 1 END,
      2 + search_name_rank(u.first_name || ' ' || u.last_name, v_query),
      CASE WHEN length(v_query) >= 3 AND strpos(lower(u.email), lower(v_query)) > 0 THEN 4
           WHEN length(v_email) >= 3 AND strpos(lower(u.email), v_email) > 0 THEN 4 END
    ) AS rank
  ) m
  WHERE m.rank IS NOT NULL
    AND COALESCE(u.user_status, 'active') <> 'inactive'
  ORDER BY m.rank, u.first_name, u.last_name
  LIMIT 20;
END;
$$;

REVOKE ALL ON FUNCTION public.search_people(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_people(text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.search_organizations(p_query text, p_type organization_role DEFAULT NULL)
RETURNS SETOF organizations
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT o.*
  FROM organizations o
  CROSS JOIN LATERAL (SELECT search_name_rank(o.name, p_query) AS rank) m
  WHERE (p_type IS NULL OR p_type = ANY (o.roles))
    AND (NULLIF(btrim(COALESCE(p_query, '')), '') IS NULL OR m.rank IS NOT NULL)
  ORDER BY m.rank NULLS FIRST,
           lower(o.name) = lower(btrim(COALESCE(p_query, ''))) DESC,
           strpos(lower(o.name), lower(btrim(COALESCE(p_query, '')))) = 1 DESC,
           o.name;
$$;

REVOKE ALL ON FUNCTION public.search_organizations(text, organization_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_organizations(text, organization_role) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.search_users_secure(text);
