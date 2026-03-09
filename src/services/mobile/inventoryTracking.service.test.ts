import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../utils/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(),
  }),
}))

vi.mock('../../utils/idb/store', () => ({
  idbStore: {
    getPackingList: vi.fn(),
    putPackingList: vi.fn(),
  },
}))

vi.mock('./offlineSync.service', () => ({
  offlineSyncService: {
    queueTrackingUpdate: vi.fn(),
    processOutbox: vi.fn(),
  },
}))

import { idbStore } from '../../utils/idb/store'
import { offlineSyncService } from './offlineSync.service'
import { inventoryTrackingService } from './inventoryTracking.service'

describe('inventoryTrackingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    })
  })

  it('adds cumulative kit and inherited asset tracking rows for a new scan', async () => {
    vi.mocked(idbStore.getPackingList).mockResolvedValue({
      gig_id: 'gig-1',
      kits: [
        {
          kit: {
            id: 'kit-1',
            assets: [
              { asset_id: 'asset-1' },
              { asset_id: 'asset-2' },
            ],
          },
        },
      ],
      tracking: [
        {
          id: 'older-kit',
          gig_id: 'gig-1',
          kit_id: 'kit-1',
          asset_id: null,
          status: 'Checked Out',
          scanned_at: '2026-03-08T09:00:00.000Z',
          scanned_by: 'user-1',
          notes: null,
        },
      ],
    })

    await inventoryTrackingService.submitScan({
      gigId: 'gig-1',
      kitId: 'kit-1',
      status: 'In Warehouse',
      organizationId: 'org-1',
      scannedBy: 'user-1',
      scannedAt: '2026-03-09T00:00:00.000Z',
    })

    expect(idbStore.putPackingList).toHaveBeenCalledWith(
      'gig-1',
      expect.objectContaining({
        tracking: expect.arrayContaining([
          expect.objectContaining({ kit_id: 'kit-1', asset_id: null, status: 'In Warehouse', notes: null }),
          expect.objectContaining({ kit_id: 'kit-1', asset_id: 'asset-1', status: 'In Warehouse', notes: null }),
          expect.objectContaining({ kit_id: 'kit-1', asset_id: 'asset-2', status: 'In Warehouse', notes: null }),
          expect.objectContaining({ id: 'older-kit', status: 'Checked Out' }),
        ]),
      })
    )
    expect(offlineSyncService.queueTrackingUpdate).toHaveBeenCalledTimes(3)
  })

  it('updates only the latest record note for the selected item', async () => {
    vi.mocked(idbStore.getPackingList).mockResolvedValue({
      gig_id: 'gig-1',
      kits: [
        {
          kit: {
            id: 'kit-1',
            assets: [{ asset_id: 'asset-1' }],
          },
        },
      ],
      tracking: [
        {
          id: 'latest-kit',
          gig_id: 'gig-1',
          kit_id: 'kit-1',
          asset_id: null,
          status: 'In Warehouse',
          scanned_at: '2026-03-09T10:00:00.000Z',
          scanned_by: 'user-1',
          notes: null,
        },
        {
          id: 'latest-asset',
          gig_id: 'gig-1',
          kit_id: 'kit-1',
          asset_id: 'asset-1',
          status: 'In Warehouse',
          scanned_at: '2026-03-09T10:00:00.000Z',
          scanned_by: 'user-1',
          notes: null,
        },
      ],
    })

    await inventoryTrackingService.updateLatestNote({
      gigId: 'gig-1',
      kitId: 'kit-1',
      notes: 'Kit note only',
      organizationId: 'org-1',
      scannedBy: 'user-1',
      fallbackStatus: 'In Warehouse',
    })

    expect(idbStore.putPackingList).toHaveBeenCalledWith(
      'gig-1',
      expect.objectContaining({
        tracking: expect.arrayContaining([
          expect.objectContaining({ id: 'latest-kit', notes: 'Kit note only' }),
          expect.objectContaining({ id: 'latest-asset', notes: null }),
        ]),
      })
    )
    expect(offlineSyncService.queueTrackingUpdate).toHaveBeenCalledWith(
      {
        gig_id: 'gig-1',
        kit_id: 'kit-1',
        asset_id: null,
        record_id: 'latest-kit',
        notes: 'Kit note only',
      },
      'INVENTORY_NOTE_UPDATE'
    )
  })

  it('clears only the latest record and reverts to the next most recent status', async () => {
    vi.mocked(idbStore.getPackingList).mockResolvedValue({
      gig_id: 'gig-1',
      kits: [
        {
          kit: {
            id: 'kit-1',
            assets: [{ asset_id: 'asset-1' }],
          },
        },
      ],
      tracking: [
        {
          id: 'latest-kit',
          gig_id: 'gig-1',
          kit_id: 'kit-1',
          asset_id: null,
          status: 'In Warehouse',
          scanned_at: '2026-03-09T10:00:00.000Z',
          scanned_by: 'user-1',
          notes: null,
        },
        {
          id: 'older-kit',
          gig_id: 'gig-1',
          kit_id: 'kit-1',
          asset_id: null,
          status: 'Checked Out',
          scanned_at: '2026-03-08T10:00:00.000Z',
          scanned_by: 'user-1',
          notes: null,
        },
        {
          id: 'latest-asset',
          gig_id: 'gig-1',
          kit_id: 'kit-1',
          asset_id: 'asset-1',
          status: 'In Warehouse',
          scanned_at: '2026-03-09T10:00:00.000Z',
          scanned_by: 'user-1',
          notes: 'Child note',
        },
        {
          id: 'older-asset',
          gig_id: 'gig-1',
          kit_id: 'kit-1',
          asset_id: 'asset-1',
          status: 'Checked Out',
          scanned_at: '2026-03-08T10:00:00.000Z',
          scanned_by: 'user-1',
          notes: null,
        },
      ],
    })

    await inventoryTrackingService.clearTracking({
      gigId: 'gig-1',
      kitId: 'kit-1',
    })

    expect(idbStore.putPackingList).toHaveBeenCalledWith(
      'gig-1',
      expect.objectContaining({
        tracking: expect.arrayContaining([
          expect.objectContaining({ id: 'older-kit', status: 'Checked Out' }),
          expect.objectContaining({ id: 'older-asset', status: 'Checked Out' }),
        ]),
      })
    )
    expect(offlineSyncService.queueTrackingUpdate).toHaveBeenNthCalledWith(
      1,
      { gig_id: 'gig-1', kit_id: 'kit-1', asset_id: null, record_id: 'latest-kit' },
      'INVENTORY_CLEAR'
    )
    expect(offlineSyncService.queueTrackingUpdate).toHaveBeenNthCalledWith(
      2,
      { gig_id: 'gig-1', kit_id: 'kit-1', asset_id: 'asset-1', record_id: 'latest-asset' },
      'INVENTORY_CLEAR'
    )
  })
})
