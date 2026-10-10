import { idbStore } from '../../utils/idb/store';
import { offlineSyncService } from './offlineSync.service';
import { createClient } from '../../utils/supabase/client';
import { NOT_RETURNED_STATUS, RETURNED_STATUS } from '../../config/inventoryWorkflow';
import { recordKind } from '../../utils/equipmentItems';
import { placementOf, type TrackingRow } from '../../utils/locations';
import { pickLots } from '../../utils/pickLots';

const supabase = createClient();

type TrackingRecord = {
  id?: string;
  organization_id?: string;
  gig_id: string;
  /** null: a no-kit row (#185: a unit or lot added at pack-out on its own). */
  kit_id: string | null;
  asset_id: string | null;
  status: string;
  scanned_at: string;
  scanned_by: string;
  notes?: string | null;
  location?: string | null;
  /** How many of the unit or lot are there as of this row (#185: state, not a delta). */
  quantity?: number;
  created_at?: string;
  scanned_by_user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null;
};

type SubmitScanParams = {
  gigId: string;
  /** null: a unit or lot added at pack-out on its own, not in a kit (#185). */
  kitId: string | null;
  assetId?: string;
  status: string;
  organizationId: string;
  scannedBy: string;
  scannedAt?: string;
  location?: string | null;
  /** A direct lot scan: how many were counted (#185). Defaults to 1. */
  quantity?: number;
};

type ClearTrackingParams = {
  gigId: string;
  kitId: string;
  assetId?: string;
};

type UpdateLatestNoteParams = {
  gigId: string;
  kitId: string;
  assetId?: string;
  notes?: string | null;
  organizationId: string;
  scannedBy: string;
  fallbackStatus: string;
};

type AssetStatusParams = {
  gigId: string;
  kitId: string;
  assetId: string;
  status: string;
};

const compareTrackingRecords = (left: TrackingRecord, right: TrackingRecord) => {
  const scannedDiff = new Date(right.scanned_at).getTime() - new Date(left.scanned_at).getTime();
  if (scannedDiff !== 0) {
    return scannedDiff;
  }

  const createdDiff = new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime();
  if (createdDiff !== 0) {
    return createdDiff;
  }

  return String(right.id || '').localeCompare(String(left.id || ''));
};

const normalizeNotes = (notes?: string | null) => {
  const trimmed = notes?.trim();
  return trimmed ? trimmed : null;
};

const getTrackingHistory = (tracking: TrackingRecord[] = [], kitId: string | null, assetId?: string) => {
  return tracking
    .filter((record) => record.kit_id === kitId && (record.asset_id ?? null) === (assetId || null))
    .sort(compareTrackingRecords);
};

const getLatestTrackingRecord = (tracking: TrackingRecord[] = [], kitId: string | null, assetId?: string) => {
  return getTrackingHistory(tracking, kitId, assetId)[0] || null;
};

const getKitAssignment = (packingList: any, kitId: string) => {
  return packingList?.kits?.find((assignment: any) => assignment.kit?.id === kitId) || null;
};

const assetIdOf = (a: any) => a.asset_id || a.asset?.id || a.id;
const quantityOf = (a: any) => Math.max(1, Number(a?.quantity ?? 1) || 1);

/** One physical thing a kit-level scan/toggle cascades to, and how many of it (#185). */
type CascadeTarget = { kit_id: string; asset_id: string | null; quantity: number };

const getDirectAssets = (kit: any): { asset_id: string; quantity: number }[] =>
  (kit?.direct_assets ?? kit?.assets ?? [])
    .filter((a: any) => assetIdOf(a))
    .map((a: any) => ({ asset_id: assetIdOf(a), quantity: quantityOf(a) }));

const getChildKits = (packingList: any, kitId: string): { kit_id: string; quantity: number }[] =>
  (packingList?.hierarchy_edges || [])
    .filter((edge: any) => edge.parent_kit_id === kitId)
    .map((edge: any) => ({ kit_id: edge.child_kit_id, quantity: quantityOf(edge) }));

