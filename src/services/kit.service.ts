import { createClient } from '../utils/supabase/client';
import { handleApiError } from '../utils/api-error-utils';

const getSupabase = () => createClient();

/**
 * Fetch kits for an organization
 */
export async function getKits(organizationId: string, filters?: {
  category?: string;
  search?: string;
}) {
  const supabase = getSupabase();
  try {
    let query = supabase
      .from('kits')
      .select(`
        *,
        kit_assets!inner(
          quantity,
          asset:assets(*)
        )
      `)
      .eq('organization_id', organizationId)
      .order('name');

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    return handleApiError(err, 'fetch kits');
  }
}

/**
 * Fetch a single kit with its assets
 */
export async function getKit(kitId: string) {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('kits')
      .select(`
        *,
        kit_assets(
          id,
          quantity,
          notes,
          asset:assets(*)
        )
      `)
      .eq('id', kitId)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'fetch kit');
  }
}

/**
 * Get distinct values for a field in kits
 */
export async function getDistinctKitValues(
  organizationId: string,
  field: 'category'
): Promise<string[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('kits')
      .select(field)
      .eq('organization_id', organizationId)
      .not(field, 'is', null);

    if (error) throw error;

    const uniqueValues = Array.from(
      new Set(
        (data || [])
          .map((item: any) => item[field])
          .filter((value): value is string => !!value && value.trim() !== '')
      )
    ).sort();

    return uniqueValues;
  } catch (err) {
    return handleApiError(err, `fetch distinct kit ${field} values`);
  }
}

/**
 * Create a new kit with assets
 */
export async function createKit(kitData: {
  organization_id: string;
  name: string;
  category?: string;
  description?: string;
  tags?: string[];
  assets: Array<{
    asset_id: string;
    quantity: number;
    notes?: string;
  }>;
}) {
  const supabase = getSupabase();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

    const { assets, ...restKitData } = kitData;

    const { data: kit, error: kitError } = await supabase
      .from('kits')
      .insert({
        ...restKitData,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (kitError) throw kitError;

    if (assets && assets.length > 0) {
      const kitAssets = assets.map(a => ({
        kit_id: kit.id,
        asset_id: a.asset_id,
        quantity: a.quantity,
        notes: a.notes || null,
      }));

      const { error: assetsError } = await supabase.from('kit_assets').insert(kitAssets);
      if (assetsError) {
        await supabase.from('kits').delete().eq('id', kit.id);
        throw assetsError;
      }
    }

    return kit;
  } catch (err) {
    return handleApiError(err, 'create kit');
  }
}

/**
 * Update an existing kit and its assets
 */
export async function updateKit(kitId: string, kitData: {
  name?: string;
  category?: string;
  description?: string;
  tags?: string[];
  assets?: Array<{
    id?: string;
    asset_id: string;
    quantity: number;
    notes?: string;
  }>;
}) {
  const supabase = getSupabase();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

    const { assets, ...restKitData } = kitData;

    const { error: updateError } = await supabase
      .from('kits')
      .update({
        ...restKitData,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', kitId);

    if (updateError) throw updateError;

    if (assets) {
      const { data: existingAssets } = await supabase.from('kit_assets').select('id').eq('kit_id', kitId);
      const existingIds = existingAssets?.map(a => a.id) || [];
      const incomingIds = assets.filter(a => a.id).map(a => a.id!);

      const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));
      if (idsToDelete.length > 0) {
        await supabase.from('kit_assets').delete().in('id', idsToDelete);
      }

      for (const asset of assets) {
        const assetData = {
          asset_id: asset.asset_id,
          quantity: asset.quantity,
          notes: asset.notes || null,
        };
        if (asset.id && existingIds.includes(asset.id)) {
          await supabase.from('kit_assets').update(assetData).eq('id', asset.id);
        } else {
          await supabase.from('kit_assets').insert({ kit_id: kitId, ...assetData });
        }
      }
    }

    return getKit(kitId);
  } catch (err) {
    return handleApiError(err, 'update kit');
  }
}

/**
 * Delete a kit
 */
export async function deleteKit(kitId: string) {
  const supabase = getSupabase();
  try {
    const { error } = await supabase.from('kits').delete().eq('id', kitId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return handleApiError(err, 'delete kit');
  }
}

/**
 * Duplicate an existing kit
 */
export async function duplicateKit(kitId: string, newName?: string) {
  const supabase = getSupabase();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

    const originalKit = await getKit(kitId);

    const { data: newKit, error: kitError } = await supabase
      .from('kits')
      .insert({
        organization_id: originalKit.organization_id,
        name: newName || `${originalKit.name} (Copy)`,
        category: originalKit.category,
        description: originalKit.description,
        tags: originalKit.tags || [],
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (kitError) throw kitError;

    if (originalKit.kit_assets && originalKit.kit_assets.length > 0) {
      const kitAssets = originalKit.kit_assets.map((ka: any) => ({
        kit_id: newKit.id,
        asset_id: ka.asset.id,
        quantity: ka.quantity,
        notes: ka.notes,
      }));
      await supabase.from('kit_assets').insert(kitAssets);
    }

    return newKit;
  } catch (err) {
    return handleApiError(err, 'duplicate kit');
  }
}
