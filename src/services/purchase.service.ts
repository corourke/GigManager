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

    // 1. Group rows by Header (Source 0) or Date + Vendor (if no Header)
    const groupsMap = new Map<string, {
      header: any;
      items: any[];
      assets: any[];
    }>();

    rows.forEach((row) => {
      const data = row.data as AssetRow;
      // Unique key for grouping: Date + Vendor
      const dateKey = data.acquisition_date || 'no-date';
      const vendorKey = (data.vendor || 'no-vendor').toLowerCase().trim();
      const groupKey = `${dateKey}|${vendorKey}`;

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          header: null,
          items: [],
          assets: [],
        });
      }

      const currentGroup = groupsMap.get(groupKey)!;

      if (data.source === '0') {
        // Use the first Source 0 header we find for this group
        if (!currentGroup.header) {
          currentGroup.header = {
            organization_id: organizationId,
            purchase_date: data.acquisition_date,
            vendor: data.vendor,
            total_inv_amount: data.total_inv_amount ? parseFloat(data.total_inv_amount.toString().replace(/[^0-9.-]/g, '')) : 0,
            payment_method: data.payment_method,
            // Prefer manufacturer_model if present in import, fallback to description
            description: data.manufacturer_model || data.description || '',
            category: data.category,
            sub_category: data['sub-category'] || undefined,
          };
        }
      } else if (data.source === '1') {
        const assetData = {
          organization_id: organizationId,
          category: data.category,
          sub_category: data['sub-category'] || undefined,
          manufacturer_model: data.manufacturer_model,
          type: data.type || undefined,
          serial_number: data.serial_number || undefined,
          tag_number: data.tag_number || undefined,
          acquisition_date: data.acquisition_date,
          vendor: data.vendor,
          item_price: data.item_price ? parseFloat(data.item_price.toString().replace(/[^0-9.-]/g, '')) : undefined,
          item_cost: data.item_cost ? parseFloat(data.item_cost.toString().replace(/[^0-9.-]/g, '')) : undefined,
          quantity: data.quantity ? parseInt(data.quantity.toString().replace(/[^0-9.-]/g, '')) : 1,
          // Asset's description: prefer manufacturer_model or its own description
          description: data.manufacturer_model || data.description || undefined,
          insurance_policy_added: data.insured ? (data.insured.toLowerCase() === 'yes' || data.insured === 'true') : false,
          insurance_class: data.insurance_class || undefined,
          replacement_value: data.replacement_value ? parseFloat(data.replacement_value.toString().replace(/[^0-9.-]/g, '')) : undefined,
          retired_on: data.retired_on || undefined,
          liquidation_amt: data.liquidation_amt ? parseFloat(data.liquidation_amt.toString().replace(/[^0-9.-]/g, '')) : undefined,
          service_life: data.service_life ? parseFloat(data.service_life.toString().replace(/[^0-9.-]/g, '')) : undefined,
          dep_method: data.dep_method || undefined,
          status: data.status || 'Active',
          kit: data.kit || undefined,
        };
        currentGroup.assets.push(assetData);
        
        // If no header yet, and this item has total_inv_amount, it's a potential header source
        if (!currentGroup.header && data.total_inv_amount) {
          currentGroup.header = {
            organization_id: organizationId,
            purchase_date: data.acquisition_date,
            vendor: data.vendor,
            total_inv_amount: parseFloat(data.total_inv_amount.toString().replace(/[^0-9.-]/g, '')),
            payment_method: data.payment_method,
            description: data.manufacturer_model || data.description || '',
            category: data.category,
            sub_category: data['sub-category'] || undefined,
          };
        }
      } else if (data.source === '2') {
        const itemData = {
          organization_id: organizationId,
          purchase_date: data.acquisition_date,
          vendor: data.vendor,
          category: data.category,
          sub_category: data['sub-category'] || undefined,
          // Purchase item's description: prefer manufacturer_model if present
          description: data.manufacturer_model || data.description || undefined,
          line_amount: data.line_amount ? parseFloat(data.line_amount.toString().replace(/[^0-9.-]/g, '')) : 0,
          line_cost: data.line_cost ? parseFloat(data.line_cost.toString().replace(/[^0-9.-]/g, '')) : 0,
          quantity: data.quantity ? parseInt(data.quantity.toString().replace(/[^0-9.-]/g, '')) : 1,
          item_price: data.item_price ? parseFloat(data.item_price.toString().replace(/[^0-9.-]/g, '')) : undefined,
          item_cost: data.item_cost ? parseFloat(data.item_cost.toString().replace(/[^0-9.-]/g, '')) : undefined,
        };
        currentGroup.items.push(itemData);

        // If no header yet, and this item has total_inv_amount, it's a potential header source
        if (!currentGroup.header && data.total_inv_amount) {
          currentGroup.header = {
            organization_id: organizationId,
            purchase_date: data.acquisition_date,
            vendor: data.vendor,
            total_inv_amount: parseFloat(data.total_inv_amount.toString().replace(/[^0-9.-]/g, '')),
            payment_method: data.payment_method,
            description: data.manufacturer_model || data.description || '',
            category: data.category,
            sub_category: data['sub-category'] || undefined,
          };
        }
      }
    });

    // 2. Process groups using RPC for atomicity
    const groups = Array.from(groupsMap.values());
    for (const group of groups) {
      // Fallback: If no header was found or synthesized from total_inv_amount
      if (!group.header && (group.items.length > 0 || group.assets.length > 0)) {
        const firstEntry = group.items[0] || group.assets[0];
        group.header = {
          organization_id: organizationId,
          purchase_date: firstEntry.purchase_date || firstEntry.acquisition_date,
          vendor: firstEntry.vendor,
          total_inv_amount: 0,
          description: 'Synthesized Purchase Header',
        };
      }

      if (group.header) {
        try {
          // Use RPC for atomic transaction across multiple tables
          await createPurchaseTransaction(group.header, group.items, group.assets);
          successCount += 1 + group.items.length + group.assets.length;
        } catch (err: any) {
          const headerInfo = `Purchase on ${group.header.purchase_date} from ${group.header.vendor}`;
          errors.push(`Failed to import ${headerInfo}: ${err.message}`);
        }
      }
    }

    return { successCount, errors };
  } catch (err) {
    return handleApiError(err, 'import purchases');
  }
}
/**
 * Create a purchase header with its items and assets atomically via RPC
 * Also handles kit creation and membership for assets
 */
