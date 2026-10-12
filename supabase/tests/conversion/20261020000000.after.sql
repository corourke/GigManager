-- Each gig's owner after the backfill (#175). Raises with the differences if not exact.
DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(format('%s: got %s, want %s', e.gig, g.owner_organization_id, e.owner), '; ') INTO bad
  FROM (VALUES ('01', 'b'), ('02', 'a'), ('03', 'b'), ('04', 'c'), ('05', 'a')) e(gig, owner)
  JOIN gigs g ON g.id = ('00000000-0000-0000-0000-0000000000' || e.gig)::uuid
  WHERE g.owner_organization_id IS DISTINCT FROM ('00000000-0000-0000-0000-00000000000' || e.owner)::uuid;
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'Wrong owners: %', bad; END IF;
  IF EXISTS (SELECT 1 FROM gig_participants WHERE inactive) THEN RAISE EXCEPTION 'A participation came out Inactive'; END IF;
END $$;
