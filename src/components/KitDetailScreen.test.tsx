import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import KitDetailScreen from './KitDetailScreen'
import { makeUser, makeOrganization } from '../test/factories'

vi.mock('../services/kit.service', () => ({
  getKit: vi.fn().mockResolvedValue({
    id: 'kit-1',
    name: 'Full Rack',
    category: 'Production',
    rental_value: 0,
  }),
  getKitFlattenedContents: vi.fn().mockResolvedValue([
    { asset_id: 'asset-1', total_quantity: 2, asset: { manufacturer_model: 'LED Par Light', replacement_value: 150, category: 'Lighting' } },
  ]),
  getKitHierarchyTree: vi.fn().mockResolvedValue([
    { parent_kit_id: 'kit-1', child_kit_id: 'kit-2', child_kit_name: 'Lighting Kit', quantity: 1, depth: 1 },
  ]),
  deleteKit: vi.fn(),
  duplicateKit: vi.fn(),
}))

vi.mock('../services/activityLog.service', () => ({
  getEntityActivity: vi.fn().mockResolvedValue([]),
}))

const mockProps = {
  organization: makeOrganization({ name: 'Test Org' }),
  user: makeUser(),
  userRole: 'Admin' as const,
  kitId: 'kit-1',
  onBack: vi.fn(),
  onEdit: vi.fn(),
  onSwitchOrganization: vi.fn(),
  onLogout: vi.fn(),
}

describe('KitDetailScreen', () => {
  it('renders the flattened asset contents and nested structure', async () => {
    render(<KitDetailScreen {...mockProps} />)

    await waitFor(() => expect(screen.getByText('Full Rack')).toBeInTheDocument())

    // Flattened contents (from kit_flattened_cache), not a direct kit_assets join
    expect(screen.getByText('LED Par Light')).toBeInTheDocument()
    expect(screen.getAllByText('2').length).toBeGreaterThan(0) // total_quantity appears (summary card + table row)

    // Nested structure section
    expect(screen.getByText('Nested Structure')).toBeInTheDocument()
    expect(screen.getByText('Lighting Kit')).toBeInTheDocument()
  })
})
