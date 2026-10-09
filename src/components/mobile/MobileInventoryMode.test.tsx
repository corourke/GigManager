import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format } from 'date-fns'
import MobileInventoryMode from './MobileInventoryMode'
import { SCANNING_MODES } from '../../config/inventoryWorkflow'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    selectedOrganization: { id: 'org-1' },
  }),
}))

vi.mock('../../utils/idb/store', () => ({
  idbStore: {
    getPackingList: vi.fn(),
    getGigs: vi.fn(),
    putPackingList: vi.fn(),
  },
}))

vi.mock('../../services/mobile/packingList.service', () => ({
  packingListService: {
    fetchGigPackingList: vi.fn(),
  },
}))

// The pure helpers (latest record, cascade, "any" slots, progress) are the real ones; only
// the writes are mocked.
vi.mock('../../services/mobile/inventoryTracking.service', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
  inventoryTrackingService: {
    ...actual.inventoryTrackingService,
    matchTag: vi.fn(),
    submitScan: vi.fn(),
    clearTracking: vi.fn(),
    updateLatestNote: vi.fn(),
    updateAssetStatus: vi.fn(),
  },
  }
})

let scannerProps: any = null
vi.mock('./MobileBarcodeScanner', () => ({
  MobileBarcodeScanner: (props: any) => { scannerProps = props; return null },
}))

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}))

import { idbStore } from '../../utils/idb/store'
import { inventoryTrackingService } from '../../services/mobile/inventoryTracking.service'
import { act } from '@testing-library/react'

