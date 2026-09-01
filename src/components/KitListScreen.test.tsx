import {describe, it, expect, vi } from 'vitest'
import {render } from '@testing-library/react'
import KitListScreen from './KitListScreen'
import { makeUser, makeOrganization } from '../test/factories'
import { getKits, getKitsFlattenedSummary } from '../services/kit.service'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock all dependencies
vi.mock('../services/kit.service', () => ({
  getKits: vi.fn().mockResolvedValue([{
    id: 'kit-1',
    organization_id: 'org-1',
    name: 'Test Kit',
    category: 'Audio',
    is_container: true,
    kit_components: [],
  }]),
  deleteKit: vi.fn().mockResolvedValue({ success: true }),
  duplicateKit: vi.fn().mockResolvedValue({ id: 'new-kit-id' }),
  updateKit: vi.fn().mockResolvedValue({}),
  getKitsFlattenedSummary: vi.fn().mockResolvedValue(new Map()),
}))

vi.mock('../services/inventoryManagement.service', () => ({
  getKitTrackingSummary: vi.fn().mockResolvedValue(new Map()),
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
  onBack: vi.fn(),
  onCreateKit: vi.fn(),
  onViewKit: vi.fn(),
  onEditKit: vi.fn(),
  onNavigateToDashboard: vi.fn(),
  onNavigateToGigs: vi.fn(),
  onNavigateToAssets: vi.fn(),
  onNavigateToKits: vi.fn(),
  onSwitchOrganization: vi.fn(),
  onLogout: vi.fn(),
}

describe('KitListScreen', () => {
  it('renders without throwing errors', () => {
    // This test ensures the component can render without syntax errors
    // (like duplicate imports or other compilation errors)
    expect(() => {
      render(<KitListScreen {...mockProps} />)
    }).not.toThrow()
  })

  it('handles loading state without errors', () => {
    expect(() => {
      render(<KitListScreen {...mockProps} />)
    }).not.toThrow()
  })

  it('renders tracking columns in table header', async () => {
    const { findAllByText } = render(<KitListScreen {...mockProps} />)
    expect((await findAllByText('Tracking Status')).length).toBeGreaterThan(0)
    expect((await findAllByText('Last Location')).length).toBeGreaterThan(0)
    expect((await findAllByText('Active Gig')).length).toBeGreaterThan(0)
  })

  it('renders tracking status filter dropdown', async () => {
    const { findAllByText } = render(<KitListScreen {...mockProps} />)
    expect((await findAllByText('Tracking Status:')).length).toBeGreaterThan(0)
  })

  // Regression: a kit's kit_components rows for nested sub-kits carry no
  // asset/quantity of their own, so summing row.kit_components directly (the
  // old behavior) silently dropped every nested kit's value/items. The
  // flattened summary (from kit_flattened_cache) is the source of truth now.
  it('shows the flattened total value/items, not a naive sum of direct kit_components rows', async () => {
    vi.mocked(getKits).mockResolvedValue([{
      id: 'kit-parent',
      organization_id: 'org-1',
      name: 'Full Rack',
      category: 'Audio',
      is_container: false,
      // Only a nested sub-kit row directly — no asset, so the old reduce read $0/0 items.
      kit_components: [{ id: 'kc-1', child_kit_id: 'kit-child', quantity: 1 }],
    }] as any)
    vi.mocked(getKitsFlattenedSummary).mockResolvedValue(new Map([
      ['kit-parent', { totalValue: 350, totalItems: 5, assetIds: new Set(['di-box', 'led-par']) }],
    ]))

    const { findByText } = render(<KitListScreen {...mockProps} />)
    expect(await findByText('$350.00')).toBeInTheDocument()
    expect(await findByText('5')).toBeInTheDocument()
  })
})

