import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format } from 'date-fns'
import MobileInventoryMode from './MobileInventoryMode'

function getLatestTrackingRecord(tracking: any[] = [], kitId: string, assetId?: string) {
  return tracking
    .filter((record) => record.kit_id === kitId && (record.asset_id ?? null) === (assetId || null))
    .sort((left, right) => new Date(right.scanned_at).getTime() - new Date(left.scanned_at).getTime())[0] || null
}

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

vi.mock('../../services/mobile/inventoryTracking.service', () => ({
  inventoryTrackingService: {
    getLatestTrackingRecord,
    matchTag: vi.fn(),
    submitScan: vi.fn(),
    clearTracking: vi.fn(),
    updateLatestNote: vi.fn(),
    updateAssetStatus: vi.fn(),
  },
}))

vi.mock('./MobileBarcodeScanner', () => ({
  MobileBarcodeScanner: () => null,
}))

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}))

import { idbStore } from '../../utils/idb/store'

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
})
