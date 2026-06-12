-- Ensure the attachments storage bucket exists
-- This handles cases where the bucket might not have been created during initial migration

INSERT INTO storage.buckets (id, name, public)
SELECT 'attachments', 'attachments', false
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'attachments'
);

-- Re-apply or ensure storage policies exist
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON storage.objects;
CREATE POLICY "Authenticated users can view attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'attachments');

DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'attachments');

DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'attachments' AND owner = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'attachments' AND owner = auth.uid());
