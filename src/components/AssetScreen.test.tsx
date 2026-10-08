import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AssetScreen from './AssetScreen'
import { makeUser, makeOrganization } from '../test/factories'
import { getBackInHeaderSlot } from '../test/pageFrame'

// AssetScreen now uses TanStack Query — renders need a QueryClientProvider.
function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

const k12Item = {
  id: 'item-k12', organization_id: 'org-1', manufacturer_model: 'QSC K12.2', category: 'Audio',
  type: 'Speaker, Powered, Full-Range', description: null, insurance_class: 'Class B', records: [],
}
vi.mock('../services/equipmentItem.service', () => ({
  getItem: vi.fn(() => Promise.resolve(k12Item)),
  getItems: vi.fn(() => Promise.resolve([k12Item])),
}))

// Mock all dependencies
vi.mock('../services/asset.service', () => ({
  getAsset: vi.fn().mockResolvedValue({}),
  createAsset: vi.fn().mockResolvedValue({ id: 'new-1', equipment_item_id: 'item-k12' }),
  updateAsset: vi.fn(),
  getAssetStatusHistory: vi.fn().mockResolvedValue([]),
  getAssetInventoryTracking: vi.fn().mockResolvedValue([]),
  getAssetDepreciatedDate: vi.fn().mockResolvedValue(null),
}))

vi.mock('../utils/hooks/useFormWithChanges', () => ({
  useFormWithChanges: vi.fn(() => ({
    hasChanges: false,
    changedFields: {},
    updateChangedFields: vi.fn(),
    markAsSaved: vi.fn(),
  })),
}))

vi.mock('../utils/hooks/useAutocompleteSuggestions', () => ({
  useAutocompleteSuggestions: vi.fn(() => ({
    suggestions: [],
    isLoading: false,
    error: null,
  })),
}))

vi.mock('../contexts/NavigationContext', () => ({
  useNavigation: vi.fn(() => ({
    navigateToGigs: vi.fn(),
    navigateToAssets: vi.fn(),
    navigateToKits: vi.fn(),
    navigateToTeam: vi.fn(),
    navigateToDashboard: vi.fn(),
  })),
}))

const mockProps = {
  organization: makeOrganization({ name: 'Test Org' }),
  user: makeUser(),
  userRole: 'Admin' as const,
  onCancel: vi.fn(),
  onAssetCreated: vi.fn(),
  onAssetUpdated: vi.fn(),
  onSwitchOrganization: vi.fn(),
  onLogout: vi.fn(),
}

describe('AssetScreen', () => {
  it('puts Back to Items in the page header slot when no item is chosen yet (#39, #182)', () => {
    const onCancel = vi.fn()
    render(<AssetScreen {...mockProps} onCancel={onCancel} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Add unit or lot' })).toBeInTheDocument()
    fireEvent.click(getBackInHeaderSlot('Back to Items'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('renders without throwing errors', () => {
    expect(() => {
      render(<AssetScreen {...mockProps} />)
    }).not.toThrow()
  })

  it('renders in edit mode without throwing errors', () => {
    expect(() => {
      render(<AssetScreen {...mockProps} assetId="test-id" />)
    }).not.toThrow()
  })

  describe('unit or lot (#182)', () => {
    it('adds to an item: shows what it is, and Back goes to the item', async () => {
      const onBackToItem = vi.fn()
      render(<AssetScreen {...mockProps} itemId="item-k12" onBackToItem={onBackToItem} />)
      expect(await screen.findByText('Audio · Speaker, Powered, Full-Range')).toBeInTheDocument()
      fireEvent.click(getBackInHeaderSlot('Back to QSC K12.2'))
      expect(onBackToItem).toHaveBeenCalledWith('item-k12')
    })

    it('a unit has quantity 1 and needs a serial number or a tag', async () => {
      const ue = userEvent.setup()
      const { createAsset } = await import('../services/asset.service')
      render(<AssetScreen {...mockProps} itemId="item-k12" />)
      await screen.findByText('Audio · Speaker, Powered, Full-Range')

      expect(screen.getByLabelText('Quantity')).toBeDisabled()
      expect(screen.getByLabelText('Quantity')).toHaveValue(1)
      fireEvent.change(screen.getByLabelText(/Acquisition Date/), { target: { value: '2025-05-02' } })
      await ue.click(screen.getByRole('button', { name: 'Add Unit' }))
      expect(await screen.findByText('A unit needs a serial number or a tag (either will do).')).toBeInTheDocument()
      expect(createAsset).not.toHaveBeenCalled()

      await ue.type(screen.getByLabelText('Inventory Tag ID'), 'DSL-0107')
      await ue.click(screen.getByRole('button', { name: 'Add Unit' }))
      await waitFor(() => expect(createAsset).toHaveBeenCalledWith(expect.objectContaining({
        manufacturer_model: 'QSC K12.2', category: 'Audio', tag_number: 'DSL-0107', quantity: 1,
      })))
    })

    it('a lot has a quantity and no serial number or tag', async () => {
      const ue = userEvent.setup()
      render(<AssetScreen {...mockProps} itemId="item-k12" />)
      await screen.findByText('Audio · Speaker, Powered, Full-Range')
      await ue.click(screen.getByRole('radio', { name: /Lot/ }))

      expect(screen.getByLabelText('Serial Number')).toBeDisabled()
      expect(screen.getByLabelText('Inventory Tag ID')).toBeDisabled()
      expect(screen.getByLabelText('Quantity')).toBeEnabled()
      expect(screen.getByRole('button', { name: 'Add Lot' })).toBeInTheDocument()
    })

    it('picks an existing item when none is given', async () => {
      const ue = userEvent.setup()
      render(<AssetScreen {...mockProps} />)
      await ue.selectOptions(await screen.findByLabelText('Item'), 'item-k12')
      expect(await screen.findByText('Audio · Speaker, Powered, Full-Range')).toBeInTheDocument()
    })
  })
})
