import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PACKING_COLUMNS, loadPackingColumns, PACKING_COLUMNS_KEY, savePackingColumns } from './packingColumns'

// #245 (Cameron, 10-11): the packing list's Columns choice is remembered per browser.
describe('packing list columns, remembered per browser', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('starts with every column when nothing is saved', () => {
    expect(loadPackingColumns()).toEqual(new Set(DEFAULT_PACKING_COLUMNS))
  })

  it('remembers a saved choice, an empty one included', () => {
    savePackingColumns(new Set(['status', 'notes']))
    expect(loadPackingColumns()).toEqual(new Set(['status', 'notes']))
    savePackingColumns(new Set())
    expect(loadPackingColumns()).toEqual(new Set())
  })

  it('falls back to the defaults on anything it can\'t read, and ignores unknown columns', () => {
    localStorage.setItem(PACKING_COLUMNS_KEY, '{not json')
    expect(loadPackingColumns()).toEqual(new Set(DEFAULT_PACKING_COLUMNS))
    localStorage.setItem(PACKING_COLUMNS_KEY, JSON.stringify({ status: true }))
    expect(loadPackingColumns()).toEqual(new Set(DEFAULT_PACKING_COLUMNS))
    localStorage.setItem(PACKING_COLUMNS_KEY, JSON.stringify(['status', 'bogus']))
    expect(loadPackingColumns()).toEqual(new Set(['status']))
  })

  it('never throws when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(loadPackingColumns()).toEqual(new Set(DEFAULT_PACKING_COLUMNS))
    expect(() => savePackingColumns(new Set(['status']))).not.toThrow()
  })
})
