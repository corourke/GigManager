import { beforeEach, describe, expect, it, vi } from 'vitest'

// vi.hoisted ensures these exist before vi.mock factory runs,
// which is important because offlineSync.service calls createClient()
// at module scope (not inside a function).
const mockFrom = vi.hoisted(() => vi.fn())
const mockRpc = vi.hoisted(() => vi.fn())

vi.mock('../../utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}))

vi.mock('../../utils/idb/store', () => ({
  idbStore: {
    getOutbox: vi.fn().mockResolvedValue([]),
    addToOutbox: vi.fn().mockResolvedValue(1),
    removeFromOutbox: vi.fn().mockResolvedValue(undefined),
    updateOutboxItem: vi.fn().mockResolvedValue(undefined),
  },
}))

import { offlineSyncService } from './offlineSync.service'
import type { OutboxItem } from '../../utils/idb/store'

// Build a chainable query builder that resolves to `result` when awaited.
// Intermediate methods (select, insert, delete, etc.) return `this`.
// Terminal methods (maybeSingle) return a Promise.
// The chain itself is thenable so `await chain` works directly.
function makeChain(result: { data: any; error: any }) {
  const chain: any = {}
  const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'is', 'order', 'limit']
  chainMethods.forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)
  return chain
}

function outboxItem(type: OutboxItem['type'], payload: any): OutboxItem {
  return { type, payload, timestamp: Date.now(), attempts: 0 }
}

describe('offlineSyncService — INVENTORY_SCAN handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts all required fields to inventory_tracking', async () => {
    const chain = makeChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await offlineSyncService.syncItem(outboxItem('INVENTORY_SCAN', {
      organization_id: 'org-1',
      gig_id: 'gig-1',
      kit_id: 'kit-1',
      asset_id: 'asset-1',
      status: 'In Warehouse',
      scanned_at: '2026-03-15T12:00:00Z',
      scanned_by: 'user-1',
      notes: 'test note',
    }))

    expect(mockFrom).toHaveBeenCalledWith('inventory_tracking')
    expect(chain.insert).toHaveBeenCalledWith({
      organization_id: 'org-1',
      gig_id: 'gig-1',
      kit_id: 'kit-1',
      asset_id: 'asset-1',
      status: 'In Warehouse',
      scanned_at: '2026-03-15T12:00:00Z',
      scanned_by: 'user-1',
      notes: 'test note',
      location: null,
      quantity: 1,
    })
  })

  it('records how many pieces the scan says (#185: quantity is state)', async () => {
    const chain = makeChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)
    await offlineSyncService.syncItem(outboxItem('INVENTORY_SCAN', {
      organization_id: 'org-1', gig_id: 'gig-1', kit_id: 'kit-1', asset_id: 'cables', status: 'Checked Out',
      scanned_at: '2026-10-09T10:00:00Z', scanned_by: 'user-1', quantity: 7,
    }))
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ asset_id: 'cables', quantity: 7 }))
  })

  it('coerces absent asset_id to null', async () => {
    const chain = makeChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await offlineSyncService.syncItem(outboxItem('INVENTORY_SCAN', {
      organization_id: 'org-1',
      gig_id: 'gig-1',
      kit_id: 'kit-1',
      // no asset_id
      status: 'In Warehouse',
      scanned_at: '2026-03-15T12:00:00Z',
      scanned_by: 'user-1',
    }))

    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ asset_id: null }))
  })

  it('coerces absent notes to null', async () => {
    const chain = makeChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await offlineSyncService.syncItem(outboxItem('INVENTORY_SCAN', {
      organization_id: 'org-1',
      gig_id: 'gig-1',
      kit_id: 'kit-1',
      asset_id: 'asset-1',
      status: 'In Warehouse',
      scanned_at: '2026-03-15T12:00:00Z',
      scanned_by: 'user-1',
      // no notes
    }))

    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ notes: null }))
  })

  it('throws when Supabase insert returns an error', async () => {
    const chain = makeChain({ data: null, error: { message: 'insert failed' } })
    mockFrom.mockReturnValue(chain)

    await expect(
      offlineSyncService.syncItem(outboxItem('INVENTORY_SCAN', {
        organization_id: 'org-1',
        gig_id: 'gig-1',
        kit_id: 'kit-1',
        asset_id: null,
        status: 'In Warehouse',
        scanned_at: '2026-03-15T12:00:00Z',
        scanned_by: 'user-1',
        notes: null,
      }))
    ).rejects.toEqual({ message: 'insert failed' })
  })
})

