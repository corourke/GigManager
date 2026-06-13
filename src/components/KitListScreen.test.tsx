import {describe, it, expect, vi } from 'vitest'
import {render } from '@testing-library/react'
import KitListScreen from './KitListScreen'
import { makeUser, makeOrganization } from '../test/factories'

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
    kit_assets: [],
  }]),
  deleteKit: vi.fn().mockResolvedValue({ success: true }),
  duplicateKit: vi.fn().mockResolvedValue({ id: 'new-kit-id' }),
  updateKit: vi.fn().mockResolvedValue({}),
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
})

