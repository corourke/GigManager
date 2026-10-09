import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format } from 'date-fns'
import MobileInventoryMode from './MobileInventoryMode'
import { SCANNING_MODES } from '../../config/inventoryWorkflow'

const auth = vi.hoisted(() => ({ role: 'Admin' as string | undefined }))
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    selectedOrganization: { id: 'org-1' },
    userRole: auth.role,
  }),
}))

vi.mock('../../services/writeOff.service', () => ({
  writeOffPieces: vi.fn().mockResolvedValue('split-1'),
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
import { writeOffPieces } from '../../services/writeOff.service'
import { packingListService } from '../../services/mobile/packingList.service'

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

  // #185: a lot line is counted, not ticked: the counter starts at the full line (or what the
  // kit holds), and fewer leaves the line short. On Unload, fewer asks what happened to the rest.
  describe('lot counter', () => {
    const PACK_OUT = SCANNING_MODES[0].resultingStatus
    const UNLOAD = SCANNING_MODES.find((m) => m.id === 'unload')!
    const withLot = (tracking: any[] = []) => ({
      gig_id: 'gig-1',
      gig_title: 'Warehouse Check-In',
      top_level_kit_ids: ['top'],
      hierarchy_edges: [],
      kits: [{ kit_id: 'top', kit: { id: 'top', name: 'Stage Box', is_container: false,
        direct_assets: [
          { asset_id: 'xlr', quantity: 10, asset: { id: 'xlr', manufacturer_model: 'XLR Cable', quantity: 20 } },
          { asset_id: 'k12', quantity: 1, asset: { id: 'k12', manufacturer_model: 'K12 Speaker', tag_number: 'K12-1' } },
        ],
        assets: [{ asset_id: 'xlr', quantity: 10 }, { asset_id: 'k12', quantity: 1 }] } }],
      tracking,
    })
    const onSite = (asset_id: string, quantity: number) =>
      ({ id: `t-${asset_id}`, gig_id: 'gig-1', kit_id: 'top', asset_id, status: 'On Site', quantity, scanned_at: '2026-10-09T10:00:00.000Z', scanned_by: 'user-1' })

    beforeEach(() => { auth.role = 'Admin' })

    async function countBack(user: ReturnType<typeof userEvent.setup>, minus: number) {
      await user.click(await screen.findByRole('button', { name: 'Check XLR Cable' }))
      for (let i = 0; i < minus; i++) await user.click(screen.getByRole('button', { name: 'One fewer' }))
      await user.click(screen.getByRole('button', { name: 'Confirm' }))
    }

    it('Pack-Out starts at the full line; fewer packs fewer', async () => {
      vi.mocked(idbStore.getPackingList).mockImplementation(async () => withLot())
      const user = userEvent.setup()
      render(<MobileInventoryMode gigId="gig-1" onSelectGig={vi.fn()} />)
      await user.click(await screen.findByRole('button', { name: 'Check XLR Cable' }))
      expect(screen.getByLabelText('How many')).toHaveValue(10)
      await user.click(screen.getByRole('button', { name: 'One fewer' }))
      await user.click(screen.getByRole('button', { name: 'Confirm' }))
      expect(inventoryTrackingService.submitScan).toHaveBeenCalledWith(expect.objectContaining({ kitId: 'top', assetId: 'xlr', quantity: 9, status: PACK_OUT }))
    })

    it('a lot part-packed shows how many, and isn\'t checked', async () => {
      vi.mocked(idbStore.getPackingList).mockImplementation(async () => withLot([{ ...onSite('xlr', 7), status: PACK_OUT }]))
      render(<MobileInventoryMode gigId="gig-1" onSelectGig={vi.fn()} />)
      expect(await screen.findByText('7 / 10')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Check XLR Cable' })).toBeInTheDocument()
    })

    it('a unit still ticks with no counter', async () => {
      vi.mocked(idbStore.getPackingList).mockImplementation(async () => withLot())
      const user = userEvent.setup()
      render(<MobileInventoryMode gigId="gig-1" onSelectGig={vi.fn()} />)
      await user.click(await screen.findByRole('button', { name: 'Check K12 Speaker' }))
      expect(screen.queryByLabelText('How many')).not.toBeInTheDocument()
      expect(inventoryTrackingService.submitScan).toHaveBeenCalledWith(expect.objectContaining({ assetId: 'k12' }))
    })

    it('Unload: all back closes the bucket', async () => {
      vi.mocked(idbStore.getPackingList).mockImplementation(async () => withLot([onSite('xlr', 8)]))
      const user = userEvent.setup()
      render(<MobileInventoryMode gigId="gig-1" onSelectGig={vi.fn()} />)
      await user.click(await screen.findByText(UNLOAD.label))
      await user.click(await screen.findByRole('button', { name: 'Check XLR Cable' }))
      expect(screen.getByLabelText('How many')).toHaveValue(8) // what went out, not the line
      await user.click(screen.getByRole('button', { name: 'Confirm' }))
      expect(inventoryTrackingService.submitScan).toHaveBeenCalledWith(expect.objectContaining({ assetId: 'xlr', quantity: 8, status: UNLOAD.resultingStatus }))
    })

    it('Unload: "Leave at the gig" writes one Not Returned row with what is still out', async () => {
      vi.mocked(idbStore.getPackingList).mockImplementation(async () => withLot([onSite('xlr', 10)]))
      const user = userEvent.setup()
      render(<MobileInventoryMode gigId="gig-1" onSelectGig={vi.fn()} />)
      await user.click(await screen.findByText(UNLOAD.label))
      await countBack(user, 3)
      expect(screen.getByText('3 not back')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Leave at the gig' }))
      expect(inventoryTrackingService.submitScan).toHaveBeenCalledTimes(1)
      expect(inventoryTrackingService.submitScan).toHaveBeenCalledWith(expect.objectContaining({ kitId: 'top', assetId: 'xlr', quantity: 3, status: 'Not Returned' }))
    })

    it('Unload: "Mark missing" writes the rest off (Admin or Manager, online)', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
      vi.mocked(packingListService.fetchGigPackingList).mockImplementation(async () => withLot([onSite('xlr', 10)]) as any)
      vi.mocked(idbStore.getPackingList).mockImplementation(async () => withLot([onSite('xlr', 10)]))
      const user = userEvent.setup()
      render(<MobileInventoryMode gigId="gig-1" onSelectGig={vi.fn()} />)
      await user.click(await screen.findByText(UNLOAD.label))
      await countBack(user, 3)
      await user.click(screen.getByRole('button', { name: 'Mark missing' }))
      expect(writeOffPieces).toHaveBeenCalledWith({ assetId: 'xlr', quantity: 3, gigId: 'gig-1', kitId: 'top', stillOut: 0 })
      expect(inventoryTrackingService.submitScan).not.toHaveBeenCalled()
    })

    it('Unload: Staff, or no connection, only get "Leave at the gig"', async () => {
      auth.role = 'Staff'
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
      vi.mocked(packingListService.fetchGigPackingList).mockImplementation(async () => withLot([onSite('xlr', 10)]) as any)
      vi.mocked(idbStore.getPackingList).mockImplementation(async () => withLot([onSite('xlr', 10)]))
      const user = userEvent.setup()
      const { unmount } = render(<MobileInventoryMode gigId="gig-1" onSelectGig={vi.fn()} />)
      await user.click(await screen.findByText(UNLOAD.label))
      await countBack(user, 3)
      expect(screen.getByRole('button', { name: 'Leave at the gig' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Mark missing' })).not.toBeInTheDocument()
      unmount()

      auth.role = 'Admin'
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
      render(<MobileInventoryMode gigId="gig-1" onSelectGig={vi.fn()} />)
      await user.click(await screen.findByText(UNLOAD.label))
      await countBack(user, 3)
      expect(screen.queryByRole('button', { name: 'Mark missing' })).not.toBeInTheDocument()
    })
  })

  it('a line in a nested sub-kit (not a container) is tracked under the top kit, like a kit scan writes it', async () => {
    vi.mocked(idbStore.getPackingList).mockImplementation(async () => ({
      gig_id: 'gig-1',
      gig_title: 'Warehouse Check-In',
      top_level_kit_ids: ['top'],
      hierarchy_edges: [{ parent_kit_id: 'top', child_kit_id: 'pair', quantity: 1 }],
      kits: [
        { kit_id: 'top', kit: { id: 'top', name: 'Stage Box', is_container: false, direct_assets: [], assets: [] } },
        { kit_id: 'pair', kit: { id: 'pair', name: 'DI Pair', is_container: false,
          direct_assets: [{ asset_id: 'di', quantity: 1, asset: { id: 'di', manufacturer_model: 'Radial DI', tag_number: 'DI-1' } }],
          assets: [{ asset_id: 'di', quantity: 1 }] } },
      ],
      tracking: [],
    }))
    const user = userEvent.setup()
    render(<MobileInventoryMode gigId="gig-1" onSelectGig={vi.fn()} />)
    await user.click(await screen.findByRole('button', { name: 'Check Radial DI' }))
    expect(inventoryTrackingService.submitScan).toHaveBeenCalledWith(expect.objectContaining({ kitId: 'top', assetId: 'di' }))
  })

  it('scanning a tag finds the kit its row belongs under: a nested container, not the top kit', async () => {
    vi.mocked(idbStore.getPackingList).mockImplementation(async () => ({
      gig_id: 'gig-1',
      gig_title: 'Warehouse Check-In',
      top_level_kit_ids: ['rack'],
      hierarchy_edges: [{ parent_kit_id: 'rack', child_kit_id: 'case', quantity: 1 }],
      kits: [
        { kit_id: 'rack', kit: { id: 'rack', name: 'Rack', is_container: false, direct_assets: [],
          assets: [{ asset_id: 'mic', quantity: 1, asset: { id: 'mic', manufacturer_model: 'SM58', tag_number: 'MIC-1' } }] } },
        { kit_id: 'case', kit: { id: 'case', name: 'Mic Case', tag_number: 'C-1', is_container: true,
          assets: [{ asset_id: 'mic', quantity: 1, asset: { id: 'mic', manufacturer_model: 'SM58', tag_number: 'MIC-1' } }] } },
      ],
      tracking: [],
    }))
    render(<MobileInventoryMode gigId="gig-1" onSelectGig={vi.fn()} />)
    await screen.findByText('Rack')
    await act(async () => { await scannerProps.onScan('MIC-1') })
    expect(inventoryTrackingService.submitScan).toHaveBeenCalledWith(expect.objectContaining({ kitId: 'case', assetId: 'mic' }))
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
