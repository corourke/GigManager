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

  it('scanning a non-container kit as a whole writes only its assets — no record for the kit itself', async () => {
    vi.mocked(idbStore.getPackingList).mockResolvedValue({
      gig_id: 'gig-1',
      kits: [
        {
          kit: {
            id: 'kit-1',
            is_container: false,
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
          expect.objectContaining({ kit_id: 'kit-1', asset_id: 'asset-1', status: 'In Warehouse', notes: null }),
          expect.objectContaining({ kit_id: 'kit-1', asset_id: 'asset-2', status: 'In Warehouse', notes: null }),
          expect.objectContaining({ id: 'older-kit', status: 'Checked Out' }),
        ]),
      })
    )
    const putCall = vi.mocked(idbStore.putPackingList).mock.calls[0][1] as any
    expect(putCall.tracking.filter((r: any) => r.kit_id === 'kit-1' && r.asset_id === null && r.status === 'In Warehouse')).toHaveLength(0)
    expect(offlineSyncService.queueTrackingUpdate).toHaveBeenCalledTimes(2)
  })

  it('scanning a container kit as a whole still writes its own record plus every flattened asset (unchanged)', async () => {
    vi.mocked(idbStore.getPackingList).mockResolvedValue({
      gig_id: 'gig-1',
      kits: [
        {
          kit: {
            id: 'kit-container',
            is_container: true,
            assets: [{ asset_id: 'asset-1' }, { asset_id: 'asset-2' }],
          },
        },
      ],
      tracking: [],
    })

    await inventoryTrackingService.submitScan({
      gigId: 'gig-1',
      kitId: 'kit-container',
      status: 'In Warehouse',
      organizationId: 'org-1',
      scannedBy: 'user-1',
      scannedAt: '2026-03-09T00:00:00.000Z',
    })

    const putCall = vi.mocked(idbStore.putPackingList).mock.calls[0][1] as any
    expect(putCall.tracking).toEqual(expect.arrayContaining([
      expect.objectContaining({ kit_id: 'kit-container', asset_id: null, status: 'In Warehouse' }),
      expect.objectContaining({ kit_id: 'kit-container', asset_id: 'asset-1', status: 'In Warehouse' }),
      expect.objectContaining({ kit_id: 'kit-container', asset_id: 'asset-2', status: 'In Warehouse' }),
    ]))
    expect(offlineSyncService.queueTrackingUpdate).toHaveBeenCalledTimes(3)
  })

  it('scanning a non-container top kit with a nested container sub-kit tracks the container under its own id, not the top kit\'s', async () => {
    // Full Rack (non-container) directly contains Cable Snake and nests Mic
    // Case (a container) which contains its own SM58 — matches the exact
    // shape reported live: a nested container's contents must not leak out
    // under the parent's kit_id.
    vi.mocked(idbStore.getPackingList).mockResolvedValue({
      gig_id: 'gig-1',
      hierarchy_edges: [{ parent_kit_id: 'kit-full-rack', child_kit_id: 'kit-mic-case' }],
      kits: [
        {
          kit: {
            id: 'kit-full-rack',
            is_container: false,
            direct_assets: [{ asset_id: 'asset-snake' }],
            assets: [{ asset_id: 'asset-snake' }, { asset_id: 'asset-mic' }],
          },
        },
        {
          kit: {
            id: 'kit-mic-case',
            is_container: true,
            direct_assets: [{ asset_id: 'asset-mic' }],
            assets: [{ asset_id: 'asset-mic' }],
          },
        },
      ],
      tracking: [],
    })

    await inventoryTrackingService.submitScan({
      gigId: 'gig-1',
      kitId: 'kit-full-rack',
      status: 'In Warehouse',
      organizationId: 'org-1',
      scannedBy: 'user-1',
      scannedAt: '2026-03-09T00:00:00.000Z',
    })

    const putCall = vi.mocked(idbStore.putPackingList).mock.calls[0][1] as any
    const written = putCall.tracking as any[]

    // Full Rack's own direct asset — owned by Full Rack, no record for Full Rack itself.
    expect(written).toEqual(expect.arrayContaining([
      expect.objectContaining({ kit_id: 'kit-full-rack', asset_id: 'asset-snake', status: 'In Warehouse' }),
    ]))
    expect(written.some((r) => r.kit_id === 'kit-full-rack' && r.asset_id === null)).toBe(false)

    // Mic Case — sealed unit, its own record plus its own asset, under its own id.
    expect(written).toEqual(expect.arrayContaining([
      expect.objectContaining({ kit_id: 'kit-mic-case', asset_id: null, status: 'In Warehouse' }),
      expect.objectContaining({ kit_id: 'kit-mic-case', asset_id: 'asset-mic', status: 'In Warehouse' }),
    ]))
    // The mic never gets a record under Full Rack's id — that's the bug being fixed.
    expect(written.some((r) => r.kit_id === 'kit-full-rack' && r.asset_id === 'asset-mic')).toBe(false)

    expect(written).toHaveLength(3)
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

  it('clearing a non-container kit as a whole clears its scannable units directly (no primary record to anchor on)', async () => {
    vi.mocked(idbStore.getPackingList).mockResolvedValue({
      gig_id: 'gig-1',
      kits: [
        {
          kit: {
            id: 'kit-1',
            is_container: false,
            assets: [{ asset_id: 'asset-1' }],
          },
        },
      ],
      tracking: [
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
          expect.objectContaining({ id: 'older-asset', status: 'Checked Out' }),
        ]),
      })
    )
    expect(offlineSyncService.queueTrackingUpdate).toHaveBeenCalledTimes(1)
    expect(offlineSyncService.queueTrackingUpdate).toHaveBeenCalledWith(
      { gig_id: 'gig-1', kit_id: 'kit-1', asset_id: 'asset-1', record_id: 'latest-asset' },
      'INVENTORY_CLEAR'
    )
  })

  it('clearing a container kit as a whole still anchors on its own record and clears same-batch children (unchanged)', async () => {
    vi.mocked(idbStore.getPackingList).mockResolvedValue({
      gig_id: 'gig-1',
      kits: [
        {
          kit: {
            id: 'kit-container',
            is_container: true,
            assets: [{ asset_id: 'asset-1' }],
          },
        },
      ],
      tracking: [
        {
          id: 'latest-kit',
          gig_id: 'gig-1',
          kit_id: 'kit-container',
          asset_id: null,
          status: 'In Warehouse',
          scanned_at: '2026-03-09T10:00:00.000Z',
          scanned_by: 'user-1',
          notes: null,
        },
        {
          id: 'older-kit',
          gig_id: 'gig-1',
          kit_id: 'kit-container',
          asset_id: null,
          status: 'Checked Out',
          scanned_at: '2026-03-08T10:00:00.000Z',
          scanned_by: 'user-1',
          notes: null,
        },
        {
          id: 'latest-asset',
          gig_id: 'gig-1',
          kit_id: 'kit-container',
          asset_id: 'asset-1',
          status: 'In Warehouse',
          scanned_at: '2026-03-09T10:00:00.000Z',
          scanned_by: 'user-1',
          notes: 'Child note',
        },
        {
          id: 'older-asset',
          gig_id: 'gig-1',
          kit_id: 'kit-container',
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
      kitId: 'kit-container',
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
      { gig_id: 'gig-1', kit_id: 'kit-container', asset_id: null, record_id: 'latest-kit' },
      'INVENTORY_CLEAR'
    )
    expect(offlineSyncService.queueTrackingUpdate).toHaveBeenNthCalledWith(
      2,
      { gig_id: 'gig-1', kit_id: 'kit-container', asset_id: 'asset-1', record_id: 'latest-asset' },
      'INVENTORY_CLEAR'
    )
  })
})
