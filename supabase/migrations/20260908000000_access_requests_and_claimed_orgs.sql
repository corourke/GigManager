-- Access-request system (issue #33 cluster): lets an org's Viewer/Staff
-- member request Manager/Admin, routed to a platform moderator when the org
-- has no Admin yet, or to the org's own Admins once it does. Also introduces
-- organizations.claimed, the shared "does this org have an Admin yet" concept
-- that #24's edit/delete gating and #30's Create-without-Joining copy build on.

-- 1. organizations.claimed
ALTER TABLE public.organizations
  ADD COLUMN claimed boolean NOT NULL DEFAULT true;

-- Backfill: an org with zero Admins today is unclaimed regardless of how it
-- was created (covers pre-existing "Create without Joining" orgs and any
-- other path that left an org Admin-less before this column existed).
UPDATE public.organizations o
SET claimed = false
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_members om
  WHERE om.organization_id = o.id AND om.role = 'Admin'
);

-- 2. users.platform_moderator — a platform-level role, distinct from
-- user_is_admin() (which means "Admin of at least one org"). No UI grants
-- this yet; the first moderator(s) are flagged directly via SQL.
ALTER TABLE public.users
  ADD COLUMN platform_moderator boolean NOT NULL DEFAULT false;

-- 3. access_requests
CREATE TABLE public.access_requests (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  requested_role public.user_role NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  handled_by uuid REFERENCES public.users(id),
  handled_at timestamptz,
  response_message text,
  requester_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT access_requests_requested_role_check CHECK (requested_role IN ('Manager', 'Admin')),
  CONSTRAINT access_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

COMMENT ON TABLE public.access_requests IS 'Viewer/Staff -> Manager/Admin elevation requests. Routed to platform moderators while the target org is unclaimed, to the org''s own Admins once it isn''t.';

CREATE INDEX access_requests_org_status_idx ON public.access_requests(organization_id, status);
CREATE INDEX access_requests_requester_idx ON public.access_requests(requester_id, status);

-- Only one pending request per (org, requester) at a time — the server route
-- also checks this explicitly (for a clean error message), this is the
-- database-level backstop.
CREATE UNIQUE INDEX access_requests_one_pending_per_requester
  ON public.access_requests(organization_id, requester_id)
  WHERE status = 'pending';

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- All reads/writes in the app go through the server edge function (service
-- role, bypasses RLS) exactly like the rest of organizations.ts — these
-- policies are the same defense-in-depth backstop used elsewhere in this
-- schema, and support the client's realtime change-notification subscription.
CREATE POLICY "Requesters can view their own access requests"
  ON public.access_requests FOR SELECT
  USING (requester_id = auth.uid());

CREATE POLICY "Org admins can view their org's access requests"
  ON public.access_requests FOR SELECT
  USING (public.user_is_admin_of_org(organization_id, auth.uid()));

CREATE POLICY "Platform moderators can view unclaimed-org access requests"
  ON public.access_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.platform_moderator)
    AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.claimed = false)
  );

GRANT ALL ON public.access_requests TO service_role;
GRANT SELECT ON public.access_requests TO authenticated;

-- 4. Claimed-aware "any org's Admin can edit this org" rule (replaces the
-- previous unconditional user_is_admin() bypass on organizations UPDATE):
-- an Admin of THIS org can always edit it; an Admin of ANY org can only edit
-- it while it's unclaimed.
DROP POLICY IF EXISTS "Admins can update any organization" ON public.organizations;
CREATE POLICY "Admins can update per claimed status" ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    public.user_is_admin_of_org(id, auth.uid())
    OR (NOT claimed AND public.user_is_admin(auth.uid()))
  );
