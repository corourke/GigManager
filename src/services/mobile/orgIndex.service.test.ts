import { beforeEach, describe, expect, it, vi } from 'vitest'

// #185 PR 2: the organization's kits and equipment, cached on the device, so a scan or a
// search can find anything the org owns, offline too.
const store = vi.hoisted(() => ({ index: null as any }))
vi.mock('../../utils/idb/store', () => ({
  idbStore: {
    getOrgIndex: vi.fn(async () => store.index),
    putOrgIndex: vi.fn(async (v: any) => { store.index = v }),
  },
}))

const tables = vi.hoisted(() => ({ data: {} as Record<string, any[]> }))
vi.mock('../../utils/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => {
      const rows = () => tables.data[table] ?? []
      const chain: any = {
        select: () => chain, eq: () => chain, order: () => chain,
        range: (from: number, to: number) => Promise.resolve({ data: rows().slice(from, to + 1), error: null }),
        then: (resolve: any, reject: any) => Promise.resolve({ data: rows(), error: null }).then(resolve, reject),
      }
      return chain
    },
  }),
}))

import { orgIndexService } from './orgIndex.service'

const index = {
  org_id: 'org-1',
  kits: [
    { id: 'kit-1', name: 'Drum Mic Kit', tag_number: 'KIT-7', is_container: false },
    { id: 'case-1', name: 'Mic Case', tag_number: 'CASE-1', is_container: true },
  ],
  records: [
    { id: 'u1', tag_number: 'MIC-1', serial_number: null, quantity: 1, status: 'Active', equipment_item_id: 'item-sm57', item_name: 'SM57' },
    { id: 'u2', tag_number: 'MIC-2', serial_number: null, quantity: 1, status: 'Maintenance', equipment_item_id: 'item-sm57', item_name: 'SM57' },
    { id: 'lot-1', tag_number: null, serial_number: null, quantity: 20, status: 'Active', equipment_item_id: 'item-xlr', item_name: 'XLR Cable, 25 ft' },
    { id: 'tagged-lot', tag_number: 'BOX-9', serial_number: null, quantity: 10, status: 'Active', equipment_item_id: 'item-xlr', item_name: 'XLR Cable, 25 ft' },
  ],
}

describe('orgIndexService', () => {
  beforeEach(() => { store.index = null; tables.data = {} })

  it('finds a kit, a unit or a tagged lot by its tag', () => {
    expect(orgIndexService.findTag(index, ' KIT-7 ')).toEqual({ type: 'kit', kit: index.kits[0] })
    expect(orgIndexService.findTag(index, 'CASE-1')).toEqual({ type: 'kit', kit: index.kits[1] })
    expect(orgIndexService.findTag(index, 'MIC-2')).toEqual({ type: 'record', record: index.records[1] })
    expect(orgIndexService.findTag(index, 'BOX-9')).toEqual({ type: 'record', record: index.records[3] })
    expect(orgIndexService.findTag(index, 'NOPE')).toBeNull()
  })

  it('searches kits and items by name, each item with its units and lots', () => {
    const r = orgIndexService.search(index, 'mic')
    expect(r.kits.map((k) => k.name)).toEqual(['Drum Mic Kit', 'Mic Case'])
    expect(orgIndexService.search(index, 'xlr').items).toEqual([
      { item_id: 'item-xlr', name: 'XLR Cable, 25 ft', records: [index.records[2], index.records[3]] },
    ])
    expect(orgIndexService.search(index, 'sm5').items.map((i) => i.records.length)).toEqual([2])
    expect(orgIndexService.search(index, ' ')).toEqual({ kits: [], items: [] })
  })

  it('refresh caches the org\'s kits and its records still in service, paged', async () => {
    tables.data = {
      kits: [{ id: 'kit-1', name: 'Drum Mic Kit', tag_number: 'KIT-7', is_container: false }],
      assets: [
        { id: 'u1', tag_number: 'MIC-1', serial_number: null, quantity: 1, status: 'Active', retired_on: null, equipment_item_id: 'item-sm57', item: { manufacturer_model: 'SM57' } },
        { id: 'gone', tag_number: 'OLD-1', serial_number: null, quantity: 1, status: 'Disposed', retired_on: '2025-01-01', equipment_item_id: 'item-sm57', item: { manufacturer_model: 'SM57' } },
      ],
    }
    const result = await orgIndexService.refresh('org-1')
    expect(result.records.map((r) => r.id)).toEqual(['u1'])
    expect(result.records[0].item_name).toBe('SM57')
    expect(await orgIndexService.get('org-1')).toEqual(result)
  })
})