/**
 * Every tracking record that toggling `kitId` as a whole writes.
 *
 * A container is one sealed physical unit: its own (kit_id, null) record,
 * plus every asset in its fully-flattened subtree tracked under its *own*
 * id — however deeply nested those assets are, since opening the container
 * to distinguish them isn't something scanning its one tag tells you. A
 * non-container kit is purely organizational and never gets a record of
 * its own — only its contents do: its own direct assets (owned by
 * `owningKitId`, the top kit whose row was actually toggled — matching how
 * gig_kit_assignments only ever assigns top-level kits), plus the same
 * rule applied recursively to every child, so a nested container still
 * gets its own sealed-unit treatment instead of leaking its contents out
 * under the top kit's id.
 */
const getCascadeTargets = (packingList: any, kitId: string, owningKitId: string = kitId, multiplier = 1): CascadeTarget[] => {
  const kit = getKitAssignment(packingList, kitId)?.kit;

  if (kit?.is_container) {
    // The container's contents are fixed: their flattened totals (kit_flattened_cache).
    return [
      { kit_id: kitId, asset_id: null, quantity: 1 },
      ...(kit.assets || []).filter((a: any) => assetIdOf(a))
        .map((a: any) => ({ kit_id: kitId, asset_id: assetIdOf(a), quantity: quantityOf(a) })),
    ];
  }

  // A non-container kit is transparent: N copies of it is N times everything in it.
  const targets: CascadeTarget[] = getDirectAssets(kit)
    .map((a) => ({ kit_id: owningKitId, asset_id: a.asset_id, quantity: a.quantity * multiplier }));
  for (const child of getChildKits(packingList, kitId)) {
    targets.push(...getCascadeTargets(packingList, child.kit_id, owningKitId, multiplier * child.quantity));
  }
  return targets;
};

/** An "any" line (#185): N of an item, filled from its units and lots, tracked under `kit_id`. */
type AnySlot = { kit_id: string; item_id: string; item_name: string; quantity: number };

/** Every "any" line toggling `kitId` covers, by the same container rule as getCascadeTargets. */
const getAnySlots = (packingList: any, kitId: string, owningKitId: string = kitId, multiplier = 1): AnySlot[] => {
  const kit = getKitAssignment(packingList, kitId)?.kit;
  const lines = (kit?.any_lines || []) as { item_id: string; item_name: string; quantity: number }[];
  if (kit?.is_container) {
    return lines.map((l) => ({ kit_id: kitId, item_id: l.item_id, item_name: l.item_name, quantity: quantityOf(l) }));
  }
  const slots: AnySlot[] = lines.map((l) => ({ kit_id: owningKitId, item_id: l.item_id, item_name: l.item_name, quantity: quantityOf(l) * multiplier }));
  for (const child of getChildKits(packingList, kitId)) {
    slots.push(...getAnySlots(packingList, child.kit_id, owningKitId, multiplier * child.quantity));
  }
  return slots;
};

/**
 * How many pieces a tracking row says are there: a row from before #185 has no count, so the
 * whole line. On Unload, a Not Returned row holds what's still out, so the rest came back.
 */
const piecesIn = (record: TrackingRecord | null, status: string, line: number) => {
  if (status === RETURNED_STATUS && record?.status === NOT_RETURNED_STATUS) {
    return Math.max(0, line - Number(record.quantity ?? line));
  }
  return record?.status === status ? Math.min(line, record.quantity ?? line) : 0;
};

/** How many of an "any" line's pieces are in `status` under its kit: each of the item's records' newest row. */
const getAnySlotFilled = (packingList: any, slot: AnySlot, status: string) =>
  ((packingList?.item_records?.[slot.item_id] || []) as { id: string }[])
    .reduce((sum, r) => {
      const latest = getLatestTrackingRecord(packingList?.tracking || [], slot.kit_id, r.id);
      return sum + (latest?.status === status ? Math.max(1, Number(latest.quantity ?? 1) || 1) : 0);
    }, 0);

