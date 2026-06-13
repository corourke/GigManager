import {describe, it, expect, vi } from 'vitest'
import {render } from '@testing-library/react'
import AssetListScreen from './AssetListScreen'
import { makeUser, makeOrganization } from '../test/factories'

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
  getAssets: vi.fn().mockResolvedValue([{
    id: 'asset-1',
    organization_id: 'org-1',
    manufacturer_model: 'Test Asset',
    category: 'Audio',
    quantity: 1,
    replacement_value: 100,
  }]),
  deleteAsset: vi.fn().mockResolvedValue({ success: true }),
  duplicateAsset: vi.fn().mockResolvedValue({ id: 'new-asset-id' }),
  updateAsset: vi.fn().mockResolvedValue({}),
}))

vi.mock('../services/inventoryManagement.service', () => ({
  getAssetTrackingSummary: vi.fn().mockResolvedValue(new Map()),
}))

vi.mock('../services/purchase.service', () => ({
  scanInvoice: vi.fn().mockResolvedValue({}),
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

  it('renders tracking columns in table header', async () => {
    const { findAllByText } = render(<AssetListScreen {...mockProps} />)
    expect((await findAllByText('Inventory Status')).length).toBeGreaterThan(0)
    expect((await findAllByText('Last Location')).length).toBeGreaterThan(0)
    expect((await findAllByText('Active Gig')).length).toBeGreaterThan(0)
  })

  it('renders tracking status filter dropdown', async () => {
    const { findAllByText } = render(<AssetListScreen {...mockProps} />)
    expect((await findAllByText('Tracking:')).length).toBeGreaterThan(0)
  })
})