describe('MobileInventoryMode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    })

    vi.mocked(idbStore.getGigs).mockResolvedValue([
      { id: 'gig-1', title: 'Warehouse Check-In' },
    ])
    vi.mocked(idbStore.getPackingList).mockImplementation(async () => ({
      gig_id: 'gig-1',
      gig_title: 'Warehouse Check-In',
      kits: [
        {
          kit: {
            id: 'kit-1',
            name: 'Audio Case',
            tag_number: 'KIT-001',
            is_container: false,
            assets: [
              {
                asset_id: 'asset-1',
                quantity: 1,
                asset: {
                  id: 'asset-1',
                  manufacturer_model: 'Shure QLXD',
                  tag_number: 'ASSET-001',
                  status: 'Maintenance',
                },
              },
            ],
          },
        },
      ],
      tracking: [
        {
          gig_id: 'gig-1',
          kit_id: 'kit-1',
          asset_id: null,
          status: 'In Warehouse',
          notes: 'Kit note only',
          scanned_at: '2026-03-09T10:00:00.000Z',
          scanned_by: 'user-1',
          scanned_by_user: {
            id: 'user-1',
            first_name: 'Alex',
            last_name: 'Crew',
          },
        },
        {
          gig_id: 'gig-1',
          kit_id: 'kit-1',
          asset_id: 'asset-1',
          status: 'In Warehouse',
          notes: null,
          scanned_at: '2026-03-09T10:00:00.000Z',
          scanned_by: 'user-1',
          scanned_by_user: {
            id: 'user-1',
            first_name: 'Alex',
            last_name: 'Crew',
          },
        },
      ],
    }))
  })

  it('shows non-container assets expanded by default and keeps kit notes from appearing on nested assets', async () => {
    const user = userEvent.setup()

    render(<MobileInventoryMode gigId="gig-1" onSelectGig={vi.fn()} />)

    expect(await screen.findByText('Audio Case')).toBeInTheDocument()
    expect(await screen.findByText('Shure QLXD')).toBeInTheDocument()
    expect(screen.getByText(/note: kit note only/i)).toBeInTheDocument()
    expect(screen.queryByText(/^Note: Kit note only$/i, { selector: 'p' })).toBeInTheDocument()
    expect(screen.queryByText(/note: kit note only/i)).toBeInTheDocument()
    expect(screen.queryAllByText(/note: kit note only/i)).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: /edit note for shure qlxd/i }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/notes on item condition/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/maintenance req'd/i)).toBeChecked()
    expect(screen.getByText(format(new Date('2026-03-09T10:00:00.000Z'), 'MMM d, yyyy h:mm a'))).toBeInTheDocument()
    expect(screen.getByText('Alex Crew')).toBeInTheDocument()
  })

  it('initializes location input from the first scanning mode locationLabel', async () => {
    render(<MobileInventoryMode gigId="gig-1" onSelectGig={vi.fn()} />)

    await screen.findByText('Audio Case')

    const locationInput = screen.getByLabelText(/current location/i)
    expect(locationInput).toHaveValue(SCANNING_MODES[0].locationLabel)
  })

  it('updates location input when switching modes if value was not customized', async () => {
    const user = userEvent.setup()

    render(<MobileInventoryMode gigId="gig-1" onSelectGig={vi.fn()} />)

    await screen.findByText('Audio Case')

    const locationInput = screen.getByLabelText(/current location/i)
    expect(locationInput).toHaveValue(SCANNING_MODES[0].locationLabel)

    const secondMode = SCANNING_MODES[1]
    await user.click(screen.getByRole('button', { name: secondMode.label }))

    expect(locationInput).toHaveValue(secondMode.locationLabel)
  })

  it('renders a nested sub-kit as its own row instead of a flat sibling card, without duplicating its assets into the parent', async () => {
    // Full Rack (not a container) directly contains Cable Snake and also
    // nests Mic Case (a container), which contains its own SM58.
    vi.mocked(idbStore.getPackingList).mockImplementation(async () => ({
      gig_id: 'gig-1',
      gig_title: 'Warehouse Check-In',
      top_level_kit_ids: ['kit-1'],
      hierarchy_edges: [{ parent_kit_id: 'kit-1', child_kit_id: 'kit-2' }],
      kits: [
        {
          kit_id: 'kit-1',
          kit: {
            id: 'kit-1',
            name: 'Full Rack',
            tag_number: 'KIT-001',
            is_container: false,
            direct_assets: [
              { asset_id: 'asset-snake', quantity: 1, asset: { id: 'asset-snake', manufacturer_model: 'Cable Snake', tag_number: 'SNAKE-1' } },
            ],
            assets: [
              { asset_id: 'asset-snake', quantity: 1, asset: { id: 'asset-snake', manufacturer_model: 'Cable Snake', tag_number: 'SNAKE-1' } },
              { asset_id: 'asset-mic', quantity: 1, asset: { id: 'asset-mic', manufacturer_model: 'SM58', tag_number: 'MIC-1' } },
            ],
          },
        },
        {
          kit_id: 'kit-2',
          kit: {
            id: 'kit-2',
            name: 'Mic Case',
            tag_number: 'KIT-002',
            is_container: true,
            direct_assets: [
              { asset_id: 'asset-mic', quantity: 1, asset: { id: 'asset-mic', manufacturer_model: 'SM58', tag_number: 'MIC-1' } },
            ],
            assets: [
              { asset_id: 'asset-mic', quantity: 1, asset: { id: 'asset-mic', manufacturer_model: 'SM58', tag_number: 'MIC-1' } },
            ],
          },
        },
      ],
      tracking: [],
    }))

    render(<MobileInventoryMode gigId="gig-1" onSelectGig={vi.fn()} />)

    expect(await screen.findByText('Full Rack')).toBeInTheDocument()
    expect(await screen.findByText('Mic Case')).toBeInTheDocument()

    // Full Rack (non-container) defaults to expanded — its own direct
    // asset shows, but Mic Case's SM58 doesn't show here (it belongs to
    // Mic Case's own row, not folded into Full Rack's list).
    expect(await screen.findByText('Cable Snake')).toBeInTheDocument()
    expect(screen.queryByText('SM58')).not.toBeInTheDocument()

    // Mic Case is a container, so it defaults to collapsed and doesn't get
    // descended into any further — but it's still there as its own kit row.
    expect(screen.getByText('Mic Case').closest('div')).toBeTruthy()
  })

  it('counts progress in pieces, once each, however the kits nest (#185)', async () => {
    // Rack holds 10 cables and nests Mic Case (2 mics); Mic Case is also on the list as its
    // own entry. 10 + the case + 2 mics = 13 pieces, 7 cables out so far.
    vi.mocked(idbStore.getPackingList).mockImplementation(async () => ({
      gig_id: 'gig-1',
      gig_title: 'Warehouse Check-In',
      top_level_kit_ids: ['rack'],
      hierarchy_edges: [{ parent_kit_id: 'rack', child_kit_id: 'case', quantity: 1 }],
      kits: [
        { kit_id: 'rack', kit: { id: 'rack', name: 'Rack', is_container: false,
          direct_assets: [{ asset_id: 'xlr', quantity: 10, asset: { id: 'xlr', manufacturer_model: 'XLR' } }],
          assets: [{ asset_id: 'xlr', quantity: 10 }, { asset_id: 'mic', quantity: 2 }] } },
        { kit_id: 'case', kit: { id: 'case', name: 'Mic Case', tag_number: 'C-1', is_container: true,
          assets: [{ asset_id: 'mic', quantity: 2, asset: { id: 'mic', manufacturer_model: 'SM58' } }] } },
      ],
      tracking: [{ gig_id: 'gig-1', kit_id: 'rack', asset_id: 'xlr', status: SCANNING_MODES[0].resultingStatus, quantity: 7, scanned_at: '2026-10-09T10:00:00.000Z', scanned_by: 'user-1' }],
    }))

    render(<MobileInventoryMode gigId="gig-1" onSelectGig={vi.fn()} />)

    expect(await screen.findByText('7 / 13 pieces')).toBeInTheDocument()
  })

  // #185: an "any" line is N of an item, filled from its lots (most at home first) or by
  // scanning a tagged unit of it.
  describe('"any" lines', () => {
    const PACK_OUT = SCANNING_MODES[0].resultingStatus
    const withAnyLine = (tracking: any[] = []) => ({
      gig_id: 'gig-1',
      gig_title: 'Warehouse Check-In',
      top_level_kit_ids: ['top'],
      hierarchy_edges: [],
      kits: [{ kit_id: 'top', kit: { id: 'top', name: 'Stage Box', is_container: false,
        direct_assets: [{ asset_id: 'xlr', quantity: 10, asset: { id: 'xlr', manufacturer_model: 'XLR' } }],
        assets: [{ asset_id: 'xlr', quantity: 10 }],
        any_lines: [{ item_id: 'item-di', item_name: 'DI box', quantity: 3 }] } }],
      item_records: { 'item-di': [
        { id: 'lot-a', quantity: 2, at_home: 2, at_gig: 0 },
        { id: 'lot-b', quantity: 5, at_home: 5, at_gig: 0 },
        { id: 'di-7', tag_number: 'DI-7', quantity: 1, at_home: 1, at_gig: 0 },
      ] },
      tracking,
    })
    const out = (asset_id: string, quantity: number) =>
      ({ id: `t-${asset_id}`, gig_id: 'gig-1', kit_id: 'top', asset_id, status: PACK_OUT, quantity, scanned_at: '2026-10-09T10:00:00.000Z', scanned_by: 'user-1' })

    it('shows the line with how many are packed, and the kit\'s count in pieces', async () => {
      vi.mocked(idbStore.getPackingList).mockImplementation(async () => withAnyLine([out('di-7', 1)]))
      render(<MobileInventoryMode gigId="gig-1" onSelectGig={vi.fn()} />)
      expect(await screen.findByText('DI box')).toBeInTheDocument()
      expect(screen.getByText('Any · 1 / 3')).toBeInTheDocument()
      expect(screen.getByText(`1 / 13 pieces ${PACK_OUT}`)).toBeInTheDocument()
    })

    it('checking it packs from the lot with the most at home, with no "which lot?" prompt', async () => {
      vi.mocked(idbStore.getPackingList).mockImplementation(async () => withAnyLine())
      const user = userEvent.setup()
      render(<MobileInventoryMode gigId="gig-1" onSelectGig={vi.fn()} />)
      await user.click(await screen.findByRole('button', { name: 'Check DI box' }))
      expect(inventoryTrackingService.submitScan).toHaveBeenCalledTimes(1)
      expect(inventoryTrackingService.submitScan).toHaveBeenCalledWith(expect.objectContaining({ kitId: 'top', assetId: 'lot-b', quantity: 3, status: PACK_OUT }))
    })

    it('un-checking a full line deletes the rows that filled it', async () => {
      vi.mocked(idbStore.getPackingList).mockImplementation(async () => withAnyLine([out('lot-b', 2), out('di-7', 1)]))
      const user = userEvent.setup()
      render(<MobileInventoryMode gigId="gig-1" onSelectGig={vi.fn()} />)
      await user.click(await screen.findByRole('button', { name: 'Uncheck DI box' }))
      expect(vi.mocked(inventoryTrackingService.clearTracking).mock.calls.map((c: any) => c[0])).toEqual([
        { gigId: 'gig-1', kitId: 'top', assetId: 'lot-b' },
        { gigId: 'gig-1', kitId: 'top', assetId: 'di-7' },
      ])
      expect(inventoryTrackingService.submitScan).not.toHaveBeenCalled()
    })

    it('scanning a tagged unit of the item fills a slot under its kit', async () => {
      vi.mocked(idbStore.getPackingList).mockImplementation(async () => withAnyLine())
      render(<MobileInventoryMode gigId="gig-1" onSelectGig={vi.fn()} />)
      await screen.findByText('DI box')
      await act(async () => { await scannerProps.onScan('DI-7') })
      expect(inventoryTrackingService.submitScan).toHaveBeenCalledWith(expect.objectContaining({ kitId: 'top', assetId: 'di-7', status: PACK_OUT }))
    })
  })

  it('preserves customized location when switching modes', async () => {
    const user = userEvent.setup()

    render(<MobileInventoryMode gigId="gig-1" onSelectGig={vi.fn()} />)

    await screen.findByText('Audio Case')

    const locationInput = screen.getByLabelText(/current location/i)
    await user.clear(locationInput)
    await user.type(locationInput, 'Truck 3 - North Dock')

    const secondMode = SCANNING_MODES[1]
    await user.click(screen.getByRole('button', { name: secondMode.label }))

    expect(locationInput).toHaveValue('Truck 3 - North Dock')
  })
})
