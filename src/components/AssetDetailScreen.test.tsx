import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AssetDetailScreen from './AssetDetailScreen'
import { getAsset } from '../services/asset.service'
import { makeUser, makeOrganization } from '../test/factories'
import { getBackInHeaderSlot } from '../test/pageFrame'

vi.mock('../services/asset.service', () => ({
  getAsset: vi.fn(),
  deleteAsset: vi.fn(),
  duplicateAsset: vi.fn(),
  getAssetHistory: vi.fn().mockResolvedValue([]),
  getAssetInventoryTracking: vi.fn().mockResolvedValue([]),
}))
vi.mock('./AttachmentManager', () => ({ default: () => null }))

const props = {
  organization: makeOrganization({ name: 'Test Org' }),
  user: makeUser(),
  userRole: 'Admin' as const,
  assetId: 'asset-1',
  onBack: vi.fn(),
  onEdit: vi.fn(),
  onSwitchOrganization: vi.fn(),
  onLogout: vi.fn(),
}

describe('AssetDetailScreen page header (#39)', () => {
  it('puts Back to Assets in the header slot, left of the model name', async () => {
    vi.mocked(getAsset).mockResolvedValue({ id: 'asset-1', manufacturer_model: 'Shure SM58', category: 'Audio', status: 'Active' } as any)
    const onBack = vi.fn()
    render(<AssetDetailScreen {...props} onBack={onBack} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Shure SM58' })).toBeInTheDocument()
    fireEvent.click(getBackInHeaderSlot('Back to Assets'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('keeps Back in the same place when the asset fails to load', async () => {
    vi.mocked(getAsset).mockRejectedValue(new Error('Asset not found.'))
    render(<AssetDetailScreen {...props} />)
    expect(await screen.findByText('Asset not found.')).toBeInTheDocument()
    expect(getBackInHeaderSlot('Back to Assets')).toBeInTheDocument()
  })
})
