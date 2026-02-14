import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import AssetListScreen from './AssetListScreen'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    length: 0,
    key: vi.fn((index: number) => null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock all dependencies
vi.mock('../services/asset.service', () => ({
  getAssets: vi.fn().mockResolvedValue([]),
  deleteAsset: vi.fn().mockResolvedValue({ success: true }),
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
  onCreateAsset: vi.fn(),
  onViewAsset: vi.fn(),
  onNavigateToDashboard: vi.fn(),
  onNavigateToGigs: vi.fn(),
  onNavigateToAssets: vi.fn(),
  onNavigateToKits: vi.fn(),
  onSwitchOrganization: vi.fn(),
  onLogout: vi.fn(),
}

describe('AssetListScreen', () => {
  it('renders without throwing errors', () => {
    // This test ensures the component can render without syntax errors
    // (like duplicate imports or other compilation errors)
    expect(() => {
      render(<AssetListScreen {...mockProps} />)
    }).not.toThrow()
  })

  it('handles loading state without errors', () => {
    expect(() => {
      render(<AssetListScreen {...mockProps} />)
    }).not.toThrow()
  })
})