/** Every record that could be filling the kit's "any" lines (#185): the items' units and lots, under each line's kit. */
const getAnySlotTargets = (packingList: any, kitId: string): CascadeTarget[] =>
  getAnySlots(packingList, kitId).flatMap((slot) =>
    ((packingList?.item_records?.[slot.item_id] || []) as { id: string }[])
      .map((r) => ({ kit_id: slot.kit_id, asset_id: r.id, quantity: 0 })));

/**
 * The rows that fill an "any" line in `status` (#185), each saying the record's new count under
 * the line's kit. First whatever the kit already holds of the item in an earlier status moves
 * on at the same count; then, except on Unload or when leaving pieces at the gig, lots at home
 * make up the rest, most at home first (pickLots). Tagged units are never picked: they're
 * scanned one by one.
 */
const getAnySlotFills = (packingList: any, slot: AnySlot, status: string, gigId: string) => {
  const tracking: TrackingRecord[] = packingList?.tracking || [];
  const records: any[] = packingList?.item_records?.[slot.item_id] || [];
  const latestOf = (r: any) => getLatestTrackingRecord(tracking, slot.kit_id, r.id);
  const countOf = (row: TrackingRecord) => Math.max(1, Number(row.quantity ?? 1) || 1);

  let need = slot.quantity - getAnySlotFilled(packingList, slot, status);
  if (need <= 0) return { fills: [] as { asset_id: string; quantity: number }[], short: 0 };

  const next = new Map<string, number>();
  for (const r of records) {
    const latest = latestOf(r);
    if (!latest || latest.status === status || latest.status === RETURNED_STATUS) continue;
    next.set(r.id, countOf(latest));
    need -= countOf(latest);
  }

  let short = Math.max(0, need);
  if (need > 0 && status !== RETURNED_STATUS && status !== NOT_RETURNED_STATUS) {
    // at_home is as of the fetch; what this gig took or put back since moves it.
    const hereRows = tracking.filter((t) => t.gig_id === gigId) as TrackingRow[];
    const lots = records.filter((r) => recordKind(r) === 'lot').map((r) => {
      const hereNow = placementOf(hereRows, r).find((p) => p.gig_id === gigId)?.quantity ?? 0;
      return { id: r.id, created_at: r.created_at, at_home: Math.max(0, Number(r.at_home ?? 0) + Number(r.at_gig ?? 0) - hereNow) };
    });
    const picked = pickLots(lots, need);
    for (const p of picked.picks) {
      const latest = latestOf({ id: p.asset_id });
      const base = next.get(p.asset_id) ?? (latest?.status === status ? countOf(latest) : 0);
      next.set(p.asset_id, base + p.quantity);
    }
    short = picked.short;
  }

  return { fills: [...next.entries()].map(([asset_id, quantity]) => ({ asset_id, quantity })), short };
};

const rootsOf = (packingList: any): string[] =>
  packingList?.top_level_kit_ids?.length
    ? packingList.top_level_kit_ids
    : (packingList?.kits || []).map((a: any) => a.kit?.id).filter(Boolean);

/** Everything on the list a row can be written for, as `kit|asset` keys. */
const listedKeys = (packingList: any): Set<string> => {
  const keys = new Set<string>();
  for (const root of rootsOf(packingList)) {
    for (const t of [...getCascadeTargets(packingList, root), ...getAnySlotTargets(packingList, root)]) {
      keys.add(`${t.kit_id}|${t.asset_id ?? ''}`);
    }
  }
  return keys;
};

