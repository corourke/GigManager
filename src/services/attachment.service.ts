import { createClient } from '../utils/supabase/client';
import { handleApiError } from '../utils/api-error-utils';
import { requireAuth } from '../utils/supabase/auth-utils';
import type { DbAttachment, EntityType } from '../utils/supabase/types';

const getSupabase = () => createClient();
const BUCKET_NAME = 'attachments';

/**
 * Upload a file and create an attachment record
 */
export async function uploadAttachment(
  organizationId: string,
  file: File,
  customFileName?: string
) {
  try {
    const { supabase, user } = await requireAuth();

    // Use organizationId prefix for storage paths for security isolation
    const fileName = customFileName || `${Date.now()}-${file.name}`;
    const filePath = `${organizationId}/${fileName}`;

    // 1. Upload to Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file);

    if (storageError) throw storageError;

    // 2. Create database record
    const { data: attachment, error: dbError } = await (supabase.from('attachments') as any)
      .insert({
        organization_id: organizationId,
        file_path: filePath,
        file_name: file.name,
        created_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      // Cleanup storage if database insert fails
      await supabase.storage.from(BUCKET_NAME).remove([filePath]);
      throw dbError;
    }

    return attachment as DbAttachment;
  } catch (err) {
    return handleApiError(err, 'upload attachment');
  }
}

/**
 * Link an existing attachment to an entity
 */
export async function linkAttachmentToEntity(
  attachmentId: string,
  entityType: EntityType,
  entityId: string
) {
  try {
    const { supabase, user } = await requireAuth();

    const { data, error } = await (supabase.from('entity_attachments') as any)
      .insert({
        attachment_id: attachmentId,
        entity_type: entityType,
        entity_id: entityId,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'link attachment to entity');
  }
}

/**
 * Fetch attachments for a specific entity
 */
export async function getEntityAttachments(entityType: EntityType, entityId: string) {
  const supabase = getSupabase();
  try {
    const { data, error } = await (supabase.from('entity_attachments') as any)
      .select('*, attachment:attachment_id(*)')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);

    if (error) throw error;

    return (data || []).map((ea: any) => ({
      ...ea.attachment,
      entity_attachment_id: ea.id,
    }));
  } catch (err) {
    return handleApiError(err, 'fetch entity attachments');
  }
}

/**
 * Delete an attachment and its storage file
 */
export async function deleteAttachment(attachmentId: string) {
  const supabase = getSupabase();
  try {
    // 1. Get attachment info to get file path
    const { data: attachment, error: fetchError } = await (supabase.from('attachments') as any)
      .select('*')
      .eq('id', attachmentId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Delete from storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([attachment.file_path]);

    // We proceed even if storage delete fails to keep DB clean, 
    // unless it's a critical error.
    if (storageError) {
      console.warn('Could not delete storage file, but continuing with DB deletion', storageError);
    }

    // 3. Delete from database (cascades to entity_attachments)
    const { error: dbError } = await (supabase.from('attachments') as any)
      .delete()
      .eq('id', attachmentId);

    if (dbError) throw dbError;

    return { success: true };
  } catch (err) {
    return handleApiError(err, 'delete attachment');
  }
}

/**
 * Unlink an attachment from an entity (but keep the attachment)
 */
export async function unlinkAttachmentFromEntity(entityAttachmentId: string) {
  const supabase = getSupabase();
  try {
    const { error } = await (supabase.from('entity_attachments') as any)
      .delete()
      .eq('id', entityAttachmentId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    return handleApiError(err, 'unlink attachment');
  }
}

/**
 * Get a signed URL for an attachment
 */
export async function getAttachmentUrl(filePath: string) {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 3600); // 1 hour

    if (error) throw error;
    return data.signedUrl;
  } catch (err) {
    return handleApiError(err, 'get attachment url');
  }
}
