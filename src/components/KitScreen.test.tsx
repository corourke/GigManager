import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen, waitFor, within } from '@testing-library/react'
import KitScreen from './KitScreen'
import { makeUser, makeOrganization } from '../test/factories'
import { getKit } from '../services/kit.service'

// Mock all dependencies
vi.mock('../services/kit.service', () => ({
  getKit: vi.fn().mockResolvedValue({}),
  getKits: vi.fn().mockResolvedValue([]),
  getKitsFlattenedSummary: vi.fn().mockResolvedValue(new Map()),
  createKit: vi.fn(),
  updateKit: vi.fn(),
}))

vi.mock('../services/asset.service', () => ({
  getAssets: vi.fn().mockResolvedValue([]),
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
  onKitCreated: vi.fn(),
  onKitUpdated: vi.fn(),
  onSwitchOrganization: vi.fn(),
  onLogout: vi.fn(),
}

describe('KitScreen', () => {
  it('renders without throwing errors', () => {
    expect(() => {
      render(<KitScreen {...mockProps} />)
    }).not.toThrow()
  })

  it('renders in edit mode without throwing errors', () => {
    expect(() => {
      render(<KitScreen {...mockProps} kitId="test-id" />)
    }).not.toThrow()
  })

  it('opens the unified component picker with All/Assets/Kits filters', () => {
    render(<KitScreen {...mockProps} />)
    fireEvent.click(screen.getByText('Add Components'))
    expect(screen.getByText('all')).toBeInTheDocument()
    expect(screen.getByText('assets')).toBeInTheDocument()
    expect(screen.getByText('kits')).toBeInTheDocument()
  })

  // Regression: two rows referencing the same asset_id (only reachable today
  // via legacy data, since the picker now excludes already-added assets) used
  // to share a derived identity, so removing one removed both. Rows are now
  // keyed by their own clientKey (the DB id, here), not the shared asset_id.
  it('removes only the specific row clicked, even when two rows reference the same asset', async () => {
    vi.mocked(getKit).mockResolvedValue({
      id: 'kit-1',
      name: 'Cable Bag',
      kit_components: [
        { id: 'kc-1', asset_id: 'asset-1', quantity: 3, asset: { id: 'asset-1', manufacturer_model: 'DMX Cable' } },
        { id: 'kc-2', asset_id: 'asset-1', quantity: 7, asset: { id: 'asset-1', manufacturer_model: 'DMX Cable' } },
      ],
    } as any)

    render(<KitScreen {...mockProps} kitId="kit-1" />)

    const quantityInputs = await waitFor(() => {
      const inputs = screen.getAllByDisplayValue(/^(3|7)$/)
      expect(inputs).toHaveLength(2)
      return inputs
    })

    // Remove the row showing quantity 3 — find its table row and click its own remove button.
    const rowToRemove = quantityInputs.find((el) => (el as HTMLInputElement).value === '3')!.closest('tr')!
    fireEvent.click(within(rowToRemove).getByRole('button'))

    await waitFor(() => {
      expect(screen.queryByDisplayValue('3')).not.toBeInTheDocument()
    })
    // The other row survives untouched — this is the actual regression check.
    expect(screen.getByDisplayValue('7')).toBeInTheDocument()
  })
})
