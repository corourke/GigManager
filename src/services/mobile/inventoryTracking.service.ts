import { idbStore } from '../../utils/idb/store';
import { offlineSyncService } from './offlineSync.service';
import { createClient } from '../../utils/supabase/client';

const supabase = createClient();

type TrackingRecord = {
  id?: string;
  organization_id?: string;
  gig_id: string;
  kit_id: string;
  asset_id: string | null;
  status: string;
  scanned_at: string;
  scanned_by: string;
  notes?: string | null;
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
  kitId: string;
  assetId?: string;
  status: string;
  organizationId: string;
  scannedBy: string;
  scannedAt?: string;
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

const getTrackingHistory = (tracking: TrackingRecord[] = [], kitId: string, assetId?: string) => {
  return tracking
    .filter((record) => record.kit_id === kitId && (record.asset_id ?? null) === (assetId || null))
    .sort(compareTrackingRecords);
};

const getLatestTrackingRecord = (tracking: TrackingRecord[] = [], kitId: string, assetId?: string) => {
  return getTrackingHistory(tracking, kitId, assetId)[0] || null;
};

const getKitAssignment = (packingList: any, kitId: string) => {
  return packingList?.kits?.find((assignment: any) => assignment.kit?.id === kitId) || null;
};

const getKitAssetIds = (packingList: any, kitId: string) => {
  return (getKitAssignment(packingList, kitId)?.kit?.assets || [])
    .map((assetAssignment: any) => assetAssignment.asset_id || assetAssignment.asset?.id || assetAssignment.id)
    .filter(Boolean);
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

const getInheritedChildClearRecords = (tracking: TrackingRecord[] = [], kitId: string, kitLatest: TrackingRecord | null, assetIds: string[]) => {
  if (!kitLatest) {
    return [];
  }

  return assetIds
    .map((assetId) => getLatestTrackingRecord(tracking, kitId, assetId))
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
      .select('id, name, manufacturer_model, description, category, tag_number, status')
      .eq('tag_number', trimmed)
      .limit(1);

    if (assets && assets.length > 0) {
      return { type: 'asset' as const, item: assets[0] };
    }

    return null;
  },

  async submitScan(params: SubmitScanParams) {
    const { gigId, kitId, assetId, status, organizationId, scannedBy, scannedAt } = params;
    const timestamp = scannedAt || new Date().toISOString();
    const packingList = await idbStore.getPackingList(gigId);
    const tracking = packingList?.tracking || [];
    const childAssetIds = assetId ? [] : getKitAssetIds(packingList, kitId);

    const previousNote = getLatestTrackingRecord(tracking, kitId, assetId)?.notes || null;

    const entries: TrackingRecord[] = [
      {
        organization_id: organizationId,
        gig_id: gigId,
        kit_id: kitId,
        asset_id: assetId || null,
        status,
        scanned_at: timestamp,
        scanned_by: scannedBy,
        notes: previousNote,
      },
      ...childAssetIds.map((childAssetId) => {
        const childNote = getLatestTrackingRecord(tracking, kitId, childAssetId)?.notes || null;
        return {
          organization_id: organizationId,
          gig_id: gigId,
          kit_id: kitId,
          asset_id: childAssetId,
          status,
          scanned_at: timestamp,
          scanned_by: scannedBy,
          notes: childNote,
        };
      }),
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
    const latestRecord = getLatestTrackingRecord(tracking, kitId, assetId);

    if (!latestRecord) {
      return;
    }

    const recordsToRemove: TrackingRecord[] = [latestRecord];

    if (!assetId) {
      const childRecords = getInheritedChildClearRecords(tracking, kitId, latestRecord, getKitAssetIds(packingList, kitId));
      recordsToRemove.push(...childRecords);
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