describe('offlineSyncService — INVENTORY_CLEAR handler (by record_id)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes the specific row by record_id without querying for latest', async () => {
    const chain = makeChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await offlineSyncService.syncItem(outboxItem('INVENTORY_CLEAR', {
      record_id: 'rec-42',
      gig_id: 'gig-1',
      kit_id: 'kit-1',
    }))

    // Exactly one from() call (just the delete; no query-latest round-trip)
    expect(mockFrom).toHaveBeenCalledTimes(1)
    expect(mockFrom).toHaveBeenCalledWith('inventory_tracking')
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'rec-42')
  })

  it('throws when Supabase delete returns an error', async () => {
    const chain = makeChain({ data: null, error: { message: 'delete failed' } })
    mockFrom.mockReturnValue(chain)

    await expect(
      offlineSyncService.syncItem(outboxItem('INVENTORY_CLEAR', {
        record_id: 'rec-42',
        gig_id: 'gig-1',
        kit_id: 'kit-1',
      }))
    ).rejects.toEqual({ message: 'delete failed' })
  })
})

describe('offlineSyncService — INVENTORY_CLEAR handler (bulk, no record_id)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queries for latest tracking row then deletes it by id', async () => {
    const queryChain = makeChain({ data: { id: 'rec-latest' }, error: null })
    const deleteChain = makeChain({ data: null, error: null })
    mockFrom.mockReturnValueOnce(queryChain).mockReturnValueOnce(deleteChain)

    await offlineSyncService.syncItem(outboxItem('INVENTORY_CLEAR', {
      gig_id: 'gig-1',
      kit_id: 'kit-1',
    }))

    expect(mockFrom).toHaveBeenCalledTimes(2)
    expect(deleteChain.delete).toHaveBeenCalled()
    expect(deleteChain.eq).toHaveBeenCalledWith('id', 'rec-latest')
  })

  it('applies asset_id filter when asset_id is present in payload', async () => {
    const queryChain = makeChain({ data: { id: 'rec-asset' }, error: null })
    const deleteChain = makeChain({ data: null, error: null })
    mockFrom.mockReturnValueOnce(queryChain).mockReturnValueOnce(deleteChain)

    await offlineSyncService.syncItem(outboxItem('INVENTORY_CLEAR', {
      gig_id: 'gig-1',
      kit_id: 'kit-1',
      asset_id: 'asset-1',
    }))

    expect(queryChain.eq).toHaveBeenCalledWith('asset_id', 'asset-1')
  })

  it('applies IS NULL filter when asset_id is absent from payload', async () => {
    const queryChain = makeChain({ data: null, error: null })
    mockFrom.mockReturnValue(queryChain)

    await offlineSyncService.syncItem(outboxItem('INVENTORY_CLEAR', {
      gig_id: 'gig-1',
      kit_id: 'kit-1',
      // no asset_id
    }))

    expect(queryChain.is).toHaveBeenCalledWith('asset_id', null)
  })

  it('returns early without deleting when no latest record exists', async () => {
    const queryChain = makeChain({ data: null, error: null })
    mockFrom.mockReturnValue(queryChain)

    await offlineSyncService.syncItem(outboxItem('INVENTORY_CLEAR', {
      gig_id: 'gig-1',
      kit_id: 'kit-1',
    }))

    // Only the query call; no delete call
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('throws when the query for latest returns an error', async () => {
    const queryChain = makeChain({ data: null, error: { message: 'query failed' } })
    mockFrom.mockReturnValue(queryChain)

    await expect(
      offlineSyncService.syncItem(outboxItem('INVENTORY_CLEAR', {
        gig_id: 'gig-1',
        kit_id: 'kit-1',
      }))
    ).rejects.toEqual({ message: 'query failed' })
  })
})

