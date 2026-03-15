import { createClient } from '../utils/supabase/client';
import { handleApiError } from '../utils/api-error-utils';
import { requireAuth } from '../utils/supabase/auth-utils';
import type { DbPurchase, PurchaseWithItems } from '../utils/supabase/types';

const getSupabase = () => createClient();

/**
 * Fetch purchases for an organization
 */
export async function getPurchases(organizationId: string, filters?: {
  gig_id?: string;
  vendor?: string;
  row_type?: 'header' | 'item';
}) {
  const supabase = getSupabase();
  try {
    let query = (supabase.from('purchases') as any)
      .select('*')
      .eq('organization_id', organizationId)
      .order('purchase_date', { ascending: false });

    if (filters?.gig_id) {
      query = query.eq('gig_id', filters.gig_id);
    }

    if (filters?.vendor) {
      query = query.ilike('vendor', `%${filters.vendor}%`);
    }

    if (filters?.row_type) {
      query = query.eq('row_type', filters.row_type);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    return handleApiError(err, 'fetch purchases');
  }
}

/**
 * Fetch a single purchase with its items, assets, and attachments
 */
export async function getPurchaseWithDetails(purchaseId: string): Promise<PurchaseWithItems> {
  const supabase = getSupabase();
  try {
    // 1. Get the purchase (could be a header or item)
    const { data: purchase, error: purchaseError } = await (supabase.from('purchases') as any)
      .select('*')
      .eq('id', purchaseId)
      .single();

    if (purchaseError) throw purchaseError;

    const result: PurchaseWithItems = { ...purchase };

    // 2. If it's a header, get its items and associated assets
    if (purchase.row_type === 'header') {
      const { data: items, error: itemsError } = await (supabase.from('purchases') as any)
        .select('*')
        .eq('parent_id', purchaseId);

      if (itemsError) throw itemsError;
      result.items = items || [];

      const { data: assets, error: assetsError } = await (supabase.from('assets') as any)
        .select('*')
        .eq('purchase_id', purchaseId);

      if (assetsError) throw assetsError;
      result.assets = assets || [];
    }

    // 3. Get attachments
    const { data: entityAttachments, error: attachError } = await (supabase.from('entity_attachments') as any)
      .select('*, attachment:attachment_id(*)')
      .eq('entity_type', 'purchase')
      .eq('entity_id', purchaseId);

    if (attachError) throw attachError;
    
    result.attachments = (entityAttachments || []).map((ea: any) => ({
      ...ea.attachment,
      entity_attachment_id: ea.id,
    }));

    return result;
  } catch (err) {
    return handleApiError(err, 'fetch purchase details');
  }
}

/**
 * Create a new purchase
 */
export async function createPurchase(purchaseData: Partial<DbPurchase>) {
  try {
    const { supabase } = await requireAuth();

    const { data, error } = await (supabase.from('purchases') as any)
      .insert(purchaseData)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'create purchase');
  }
}

/**
 * Update an existing purchase
 */
