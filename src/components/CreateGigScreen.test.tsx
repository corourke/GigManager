import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import CreateGigScreen from './CreateGigScreen'

// Mock all dependencies
vi.mock('../utils/api', () => ({
  getGig: vi.fn().mockResolvedValue({}),
  createGig: vi.fn(),
  updateGig: vi.fn(),
  getOrganizations: vi.fn().mockResolvedValue([]),
  getUsers: vi.fn().mockResolvedValue([]),
  getKits: vi.fn().mockResolvedValue([]),
  getGigKits: vi.fn().mockResolvedValue([]),
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
  onGigCreated: vi.fn(),
  onSwitchOrganization: vi.fn(),
  onLogout: vi.fn(),
}

describe('CreateGigScreen', () => {
  it('renders without throwing errors', () => {
    expect(() => {
      render(<CreateGigScreen {...mockProps} />)
    }).not.toThrow()
  })

  it('renders in edit mode without throwing errors', () => {
    expect(() => {
      render(<CreateGigScreen {...mockProps} gigId="test-id" />)
    }).not.toThrow()
  })
})
