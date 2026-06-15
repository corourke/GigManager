import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render as rtlRender } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AssetScreen from './AssetScreen'
import { makeUser, makeOrganization } from '../test/factories'

// AssetScreen now uses TanStack Query — renders need a QueryClientProvider.
function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

// Mock all dependencies
vi.mock('../services/asset.service', () => ({
  getAsset: vi.fn().mockResolvedValue({}),
  createAsset: vi.fn(),
  updateAsset: vi.fn(),
  getAssetStatusHistory: vi.fn().mockResolvedValue([]),
  getAssetInventoryTracking: vi.fn().mockResolvedValue([]),
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
})