export async function createPurchaseTransaction(
  header: Partial<DbPurchase>,
  items: Partial<DbPurchase>[] = [],
  assets: any[] = []
) {
  try {
    const { supabase, user } = await requireAuth();

    // 1. Process Kits if any assets have a kit name
    // We do this before the RPC to get kit IDs
    const assetsWithKits = assets.filter(a => a.kit && a.kit.trim());
    const kitIdsByName = new Map<string, string>();

    if (assetsWithKits.length > 0) {
      const uniqueKitNames = Array.from(new Set(assetsWithKits.map(a => a.kit.trim())));
      const orgId = header.organization_id;

      for (const kitName of uniqueKitNames) {
        // Try to find existing kit
        const { data: existingKit } = await supabase
          .from('kits')
          .select('id')
          .eq('organization_id', orgId)
          .ilike('name', kitName)
          .maybeSingle();

        if (existingKit) {
          kitIdsByName.set(kitName.toLowerCase(), existingKit.id);
        } else {
          // Create new kit
          const { data: newKit, error: createError } = await supabase
            .from('kits')
            .insert({
              organization_id: orgId,
              name: kitName,
              category: 'Imported',
              created_by: user.id,
              updated_by: user.id,
            })
            .select('id')
            .single();

          if (createError) throw createError;
          kitIdsByName.set(kitName.toLowerCase(), newKit.id);
        }
      }
    }

    // 2. Call the PostgreSQL RPC for atomic execution of purchase + items + assets
    const { data, error } = await supabase.rpc('create_purchase_transaction_v1', {
      p_header: header,
      p_items: items,
      p_assets: assets
    });

    if (error) throw error;
    
    // 3. Handle Kit Membership (Post-RPC)
    // The RPC returns { id: v_header_id }
    // We need the asset IDs that were created to add them to kits
    // Since create_purchase_transaction_v1 doesn't return asset IDs, we fetch them
    if (assetsWithKits.length > 0 && data?.id) {
      const { data: createdAssets, error: fetchError } = await supabase
        .from('assets')
        .select('id, manufacturer_model, serial_number, kit_temp:description') // kit is not in assets table yet, but we had it in the import data
        .eq('purchase_id', data.id);

      if (!fetchError && createdAssets) {
        const kitMemberships = [];
        
        for (const asset of assets) {
          if (asset.kit && asset.kit.trim()) {
            const kitId = kitIdsByName.get(asset.kit.trim().toLowerCase());
            if (kitId) {
              // Match the created asset by model and serial if available
              const createdAsset = createdAssets.find(ca => 
                ca.manufacturer_model === asset.manufacturer_model && 
                (asset.serial_number ? ca.serial_number === asset.serial_number : true)
              );

              if (createdAsset) {
                kitMemberships.push({
                  kit_id: kitId,
                  asset_id: createdAsset.id,
                  quantity: asset.quantity || 1,
                });
              }
            }
          }
        }

        if (kitMemberships.length > 0) {
          await supabase.from('kit_assets').insert(kitMemberships);
        }
      }
    }

    return data;
  } catch (err) {
    return handleApiError(err, 'create purchase transaction');
  }
}

/**
 * Scan an invoice or receipt PDF using AI
 */
export async function scanInvoice(file: File) {
  const supabase = getSupabase();
  try {
    const formData = new FormData();
    formData.append('file', file);

    const { data, error } = await supabase.functions.invoke('ai-scan', {
      body: formData,
    });

    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'scan invoice');
  }
}
