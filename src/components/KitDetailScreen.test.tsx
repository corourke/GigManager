import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import KitDetailScreen from './KitDetailScreen'
import { makeUser, makeOrganization } from '../test/factories'

// countInventoryItems/maxTreeDepth are plain, pure functions — keep the real
// implementations so these tests actually exercise the container-aware
// counting logic, not a hand-rolled stand-in that could drift from it.
vi.mock('../services/kit.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/kit.service')>()
  return {
    ...actual,
    getKit: vi.fn().mockResolvedValue({
      id: 'kit-1',
      name: 'Full Rack',
      category: 'Production',
      rental_value: 0,
      is_container: false,
    }),
    // Fully flattened (ignores container boundaries): 2 LED Par Lights + 5 Cable Snakes = 7.
    getKitFlattenedContents: vi.fn().mockResolvedValue([
      { asset_id: 'asset-1', total_quantity: 2, asset: { manufacturer_model: 'LED Par Light', replacement_value: 150, category: 'Lighting' } },
      { asset_id: 'asset-2', total_quantity: 5, asset: { manufacturer_model: 'Cable Snake', replacement_value: 20, category: 'Cables' } },
    ]),
    // Lighting Kit is NOT a container (transparent — contributes its own assets).
    // Road Case IS a container (counts as one, contents hidden by default).
    getKitComponentTree: vi.fn().mockResolvedValue([
      {
        clientKey: 'kit-kit-2',
        type: 'kit',
        quantity: 1,
        kit: { id: 'kit-2', name: 'Lighting Kit', category: 'Lighting', is_container: false },
        children: [
          {
            clientKey: 'asset-asset-1',
            type: 'asset',
            quantity: 2,
            asset: { manufacturer_model: 'LED Par Light' },
            children: [],
          },
        ],
      },
      {
        clientKey: 'kit-kit-3',
        type: 'kit',
        quantity: 1,
        kit: { id: 'kit-3', name: 'Road Case', category: 'Cases', is_container: true },
        children: [
          {
            clientKey: 'asset-asset-2',
            type: 'asset',
            quantity: 5,
            asset: { manufacturer_model: 'Cable Snake' },
            children: [],
          },
        ],
      },
    ]),
    deleteKit: vi.fn(),
    duplicateKit: vi.fn(),
  }
})

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
  it('renders the flattened asset contents and the combined kit structure tree', async () => {
    render(<KitDetailScreen {...mockProps} />)

    await waitFor(() => expect(screen.getByText('Full Rack')).toBeInTheDocument())

    // Flattened contents (from kit_flattened_cache), not a direct kit_assets join.
    // LED Par Light also appears in the (non-container) tree below, hence 2.
    expect(screen.getAllByText('LED Par Light').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Cable Snake').length).toBeGreaterThan(0)

    // Combined structure section — both the sub-kit and its nested asset show up together.
    expect(screen.getByText('Kit Structure')).toBeInTheDocument()
    expect(screen.getByText('Lighting Kit')).toBeInTheDocument()
    expect(screen.getByText('Road Case')).toBeInTheDocument()
  })

  it('distinguishes fully-flattened Total Items from container-aware Inventory Items', async () => {
    render(<KitDetailScreen {...mockProps} />)
    await waitFor(() => expect(screen.getByText('Full Rack')).toBeInTheDocument())

    // Total Items: fully flattened, ignores container boundaries — 2 + 5 = 7.
    const totalItemsCard = screen.getByText('Total Items').closest('[data-slot="card"]')!
    expect(totalItemsCard.textContent).toContain('7')

    // Inventory Items: Lighting Kit is transparent (not a container) so its
    // 2 LED Par Lights count individually; Road Case IS a container so it
    // counts as one and its 5 Cable Snakes are not drilled into — 2 + 1 = 3.
    const inventoryItemsCard = screen.getByText('Inventory Items').closest('[data-slot="card"]')!
    expect(inventoryItemsCard.textContent).toContain('3')
  })

  it('hides a container sub-kit\'s contents by default, and reveals them via the toggle', async () => {
    render(<KitDetailScreen {...mockProps} />)
    await waitFor(() => expect(screen.getByText('Road Case')).toBeInTheDocument())

    // Road Case's own asset (Cable Snake) appears once already, from the
    // flattened "Assets in Kit" table — but not a second time from the tree,
    // since the tree hides a container's contents by default.
    expect(screen.getAllByText('Cable Snake')).toHaveLength(1)
    // Lighting Kit is NOT a container, so its contents show regardless —
    // once in the flattened table, once in the tree.
    expect(screen.getAllByText('LED Par Light')).toHaveLength(2)

    fireEvent.click(screen.getByText('Show container contents'))

    await waitFor(() => {
      expect(screen.getAllByText('Cable Snake')).toHaveLength(2)
    })
  })
})
