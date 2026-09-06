-- Follow-up to 20260906120000_quick_add_contacts_and_duplicate_check.sql,
-- after testing surfaced two problems with that migration:
--
-- 1. add_organization_contact was changed to accept a NULL email, but
--    public.users.email itself is still NOT NULL -- so creating a contact
--    with no email raised "null value in column "email" ... violates
--    not-null constraint" instead of actually succeeding. users_email_key
--    (UNIQUE) still holds with this relaxed: Postgres treats multiple NULLs
--    as distinct for uniqueness purposes, so any number of no-email people
--    can coexist.
-- 2. find_organization_person_matches only searched the TARGET
--    organization's existing members. The product intent (confirmed
--    explicitly) is the opposite of that scoping: avoid duplicate people
--    system-wide, the same way the Team screen's "Add Existing User" tab
--    already searches every user via search_users_secure. Dropping it in
--    favor of reusing that existing, already-proven search path from the
--    application layer instead of a second, narrower one.

ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;

DROP FUNCTION IF EXISTS public.find_organization_person_matches(uuid, text, text, text, uuid);
