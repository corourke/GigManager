import { createClient } from '../utils/supabase/client';
import { handleApiError } from '../utils/api-error-utils';
import { requireAuth } from '../utils/supabase/auth-utils';
import { sanitizeLikeInput } from '../utils/validation-utils';
import type { DbAsset, DbAssetStatusHistory, DbInventoryTracking } from '../utils/supabase/types';

const getSupabase = () => createClient();

/**
 * Fetch assets for an organization
 */
export async function getAssets(organizationId: string, filters?: {
  category?: string;
  sub_category?: string;
  insurance_added?: boolean;
  purchase_id?: string;
  search?: string;
}) {
  const supabase = getSupabase();
  try {
    let query = (supabase.from('assets') as any)
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

    if (filters?.purchase_id) {
      query = query.eq('purchase_id', filters.purchase_id);
    }

    if (filters?.search) {
      const s = sanitizeLikeInput(filters.search);
      query = query.or(`manufacturer_model.ilike.%${s}%,serial_number.ilike.%${s}%,description.ilike.%${s}%`);
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
    let query = (supabase.from('assets') as any)
      .select(field)
      .eq('organization_id', organizationId)
      .not(field, 'is', null);

    if (filterByCategory && field === 'sub_category') {
      query = query.eq('category', filterByCategory);
    }

    const { data, error } = await query;
    if (error) throw error;

    const uniqueValues: string[] = (Array.from(
      new Set(
        (data || [])
          .map((item: any) => item[field] as string)
          .filter((value: string) => !!value && value.trim() !== '')
      )
    ) as string[]).sort();

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
    const { data, error } = await (supabase.from('assets') as any)
      .select('*')
      .eq('id', assetId)
      .single();

    if (error) throw error;
    return data as Record<string, any>;
  } catch (err) {
    return handleApiError(err, 'fetch asset');
  }
}

/**
 * Fetch status history for an asset, with changer's name joined
 */
export async function getAssetStatusHistory(assetId: string): Promise<DbAssetStatusHistory[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await (supabase.from('asset_status_history') as any)
      .select('*')
      .eq('asset_id', assetId)
      .order('changed_at', { ascending: false });

    if (error) throw error;

    const rows = data || [];
    const changerIds = Array.from(new Set(rows.map((r: any) => r.changed_by).filter(Boolean)));

    let userMap = new Map<string, { first_name: string; last_name: string }>();
    if (changerIds.length > 0) {
      const { data: users } = await (supabase.from('users') as any)
        .select('id, first_name, last_name')
        .in('id', changerIds);
      userMap = new Map((users || []).map((u: any) => [u.id, u]));
    }

    return rows.map((r: any) => ({
      ...r,
      changed_by_user: r.changed_by ? (userMap.get(r.changed_by) ?? null) : null,
    })) as DbAssetStatusHistory[];
  } catch (err) {
    return handleApiError(err, 'fetch asset status history');
  }
}

/**
 * Fetch inventory tracking records for an asset, with scanner name and gig/kit info joined
 */
export async function getAssetInventoryTracking(assetId: string): Promise<DbInventoryTracking[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await (supabase.from('inventory_tracking') as any)
      .select('*, gig:gig_id(title), kit:kit_id(name)')
      .eq('asset_id', assetId)
      .order('scanned_at', { ascending: false });

    if (error) throw error;

    const rows = data || [];
    const scannerIds = Array.from(new Set(rows.map((r: any) => r.scanned_by).filter(Boolean)));

    let userMap = new Map<string, { first_name: string; last_name: string }>();
    if (scannerIds.length > 0) {
      const { data: users } = await (supabase.from('users') as any)
        .select('id, first_name, last_name')
        .in('id', scannerIds);
      userMap = new Map((users || []).map((u: any) => [u.id, u]));
    }

    return rows.map((r: any) => ({
      ...r,
      scanned_by_user: r.scanned_by ? (userMap.get(r.scanned_by) ?? null) : null,
    })) as DbInventoryTracking[];
  } catch (err) {
    return handleApiError(err, 'fetch asset inventory tracking');
  }
}

/**
 * Create a new asset
 */
export async function createAsset(assetData: Partial<DbAsset> & { cost?: number }) {
  try {
    const { supabase, user } = await requireAuth();

    // Handle legacy 'cost' field mapping
    const finalData = { ...assetData };
    if (finalData.cost !== undefined && finalData.item_cost === undefined) {
      finalData.item_cost = finalData.cost;
      delete finalData.cost;
    }

    const { data, error } = await (supabase.from('assets') as any)
      .insert({
        ...finalData,
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
export async function updateAsset(assetId: string, assetData: Partial<DbAsset> & { cost?: number }) {
  try {
    const { supabase, user } = await requireAuth();

    // Handle legacy 'cost' field mapping
    const finalData = { ...assetData };
    if (finalData.cost !== undefined && finalData.item_cost === undefined) {
      finalData.item_cost = finalData.cost;
      delete finalData.cost;
    }

    const { data, error } = await (supabase.from('assets') as any)
      .update({
        ...finalData,
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
    const { error } = await (supabase.from('assets') as any).delete().eq('id', assetId);
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
  try {
    const { supabase, user } = await requireAuth();

    const original = await getAsset(assetId);
    if (!original) throw new Error('Original asset not found');

    const {
      id,
      created_at,
      updated_at,
      created_by,
      updated_by,
      ...assetData
    } = original;

    const { data, error } = await (supabase.from('assets') as any)
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
