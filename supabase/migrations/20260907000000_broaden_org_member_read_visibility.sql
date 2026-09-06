-- The Organization Contacts screen now lists every organization_members row
-- (user_status = 'contact' just means "no login", not a separate, more-
-- visible category of person). But for an org you don't belong to,
-- viewed via a shared gig (e.g. "Edit Organization" from the Participants
-- section), the read policies added in
-- 20260825180000_organizations_contacts_and_client_flag.sql still only
-- expose rows that are the primary contact or user_status = 'contact' --
-- a real Team Member of that org stays invisible at the database level no
-- matter what the application layer does. Broaden both policies to match
-- what write access already allows: update_organization_contact,
-- remove_organization_contact etc. already let anyone who passes
-- user_can_manage_org_contacts edit or remove ANY member of that org, not
-- just contact-status ones -- read access was the odd one out, still
-- gated by the old, narrower condition. Reusing that same function ties
-- read and write access to one consistent rule instead of drifting apart
-- again.

ALTER POLICY "Users can view contacts of organizations on their gigs" ON public.organization_members
  USING (public.user_can_manage_org_contacts(organization_id, auth.uid()));

ALTER POLICY "Users can view contacts of organizations on their gigs" ON public.organization_members
  RENAME TO "Users can view members of organizations they can manage contacts for";

ALTER POLICY "Users can view contact users on their gigs" ON public.users
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = users.id
        AND public.user_can_manage_org_contacts(om.organization_id, auth.uid())
    )
  );

ALTER POLICY "Users can view contact users on their gigs" ON public.users
  RENAME TO "Users can view users of organizations they can manage contacts for";
