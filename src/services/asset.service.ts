import { createClient } from '../utils/supabase/client';
import { handleApiError } from '../utils/api-error-utils';

const getSupabase = () => createClient();

/**
 * Fetch assets for an organization
 */
export async function getAssets(organizationId: string, filters?: {
  category?: string;
  sub_category?: string;
  insurance_added?: boolean;
  search?: string;
}) {
  const supabase = getSupabase();
  try {
    let query = supabase
      .from('assets')
      .select('*')
      .eq('organization_id', organizationId)
      .order('manufacturer_model');

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.sub_category) {
      query = query.eq('sub_category', filters.sub_category);
    }

    if (filters?.insurance_added !== undefined) {
      query = query.eq('insurance_policy_added', filters.insurance_added);
    }

    if (filters?.search) {
      query = query.or(`manufacturer_model.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    return handleApiError(err, 'fetch assets');
  }
}

/**
 * Get distinct values for a field in assets
 */
export async function getDistinctAssetValues(
  organizationId: string,
  field: 'category' | 'sub_category' | 'type' | 'vendor',
  filterByCategory?: string
): Promise<string[]> {
  const supabase = getSupabase();
  try {
    let query = supabase
      .from('assets')
      .select(field)
      .eq('organization_id', organizationId)
      .not(field, 'is', null);

    if (filterByCategory && field === 'sub_category') {
      query = query.eq('category', filterByCategory);
    }

    const { data, error } = await query;
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
    return handleApiError(err, `fetch distinct ${field} values`);
  }
}

/**
 * Fetch a single asset
 */
export async function getAsset(assetId: string) {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('id', assetId)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'fetch asset');
  }
}

/**
 * Create a new asset
 */
export async function createAsset(assetData: {
  organization_id: string;
  category: string;
  manufacturer_model: string;
  serial_number?: string;
  acquisition_date?: string;
  vendor?: string;
  cost?: number;
  replacement_value?: number;
  sub_category?: string;
  type?: string;
  description?: string;
  insurance_policy_added?: boolean;
  insurance_class?: string;
  quantity?: number;
}) {
  const supabase = getSupabase();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

    const { data, error } = await supabase
      .from('assets')
      .insert({
        ...assetData,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'create asset');
  }
}

/**
 * Update an existing asset
 */
export async function updateAsset(assetId: string, assetData: {
  category?: string;
  manufacturer_model?: string;
  serial_number?: string;
  acquisition_date?: string;
  vendor?: string;
  cost?: number;
  replacement_value?: number;
  sub_category?: string;
  type?: string;
  description?: string;
  insurance_policy_added?: boolean;
}) {
  const supabase = getSupabase();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

    const { data, error } = await supabase
      .from('assets')
      .update({
        ...assetData,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assetId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'update asset');
  }
}

/**
 * Delete an asset
 */
export async function deleteAsset(assetId: string) {
  const supabase = getSupabase();
  try {
    const { error } = await supabase.from('assets').delete().eq('id', assetId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return handleApiError(err, 'delete asset');
  }
}

/**
 * Duplicate an existing asset
 */
export async function duplicateAsset(assetId: string) {
  const supabase = getSupabase();
  try {
    // 1. Get the original asset
    const original = await getAsset(assetId);
    if (!original) throw new Error('Original asset not found');

    // 2. Prepare new asset data (omit ID and timestamps, prefix name)
    const {
      id,
      created_at,
      updated_at,
      created_by,
      updated_by,
      ...assetData
    } = original;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

    // 3. Insert as new asset
    const { data, error } = await supabase
      .from('assets')
      .insert({
        ...assetData,
        manufacturer_model: `${original.manufacturer_model} (Copy)`,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'duplicate asset');
  }
}
