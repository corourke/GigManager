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

  // #246 review: adding a kit that's already on the gig queues nothing.
  it('addKitAtPackOut does nothing for a kit already on the gig', async () => {
    vi.mocked(idbStore.getPackingList).mockResolvedValue({ gig_id: 'gig-1', top_level_kit_ids: ['case-1'], kits: [{ kit_id: 'case-1', kit: { id: 'case-1' } }], tracking: [] })
    const added = await inventoryTrackingService.addKitAtPackOut({ gigId: 'gig-1', organizationId: 'org-1', userId: 'user-1', kit: { id: 'case-1', name: 'Mic Case', tag_number: null, is_container: true } })
    expect(added).toBe(false)
    expect(idbStore.putPackingList).not.toHaveBeenCalled()
    expect(offlineSyncService.queueTrackingUpdate).not.toHaveBeenCalled()
  })

  // #246 (Cameron, 10-10): saving a note always appends a new row that carries the item's last
  // status (and count and place) forward. It never edits a row, and never invents a scan.
  describe('saveNote', () => {
    const at = (m: number) => `2026-10-10T10:0${m}:00.000Z`
    const list = (tracking: any[], over: Record<string, unknown> = {}) => ({
      gig_id: 'gig-1',
      kits: [{ kit: { id: 'kit-1', is_container: false, assets: [{ asset_id: 'u1', quantity: 1 }, { asset_id: 'lot', quantity: 4 }] } }],
      tracking,
      ...over,
    })
    const save = (over: Record<string, unknown> = {}) => inventoryTrackingService.saveNote({
      gigId: 'gig-1', kitId: 'kit-1', assetId: 'u1', notes: 'Fan rattles', organizationId: 'org-1', scannedBy: 'user-2', ...over,
    })
    const appended = () => (vi.mocked(idbStore.putPackingList).mock.calls.at(-1)![1] as any).tracking

    it('carries the newest row here forward: status, count and place; the old row is untouched', async () => {
      const old = { id: 'r1', gig_id: 'gig-1', kit_id: 'kit-1', asset_id: 'lot', status: 'Checked Out', quantity: 4, location: 'Truck', notes: null, scanned_at: at(0), scanned_by: 'user-1' }
      vi.mocked(idbStore.getPackingList).mockResolvedValue(list([old]))
      await save({ assetId: 'lot' })
      const rows = appended()
      expect(rows).toHaveLength(2)
      expect(rows.find((r: any) => r.id === 'r1')).toEqual(old)
      const added = rows.find((r: any) => r.id !== 'r1')
      expect(added).toMatchObject({ gig_id: 'gig-1', kit_id: 'kit-1', asset_id: 'lot', status: 'Checked Out', quantity: 4, location: 'Truck', notes: 'Fan rattles', scanned_by: 'user-2' })
      expect(Date.parse(added.scanned_at)).toBeGreaterThan(Date.parse(at(0)))
      expect(offlineSyncService.queueTrackingUpdate).toHaveBeenCalledWith(expect.objectContaining({ asset_id: 'lot', status: 'Checked Out', quantity: 4, notes: 'Fan rattles' }), 'INVENTORY_SCAN')
      expect(vi.mocked(offlineSyncService.queueTrackingUpdate).mock.calls.map((c: any) => c[1])).not.toContain('INVENTORY_NOTE_UPDATE')
    })

    it('an item not scanned here, and home, gets an In Warehouse row: a note never packs it', async () => {
      vi.mocked(idbStore.getPackingList).mockResolvedValue(list([]))
      await save()
      expect(appended()).toEqual([expect.objectContaining({ kit_id: 'kit-1', asset_id: 'u1', status: 'In Warehouse', quantity: 1, notes: 'Fan rattles' })])
      expect(inventoryTrackingService.getScanProgress(list(appended()), 'Checked Out').done).toBe(0)
    })

    // Cameron, 10-10: a note is recorded here anyway, carrying the newest record from anywhere.
    it('a unit whose last record is at another gig gets its note here, carrying that status', async () => {
      vi.mocked(idbStore.getPackingList).mockResolvedValue(list([], {
        elsewhere: { u1: { gig_id: 'gig-2', gig_title: 'Other Gig', status: 'On Site' } },
        last_records: { assets: { u1: { gig_id: 'gig-2', status: 'On Site', scanned_at: at(0) } }, kits: {} },
      }))
      const result = await save()
      expect(result).toMatchObject({ saved: true, record: { gig_id: 'gig-1', asset_id: 'u1', status: 'On Site', notes: 'Fan rattles' } })
      expect(appended()).toEqual([expect.objectContaining({ gig_id: 'gig-1', kit_id: 'kit-1', asset_id: 'u1', status: 'On Site' })])
      expect(offlineSyncService.queueTrackingUpdate).toHaveBeenCalledWith(expect.objectContaining({ gig_id: 'gig-1', asset_id: 'u1', status: 'On Site' }), 'INVENTORY_SCAN')
    })

    it('the newer of the row here and the last record anywhere is carried', async () => {
      const mine = { id: 'r1', gig_id: 'gig-1', kit_id: 'kit-1', asset_id: 'u1', status: 'Checked Out', quantity: 1, location: 'Truck', notes: null, scanned_at: at(2), scanned_by: 'user-1' }
      const away = { last_records: { assets: { u1: { gig_id: 'gig-2', status: 'On Site', location: 'Stage left', scanned_at: at(1) } }, kits: {} } }
      vi.mocked(idbStore.getPackingList).mockResolvedValue(list([mine], away))
      await save()
      expect(appended().find((r: any) => r.id !== 'r1')).toMatchObject({ status: 'Checked Out', location: 'Truck' })

      vi.clearAllMocks()
      vi.mocked(idbStore.getPackingList).mockResolvedValue(list([{ ...mine, scanned_at: at(0) }], away))
      await save()
      // Its place comes with it, the same as its status (#246 re-review).
      expect(appended().find((r: any) => r.id !== 'r1')).toMatchObject({ status: 'On Site', location: 'Stage left' })
    })

    it('a container with no row here carries its own last record from anywhere, not In Warehouse', async () => {
      vi.mocked(idbStore.getPackingList).mockResolvedValue({
        gig_id: 'gig-1',
        kits: [{ kit: { id: 'case-1', is_container: true, assets: [] } }],
        tracking: [],
        last_records: { assets: {}, kits: { 'case-1': { gig_id: 'gig-2', status: 'Checked Out', scanned_at: at(0) } } },
      })
      await save({ kitId: 'case-1', assetId: undefined, notes: 'Latch loose' })
      expect(appended()).toEqual([expect.objectContaining({ gig_id: 'gig-1', kit_id: 'case-1', asset_id: null, status: 'Checked Out', notes: 'Latch loose' })])
    })

    // Cameron, 10-10: a note on a whole kit is one kit-level row and nothing else: no rows for its
    // units or lots, no cascade, for containers and non-containers alike.
    it.each([false, true])('a note on a whole kit (container: %s) writes exactly one kit row; its items stay unchecked', async (isContainer) => {
      const packing = {
        gig_id: 'gig-1',
        top_level_kit_ids: ['kit-1'],
        kits: [{ kit_id: 'kit-1', kit: { id: 'kit-1', is_container: isContainer,
          assets: [{ asset_id: 'u1', quantity: 1, asset: { id: 'u1', quantity: 1 } }, { asset_id: 'lot', quantity: 4, asset: { id: 'lot', quantity: 10 } }],
          direct_assets: [{ asset_id: 'u1', quantity: 1, asset: { id: 'u1', quantity: 1 } }, { asset_id: 'lot', quantity: 4, asset: { id: 'lot', quantity: 10 } }] } }],
        tracking: [],
      }
      vi.mocked(idbStore.getPackingList).mockResolvedValue(packing)
      await save({ assetId: undefined, notes: 'Lid cracked' })
      const rows = appended()
      expect(rows).toEqual([expect.objectContaining({ gig_id: 'gig-1', kit_id: 'kit-1', asset_id: null, notes: 'Lid cracked' })])
      expect(offlineSyncService.queueTrackingUpdate).toHaveBeenCalledTimes(1)
      // Its items have no rows of their own, so none of them reads as checked in any mode.
      for (const id of ['u1', 'lot']) expect(inventoryTrackingService.getLatestTrackingRecord(rows, 'kit-1', id)).toBeNull()
      if (!isContainer) {
        for (const status of ['Checked Out', 'In Warehouse']) {
          expect(inventoryTrackingService.getKitProgress({ ...packing, tracking: rows }, 'kit-1', status).done).toBe(0)
        }
      }
    })

    it('a note on a kit row carries that row forward too', async () => {
      const kitRow = { id: 'k1', gig_id: 'gig-1', kit_id: 'kit-1', asset_id: null, status: 'On Site', quantity: 1, location: 'Stage', notes: null, scanned_at: at(0), scanned_by: 'user-1' }
      vi.mocked(idbStore.getPackingList).mockResolvedValue(list([kitRow]))
      await save({ assetId: undefined, notes: 'Lid cracked' })
      expect(appended().find((r: any) => r.id !== 'k1')).toMatchObject({ kit_id: 'kit-1', asset_id: null, status: 'On Site', location: 'Stage', notes: 'Lid cracked' })
    })
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

  // #246 review: the same item, or the same lot, under two sub-kits of one kit is one line of
  // the sum, as on the web packing list (sumRepeatedLines). A tracked unit stays 1.
  describe('the same line under two sub-kits', () => {
    const list = (tracking: any[] = []) => ({
      top_level_kit_ids: ['T'],
      hierarchy_edges: [{ parent_kit_id: 'T', child_kit_id: 'L', quantity: 1 }, { parent_kit_id: 'T', child_kit_id: 'R', quantity: 1 }],
      kits: [
        { kit_id: 'T', kit: { id: 'T', is_container: false, direct_assets: [], assets: [] } },
        { kit_id: 'L', kit: { id: 'L', is_container: false,
          direct_assets: [{ asset_id: 'lot', quantity: 4, asset: { id: 'lot', quantity: 20 } }, { asset_id: 'di', quantity: 1, asset: { id: 'di', tag_number: 'DI-1', quantity: 1 } }],
          any_lines: [{ item_id: 'xlr', item_name: 'XLR', quantity: 4 }] } },
        { kit_id: 'R', kit: { id: 'R', is_container: false,
          direct_assets: [{ asset_id: 'lot', quantity: 4, asset: { id: 'lot', quantity: 20 } }, { asset_id: 'di', quantity: 1, asset: { id: 'di', tag_number: 'DI-1', quantity: 1 } }],
          any_lines: [{ item_id: 'xlr', item_name: 'XLR', quantity: 4 }] } },
      ],
      item_records: { xlr: [{ id: 'xlr-lot', quantity: 50, at_home: 50 }] },
      tracking,
    })

    it('progress counts the sum: 8 of the lot, 8 of the "any" item, the unit once', () => {
      expect(inventoryTrackingService.getScanProgress(list(), 'Checked Out')).toEqual({ done: 0, total: 8 + 8 + 1 })
    })

    it('a kit scan writes one row per line, with the sum', async () => {
      vi.mocked(idbStore.getPackingList).mockResolvedValue(list() as any)
      await inventoryTrackingService.submitScan({ gigId: 'gig-1', kitId: 'T', status: 'Checked Out', organizationId: 'org-1', scannedBy: 'u' })
      const rows = vi.mocked(offlineSyncService.queueTrackingUpdate).mock.calls.map(([r]: any[]) => [r.kit_id, r.asset_id, r.quantity])
      expect(rows).toEqual(expect.arrayContaining([['T', 'lot', 8], ['T', 'di', 1], ['T', 'xlr-lot', 8]]))
      expect(rows).toHaveLength(3)
    })

    it('after that scan, the kit reads complete', () => {
      const at = '2026-10-10T10:00:00.000Z'
      const tracking = [['lot', 8], ['di', 1], ['xlr-lot', 8]].map(([asset_id, quantity]) =>
        ({ gig_id: 'gig-1', kit_id: 'T', asset_id, status: 'Checked Out', quantity, scanned_at: at }))
      expect(inventoryTrackingService.getScanProgress(list(tracking), 'Checked Out')).toEqual({ done: 17, total: 17 })
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

    // #186 step 3 (Cameron, 10-22): a lot in Maintenance or Inactive isn't picked; one only flagged
    // to maintenance still is (it stays available until it comes home).
    it('skips a lot in Maintenance or Inactive, but not one only flagged', () => {
      const records = (status: string, pending = false) => ({
        item_records: { 'item-di': [
          { id: 'lot-a', quantity: 4, at_home: 4, at_gig: 0, status: 'Active' },
          { id: 'lot-b', quantity: 5, at_home: 5, at_gig: 0, status, maintenance_pending: pending },
        ] },
        tracking: [],
      })
      expect(inventoryTrackingService.getAnySlotFills(records('Maintenance'), slot, 'Checked Out', 'gig-1'))
        .toEqual({ fills: [{ asset_id: 'lot-a', quantity: 3 }], short: 0 })
      expect(inventoryTrackingService.getAnySlotFills(records('Inactive'), slot, 'Checked Out', 'gig-1'))
        .toEqual({ fills: [{ asset_id: 'lot-a', quantity: 3 }], short: 0 })
      expect(inventoryTrackingService.getAnySlotFills(records('Active', true), slot, 'Checked Out', 'gig-1'))
        .toEqual({ fills: [{ asset_id: 'lot-b', quantity: 3 }], short: 0 })
    })

    it('Unload never picks from home', () => {
      expect(inventoryTrackingService.getAnySlotFills(list([at('lot-b', 'On Site', 1)]), slot, 'In Warehouse', 'gig-1'))
        .toEqual({ fills: [{ asset_id: 'lot-b', quantity: 1 }], short: 2 })
    })

    it('leaving pieces at the gig never picks from home either', () => {
      expect(inventoryTrackingService.getAnySlotFills(list([at('lot-b', 'On Site', 1)]), slot, 'Not Returned', 'gig-1'))
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

  // #185: a unit tracked at the gig that isn't on the list is an extra. There is no swap (Cameron,
  // 10-10): an extra never stands in for a listed unit.
  describe('extras', () => {
    const row = (asset_id: string, status: string, minute = 0) =>
      ({ gig_id: 'gig-1', kit_id: 'top', asset_id, status, quantity: 1, scanned_at: `2026-10-09T10:0${minute}:00.000Z`, scanned_by: 'u' })
    const list = (tracking: any[]) => ({
      top_level_kit_ids: ['top'],
      hierarchy_edges: [],
      kits: [{ kit: { id: 'top', is_container: false,
        direct_assets: [{ asset_id: 'k12-1', quantity: 1, asset: { id: 'k12-1', equipment_item_id: 'item-k12', tag_number: 'K12-1' } }] } }],
      extra_assets: { 'k12-2': { id: 'k12-2', equipment_item_id: 'item-k12', tag_number: 'K12-2' }, 'sub-9': { id: 'sub-9', equipment_item_id: 'item-sub', tag_number: 'SUB-9' } },
      tracking,
    })

    it('getExtras lists what is tracked at the gig but not on the list', () => {
      expect(inventoryTrackingService.getExtras(list([row('k12-1', 'Checked Out'), row('k12-2', 'Checked Out'), row('sub-9', 'Checked Out')])))
        .toEqual([{ kit_id: 'top', asset_id: 'k12-2' }, { kit_id: 'top', asset_id: 'sub-9' }])
    })

    it('an extra of the same item never stands in for a listed unit put back', () => {
      const putBack = [row('k12-1', 'In Warehouse'), row('k12-2', 'Checked Out')]
      expect(inventoryTrackingService.getScanProgress(list(putBack), 'Checked Out')).toEqual({ done: 0, total: 1 })
      expect('getSwapFor' in inventoryTrackingService).toBe(false)
    })

    it('Finish unload lists extras still out', () => {
      expect(inventoryTrackingService.getStillOut(list([row('k12-1', 'In Warehouse'), row('k12-2', 'On Site')])))
        .toEqual([{ kit_id: 'top', asset_id: 'k12-2', quantity: 1 }])
    })
  })

  // #185 PR 2: a kit added at pack-out joins the gig's list on the device at once, and goes to the
  // server as a flagged assignment through the outbox (offline too). Its adder can remove it.
  describe('kits added at pack-out', () => {
    const list = () => ({ gig_id: 'gig-1', top_level_kit_ids: ['main'], kits: [{ kit_id: 'main', kit: { id: 'main', name: 'Main', is_container: false } }], tracking: [] })

    it('addKitAtPackOut queues a flagged assignment and adds the kit to the list', async () => {
      vi.mocked(idbStore.getPackingList).mockResolvedValue(list())
      await inventoryTrackingService.addKitAtPackOut({
        gigId: 'gig-1', organizationId: 'org-1', userId: 'user-1',
        kit: { id: 'case-1', name: 'Mic Case', tag_number: 'CASE-1', is_container: true },
      })
      expect(offlineSyncService.queueTrackingUpdate).toHaveBeenCalledWith(
        { organization_id: 'org-1', gig_id: 'gig-1', kit_id: 'case-1', assigned_by: 'user-1', added_at_pack_out: true },
        'KIT_ASSIGNMENT_ADD',
      )
      const saved = vi.mocked(idbStore.putPackingList).mock.calls[0][1] as any
      expect(saved.top_level_kit_ids).toEqual(['main', 'case-1'])
      expect(saved.kits[1]).toMatchObject({ kit_id: 'case-1', added_at_pack_out: true, assigned_by: 'user-1', contents_pending: true, kit: { id: 'case-1', name: 'Mic Case', is_container: true } })
    })

    it('removePackOutKit clears what was scanned for it, then queues the removal', async () => {
      const withAdded = {
        ...list(),
        top_level_kit_ids: ['main', 'case-1'],
        kits: [...list().kits, { kit_id: 'case-1', added_at_pack_out: true, assigned_by: 'user-1', kit: { id: 'case-1', name: 'Mic Case', is_container: true, assets: [] } }],
        tracking: [{ id: 'r1', gig_id: 'gig-1', kit_id: 'case-1', asset_id: null, status: 'Checked Out', scanned_at: '2026-10-10T10:00:00.000Z', scanned_by: 'user-1' }],
      }
      vi.mocked(idbStore.getPackingList).mockResolvedValue(withAdded)
      await inventoryTrackingService.removePackOutKit({ gigId: 'gig-1', organizationId: 'org-1', kitId: 'case-1', userId: 'user-1' })
      // One step: the removal, then (on the server) the kit's rows, so a refused removal keeps them.
      expect(vi.mocked(offlineSyncService.queueTrackingUpdate).mock.calls).toEqual([
        [{ organization_id: 'org-1', gig_id: 'gig-1', kit_id: 'case-1', assigned_by: 'user-1' }, 'KIT_ASSIGNMENT_REMOVE'],
      ])
      const saved = vi.mocked(idbStore.putPackingList).mock.calls.at(-1)![1] as any
      expect(saved.top_level_kit_ids).toEqual(['main'])
      expect(saved.kits.map((k: any) => k.kit_id)).toEqual(['main'])
    })

    // #246 review: after Pack-Out then Load Truck, Remove left the Pack-Out rows behind.
    it('removePackOutKit removes every row of the kit at the gig, from every mode', async () => {
      const at = (m: number) => `2026-10-10T10:0${m}:00.000Z`
      const withAdded = {
        ...list(),
        top_level_kit_ids: ['main', 'amps'],
        kits: [...list().kits, { kit_id: 'amps', added_at_pack_out: true, assigned_by: 'user-1', kit: { id: 'amps', name: 'Amps', is_container: false, direct_assets: [{ asset_id: 'a1', quantity: 1 }] } }],
        tracking: [
          { id: 'r1', gig_id: 'gig-1', kit_id: 'amps', asset_id: 'a1', status: 'Checked Out', scanned_at: at(0) },
          { id: 'r2', gig_id: 'gig-1', kit_id: 'amps', asset_id: 'a1', status: 'In Transit', scanned_at: at(1) },
          { gig_id: 'gig-1', kit_id: 'amps', asset_id: 'a1', status: 'On Site', scanned_at: at(2) },
          { id: 'r9', gig_id: 'gig-1', kit_id: 'main', asset_id: 'm1', status: 'Checked Out', scanned_at: at(0) },
        ],
      }
      vi.mocked(idbStore.getPackingList).mockResolvedValue(withAdded)
      await inventoryTrackingService.removePackOutKit({ gigId: 'gig-1', organizationId: 'org-1', kitId: 'amps', userId: 'user-1' })
      const saved = vi.mocked(idbStore.putPackingList).mock.calls.at(-1)![1] as any
      expect(saved.tracking.map((r: any) => r.id)).toEqual(['r9'])
      expect(vi.mocked(offlineSyncService.queueTrackingUpdate).mock.calls.map((c: any) => c[1])).toEqual(['KIT_ASSIGNMENT_REMOVE'])
    })

    it('a unit or lot added at pack-out is a no-kit row', async () => {
      vi.mocked(idbStore.getPackingList).mockResolvedValue(list())
      await inventoryTrackingService.submitScan({ gigId: 'gig-1', kitId: null, assetId: 'lot-1', quantity: 6, status: 'Checked Out', organizationId: 'org-1', scannedBy: 'user-1' })
      expect(offlineSyncService.queueTrackingUpdate).toHaveBeenCalledWith(expect.objectContaining({ kit_id: null, asset_id: 'lot-1', quantity: 6 }), 'INVENTORY_SCAN')
    })
  })

  it('Finish unload lists units and lots added at pack-out on their own that are still out (#185)', () => {
    const at = (asset_id: string, status: string, quantity: number, minute: number) =>
      ({ gig_id: 'gig-1', kit_id: null, asset_id, status, quantity, scanned_at: `2026-10-10T10:0${minute}:00.000Z`, scanned_by: 'u' })
    const packingList = { top_level_kit_ids: [], kits: [], tracking: [at('lot-1', 'Checked Out', 6, 0), at('u9', 'On Site', 1, 1), at('u8', 'In Warehouse', 1, 2)] }
    expect(inventoryTrackingService.getStillOut(packingList)).toEqual([
      { kit_id: null, asset_id: 'u9', quantity: 1 },
      { kit_id: null, asset_id: 'lot-1', quantity: 6 },
    ])
  })

  // #186 step 3: Send to Maintenance from the phone. The send goes with this gig; the database
  // decides whether it's only flagged (still out) or goes in now (home). The cached list follows
  // the same rule so the row's mark shows offline.
  describe('maintenance from the phone', () => {
    const lot = { id: 'lot-1', manufacturer_model: 'XLR Cable', quantity: 10, status: 'Active' }
    const unit = { id: 'u-1', manufacturer_model: 'QSC K12.2', tag_number: 'DSL-1', quantity: 1, status: 'Inactive' }
    const cached = (tracking: any[] = [], over: Record<string, unknown> = {}) => ({
      gig_id: 'gig-1',
      kits: [{ kit: { id: 'kit-1', name: 'Case', assets: [{ asset_id: 'lot-1', quantity: 4, asset: { ...lot } }, { asset_id: 'u-1', quantity: 1, asset: { ...unit } }] } }],
      tracking,
      ...over,
    })
    const row = (asset_id: string, status: string, quantity = 1) =>
      ({ gig_id: 'gig-1', kit_id: 'kit-1', asset_id, status, quantity, scanned_at: '2026-10-22T10:00:00.000Z', scanned_by: 'u' })
    const saved = () => vi.mocked(idbStore.putPackingList).mock.calls.at(-1)?.[1] as any
    const assetIn = (list: any, id: string) => list.kits[0].kit.assets.find((a: any) => a.asset_id === id).asset

    it('queues MAINTENANCE_SEND with this gig and the details', async () => {
      vi.mocked(idbStore.getPackingList).mockResolvedValue(cached([row('lot-1', 'On Site', 4)]))
      await inventoryTrackingService.sendToMaintenance({
        gigId: 'gig-1', assetId: 'lot-1', quantity: 2, notes: 'Frayed', location: 'Repair Bench', expectedBack: '2026-11-03',
      })
      expect(offlineSyncService.queueTrackingUpdate).toHaveBeenCalledWith({
        asset_id: 'lot-1', quantity: 2, notes: 'Frayed', location: 'Repair Bench', expected_back: '2026-11-03', gig_id: 'gig-1',
      }, 'MAINTENANCE_SEND')
    })

    it('a lot out here is only flagged in the cached list, and adding more adds to the flag', async () => {
      vi.mocked(idbStore.getPackingList).mockResolvedValue(cached([row('lot-1', 'On Site', 4)]))
      await inventoryTrackingService.sendToMaintenance({ gigId: 'gig-1', assetId: 'lot-1', quantity: 2, location: 'Bench' })
      expect(assetIn(saved(), 'lot-1')).toMatchObject({
        status: 'Active', maintenance_pending: true, maintenance_pending_quantity: 2, maintenance_pending_gig_id: 'gig-1', maintenance_location: 'Bench',
      })
      vi.mocked(idbStore.getPackingList).mockResolvedValue(saved())
      await inventoryTrackingService.sendToMaintenance({ gigId: 'gig-1', assetId: 'lot-1', quantity: 9 })
      expect(assetIn(saved(), 'lot-1')).toMatchObject({ maintenance_pending: true, maintenance_pending_quantity: null, maintenance_location: 'Bench' })
    })

    it('a unit home goes into Maintenance at once in the cached list, keeping the status it had', async () => {
      vi.mocked(idbStore.getPackingList).mockResolvedValue(cached())
      await inventoryTrackingService.sendToMaintenance({ gigId: 'gig-1', assetId: 'u-1', quantity: 1 })
      expect(assetIn(saved(), 'u-1')).toMatchObject({ status: 'Maintenance', status_before_maintenance: 'Inactive', maintenance_pending: false })
    })

    it('a unit out at another gig is only flagged', async () => {
      vi.mocked(idbStore.getPackingList).mockResolvedValue(cached([], { elsewhere: { 'u-1': { gig_id: 'gig-2', gig_title: 'Fri', status: 'On Site' } } }))
      await inventoryTrackingService.sendToMaintenance({ gigId: 'gig-1', assetId: 'u-1', quantity: 1 })
      expect(assetIn(saved(), 'u-1')).toMatchObject({ status: 'Inactive', maintenance_pending: true })
    })

    it('part of a lot that is home splits off: the cached lot is smaller', async () => {
      vi.mocked(idbStore.getPackingList).mockResolvedValue(cached())
      await inventoryTrackingService.sendToMaintenance({ gigId: 'gig-1', assetId: 'lot-1', quantity: 3 })
      expect(assetIn(saved(), 'lot-1')).toMatchObject({ status: 'Active', quantity: 7, maintenance_pending: false })
    })

    it('returnFromMaintenance queues MAINTENANCE_RETURN and restores the cached record', async () => {
      vi.mocked(idbStore.getPackingList).mockResolvedValue(cached())
      await inventoryTrackingService.sendToMaintenance({ gigId: 'gig-1', assetId: 'u-1', quantity: 1 })
      vi.mocked(idbStore.getPackingList).mockResolvedValue(saved())
      await inventoryTrackingService.returnFromMaintenance({ gigId: 'gig-1', assetId: 'u-1' })
      expect(offlineSyncService.queueTrackingUpdate).toHaveBeenLastCalledWith({ asset_id: 'u-1' }, 'MAINTENANCE_RETURN')
      expect(assetIn(saved(), 'u-1')).toMatchObject({ status: 'Inactive', maintenance_pending: false, maintenance_location: null })
    })

    it('returnFromMaintenance on a flagged record clears the flag', async () => {
      vi.mocked(idbStore.getPackingList).mockResolvedValue(cached([row('lot-1', 'On Site', 4)]))
      await inventoryTrackingService.sendToMaintenance({ gigId: 'gig-1', assetId: 'lot-1', quantity: 2 })
      vi.mocked(idbStore.getPackingList).mockResolvedValue(saved())
      await inventoryTrackingService.returnFromMaintenance({ gigId: 'gig-1', assetId: 'lot-1' })
      expect(assetIn(saved(), 'lot-1')).toMatchObject({ status: 'Active', maintenance_pending: false, maintenance_pending_quantity: null })
    })

    it('updateMaintenanceDetails queues MAINTENANCE_UPDATE', async () => {
      vi.mocked(idbStore.getPackingList).mockResolvedValue(cached())
      await inventoryTrackingService.updateMaintenanceDetails({ gigId: 'gig-1', assetId: 'u-1', notes: 'x', location: 'Shop', expectedBack: null })
      expect(offlineSyncService.queueTrackingUpdate).toHaveBeenCalledWith(
        { asset_id: 'u-1', notes: 'x', location: 'Shop', expected_back: null }, 'MAINTENANCE_UPDATE')
      expect(assetIn(saved(), 'u-1')).toMatchObject({ maintenance_location: 'Shop' })
    })

    it('lotHomeNow: the pieces home, as fetched, less what this gig took since', () => {
      const list = cached([row('lot-1', 'Checked Out', 5)], { lot_places: { 'lot-1': { at_home: 7, at_gig: 3 } } })
      expect(inventoryTrackingService.lotHomeNow(list, 'lot-1', 'gig-1')).toBe(5)
      expect(inventoryTrackingService.lotHomeNow(cached(), 'lot-1', 'gig-1')).toBeNull()
    })
  })
})
