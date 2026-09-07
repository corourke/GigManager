-- Fixes a crash when adding a brand-new person as a gig participant
-- contact: 20260906200000_gig_participant_contacts.sql deliberately
-- decoupled gig contacts from organization_members ("a gig contact does
-- not need to be an org member at all"), but the `users` table's own
-- SELECT policy ("Users can view users of organizations they can manage
-- contacts for", from 20260907000000_broaden_org_member_read_visibility.sql)
-- still only exposes a user row when that person has an
-- organization_members row somewhere. A person created via
-- create_contact_person() and linked purely through
-- gig_participant_contacts has no such row, so the `user:users(...)`
-- embed in getGigParticipantContacts() silently comes back null for them
-- (RLS makes the joined row invisible rather than erroring) -- which then
-- crashes GigParticipantContactsList when it reads
-- contact.user.first_name.
--
-- Add the missing visibility, mirroring gig_participant_contacts' own
-- SELECT policy (same user_has_access_to_gig predicate) so anyone who can
-- see a gig's participant contacts can also see the name/email/phone of
-- who's linked -- same fix shape as
-- "Users can view contact users on their gigs" in
-- 20260825180000_organizations_contacts_and_client_flag.sql did for the
-- organization_members-based version of this list.

CREATE POLICY "Users can view gig participant contact users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gig_participant_contacts gpc
      WHERE gpc.user_id = users.id
        AND public.user_has_access_to_gig(gpc.gig_id, auth.uid())
    )
  );
