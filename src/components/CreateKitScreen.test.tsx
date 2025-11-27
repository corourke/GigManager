import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import CreateKitScreen from './CreateKitScreen'

// Mock all dependencies
vi.mock('../utils/api', () => ({
  getKit: vi.fn().mockResolvedValue({}),
  createKit: vi.fn(),
  updateKit: vi.fn(),
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
  organization: { id: 'org-1', name: 'Test Org', type: 'Production' },
  user: { 
    id: 'user-1', 
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    avatar_url: null,
  },
  userRole: 'Admin' as const,
  onCancel: vi.fn(),
  onKitCreated: vi.fn(),
  onKitUpdated: vi.fn(),
  onSwitchOrganization: vi.fn(),
  onLogout: vi.fn(),
}

describe('CreateKitScreen', () => {
  it('renders without throwing errors', () => {
    expect(() => {
      render(<CreateKitScreen {...mockProps} />)
    }).not.toThrow()
  })

  it('renders in edit mode without throwing errors', () => {
    expect(() => {
      render(<CreateKitScreen {...mockProps} kitId="test-id" />)
    }).not.toThrow()
  })
})
