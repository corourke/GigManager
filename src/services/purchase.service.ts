import { createClient } from '../utils/supabase/client';
import { handleApiError, handleFunctionsError } from '../utils/api-error-utils';
import { requireAuth } from '../utils/supabase/auth-utils';
import type { DbPurchase, PurchaseWithItems, DbGigFinancial, DbAsset } from '../utils/supabase/types';
import type { LineUnitInput } from '../utils/lineUnits';
import type { AssetRow } from '../utils/csvImport';
import { toFinCategory } from '../utils/supabase/constants';
import { toDateInTimeZone } from '../utils/dateUtils';
import { lineTaxTreatment } from '../utils/taxTreatment';
import {
  createGigFinancial,
  updateGigFinancial,
  deleteGigFinancial,
  getGigFinancialsByPurchaseId,
} from './gigFinancial.service';

const getSupabase = () => createClient();

/**
 * Fetch purchases for an organization
 */
export async function getPurchases(organizationId: string, filters?: {
  gig_id?: string;
  vendor?: string;
  row_type?: 'header' | 'line';
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
    // .select() to confirm a row was removed — RLS denies silently (0 rows, no error)
    const { data, error } = await (supabase.from('purchases') as any).delete().eq('id', purchaseId).select();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Purchase not found, or you do not have permission to delete it.');
    }
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
  rows: any[], // ParsedRow<AssetRow>[]
  onProgress?: (successCount: number, errorCount: number) => void
) {
  const errors: string[] = [];
  let successCount = 0;
  let errorCount = 0;

  try {
    const { user: _user } = await requireAuth();

    // 1. Group rows by Header (Source 0) or Date + Vendor (if no Header)
    interface PurchaseGroup {
      header: any;
      items: any[];
      assets: any[];
    }
    const allGroups: PurchaseGroup[] = [];
    const latestGroupMap = new Map<string, number>(); // dateKey|vendorKey -> index in allGroups
    let lastHeaderIdx: number | undefined = undefined;

    rows.forEach((row, rowIndex) => {
      const data = row.data as AssetRow;
      const dateKey = data.acquisition_date || 'no-date';
      const vendorKey = (data.vendor || 'no-vendor').toLowerCase().trim();
      const lookupKey = `${dateKey}|${vendorKey}`;

      const isHeader = data.source === '0';
      const hasTotal = !!(data.total_inv_amount && parseFloat(data.total_inv_amount.toString().replace(/[^0-9.-]/g, '')) > 0);
      const isStandalone = (data.source === '1' || data.source === '2') && hasTotal;

      if (isHeader) {
        // Check if we already have an "open" header group for this key that we can merge into
        // We only merge if the existing group hasn't received any items/assets yet
        const existingIdx = latestGroupMap.get(lookupKey);
        const invAmt = hasTotal ? parseFloat(data.total_inv_amount!.toString().replace(/[^0-9.-]/g, '')) : 0;

        if (existingIdx !== undefined && allGroups[existingIdx].items.length === 0 && allGroups[existingIdx].assets.length === 0) {
          const group = allGroups[existingIdx];
          group.header.total_inv_amount += invAmt;
          if (data.description || data.manufacturer_model) {
            group.header.description = group.header.description 
              ? `${group.header.description}; ${data.manufacturer_model || data.description}`
              : (data.manufacturer_model || data.description);
          }
          lastHeaderIdx = existingIdx;
        } else {
          // Start a NEW group
          const newGroup: PurchaseGroup = {
            header: mapRowToPurchaseHeader(organizationId, data, invAmt),
            items: [],
            assets: [],
          };
          allGroups.push(newGroup);
          lastHeaderIdx = allGroups.length - 1;
          latestGroupMap.set(lookupKey, lastHeaderIdx);
        }
      } else if (isStandalone) {
        // Start a NEW group
        const invAmt = hasTotal ? parseFloat(data.total_inv_amount!.toString().replace(/[^0-9.-]/g, '')) : 0;
        const newGroup: PurchaseGroup = {
          header: mapRowToPurchaseHeader(organizationId, data, invAmt),
          items: [],
          assets: [],
        };
        allGroups.push(newGroup);
        // Standalone items NEVER receive further children from the map
        // so we DON'T update latestGroupMap or lastHeaderIdx with the standalone row
        
        const currentGroup = allGroups[allGroups.length - 1];
        currentGroup.items.push(mapRowToPurchaseItem(organizationId, data));

        if (data.source === '1') {
          currentGroup.assets.push(mapRowToAsset(organizationId, data));
        }
      } else {
        // It's an item/asset that belongs to a group
        let groupIdx = latestGroupMap.get(lookupKey);
        
        // If no explicit match via lookupKey, try the last seen header (positional grouping)
        if (groupIdx === undefined && lastHeaderIdx !== undefined) {
          groupIdx = lastHeaderIdx;
        }

        if (groupIdx === undefined) {
          // No header found yet, create synthesized group
          const synthesizedGroup: PurchaseGroup = {
            header: {
              organization_id: organizationId,
              purchase_date: data.acquisition_date,
              vendor: data.vendor,
              total_inv_amount: 0,
              description: 'Synthesized Purchase Header',
            },
            items: [],
            assets: [],
          };
          allGroups.push(synthesizedGroup);
          groupIdx = allGroups.length - 1;
          latestGroupMap.set(lookupKey, groupIdx);
        }

        const currentGroup = allGroups[groupIdx];
        
        // Ensure child items have vendor/date if they were missing (inherited from header)
        if (!data.vendor && currentGroup.header.vendor) {
          data.vendor = currentGroup.header.vendor;
        }
        if (!data.acquisition_date && currentGroup.header.purchase_date) {
          data.acquisition_date = currentGroup.header.purchase_date;
        }

        if (data.source === '1' || data.source === '2') {
          currentGroup.items.push(mapRowToPurchaseItem(organizationId, data));
        }

        if (data.source === '1') {
          currentGroup.assets.push(mapRowToAsset(organizationId, data));
        }
      }
    });

    // 2. Process groups using RPC for atomicity
    const kitCache = new Map<string, string>(); // Cache kit IDs by name (lowercase)
    
    for (const group of allGroups) {
      if (group.header) {
        try {
          // Use RPC for atomic transaction across multiple tables
          await createPurchaseTransaction(group.header, group.items, group.assets, kitCache);
          successCount += 1 + group.items.length + group.assets.length;
        } catch (err: any) {
          errorCount += 1 + group.items.length + group.assets.length;
          const headerInfo = `Purchase on ${group.header.purchase_date} from ${group.header.vendor}`;
          errors.push(`Failed to import ${headerInfo}: ${err.message}`);
        }
        
        // Notify progress after each group
        if (onProgress) {
          onProgress(successCount, errorCount);
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
  /** `track: true` gives the line an equipment record: the next entry of `assets`. */
  items: (Partial<DbPurchase> & { track?: boolean })[] = [],
  assets: any[] = [],
  kitCache?: Map<string, string>
) {
  try {
    const { supabase, user } = await requireAuth();

    // 1. Process Kits if any assets have a kit name
    const assetsWithKits = assets.filter(a => a.kit && a.kit.trim());
    const localKitIdsByName = new Map<string, string>();

    if (assetsWithKits.length > 0) {
      const uniqueKitNames = Array.from(new Set(assetsWithKits.map(a => a.kit.trim())));
      const orgId = header.organization_id;
      if (!orgId) throw new Error('organization_id is required to create a purchase');

      for (const kitName of uniqueKitNames) {
        const cacheKey = kitName.toLowerCase();
        
        // 1a. Check provided cache first (for cross-group consistency)
        if (kitCache?.has(cacheKey)) {
          localKitIdsByName.set(cacheKey, kitCache.get(cacheKey)!);
          continue;
        }

        // 1b. Try to find existing kit in database
        const { data: existingKit } = await supabase
          .from('kits')
          .select('id')
          .eq('organization_id', orgId)
          .ilike('name', kitName)
          .limit(1)
          .maybeSingle();

        if (existingKit) {
          localKitIdsByName.set(cacheKey, existingKit.id);
          kitCache?.set(cacheKey, existingKit.id);
        } else {
          // 1c. Create new kit
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
          localKitIdsByName.set(cacheKey, newKit.id);
          kitCache?.set(cacheKey, newKit.id);
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
    // The RPC returns Json; it resolves to the created purchase header
    const result = data as { id: string } | null;
    if (!result?.id) throw new Error('Purchase transaction returned no result');
    
    // 3. Handle Kit Membership (Post-RPC)
    if (assetsWithKits.length > 0) {
      const { data: createdAssets, error: fetchError } = await supabase
        .from('assets')
        .select('id, manufacturer_model, serial_number')
        .eq('purchase_id', result.id);

      if (!fetchError && createdAssets) {
        const kitMemberships = [];
        
        for (const asset of assets) {
          if (asset.kit && asset.kit.trim()) {
            const kitId = localKitIdsByName.get(asset.kit.trim().toLowerCase());
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
          await supabase.from('kit_components').insert(kitMemberships);
        }
      }
    }

    return result;
  } catch (err) {
    return handleApiError(err, 'create purchase transaction');
  }
}

/**
 * Track a purchase line as equipment (#133): creates its `assets` record from the
 * line and links it, without changing the line's tax treatment. Works for lines in
 * a filed (locked) year, since only `asset_id` changes. Returns the new asset id.
 */
export async function trackPurchaseLineAsEquipment(lineId: string): Promise<string> {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase.rpc('track_purchase_line_as_equipment', { p_line_id: lineId });
    if (error) throw error;
    return data as string;
  } catch (err) {
    return handleApiError(err, 'track purchase line as equipment');
  }
}

/**
 * Record a purchase atomically (#183): the header, its lines, and one record per unit
 * (or one lot) for each tracked line. Each unit names its line by `line_index`; build
 * them with `buildLineUnits`. The line's first unit (or its lot) marks it tracked.
 */
export async function createPurchaseWithUnits(
  header: Partial<DbPurchase>,
  items: Partial<DbPurchase>[],
  units: LineUnitInput[],
): Promise<{ id: string; line_ids: string[]; unit_ids: string[] }> {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await (supabase.rpc as any)('create_purchase_transaction_v2', {
      p_header: header,
      p_items: items,
      p_units: units,
    });
    if (error) throw error;
    if (!data?.id) throw new Error('Purchase transaction returned no result');
    return data;
  } catch (err) {
    return handleApiError(err, 'create purchase transaction');
  }
}

/**
 * Add units (or a lot) to a saved purchase line (#183): tracking it for the first time,
 * or more units when its quantity goes up. Fields not sent come from the line and its
 * invoice. Returns the new records' ids.
 */
export async function addLineUnits(lineId: string, units: Omit<LineUnitInput, 'line_index'>[]): Promise<string[]> {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await (supabase.rpc as any)('add_purchase_line_units', { p_line_id: lineId, p_units: units });
    if (error) throw error;
    return (data ?? []) as string[];
  } catch (err) {
    return handleApiError(err, 'add equipment to purchase line');
  }
}

/** The units, or the lot, a purchase line made (#183). */
export async function getLineUnits(lineId: string): Promise<DbAsset[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await (supabase.from('assets') as any)
      .select('*')
      .eq('purchase_line_id', lineId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as DbAsset[];
  } catch (err) {
    return handleApiError(err, 'fetch purchase line equipment');
  }
}

/** The subset of a purchase line needed to build/refresh its ledger entry. */
export type LedgerLineSource = Pick<
  DbPurchase,
  | 'id' | 'row_type' | 'line_cost' | 'item_cost' | 'line_amount' | 'item_price'
  | 'quantity' | 'purchase_date' | 'description' | 'vendor' | 'category'
> & { tax_treatment?: string | null };

/**
 * Amount a purchase line contributes to a gig ledger.
 *
 * `line_cost` is the burdened line total that cost allocation reconciles to the
 * invoice (see `applyCostAllocation`), so it's the authoritative figure for a
 * money-out ledger entry. "Cost" rows (imported/scanned expenses) only carry
 * `line_cost`/`item_cost` — `line_amount`/`item_price` are null for them, which
 * is why the old `line_amount`-first logic recorded $0. Fall back to the pre-fee
 * price only when no cost is stored.
 */
export function purchaseLineLedgerAmount(
  item: Pick<DbPurchase, 'line_cost' | 'item_cost' | 'line_amount' | 'item_price' | 'quantity'>
): number {
  const qty = item.quantity ?? 1;
  return (
    item.line_cost ??
    (item.item_cost != null ? item.item_cost * qty : null) ??
    item.line_amount ??
    (item.item_price ?? 0) * qty
  );
}

/**
 * Build the `createGigFinancial` payload for a purchase line linked to a gig.
 * A line with no purchase date is dated today in `timeZone` (the gig's), or
 * the user's local date without one (#93).
 */
export function buildPurchaseLineLedgerPayload(
  item: LedgerLineSource,
  gigId: string,
  organizationId: string,
  timeZone?: string | null
) {
  return {
    gig_id: gigId,
    organization_id: organizationId,
    date: item.purchase_date || toDateInTimeZone(new Date(), timeZone),
    amount: purchaseLineLedgerAmount(item),
    // A purchase is money already spent.
    direction: 'out' as const,
    stage: 'paid' as const,
    category: toFinCategory(item.category) ?? ('Other expenses' as const),
    description: item.description || `Expense: ${item.vendor || ''}`.trim(),
    purchase_id: item.id,
    paid_at: new Date().toISOString(),
  };
}

/** A gig's time zone, or null when it has none or can't be read. */
async function getGigTimeZone(gigId: string): Promise<string | null> {
  const { data, error } = await getSupabase().from('gigs').select('timezone').eq('id', gigId).maybeSingle();
  if (error) {
    console.error('Could not read the gig time zone; using the local date:', error);
    return null;
  }
  return data?.timezone ?? null;
}

/**
 * Create the money-out ledger entry for a purchase line linked to a gig.
 *
 * Dedup guard (correctness): if a `gig_financials` row already references this
 * purchase line, no new row is inserted — the existing one is returned. This
 * prevents the double-count that an unassign/reassign cycle used to produce.
 */
export async function createLedgerEntryForPurchaseLine(
  item: LedgerLineSource,
  gigId: string,
  organizationId: string
): Promise<{ created: boolean; financial: DbGigFinancial }> {
  try {
    const existing = await getGigFinancialsByPurchaseId(item.id);
    if (existing.length > 0) {
      // Already linked. If it somehow sits on a different gig, realign it rather
      // than creating a competing row.
      const primary = existing[0];
      if (primary.gig_id !== gigId) {
        const moved = await updateGigFinancial(primary.id, { gig_id: gigId });
        return { created: false, financial: (moved as DbGigFinancial) ?? primary };
      }
      return { created: false, financial: primary };
    }
    const timeZone = item.purchase_date ? null : await getGigTimeZone(gigId);
    const financial = await createGigFinancial(buildPurchaseLineLedgerPayload(item, gigId, organizationId, timeZone));
    return { created: true, financial: financial as DbGigFinancial };
  } catch (err) {
    return handleApiError(err, 'create ledger entry for purchase line');
  }
}

/** Outcome of reconciling a purchase line's ledger entry after its gig changed. */
export type LedgerReconcileResult =
  | { action: 'noop' }
  /** No ledger entry exists yet — caller should offer to create one for `gigId`. */
  | { action: 'needs-entry'; gigId: string }
  /** A ledger entry already covers this line on the target gig — nothing to do. */
  | { action: 'exists'; financialIds: string[] }
  /** Existing ledger entries were moved to follow the line's new gig. */
  | { action: 'moved'; financialIds: string[]; toGigId: string }
  /** The line was cleared of its gig — caller must confirm removing these entries. */
  | { action: 'confirm-remove'; financialIds: string[]; fromGigId: string; amount: number };

/**
 * Keep a purchase line's auto-created gig ledger entry in sync after its
 * `gig_id` changed. Non-destructive operations (moving an entry to follow a
 * reassigned line) are applied here; destructive ones (removing an entry when a
 * line is unlinked from every gig) are returned for the caller to confirm.
 *
 * Only expensed lines ever carry a ledger entry; a depreciated line never does (#133).
 */
export async function reconcileLedgerForLineGigChange(params: {
  item: LedgerLineSource;
  previousGigId: string | null | undefined;
  newGigId: string | null | undefined;
  organizationId: string;
}): Promise<LedgerReconcileResult> {
  const { item, newGigId } = params;
  try {
    if (lineTaxTreatment(item) !== 'expense') return { action: 'noop' };

    const existing = await getGigFinancialsByPurchaseId(item.id);

    if (newGigId) {
      if (existing.length === 0) return { action: 'needs-entry', gigId: newGigId };

      const misplaced = existing.filter((f) => f.gig_id !== newGigId);
      if (misplaced.length === 0) {
        return { action: 'exists', financialIds: existing.map((f) => f.id) };
      }
      for (const f of misplaced) {
        await updateGigFinancial(f.id, { gig_id: newGigId });
      }
      return { action: 'moved', financialIds: misplaced.map((f) => f.id), toGigId: newGigId };
    }

    // Clearing the gig.
    if (existing.length === 0) return { action: 'noop' };
    return {
      action: 'confirm-remove',
      financialIds: existing.map((f) => f.id),
      fromGigId: existing[0].gig_id,
      amount: existing.reduce((sum, f) => sum + (Number(f.amount) || 0), 0),
    };
  } catch (err) {
    return handleApiError(err, 'reconcile ledger for purchase line');
  }
}

/**
 * Delete the given gig ledger entries. Used when the user confirms unlinking a
 * purchase line from its gig (see `reconcileLedgerForLineGigChange`).
 */
export async function removeLedgerEntriesForPurchaseLine(financialIds: string[]): Promise<{ removed: number }> {
  try {
    let removed = 0;
    for (const id of financialIds) {
      await deleteGigFinancial(id);
      removed += 1;
    }
    return { removed };
  } catch (err) {
    return handleApiError(err, 'remove ledger entries for purchase line');
  }
}

/**
 * A single proposed change to an asset field, derived from an edited purchase line.
 */
export interface AssetFieldChange {
  field: string;
  label: string;
  from: unknown;
  to: unknown;
}

/**
 * The subset of an edited purchase line whose fields also live on the asset record.
 */
export interface EditableLineSnapshot {
  description?: string | null;
  category?: string | null;
  quantity?: number | null;
  item_price?: number | null;
  item_cost?: number | null;
  vendor?: string | null;
  purchase_date?: string | null;
}

const normValue = (v: unknown): unknown =>
  v === undefined || v === null || v === '' ? null : v;

/**
 * Compute the asset field changes implied by an edited purchase line, comparing
 * the edited line against the current asset record. Only fields that are part of
 * the purchase record are considered (per product decision: editing a purchase
 * line only ever proposes changes to the overlapping fields, never asset-only
 * fields like serial/tag/replacement value). Returns an empty array when nothing
 * relevant changed, so callers can skip the confirmation step.
 */
export function computeAssetFieldChanges(
  line: EditableLineSnapshot,
  asset: Record<string, any>
): AssetFieldChange[] {
  const changes: AssetFieldChange[] = [];
  const push = (field: string, label: string, to: unknown) => {
    const from = normValue(asset[field]);
    const next = normValue(to);
    if (from !== next) changes.push({ field, label, from, to: next });
  };
  if (line.description !== undefined) {
    push('manufacturer_model', 'Name / Model', line.description);
    push('description', 'Description', line.description);
  }
  if (line.category !== undefined) push('category', 'Category', line.category);
  if (line.quantity !== undefined) push('quantity', 'Quantity', line.quantity);
  if (line.item_price !== undefined) push('item_price', 'Item Price', line.item_price);
  if (line.item_cost !== undefined) push('item_cost', 'Item Cost', line.item_cost);
  if (line.vendor !== undefined) push('vendor', 'Vendor', line.vendor);
  if (line.purchase_date !== undefined) push('acquisition_date', 'Acquisition Date', line.purchase_date);
  return changes;
}

/**
 * Scan an invoice or receipt PDF using AI
 */
export async function scanInvoice(file: File, organizationId: string) {
  const supabase = getSupabase();
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('organization_id', organizationId);

    const { data, error } = await supabase.functions.invoke('ai-scan', {
      body: formData,
    });

    if (error) throw error;
    return data;
  } catch (err) {
    return handleFunctionsError(err, 'scan invoice');
  }
}

/**
 * Maps a CSV row to a Purchase Header object
 */
function mapRowToPurchaseHeader(organizationId: string, data: any, invAmt: number) {
  return {
    organization_id: organizationId,
    purchase_date: data.acquisition_date,
    vendor: data.vendor,
    total_inv_amount: invAmt,
    payment_method: data.payment_method,
    description: data.manufacturer_model || data.description || '',
    category: data.category,
  };
}

/**
 * Maps a CSV row to a Purchase Item object
 */
function mapRowToPurchaseItem(organizationId: string, data: any) {
  const parsedQty = data.quantity ? parseInt(data.quantity.toString().replace(/[^0-9.-]/g, '')) : 1;
  const parsedItemPrice = data.item_price ? parseFloat(data.item_price.toString().replace(/[^0-9.-]/g, '')) : undefined;
  const parsedItemCost = data.item_cost ? parseFloat(data.item_cost.toString().replace(/[^0-9.-]/g, '')) : undefined;
  const parsedLineAmount = data.line_amount ? parseFloat(data.line_amount.toString().replace(/[^0-9.-]/g, '')) : undefined;
  const parsedLineCost = data.line_cost ? parseFloat(data.line_cost.toString().replace(/[^0-9.-]/g, '')) : undefined;
  const desc = data.manufacturer_model || data.description || undefined;

  return {
    organization_id: organizationId,
    purchase_date: data.acquisition_date,
    vendor: data.vendor,
    category: data.category,
    description: desc,
    line_amount: parsedLineAmount,
    line_cost: parsedLineCost,
    quantity: parsedQty,
    item_price: parsedItemPrice,
    item_cost: parsedItemCost,
    // One line type (10-07): an equipment row is a tracked, depreciated line.
    row_type: 'line' as const,
    track: data.source === '1',
    tax_treatment: (data.source === '1' ? 'depreciate' : 'expense') as 'depreciate' | 'expense',
  };
}

/**
 * Maps a CSV row to an Asset object
 */
function mapRowToAsset(organizationId: string, data: any) {
  const parsedQty = data.quantity ? parseInt(data.quantity.toString().replace(/[^0-9.-]/g, '')) : 1;
  const parsedItemPrice = data.item_price ? parseFloat(data.item_price.toString().replace(/[^0-9.-]/g, '')) : undefined;
  const parsedItemCost = data.item_cost ? parseFloat(data.item_cost.toString().replace(/[^0-9.-]/g, '')) : undefined;
  const desc = data.manufacturer_model || data.description || undefined;

  return {
    organization_id: organizationId,
    category: data.category,
    manufacturer_model: data.manufacturer_model,
    type: data.type || undefined,
    serial_number: data.serial_number || undefined,
    tag_number: data.tag_number || undefined,
    acquisition_date: data.acquisition_date,
    vendor: data.vendor,
    item_price: parsedItemPrice,
    item_cost: parsedItemCost,
    quantity: parsedQty,
    description: desc,
    insurance_policy_added: data.insured ? (data.insured.toLowerCase() === 'yes' || data.insured === 'true') : false,
    insurance_class: data.insurance_class || undefined,
    replacement_value: data.replacement_value ? parseFloat(data.replacement_value.toString().replace(/[^0-9.-]/g, '')) : undefined,
    retired_on: data.retired_on || undefined,
    liquidation_amt: data.liquidation_amt ? parseFloat(data.liquidation_amt.toString().replace(/[^0-9.-]/g, '')) : undefined,
    // Kept only if the line is depreciated (the purchase RPC checks, #125).
    recovery_period: ['5', '7', '15'].includes(String(data.recovery_period ?? '').trim()) ? Number(data.recovery_period) : undefined,
    status: data.status || 'Active',
    kit: data.kit || undefined,
  };
}
