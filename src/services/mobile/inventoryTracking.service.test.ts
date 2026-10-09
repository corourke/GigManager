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

  // #185: every scan records how many pieces (quantity is state). A kit scan writes each lot with
  // its line's N, multiplied through nested non-container kits; a container's contents carry their totals.
  it('a kit scan writes each lot with its line\'s quantity, multiplied through nested kits (#185)', async () => {
    vi.mocked(idbStore.getPackingList).mockResolvedValue({
      gig_id: 'gig-1',
      hierarchy_edges: [{ parent_kit_id: 'kit-top', child_kit_id: 'kit-pair', quantity: 2 }, { parent_kit_id: 'kit-top', child_kit_id: 'kit-case', quantity: 1 }],
      kits: [
        { kit: { id: 'kit-top', is_container: false, direct_assets: [{ asset_id: 'xlr', quantity: 4 }] } },
        { kit: { id: 'kit-pair', is_container: false, direct_assets: [{ asset_id: 'di', quantity: 3 }] } },
        { kit: { id: 'kit-case', is_container: true, assets: [{ asset_id: 'mic', quantity: 6 }] } },
      ],
      tracking: [],
    })
    await inventoryTrackingService.submitScan({
      gigId: 'gig-1', kitId: 'kit-top', status: 'Checked Out', organizationId: 'org-1', scannedBy: 'user-1', scannedAt: '2026-10-09T10:00:00.000Z',
    })
    const written = (vi.mocked(idbStore.putPackingList).mock.calls[0][1] as any).tracking as any[]
    expect(written.map((r) => [r.kit_id, r.asset_id, r.quantity])).toEqual(expect.arrayContaining([
      ['kit-top', 'xlr', 4], ['kit-top', 'di', 6], ['kit-case', null, 1], ['kit-case', 'mic', 6],
    ]))
    expect(vi.mocked(offlineSyncService.queueTrackingUpdate).mock.calls.map((c: any) => c[0].quantity)).toEqual(expect.arrayContaining([4, 6, 1, 6]))
  })

  it('a direct lot scan records the count given; a unit scan records 1 (#185)', async () => {
    vi.mocked(idbStore.getPackingList).mockResolvedValue({ gig_id: 'gig-1', kits: [], tracking: [] })
    await inventoryTrackingService.submitScan({
      gigId: 'gig-1', kitId: 'kit-1', assetId: 'cables', quantity: 7, status: 'Checked Out', organizationId: 'org-1', scannedBy: 'user-1',
    })
    await inventoryTrackingService.submitScan({
      gigId: 'gig-1', kitId: 'kit-1', assetId: 'k12', status: 'Checked Out', organizationId: 'org-1', scannedBy: 'user-1',
    })
    const queued = vi.mocked(offlineSyncService.queueTrackingUpdate).mock.calls.map((c: any) => [c[0].asset_id, c[0].quantity])
    expect(queued).toEqual([['cables', 7], ['k12', 1]])
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

  // #185: progress is counted in pieces. A kit shared by two parents, or a sub-kit that's also
  // listed on its own, is counted once, not once per place it appears.
  describe('getScanProgress', () => {
    const row = (kit_id: string, asset_id: string | null, status: string, quantity?: number) =>
      ({ gig_id: 'gig-1', kit_id, asset_id, status, quantity, scanned_at: '2026-10-09T10:00:00.000Z', scanned_by: 'u' })
    const list = (tracking: any[]) => ({
      top_level_kit_ids: ['rack'],
      hierarchy_edges: [{ parent_kit_id: 'rack', child_kit_id: 'case', quantity: 1 }],
      kits: [
        { kit_id: 'rack', kit: { id: 'rack', is_container: false, direct_assets: [{ asset_id: 'xlr', quantity: 10 }], assets: [{ asset_id: 'xlr', quantity: 10 }, { asset_id: 'mic', quantity: 2 }],
          any_lines: [{ item_id: 'item-di', item_name: 'DI box', quantity: 3 }] } },
        { kit_id: 'case', kit: { id: 'case', is_container: true, assets: [{ asset_id: 'mic', quantity: 2 }] } },
      ],
      item_records: { 'item-di': [{ id: 'di-lot', quantity: 5, at_home: 5 }, { id: 'di-7', tag_number: 'DI-7', quantity: 1, at_home: 1 }] },
      tracking,
    })

    it('counts pieces once: lines, the container and its contents, and "any" lines', () => {
      // 10 cables + the case + 2 mics + 3 DI boxes
      expect(inventoryTrackingService.getScanProgress(list([]), 'Checked Out')).toEqual({ done: 0, total: 16 })
    })

    it('counts what each row says is there, up to the line, in the chosen status only', () => {
      const tracking = [
        row('rack', 'xlr', 'Checked Out', 7),
        row('case', null, 'Checked Out', 1),
        row('case', 'mic', 'In Warehouse', 2),
        row('rack', 'di-lot', 'Checked Out', 2),
        row('rack', 'di-7', 'Checked Out', 1),
        row('rack', 'di-lot', 'Checked Out', 9), // newer state wins; capped at the line
      ].map((r, i) => ({ ...r, scanned_at: `2026-10-09T10:0${i}:00.000Z` }))
      expect(inventoryTrackingService.getScanProgress(list(tracking), 'Checked Out')).toEqual({ done: 7 + 1 + 3, total: 16 })
    })

    it('on Unload, a Not Returned row counts what came back: the line less what is still out', () => {
      expect(inventoryTrackingService.getScanProgress(list([row('rack', 'xlr', 'Not Returned', 3)]), 'In Warehouse').done).toBe(7)
    })

    it('a row with no quantity (before #185) counts as the whole line', () => {
      expect(inventoryTrackingService.getScanProgress(list([row('rack', 'xlr', 'Checked Out')]), 'Checked Out').done).toBe(10)
    })
  })

  describe('getAnySlots', () => {
    it('lists each "any" line under the kit its pieces are tracked in, multiplied through nested kits', () => {
      const packingList = {
        hierarchy_edges: [{ parent_kit_id: 'top', child_kit_id: 'pair', quantity: 2 }, { parent_kit_id: 'top', child_kit_id: 'case', quantity: 1 }],
        kits: [
          { kit: { id: 'top', is_container: false, any_lines: [{ item_id: 'xlr', item_name: 'XLR', quantity: 4 }] } },
          { kit: { id: 'pair', is_container: false, any_lines: [{ item_id: 'di', item_name: 'DI', quantity: 1 }] } },
          { kit: { id: 'case', is_container: true, any_lines: [{ item_id: 'clip', item_name: 'Clip', quantity: 6 }] } },
        ],
      }
      expect(inventoryTrackingService.getAnySlots(packingList, 'top')).toEqual([
        { kit_id: 'top', item_id: 'xlr', item_name: 'XLR', quantity: 4 },
        { kit_id: 'top', item_id: 'di', item_name: 'DI', quantity: 2 },
        { kit_id: 'case', item_id: 'clip', item_name: 'Clip', quantity: 6 },
      ])
    })
  })

  // #185 (Cameron, 10-09): an "any" line of lots is packed with no "which lot?" prompt: the lot
  // with the most at home first, then the next. Tagged units are scanned one by one. After
  // Pack-Out, each mode moves on what the kit already holds; Unload never picks from home.
  describe('getAnySlotFills', () => {
    const slot = { kit_id: 'top', item_id: 'item-di', item_name: 'DI box', quantity: 3 }
    const at = (asset_id: string, status: string, quantity: number, minute = 0) =>
      ({ gig_id: 'gig-1', kit_id: 'top', asset_id, status, quantity, scanned_at: `2026-10-09T10:0${minute}:00.000Z`, scanned_by: 'u' })
    const list = (tracking: any[] = []) => ({
      item_records: { 'item-di': [
        { id: 'lot-a', quantity: 4, at_home: 2, at_gig: 0, created_at: '2025-01-01T00:00:00Z' },
        { id: 'lot-b', quantity: 5, at_home: 5, at_gig: 0, created_at: '2026-01-01T00:00:00Z' },
        { id: 'di-7', tag_number: 'DI-7', quantity: 1, at_home: 1, at_gig: 0 },
      ] },
      tracking,
    })

    it('Pack-Out picks from the lot with the most at home, never a tagged unit', () => {
      expect(inventoryTrackingService.getAnySlotFills(list(), slot, 'Checked Out', 'gig-1')).toEqual({ fills: [{ asset_id: 'lot-b', quantity: 3 }], short: 0 })
    })

    it('spills to the next lot, and says how many it couldn\'t find', () => {
      expect(inventoryTrackingService.getAnySlotFills(list(), { ...slot, quantity: 8 }, 'Checked Out', 'gig-1'))
        .toEqual({ fills: [{ asset_id: 'lot-b', quantity: 5 }, { asset_id: 'lot-a', quantity: 2 }], short: 1 })
    })

    it('tops up a line already partly packed: the lot\'s row says its new total', () => {
      // 2 of lot-b went out since the list was fetched, so 3 are home now; lot-b still leads lot-a's 2.
      expect(inventoryTrackingService.getAnySlotFills(list([at('lot-b', 'Checked Out', 2)]), slot, 'Checked Out', 'gig-1'))
        .toEqual({ fills: [{ asset_id: 'lot-b', quantity: 3 }], short: 0 })
    })

    it('later modes move on what the kit holds, at the same count, units included', () => {
      const tracking = [at('lot-b', 'Checked Out', 2), at('di-7', 'Checked Out', 1, 1)]
      expect(inventoryTrackingService.getAnySlotFills(list(tracking), slot, 'In Transit', 'gig-1'))
        .toEqual({ fills: [{ asset_id: 'lot-b', quantity: 2 }, { asset_id: 'di-7', quantity: 1 }], short: 0 })
    })

    it('Unload never picks from home', () => {
      expect(inventoryTrackingService.getAnySlotFills(list([at('lot-b', 'On Site', 1)]), slot, 'In Warehouse', 'gig-1'))
        .toEqual({ fills: [{ asset_id: 'lot-b', quantity: 1 }], short: 2 })
    })

    it('a full line needs nothing', () => {
      expect(inventoryTrackingService.getAnySlotFills(list([at('lot-b', 'Checked Out', 3)]), slot, 'Checked Out', 'gig-1'))
        .toEqual({ fills: [], short: 0 })
    })
  })

  it('a kit scan also fills its "any" lines from lots (#185)', async () => {
    vi.mocked(idbStore.getPackingList).mockResolvedValue({
      gig_id: 'gig-1',
      kits: [{ kit: { id: 'top', is_container: false, direct_assets: [], any_lines: [{ item_id: 'item-di', item_name: 'DI box', quantity: 3 }] } }],
      item_records: { 'item-di': [{ id: 'lot-b', quantity: 5, at_home: 5, at_gig: 0 }] },
      tracking: [],
    })
    await inventoryTrackingService.submitScan({ gigId: 'gig-1', kitId: 'top', status: 'Checked Out', organizationId: 'org-1', scannedBy: 'user-1' })
    expect(vi.mocked(offlineSyncService.queueTrackingUpdate).mock.calls.map((c: any) => [c[0].kit_id, c[0].asset_id, c[0].quantity]))
      .toEqual([['top', 'lot-b', 3]])
  })

  it('un-checking a kit also deletes the rows its "any" lines wrote (#185)', async () => {
    const row = (id: string, asset_id: string) => ({ id, gig_id: 'gig-1', kit_id: 'top', asset_id, status: 'Checked Out', quantity: 2, scanned_at: '2026-10-09T10:00:00.000Z', scanned_by: 'u' })
    vi.mocked(idbStore.getPackingList).mockResolvedValue({
      gig_id: 'gig-1',
      kits: [{ kit: { id: 'top', is_container: false, direct_assets: [], any_lines: [{ item_id: 'item-di', item_name: 'DI box', quantity: 3 }] } }],
      item_records: { 'item-di': [{ id: 'lot-b', quantity: 5 }, { id: 'di-7', tag_number: 'DI-7', quantity: 1 }, { id: 'lot-c', quantity: 2 }] },
      tracking: [row('r1', 'lot-b'), row('r2', 'di-7')],
    })
    await inventoryTrackingService.clearTracking({ gigId: 'gig-1', kitId: 'top' })
    expect(vi.mocked(offlineSyncService.queueTrackingUpdate).mock.calls.map((c: any) => c[0].record_id)).toEqual(['r1', 'r2'])
  })

  // #185: Finish unload lists what's still out at the gig: units and lots by kit, a container
  // as one sealed unit, nothing already back or already left at the gig.
  it('getStillOut lists what is out and not yet back or left', () => {
    const row = (kit_id: string, asset_id: string | null, status: string, quantity: number) =>
      ({ gig_id: 'gig-1', kit_id, asset_id, status, quantity, scanned_at: '2026-10-09T10:00:00.000Z', scanned_by: 'u' })
    const packingList = {
      top_level_kit_ids: ['top'],
      hierarchy_edges: [{ parent_kit_id: 'top', child_kit_id: 'case', quantity: 1 }],
      kits: [
        { kit: { id: 'top', is_container: false, direct_assets: [{ asset_id: 'k12', quantity: 1 }, { asset_id: 'xlr', quantity: 10 }, { asset_id: 'sub', quantity: 1 }, { asset_id: 'di', quantity: 1 }],
          any_lines: [{ item_id: 'item-clip', item_name: 'Clip', quantity: 4 }] } },
        { kit: { id: 'case', is_container: true, assets: [{ asset_id: 'mic', quantity: 2 }] } },
      ],
      item_records: { 'item-clip': [{ id: 'clip-lot', quantity: 9 }] },
      tracking: [
        row('top', 'k12', 'On Site', 1),
        row('top', 'xlr', 'In Transit', 8),
        row('top', 'sub', 'In Warehouse', 1),
        row('top', 'di', 'Not Returned', 1),
        row('case', null, 'On Site', 1),
        row('case', 'mic', 'On Site', 2),
        row('top', 'clip-lot', 'On Site', 4),
      ],
    }
    expect(inventoryTrackingService.getStillOut(packingList)).toEqual([
      { kit_id: 'top', asset_id: 'k12', quantity: 1 },
      { kit_id: 'top', asset_id: 'xlr', quantity: 8 },
      { kit_id: 'case', asset_id: null, quantity: 1 },
      { kit_id: 'top', asset_id: 'clip-lot', quantity: 4 },
    ])
  })
})
