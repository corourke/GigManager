// The CSV assets import's plan (#183 D): which purchases, lines, units, lots and kit lines a
// file makes, built before anything is saved, so the screen can preview it and the save
// sends exactly that. Units and lots are built by buildLineUnits, as on the purchase screens.
//
// An import only ever adds: a row whose model + category match a stored item reuses it and
// leaves its details alone (Cameron, 10-11); the preview notes where the file differs.
import type { DbPurchase } from './supabase/types';
import { assetRowUnits, groupAssetRows, parseBoolean, type AssetRow, type ParsedRow } from './csvImport';
import { buildLineUnits, type ItemChoice, type LineUnitInput } from './lineUnits';
import { itemMatchKey } from './equipmentItems';

/** A stored item the rows can match. */
export interface ExistingItem {
  id: string;
  manufacturer_model: string;
  category: string;
  type?: string | null;
  description?: string | null;
  insurance_class?: string | null;
}

/** One purchase to save with createPurchaseWithUnits, and the kit each unit or lot goes into. */
export interface PlannedPurchase {
  /** "Purchase on <date> from <vendor>", for messages. */
  label: string;
  header: Partial<DbPurchase>;
  items: Partial<DbPurchase>[];
  units: LineUnitInput[];
  /** Parallel to `units`: the kit name each goes into, or null. */
  unitKits: (string | null)[];
  /** The file rows this purchase is made from (its invoice rows and lines). */
  rowIndexes: number[];
}

export interface RowPlan {
  rowIndex: number;
  purchaseIndex: number;
  /** The row's line within its purchase; null for an invoice row. */
  lineIndex: number | null;
  item: { status: 'new' | 'matched'; id?: string } | null;
  creates: { kind: 'header' | 'units' | 'lot' | 'expense'; count: number };
  kit: { name: string; isNew: boolean } | null;
  /** Non-blocking notes for the preview. */
  notes: string[];
}

export interface AssetImportSummary {
  purchases: number;
  lines: number;
  units: number;
  lots: number;
  /** Units plus every piece in the lots. */
  pieces: number;
  itemsNew: number;
  itemsMatched: number;
  /** Kits the import will create, as first written in the file. */
  kitsNew: string[];
}

export interface AssetImportPlan {
  purchases: PlannedPurchase[];
  rows: Record<number, RowPlan>;
  summary: AssetImportSummary;
}

export { itemMatchKey };

const num = (v: string | undefined) => {
  const t = (v ?? '').toString().replace(/[^0-9.-]/g, '');
  return t ? parseFloat(t) : undefined;
};
const blank = (v: string | null | undefined) => !v || !v.trim();

const ITEM_DETAILS = [['type', 'type'], ['description', 'description'], ['insurance_class', 'insurance class']] as const;

/** The item details a row gives that differ from `base` (a blank in the row doesn't count). */
function differingDetails(row: AssetRow, base: { type?: string | null; description?: string | null; insurance_class?: string | null }): string[] {
  return ITEM_DETAILS
    .filter(([f]) => !blank(row[f]) && itemMatchKey(row[f]) !== itemMatchKey(base[f]))
    .map(([, label]) => label);
}

