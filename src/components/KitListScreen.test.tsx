import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import KitListScreen from './KitListScreen'

// Mock all dependencies
vi.mock('../services/kit.service', () => ({
  getKits: vi.fn().mockResolvedValue([]),
  deleteKit: vi.fn().mockResolvedValue({ success: true }),
  duplicateKit: vi.fn().mockResolvedValue({ id: 'new-kit-id' }),
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
})