export async function updatePurchase(purchaseId: string, purchaseData: Partial<DbPurchase>) {
  try {
    const { supabase } = await requireAuth();

    const { data, error } = await (supabase.from('purchases') as any)
      .update({
        ...purchaseData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', purchaseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'update purchase');
  }
}

/**
 * Delete a purchase
 */
export async function deletePurchase(purchaseId: string) {
  const supabase = getSupabase();
  try {
    const { error } = await (supabase.from('purchases') as any).delete().eq('id', purchaseId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return handleApiError(err, 'delete purchase');
  }
}

/**
 * Import a list of purchase rows (headers, items, assets)
 * Groups rows by header and creates transactions
 */
export async function importPurchases(
  organizationId: string,
  rows: any[] // ParsedRow<AssetRow>[]
) {
  const errors: string[] = [];
  let successCount = 0;

  try {
    const { user } = await requireAuth();

    // 1. Group rows by header
    const groups: Array<{
      header: any;
      items: any[];
      assets: any[];
    }> = [];

    let currentGroup: { header: any; items: any[]; assets: any[] } | null = null;

    rows.forEach((row) => {
      const data = row.data;
      if (data.source === '0') {
        currentGroup = {
          header: {
            organization_id: organizationId,
            purchase_date: data.acquisition_date,
            vendor: data.vendor,
            total_inv_amount: data.total_inv_amount ? parseFloat(data.total_inv_amount) : 0,
            payment_method: data.payment_method,
            description: data.description,
          },
          items: [],
          assets: [],
        };
        groups.push(currentGroup);
      } else if (data.source === '1') {
        const assetData = {
          organization_id: organizationId,
          category: data.category,
          sub_category: data['sub-category'] || undefined,
          manufacturer_model: data.manufacturer_model,
          type: data.type || undefined,
          serial_number: data.serial_number || undefined,
          tag_number: data.tag_number || undefined,
          acquisition_date: data.acquisition_date || (currentGroup?.header?.purchase_date),
          vendor: data.vendor || (currentGroup?.header?.vendor),
          item_price: data.item_price ? parseFloat(data.item_price) : undefined,
          item_cost: data.item_cost ? parseFloat(data.item_cost) : undefined,
          quantity: data.quantity ? parseInt(data.quantity) : 1,
          description: data.description || undefined,
          insurance_policy_added: data.insured ? (data.insured.toLowerCase() === 'yes' || data.insured === 'true') : false,
          insurance_class: data.insurance_class || undefined,
          replacement_value: data.replacement_value ? parseFloat(data.replacement_value) : undefined,
          retired_on: data.retired_on || undefined,
          liquidation_amt: data.liquidation_amt ? parseFloat(data.liquidation_amt) : undefined,
          service_life: data.service_life ? parseFloat(data.service_life) : undefined,
          dep_method: data.dep_method || undefined,
          status: data.status || 'Active',
        };
        
        if (currentGroup) {
          currentGroup.assets.push(assetData);
        } else {
          // Standalone asset without header
          groups.push({
            header: null,
            items: [],
            assets: [assetData],
          });
        }
      } else if (data.source === '2') {
        const itemData = {
          organization_id: organizationId,
          category: data.category,
          sub_category: data['sub-category'] || undefined,
          description: data.description || undefined,
          line_amount: data.line_amount ? parseFloat(data.line_amount) : 0,
          line_cost: data.line_cost ? parseFloat(data.line_cost) : 0,
          quantity: data.quantity ? parseInt(data.quantity) : 1,
          item_price: data.item_price ? parseFloat(data.item_price) : undefined,
          item_cost: data.item_cost ? parseFloat(data.item_cost) : undefined,
        };

        if (currentGroup) {
          currentGroup.items.push(itemData);
        } else {
          errors.push(`Row ${row.rowIndex}: Expense item (Source 2) found without a preceding Header (Source 0). Skipping.`);
        }
      }
    });

    // 2. Process groups
    for (const group of groups) {
      try {
        if (group.header) {
          await createPurchaseTransaction(group.header, group.items, group.assets);
          successCount += 1 + group.items.length + group.assets.length;
        } else {
          // Process standalone assets
          for (const asset of group.assets) {
            const { supabase } = await requireAuth();
            const { error } = await (supabase.from('assets') as any).insert({
              ...asset,
              created_by: user.id,
              updated_by: user.id,
            });
            if (error) throw error;
            successCount++;
          }
        }
      } catch (err: any) {
        const headerInfo = group.header ? `Purchase from ${group.header.vendor}` : 'Standalone Assets';
        errors.push(`Failed to import ${headerInfo}: ${err.message}`);
      }
    }

    return { successCount, errors };
  } catch (err) {
    return handleApiError(err, 'import purchases');
  }
}
/**
 * Create a purchase header with its items and assets
 */
export async function createPurchaseTransaction(
  header: Partial<DbPurchase>,
  items: Partial<DbPurchase>[],
  assets: any[] = []
) {
  try {
    const { supabase, user } = await requireAuth();

    // 1. Insert Header
    const { data: headerData, error: headerError } = await (supabase.from('purchases') as any)
      .insert({
        ...header,
        row_type: 'header',
        organization_id: header.organization_id,
      })
      .select()
      .single();

    if (headerError) throw headerError;

    const purchaseId = headerData.id;

    // 2. Insert Items
    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({
        ...item,
        parent_id: purchaseId,
        row_type: 'item',
        organization_id: header.organization_id,
      }));

      const { error: itemsError } = await (supabase.from('purchases') as any)
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    // 3. Insert Assets
    if (assets.length > 0) {
      const assetsToInsert = assets.map(asset => ({
        ...asset,
        purchase_id: purchaseId,
        organization_id: header.organization_id,
        created_by: user.id,
        updated_by: user.id,
      }));

      const { error: assetsError } = await (supabase.from('assets') as any)
        .insert(assetsToInsert);

      if (assetsError) throw assetsError;
    }

    return headerData;
  } catch (err) {
    return handleApiError(err, 'create purchase transaction');
  }
}