export function buildAssetImportPlan(
  organizationId: string,
  rows: ParsedRow<AssetRow>[],
  existing: { items: ExistingItem[]; kitNames: string[] },
): AssetImportPlan {
  const storedByKey = new Map(existing.items.map((i) => [`${itemMatchKey(i.manufacturer_model)}|${itemMatchKey(i.category)}`, i]));
  const storedKits = new Set(existing.kitNames.map(itemMatchKey));
  const newItems = new Map<string, { rowIndex: number; choice: ItemChoice }>();
  const matchedItems = new Set<string>();
  const newKits = new Map<string, string>();

  const purchases: PlannedPurchase[] = [];
  const plans: Record<number, RowPlan> = {};
  const summary: AssetImportSummary = { purchases: 0, lines: 0, units: 0, lots: 0, pieces: 0, itemsNew: 0, itemsMatched: 0, kitsNew: [] };

  for (const group of groupAssetRows(rows)) {
    const h = group.header;
    const purchaseIndex = purchases.length;
    const header: Partial<DbPurchase> = group.synthesized
      ? { organization_id: organizationId, purchase_date: h.acquisition_date, vendor: h.vendor, total_inv_amount: 0, description: 'Synthesized Purchase Header' }
      : {
          organization_id: organizationId,
          purchase_date: h.acquisition_date,
          vendor: h.vendor,
          total_inv_amount: num(h.total_inv_amount) ?? 0,
          payment_method: h.payment_method,
          description: h.manufacturer_model || h.description || '',
          category: h.category,
        };
    const purchase: PlannedPurchase = {
      label: `Purchase on ${h.acquisition_date} from ${h.vendor}`,
      header,
      items: [],
      units: [],
      unitKits: [],
      rowIndexes: [...group.headerRowIndexes, ...group.items.map((r) => r.rowIndex)],
    };

    for (const rowIndex of group.headerRowIndexes) {
      plans[rowIndex] = { rowIndex, purchaseIndex, lineIndex: null, item: null, creates: { kind: 'header', count: 0 }, kit: null, notes: [] };
    }

    for (const row of group.items) {
      const d = row.data;
      const lineIndex = purchase.items.length;
      const quantity = Math.max(1, parseInt(d.quantity || '1') || 1);
      const equipment = d.source === '1';
      purchase.items.push({
        organization_id: organizationId,
        purchase_date: d.acquisition_date,
        vendor: d.vendor,
        category: d.category,
        description: d.manufacturer_model || d.description || undefined,
        line_amount: num(d.line_amount),
        line_cost: num(d.line_cost),
        quantity,
        item_price: num(d.item_price),
        item_cost: num(d.item_cost),
        // One line type (10-07): an equipment row is a depreciated line with units or a lot.
        row_type: 'line',
        tax_treatment: equipment ? 'depreciate' : 'expense',
      });
      summary.lines++;
      const plan: RowPlan = {
        rowIndex: row.rowIndex, purchaseIndex, lineIndex, item: null,
        creates: { kind: 'expense', count: quantity }, kit: null, notes: [...(row.notes ?? [])],
      };
      plans[row.rowIndex] = plan;
      if (!equipment) continue;

      // What it is: a stored item (kept as it is), or a new one (the first row's details).
      const key = `${itemMatchKey(d.manufacturer_model)}|${itemMatchKey(d.category)}`;
      const stored = storedByKey.get(key);
      let item: ItemChoice;
      if (stored) {
        item = { equipment_item_id: stored.id, manufacturer_model: stored.manufacturer_model, category: stored.category,
          type: stored.type ?? null, description: stored.description ?? null, insurance_class: stored.insurance_class ?? null };
        plan.item = { status: 'matched', id: stored.id };
        matchedItems.add(key);
        const differs = differingDetails(d, stored);
        if (differs.length) plan.notes.push(`Differs from the stored item (${differs.join(', ')}). The stored item’s details are kept.`);
      } else {
        const first = newItems.get(key);
        if (first) {
          item = first.choice;
          const differs = differingDetails(d, first.choice);
          if (differs.length) {
            plan.notes.push(`Differs from row ${first.rowIndex}, which creates this item (${differs.join(', ')}). Row ${first.rowIndex}’s details are used.`);
          }
        } else {
          item = { manufacturer_model: d.manufacturer_model, category: d.category, type: d.type || null, description: d.description || null, insurance_class: d.insurance_class || null };
          newItems.set(key, { rowIndex: row.rowIndex, choice: item });
        }
        plan.item = { status: 'new' };
      }

      // What we own: one unit per serial or tag, or a lot of the quantity.
      const unitRows = assetRowUnits(d);
      const kind = unitRows.length ? 'units' : 'lot';
      const built = buildLineUnits(organizationId, lineIndex, quantity, {
        item,
        kind,
        units: unitRows,
        replacement_value: num(d.replacement_value) ?? null,
        ...(blank(d.insured) ? {} : { insured: parseBoolean(d.insured) }),
        recovery_period: ['5', '7', '15'].includes((d.recovery_period ?? '').trim()) ? Number(d.recovery_period) : null,
      }).map((u) => (d.status ? { ...u, status: d.status } : u));
      plan.creates = { kind, count: kind === 'units' ? built.length : quantity };
      if (kind === 'units') summary.units += built.length; else summary.lots++;
      summary.pieces += kind === 'units' ? built.length : quantity;

      // The kit each unit, or the lot, goes into as its own line.
      const kitName = d.kit?.trim() || null;
      if (kitName) {
        const isNew = !storedKits.has(itemMatchKey(kitName));
        plan.kit = { name: kitName, isNew };
        if (isNew && !newKits.has(itemMatchKey(kitName))) newKits.set(itemMatchKey(kitName), kitName);
      }
      purchase.units.push(...built);
      purchase.unitKits.push(...built.map(() => kitName));
    }

    purchases.push(purchase);
  }

  summary.purchases = purchases.length;
  summary.itemsNew = newItems.size;
  summary.itemsMatched = matchedItems.size;
  summary.kitsNew = [...newKits.values()];
  return { purchases, rows: plans, summary };
}