/** Units tracked at the gig that aren't on the list (#185): added as extras, or swapped in. */
const getExtras = (packingList: any): { kit_id: string; asset_id: string }[] => {
  const listed = listedKeys(packingList);
  const seen = new Set<string>();
  const extras: { kit_id: string; asset_id: string }[] = [];
  for (const row of (packingList?.tracking || []) as TrackingRecord[]) {
    // A no-kit row is a unit or lot added at pack-out on its own (getLoose), not an extra in a kit.
    if (!row.asset_id || !row.kit_id) continue;
    const key = `${row.kit_id}|${row.asset_id}`;
    if (listed.has(key) || seen.has(key)) continue;
    seen.add(key);
    extras.push({ kit_id: row.kit_id, asset_id: row.asset_id });
  }
  return extras;
};

/**
 * Units and lots added at pack-out on their own (#185): the gig's no-kit rows, newest per record,
 * with what that row says is there. Un-checking one deletes its row.
 */
const getLoose = (packingList: any): { asset_id: string; quantity: number; status: string; row: TrackingRecord }[] => {
  const seen = new Set<string>();
  const out: { asset_id: string; quantity: number; status: string; row: TrackingRecord }[] = [];
  for (const row of [...(packingList?.tracking || []) as TrackingRecord[]].sort(compareTrackingRecords)) {
    if (row.kit_id || !row.asset_id || seen.has(row.asset_id)) continue;
    seen.add(row.asset_id);
    out.push({ asset_id: row.asset_id, quantity: Math.max(1, Number(row.quantity ?? 1) || 1), status: row.status, row });
  }
  return out;
};

const itemIdOf = (packingList: any, assetId: string): string | null => {
  const extra = packingList?.extra_assets?.[assetId];
  if (extra) return extra.equipment_item_id ?? null;
  for (const assignment of packingList?.kits || []) {
    for (const a of [...(assignment.kit?.assets || []), ...(assignment.kit?.direct_assets || [])]) {
      if (assetIdOf(a) === assetId && a.asset) return a.asset.equipment_item_id ?? null;
    }
  }
  return null;
};

/**
 * Swaps (#185): a listed unit whose newest row is In Warehouse while an extra of the same item
 * is in its kit was swapped out for that extra, and its line follows the extra from then on.
 * Each extra stands in for one line, first come first served.
 */
const getSwaps = (packingList: any): Map<string, string> => {
  const tracking = packingList?.tracking || [];
  const free = getExtras(packingList);
  const swaps = new Map<string, string>();
  for (const root of rootsOf(packingList)) {
    for (const t of getCascadeTargets(packingList, root)) {
      if (!t.asset_id || t.quantity !== 1) continue;
      const key = `${t.kit_id}|${t.asset_id}`;
      if (swaps.has(key)) continue;
      if (getLatestTrackingRecord(tracking, t.kit_id, t.asset_id)?.status !== RETURNED_STATUS) continue;
      const item = itemIdOf(packingList, t.asset_id);
      const i = item ? free.findIndex((e) => e.kit_id === t.kit_id && itemIdOf(packingList, e.asset_id) === item) : -1;
      if (i < 0) continue;
      swaps.set(key, free[i].asset_id);
      free.splice(i, 1);
    }
  }
  return swaps;
};

const getSwapFor = (packingList: any, kitId: string, assetId: string): string | null =>
  getSwaps(packingList).get(`${kitId}|${assetId}`) ?? null;

