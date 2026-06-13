import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import KitScreen from './KitScreen'
import { makeUser, makeOrganization } from '../test/factories'

// Mock all dependencies
vi.mock('../services/kit.service', () => ({
  getKit: vi.fn().mockResolvedValue({}),
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
})