// #239 review: a status change the database refuses (e.g. Staff bringing back Disposed or
// written-off equipment) won't succeed on a retry. It's dropped with a message, not retried silently.
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }))

describe('offlineSyncService — ASSET_STATUS_UPDATE refused', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('drops a refused status change and says why', async () => {
    const { idbStore } = await import('../../utils/idb/store')
    const { toast } = await import('sonner')
    const item = { ...outboxItem('ASSET_STATUS_UPDATE', { asset_id: 'a1', status: 'Active' }), id: 7 }
    vi.mocked(idbStore.getOutbox).mockResolvedValueOnce([item])
    mockRpc.mockResolvedValue({ error: { code: '42501', message: 'This equipment was written off as missing. Undo the write-off to bring it back.' } })

    await offlineSyncService.processOutbox()

    expect(idbStore.removeFromOutbox).toHaveBeenCalledWith(7)
    expect(idbStore.updateOutboxItem).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('written off as missing'))
  })

  it('a network failure is still retried', async () => {
    const { idbStore } = await import('../../utils/idb/store')
    const item = { ...outboxItem('ASSET_STATUS_UPDATE', { asset_id: 'a1', status: 'Maintenance' }), id: 8 }
    vi.mocked(idbStore.getOutbox).mockResolvedValueOnce([item])
    mockRpc.mockResolvedValue({ error: { message: 'Failed to fetch' } })

    await offlineSyncService.processOutbox()

    expect(idbStore.removeFromOutbox).not.toHaveBeenCalled()
    expect(idbStore.updateOutboxItem).toHaveBeenCalled()
  })
})

describe('offlineSyncService: kits added at pack-out (#185)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('KIT_ASSIGNMENT_ADD inserts a flagged assignment; one already there counts as done', async () => {
    const chain = makeChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)
    const payload = { organization_id: 'org-1', gig_id: 'gig-1', kit_id: 'case-1', assigned_by: 'user-1', added_at_pack_out: true }
    await offlineSyncService.syncItem(outboxItem('KIT_ASSIGNMENT_ADD', payload))
    expect(mockFrom).toHaveBeenCalledWith('gig_kit_assignments')
    expect(chain.insert).toHaveBeenCalledWith(payload)

    mockFrom.mockReturnValue(makeChain({ data: null, error: { code: '23505', message: 'duplicate key' } }))
    await expect(offlineSyncService.syncItem(outboxItem('KIT_ASSIGNMENT_ADD', payload))).resolves.toBeUndefined()
  })

  it('KIT_ASSIGNMENT_REMOVE deletes only the adder\'s own pack-out addition', async () => {
    const chain = makeChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)
    await offlineSyncService.syncItem(outboxItem('KIT_ASSIGNMENT_REMOVE', { gig_id: 'gig-1', kit_id: 'case-1', assigned_by: 'user-1' }))
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq.mock.calls).toEqual([['gig_id', 'gig-1'], ['kit_id', 'case-1'], ['added_at_pack_out', true], ['assigned_by', 'user-1']])
  })

  it('a refused add is dropped with a message, not retried', async () => {
    const { idbStore } = await import('../../utils/idb/store')
    const { toast } = await import('sonner')
    const item = { ...outboxItem('KIT_ASSIGNMENT_ADD', { gig_id: 'gig-1', kit_id: 'k' }), id: 9 }
    vi.mocked(idbStore.getOutbox).mockResolvedValueOnce([item])
    mockFrom.mockReturnValue(makeChain({ data: null, error: { code: '42501', message: 'new row violates row-level security policy' } }))
    await offlineSyncService.processOutbox()
    expect(idbStore.removeFromOutbox).toHaveBeenCalledWith(9)
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Kit not added'))
  })
})