/** Pieces done and to do under `roots`, each line, container and "any" line counted once. */
const progressUnder = (packingList: any, roots: string[], status: string): { done: number; total: number } => {
  const tracking = packingList?.tracking || [];
  const swaps = getSwaps(packingList);
  const seen = new Set<string>();
  let done = 0;
  let total = 0;
  for (const root of roots) {
    for (const t of getCascadeTargets(packingList, root)) {
      const key = `${t.kit_id}|${t.asset_id ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      total += t.quantity;
      const tracked = swaps.get(key) ?? t.asset_id ?? undefined;
      done += piecesIn(getLatestTrackingRecord(tracking, t.kit_id, tracked), status, t.quantity);
    }
    for (const slot of getAnySlots(packingList, root)) {
      const key = `${slot.kit_id}|item:${slot.item_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      total += slot.quantity;
      done += Math.min(slot.quantity, getAnySlotFilled(packingList, slot, status));
    }
  }
  return { done, total };
};

/** Packing progress in pieces (#185) across the gig's top-level kits, however they nest. */
const getScanProgress = (packingList: any, status: string) => progressUnder(packingList, rootsOf(packingList), status);

/** One kit's progress in pieces: what toggling it as a whole covers. */
const getKitProgress = (packingList: any, kitId: string, status: string) => progressUnder(packingList, [kitId], status);

/** One thing still out at the gig: kit_id null for a unit or lot added at pack-out on its own. */
type StillOut = { kit_id: string | null; asset_id: string | null; quantity: number };

/**
 * What's still out at the gig (#185), for Finish unload: every unit and lot whose newest row in
 * its kit isn't a return or a partial return, with what that row says is there. A container is
 * one sealed unit (its own row), so its contents aren't listed apart from it.
 */
const getStillOut = (packingList: any): StillOut[] => {
  const roots: string[] = packingList?.top_level_kit_ids?.length
    ? packingList.top_level_kit_ids
    : (packingList?.kits || []).map((a: any) => a.kit?.id).filter(Boolean);
  const tracking = packingList?.tracking || [];
  const seen = new Set<string>();
  const out: StillOut[] = [];
  for (const root of roots) {
    for (const t of [...getCascadeTargets(packingList, root), ...getAnySlotTargets(packingList, root)]) {
      if (t.asset_id && getKitAssignment(packingList, t.kit_id)?.kit?.is_container) continue;
      const key = `${t.kit_id}|${t.asset_id ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const latest = getLatestTrackingRecord(tracking, t.kit_id, t.asset_id ?? undefined);
      if (!latest || latest.status === RETURNED_STATUS || latest.status === NOT_RETURNED_STATUS) continue;
      out.push({ kit_id: t.kit_id, asset_id: t.asset_id, quantity: Math.max(1, Number(latest.quantity ?? t.quantity) || 1) });
    }
  }
  for (const e of getExtras(packingList)) {
    const latest = getLatestTrackingRecord(tracking, e.kit_id, e.asset_id);
    if (!latest || latest.status === RETURNED_STATUS || latest.status === NOT_RETURNED_STATUS) continue;
    out.push({ kit_id: e.kit_id, asset_id: e.asset_id, quantity: Math.max(1, Number(latest.quantity ?? 1) || 1) });
  }
  for (const l of getLoose(packingList)) {
    if (l.status === RETURNED_STATUS || l.status === NOT_RETURNED_STATUS) continue;
    out.push({ kit_id: null, asset_id: l.asset_id, quantity: l.quantity });
  }
  return out;
};

const appendTrackingEntries = (packingList: any, entries: TrackingRecord[]) => {
  if (!packingList) {
    return packingList;
  }

  return {
    ...packingList,
    tracking: [...entries, ...(packingList.tracking || [])].sort(compareTrackingRecords),
  };
};

const replaceTrackingRecord = (packingList: any, targetRecord: TrackingRecord, nextRecord: TrackingRecord) => {
  if (!packingList) {
    return packingList;
  }

  return {
    ...packingList,
    tracking: (packingList.tracking || [])
      .map((record: TrackingRecord) => {
        if (record === targetRecord) {
          return nextRecord;
        }
        if (targetRecord.id && record.id === targetRecord.id) {
          return nextRecord;
        }
        return record;
      })
      .sort(compareTrackingRecords),
  };
};

const removeTrackingRecords = (packingList: any, recordsToRemove: TrackingRecord[]) => {
  if (!packingList || recordsToRemove.length === 0) {
    return packingList;
  }

  const idSet = new Set(recordsToRemove.map((record) => record.id).filter(Boolean));
  const objectSet = new Set(recordsToRemove);

  return {
    ...packingList,
    tracking: (packingList.tracking || []).filter((record: TrackingRecord) => {
      if (objectSet.has(record)) {
        return false;
      }
        if (record.id && idSet.has(record.id)) {
        return false;
      }
      return true;
    }),
  };
};

const updateAssetStatusInPackingList = (packingList: any, assetId: string, status: string) => {
  if (!packingList) {
    return packingList;
  }

  return {
    ...packingList,
    kits: (packingList.kits || []).map((assignment: any) => ({
      ...assignment,
      kit: assignment.kit
        ? {
            ...assignment.kit,
            assets: (assignment.kit.assets || []).map((assetAssignment: any) => {
              const currentAssetId = assetAssignment.asset_id || assetAssignment.asset?.id || assetAssignment.id;
              if (currentAssetId !== assetId) {
                return assetAssignment;
              }

              return {
                ...assetAssignment,
                asset: assetAssignment.asset
                  ? {
                      ...assetAssignment.asset,
                      status,
                    }
                  : assetAssignment.asset,
              };
            }),
          }
        : assignment.kit,
    })),
  };
};

const getInheritedChildClearRecords = (tracking: TrackingRecord[] = [], kitLatest: TrackingRecord | null, targets: CascadeTarget[]) => {
  if (!kitLatest) {
    return [];
  }

  return targets
    .map((target) => getLatestTrackingRecord(tracking, target.kit_id, target.asset_id ?? undefined))
    .filter((record): record is TrackingRecord => {
      return Boolean(
        record &&
        record.scanned_at === kitLatest.scanned_at &&
        record.status === kitLatest.status &&
        record.scanned_by === kitLatest.scanned_by
      );
    });
};

const syncIfOnline = async () => {
  try {
    if (navigator.onLine) {
      await offlineSyncService.processOutbox();
    }
  } catch (error) {
    console.warn('Background sync failed, will retry later', error);
  }
};

export const inventoryTrackingService = {
  getLatestTrackingRecord,
  getCascadeTargets,
  getAnySlots,
  getAnySlotFilled,
  getAnySlotFills,
  getScanProgress,
  getKitProgress,
  getStillOut,
  getExtras,
  getLoose,
  getSwapFor,

  async matchTag(tagNumber: string) {
    const trimmed = tagNumber.trim();

    const { data: kits } = await supabase
      .from('kits')
      .select('id, name, tag_number')
      .eq('tag_number', trimmed)
      .limit(1);

    if (kits && kits.length > 0) {
      return { type: 'kit' as const, item: kits[0] };
    }

    const { data: assets } = await supabase
      .from('assets')
      .select('id, name, manufacturer_model, description, category, tag_number, serial_number, quantity, status, equipment_item_id')
      .eq('tag_number', trimmed)
      .limit(1);

    if (assets && assets.length > 0) {
      return { type: 'asset' as const, item: assets[0] };
    }

    return null;
  },

  /**
   * A kit added at pack-out (#185): on the device's list at once, and on the server as a flagged
   * assignment through the outbox. Its contents come with the next packing-list sync.
   */
  async addKitAtPackOut(params: { gigId: string; organizationId: string; userId: string; kit: { id: string; name: string; tag_number: string | null; is_container: boolean } }) {
    const { gigId, organizationId, userId, kit } = params;
    const packingList = await idbStore.getPackingList(gigId);
    if (packingList && !(packingList.kits || []).some((a: any) => a.kit_id === kit.id)) {
      await idbStore.putPackingList(gigId, {
        ...packingList,
        top_level_kit_ids: [...(packingList.top_level_kit_ids || []), kit.id],
        kits: [...(packingList.kits || []), {
          kit_id: kit.id, notes: null, added_at_pack_out: true, assigned_by: userId,
          kit: { ...kit, assets: [], direct_assets: [], any_lines: [] },
        }],
      });
    }
    await offlineSyncService.queueTrackingUpdate(
      { organization_id: organizationId, gig_id: gigId, kit_id: kit.id, assigned_by: userId, added_at_pack_out: true },
      'KIT_ASSIGNMENT_ADD'
    );
    await syncIfOnline();
  },

  /** Remove a kit you added at pack-out: what was scanned for it first, then the assignment. */
  async removePackOutKit(params: { gigId: string; kitId: string; userId: string }) {
    const { gigId, kitId, userId } = params;
    await this.clearTracking({ gigId, kitId });
    const packingList = await idbStore.getPackingList(gigId);
    if (packingList) {
      await idbStore.putPackingList(gigId, {
        ...packingList,
        top_level_kit_ids: (packingList.top_level_kit_ids || []).filter((id: string) => id !== kitId),
        kits: (packingList.kits || []).filter((a: any) => a.kit_id !== kitId),
      });
    }
    await offlineSyncService.queueTrackingUpdate({ gig_id: gigId, kit_id: kitId, assigned_by: userId }, 'KIT_ASSIGNMENT_REMOVE');
    await syncIfOnline();
  },

  /** Keep a unit that isn't on the list with the gig's packing list, so it can be shown (#185). */
  async addExtraAsset(gigId: string, asset: any) {
    const packingList = await idbStore.getPackingList(gigId);
    if (!packingList) return;
    await idbStore.putPackingList(gigId, { ...packingList, extra_assets: { ...(packingList.extra_assets || {}), [asset.id]: asset } });
  },

  async submitScan(params: SubmitScanParams) {
    const { gigId, kitId, assetId, status, organizationId, scannedBy, scannedAt, location, quantity } = params;
    const timestamp = scannedAt || new Date().toISOString();
    const packingList = await idbStore.getPackingList(gigId);
    const tracking = packingList?.tracking || [];

    const buildEntry = (targetKitId: string | null, targetAssetId: string | null, n = 1): TrackingRecord => ({
      organization_id: organizationId,
      gig_id: gigId,
      kit_id: targetKitId,
      asset_id: targetAssetId,
      status,
      scanned_at: timestamp,
      scanned_by: scannedBy,
      notes: getLatestTrackingRecord(tracking, targetKitId, targetAssetId ?? undefined)?.notes || null,
      location: location ?? null,
      quantity: Math.max(1, Math.floor(n) || 1),
    });

    // Scanning a specific asset directly never cascades. Scanning a kit's
    // own row cascades to every scannable unit inside it, respecting
    // container boundaries at every level — see getCascadeTargets.
    if (!assetId && !kitId) return null;
    const entries: TrackingRecord[] = assetId
      ? [buildEntry(kitId, assetId, quantity ?? 1)]
      : !kitId ? [] : [
          ...getCascadeTargets(packingList, kitId).map((target) => buildEntry(target.kit_id, target.asset_id, target.quantity)),
          ...getAnySlots(packingList, kitId).flatMap((slot) =>
            getAnySlotFills(packingList, slot, status, gigId).fills.map((f) => buildEntry(slot.kit_id, f.asset_id, f.quantity))),
        ];

    if (packingList) {
      await idbStore.putPackingList(gigId, appendTrackingEntries(packingList, entries));
    }

    await Promise.all(entries.map((entry) => offlineSyncService.queueTrackingUpdate(entry, 'INVENTORY_SCAN')));
    await syncIfOnline();

    return entries[0];
  },

  async updateLatestNote(params: UpdateLatestNoteParams) {
    const { gigId, kitId, assetId, organizationId, scannedBy, fallbackStatus } = params;
    const notes = normalizeNotes(params.notes);
    const packingList = await idbStore.getPackingList(gigId);
    const latestRecord = getLatestTrackingRecord(packingList?.tracking || [], kitId, assetId);

    if (!latestRecord) {
      const record = await this.submitScan({
        gigId,
        kitId,
        assetId,
        status: fallbackStatus,
        organizationId,
        scannedBy,
      });

      const refreshedPackingList = await idbStore.getPackingList(gigId);
      const createdLatest = getLatestTrackingRecord(refreshedPackingList?.tracking || [], kitId, assetId);

      if (!createdLatest) {
        return record;
      }

      const updatedRecord = { ...createdLatest, notes };
      await idbStore.putPackingList(gigId, replaceTrackingRecord(refreshedPackingList, createdLatest, updatedRecord));
      await offlineSyncService.queueTrackingUpdate(
        {
          gig_id: gigId,
          kit_id: kitId,
          asset_id: assetId || null,
          record_id: createdLatest.id,
          notes,
        },
        'INVENTORY_NOTE_UPDATE'
      );
      await syncIfOnline();
      return updatedRecord;
    }

    const updatedRecord = {
      ...latestRecord,
      notes,
    };

    if (packingList) {
      await idbStore.putPackingList(gigId, replaceTrackingRecord(packingList, latestRecord, updatedRecord));
    }

    await offlineSyncService.queueTrackingUpdate(
      {
        gig_id: gigId,
        kit_id: kitId,
        asset_id: assetId || null,
        record_id: latestRecord.id,
        notes,
      },
      'INVENTORY_NOTE_UPDATE'
    );
    await syncIfOnline();

    return updatedRecord;
  },

  async clearTracking(params: ClearTrackingParams) {
    const { gigId, kitId, assetId } = params;
    const packingList = await idbStore.getPackingList(gigId);
    const tracking = packingList?.tracking || [];

    let recordsToRemove: TrackingRecord[];

    if (assetId) {
      const latestRecord = getLatestTrackingRecord(tracking, kitId, assetId);
      if (!latestRecord) return;
      recordsToRemove = [latestRecord];
    } else {
      const kit = getKitAssignment(packingList, kitId)?.kit;
      if (kit?.is_container) {
        // A container has its own record to anchor on — only clear
        // children that were set in the same batch as it, same as before.
        const latestRecord = getLatestTrackingRecord(tracking, kitId, undefined);
        if (!latestRecord) return;
        const childTargets = [...getCascadeTargets(packingList, kitId), ...getAnySlotTargets(packingList, kitId)]
          .filter((target) => !(target.kit_id === kitId && target.asset_id === null));
        recordsToRemove = [latestRecord, ...getInheritedChildClearRecords(tracking, latestRecord, childTargets)];
      } else {
        // Non-container: no record of its own to anchor on — clear
        // whatever the latest record currently is for each of its
        // scannable units directly.
        recordsToRemove = [...getCascadeTargets(packingList, kitId), ...getAnySlotTargets(packingList, kitId)]
          .map((target) => getLatestTrackingRecord(tracking, target.kit_id, target.asset_id ?? undefined))
          .filter((record): record is TrackingRecord => Boolean(record));
      }
    }

    if (recordsToRemove.length === 0) {
      return;
    }

    if (packingList) {
      await idbStore.putPackingList(gigId, removeTrackingRecords(packingList, recordsToRemove));
    }

    await Promise.all(
      recordsToRemove.map((record) =>
        offlineSyncService.queueTrackingUpdate(
          {
            gig_id: gigId,
            kit_id: record.kit_id,
            asset_id: record.asset_id,
            record_id: record.id,
          },
          'INVENTORY_CLEAR'
        )
      )
    );

    await syncIfOnline();
  },

  async updateAssetStatus(params: AssetStatusParams) {
    const { gigId, assetId, status } = params;
    const packingList = await idbStore.getPackingList(gigId);

    if (packingList) {
      await idbStore.putPackingList(gigId, updateAssetStatusInPackingList(packingList, assetId, status));
    }

    await offlineSyncService.queueTrackingUpdate(
      {
        asset_id: assetId,
        status,
      },
      'ASSET_STATUS_UPDATE'
    );

    await syncIfOnline();
  }
};
