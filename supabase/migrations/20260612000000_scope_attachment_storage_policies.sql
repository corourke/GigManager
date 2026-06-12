-- Scope attachments storage policies per-organization
--
-- Previous policies (20260611000001_ensure_attachments_bucket.sql) granted
-- SELECT/INSERT on every object in the 'attachments' bucket to any
-- authenticated user, leaking files across organizations.
--
-- Path convention: every object in the 'attachments' bucket is stored as
--   {organization_id}/{filename}
-- (enforced by src/services/attachment.service.ts since its introduction).
--
-- New model:
--   SELECT                requires org membership
--   INSERT/UPDATE/DELETE  require Admin or Manager role in the org
-- The org is derived from the first path segment via storage.foldername().

-- Safety gate: refuse to apply if any existing object lacks a valid
-- organization-id prefix, or if any attachments row disagrees with its
-- organization_id. Such objects would become permanently inaccessible (or the
-- uuid cast in the policies could error). None are expected — the only upload
-- path ever has prefixed the org id — but verify rather than assume.
DO $$
DECLARE
  bad_objects integer;
  bad_rows integer;
BEGIN
  SELECT count(*) INTO bad_objects
  FROM storage.objects
  WHERE bucket_id = 'attachments'
    AND (
      (storage.foldername(name))[1] IS NULL
      OR (storage.foldername(name))[1] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    );

  SELECT count(*) INTO bad_rows
  FROM public.attachments
  WHERE file_path NOT LIKE organization_id || '/%';

  IF bad_objects > 0 OR bad_rows > 0 THEN
    RAISE EXCEPTION
      'attachments bucket has % object(s) without an org-id prefix and % attachments row(s) whose file_path does not match organization_id; migrate these before applying per-org storage policies',
      bad_objects, bad_rows;
  END IF;
END $$;

-- Replace the over-broad policies with org-scoped ones
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

DROP POLICY IF EXISTS "Org members can view attachments" ON storage.objects;
CREATE POLICY "Org members can view attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'attachments'
  AND public.user_is_member_of_org(((storage.foldername(name))[1])::uuid, auth.uid())
);

DROP POLICY IF EXISTS "Org managers can upload attachments" ON storage.objects;
CREATE POLICY "Org managers can upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'attachments'
  AND public.user_is_admin_or_manager_of_org(((storage.foldername(name))[1])::uuid, auth.uid())
);

DROP POLICY IF EXISTS "Org managers can update attachments" ON storage.objects;
CREATE POLICY "Org managers can update attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'attachments'
  AND public.user_is_admin_or_manager_of_org(((storage.foldername(name))[1])::uuid, auth.uid())
)
WITH CHECK (
  bucket_id = 'attachments'
  AND public.user_is_admin_or_manager_of_org(((storage.foldername(name))[1])::uuid, auth.uid())
);

DROP POLICY IF EXISTS "Org managers can delete attachments" ON storage.objects;
CREATE POLICY "Org managers can delete attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'attachments'
  AND public.user_is_admin_or_manager_of_org(((storage.foldername(name))[1])::uuid, auth.uid())
);
