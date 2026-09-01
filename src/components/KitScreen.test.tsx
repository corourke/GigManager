import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen, waitFor, within } from '@testing-library/react'
import KitScreen from './KitScreen'
import { makeUser, makeOrganization } from '../test/factories'
import { getKit, getKits, getKitsFlattenedSummary, getKitsThatWouldCycle } from '../services/kit.service'
import { getAssets } from '../services/asset.service'

// Mock all dependencies
vi.mock('../services/kit.service', () => ({
  getKit: vi.fn().mockResolvedValue({}),
  getKits: vi.fn().mockResolvedValue([]),
  getKitsFlattenedSummary: vi.fn().mockResolvedValue(new Map()),
  getKitsThatWouldCycle: vi.fn().mockResolvedValue(new Set()),
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

  it('opens the unified component picker with All/Assets/Kits filters', () => {
    render(<KitScreen {...mockProps} />)
    fireEvent.click(screen.getByText('Add Components'))
    expect(screen.getByText('all')).toBeInTheDocument()
    expect(screen.getByText('assets')).toBeInTheDocument()
    expect(screen.getByText('kits')).toBeInTheDocument()
  })

  // Regression: two rows referencing the same asset_id (only reachable today
  // via legacy data, since the picker now excludes already-added assets) used
  // to share a derived identity, so removing one removed both. Rows are now
  // keyed by their own clientKey (the DB id, here), not the shared asset_id.
  it('removes only the specific row clicked, even when two rows reference the same asset', async () => {
    vi.mocked(getKit).mockResolvedValue({
      id: 'kit-1',
      name: 'Cable Bag',
      kit_components: [
        { id: 'kc-1', asset_id: 'asset-1', quantity: 3, asset: { id: 'asset-1', manufacturer_model: 'DMX Cable' } },
        { id: 'kc-2', asset_id: 'asset-1', quantity: 7, asset: { id: 'asset-1', manufacturer_model: 'DMX Cable' } },
      ],
    } as any)

    render(<KitScreen {...mockProps} kitId="kit-1" />)

    const quantityInputs = await waitFor(() => {
      const inputs = screen.getAllByDisplayValue(/^(3|7)$/)
      expect(inputs).toHaveLength(2)
      return inputs
    })

    // Remove the row showing quantity 3 — find its table row and click its own remove button.
    const rowToRemove = quantityInputs.find((el) => (el as HTMLInputElement).value === '3')!.closest('tr')!
    fireEvent.click(within(rowToRemove).getByRole('button'))

    await waitFor(() => {
      expect(screen.queryByDisplayValue('3')).not.toBeInTheDocument()
    })
    // The other row survives untouched — this is the actual regression check.
    expect(screen.getByDisplayValue('7')).toBeInTheDocument()
  })

  // A kit is a singular entity — its row in the contents table shows a fixed
  // quantity of 1, not an editable input.
  it('shows a fixed quantity of 1 for sub-kit rows, not an editable input', async () => {
    vi.mocked(getKit).mockResolvedValue({
      id: 'kit-1',
      name: 'Full Rack',
      kit_components: [
        { id: 'kc-1', child_kit_id: 'kit-sub', quantity: 1, child_kit: { id: 'kit-sub', name: 'Audio Kit' } },
      ],
    } as any)

    render(<KitScreen {...mockProps} kitId="kit-1" />)

    const row = await waitFor(() => screen.getByText('Audio Kit').closest('tr')!)
    expect(within(row).queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(within(row).getByText('1')).toBeInTheDocument()
  })

  // "It also allows me to add more asset components to a kit than we have
  // in inventory" — the picker's quantity stepper must not exceed stock.
  it('clamps the quantity added for an asset to what is in stock', async () => {
    vi.mocked(getAssets).mockResolvedValue([
      { id: 'asset-1', manufacturer_model: 'DMX Cable', quantity: 5 },
    ] as any)

    render(<KitScreen {...mockProps} />)
    fireEvent.click(screen.getByText('Add Components'))

    await waitFor(() => screen.getByText('DMX Cable'))

    const qtyInput = screen.getByLabelText('Qty') as HTMLInputElement
    fireEvent.change(qtyInput, { target: { value: '10' } })
    expect(qtyInput.value).toBe('5')

    fireEvent.click(screen.getByText('DMX Cable'))
    fireEvent.click(screen.getByRole('button', { name: /Add 1 Selected/ }))

    await waitFor(() => {
      expect(screen.getByDisplayValue('5')).toBeInTheDocument()
    })
  })

  // "It also allows me to add an asset, and then also add a kit containing
  // that asset" (and the reverse) — the same physical asset can't enter a
  // kit twice, however it gets there.
  it('excludes picker candidates whose flattened assets overlap what the kit already contains', async () => {
    vi.mocked(getKit).mockResolvedValue({
      id: 'kit-1',
      name: 'Full Rack',
      kit_components: [
        { id: 'kc-1', asset_id: 'asset-1', quantity: 1, asset: { id: 'asset-1', manufacturer_model: 'DI Box' } },
        { id: 'kc-2', child_kit_id: 'kit-audio', quantity: 1, child_kit: { id: 'kit-audio', name: 'Audio Kit' } },
      ],
    } as any)

    vi.mocked(getAssets).mockResolvedValue([
      { id: 'asset-1', manufacturer_model: 'DI Box', quantity: 1 },
      { id: 'asset-2', manufacturer_model: 'SM58 Mic', quantity: 1 }, // already reachable via Audio Kit
      { id: 'asset-3', manufacturer_model: 'XLR Cable', quantity: 10 }, // unrelated
    ] as any)

    vi.mocked(getKits).mockResolvedValue([
      { id: 'kit-lighting', name: 'Lighting Kit', category: 'Lighting', kit_components: [] }, // already contains DI Box
    ] as any)

    vi.mocked(getKitsFlattenedSummary).mockImplementation(async (ids: string[]) => {
      const all = new Map([
        ['kit-audio', { totalValue: 50, totalItems: 1, assetIds: new Set(['asset-2']) }],
        ['kit-lighting', { totalValue: 150, totalItems: 1, assetIds: new Set(['asset-1']) }],
      ])
      const result = new Map()
      for (const id of ids) if (all.has(id)) result.set(id, all.get(id))
      return result
    })

    render(<KitScreen {...mockProps} kitId="kit-1" />)
    fireEvent.click(await screen.findByText('Add Components'))

    await waitFor(() => {
      expect(screen.getByText('XLR Cable')).toBeInTheDocument()
    })
    expect(screen.queryByText('SM58 Mic')).not.toBeInTheDocument()
    expect(screen.queryByText('Lighting Kit')).not.toBeInTheDocument()
  })

  // A kit candidate that would create a circular reference is still shown
  // (unlike an already-added/duplicate-asset candidate) but flagged inline
  // on its own row, and can't be selected — surfaced before save, not just
  // from the kit_components_prevent_cycle trigger's rejection afterward.
  it('flags a kit candidate that would create a circular reference, inline on its row, and blocks selecting it', async () => {
    vi.mocked(getKit).mockResolvedValue({
      id: 'kit-1',
      name: 'Full Rack',
      kit_components: [],
    } as any)

    vi.mocked(getKits).mockResolvedValue([
      { id: 'kit-parent', name: 'Grand Rack', category: null, kit_components: [] }, // already contains Full Rack — cyclic
      { id: 'kit-other', name: 'Spare Case', category: null, kit_components: [] }, // unrelated — fine
    ] as any)

    vi.mocked(getKitsThatWouldCycle).mockImplementation(async (parentKitId: string, candidateKitIds: string[]) => {
      expect(parentKitId).toBe('kit-1')
      expect(candidateKitIds.sort()).toEqual(['kit-other', 'kit-parent'])
      return new Set(['kit-parent'])
    })

    render(<KitScreen {...mockProps} kitId="kit-1" />)
    fireEvent.click(await screen.findByText('Add Components'))

    await waitFor(() => {
      expect(screen.getByText('Grand Rack')).toBeInTheDocument()
    })
    expect(screen.getByText(/Would create a circular reference/)).toBeInTheDocument()
    expect(screen.getByText('Spare Case')).toBeInTheDocument()

    // Clicking the flagged row doesn't select it.
    fireEvent.click(screen.getByText('Grand Rack'))
    expect(screen.getByText('0 selected')).toBeInTheDocument()

    // The unaffected candidate remains selectable.
    fireEvent.click(screen.getByText('Spare Case'))
    expect(screen.getByText('1 selected')).toBeInTheDocument()
  })

  // Unlike the cycle case, an already-in-kit candidate isn't shown by
  // default — the "excludes..." test above covers that. This test covers
  // the reveal path: a toggle brings it back into view, grayed out with a
  // reason, same visual treatment as a cyclic candidate, and the reason
  // names the specific sub-kit when that's how the overlap happened.
  it('reveals already-in-kit candidates with a reason when the "show items already in this kit" toggle is enabled', async () => {
    vi.mocked(getKit).mockResolvedValue({
      id: 'kit-1',
      name: 'Full Rack',
      kit_components: [
        { id: 'kc-1', asset_id: 'asset-1', quantity: 1, asset: { id: 'asset-1', manufacturer_model: 'DI Box' } },
        { id: 'kc-2', child_kit_id: 'kit-audio', quantity: 1, child_kit: { id: 'kit-audio', name: 'Audio Kit' } },
      ],
    } as any)

    vi.mocked(getAssets).mockResolvedValue([
      { id: 'asset-1', manufacturer_model: 'DI Box', quantity: 1 }, // added directly
      { id: 'asset-2', manufacturer_model: 'SM58 Mic', quantity: 1 }, // already reachable via Audio Kit
      { id: 'asset-3', manufacturer_model: 'XLR Cable', quantity: 10 }, // unrelated
    ] as any)

    vi.mocked(getKits).mockResolvedValue([
      { id: 'kit-lighting', name: 'Lighting Kit', category: 'Lighting', kit_components: [] }, // already contains DI Box
    ] as any)

    vi.mocked(getKitsFlattenedSummary).mockImplementation(async (ids: string[]) => {
      const all = new Map([
        ['kit-audio', { totalValue: 50, totalItems: 1, assetIds: new Set(['asset-2']) }],
        ['kit-lighting', { totalValue: 150, totalItems: 1, assetIds: new Set(['asset-1']) }],
      ])
      const result = new Map()
      for (const id of ids) if (all.has(id)) result.set(id, all.get(id))
      return result
    })

    // Neither candidate here is cyclic — reset any custom implementation a
    // preceding test left behind, since this file doesn't clear mocks
    // between tests.
    vi.mocked(getKitsThatWouldCycle).mockResolvedValue(new Set())

    render(<KitScreen {...mockProps} kitId="kit-1" />)
    fireEvent.click(await screen.findByText('Add Components'))
    const dialog = await waitFor(() => screen.getByRole('dialog'))

    await waitFor(() => {
      expect(within(dialog).getByText('XLR Cable')).toBeInTheDocument()
    })
    // Off by default — same list as before the toggle existed.
    expect(within(dialog).queryByText('SM58 Mic')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Lighting Kit')).not.toBeInTheDocument()

    fireEvent.click(within(dialog).getByText('Show items already in this kit'))

    await waitFor(() => {
      expect(within(dialog).getByText('SM58 Mic')).toBeInTheDocument()
    })
    // Reachable via Audio Kit's flattened contents, not added directly — the
    // reason names that sub-kit.
    expect(within(dialog).getByText('Already in this kit via Audio Kit')).toBeInTheDocument()
    // A kit candidate's reason doesn't pinpoint which asset overlaps.
    expect(within(dialog).getByText('Lighting Kit')).toBeInTheDocument()
    expect(within(dialog).getByText('Contains assets already in this kit')).toBeInTheDocument()
    // Added directly to this kit, not via a sub-kit — no "via" clause.
    expect(within(dialog).getByText('Already in this kit')).toBeInTheDocument()
  })

  // Revealing an already-in-kit candidate makes it visible, not selectable —
  // same rule as a cyclic candidate.
  it('does not allow selecting an already-in-kit candidate even after the toggle reveals it', async () => {
    vi.mocked(getKit).mockResolvedValue({
      id: 'kit-1',
      name: 'Full Rack',
      kit_components: [
        { id: 'kc-1', child_kit_id: 'kit-audio', quantity: 1, child_kit: { id: 'kit-audio', name: 'Audio Kit' } },
      ],
    } as any)

    vi.mocked(getAssets).mockResolvedValue([
      { id: 'asset-2', manufacturer_model: 'SM58 Mic', quantity: 1 }, // already reachable via Audio Kit
    ] as any)

    // No kit candidates in this scenario — only the sub-kit already in the draft.
    vi.mocked(getKits).mockResolvedValue([])

    vi.mocked(getKitsFlattenedSummary).mockImplementation(async (ids: string[]) => {
      const all = new Map([
        ['kit-audio', { totalValue: 50, totalItems: 1, assetIds: new Set(['asset-2']) }],
      ])
      const result = new Map()
      for (const id of ids) if (all.has(id)) result.set(id, all.get(id))
      return result
    })

    vi.mocked(getKitsThatWouldCycle).mockResolvedValue(new Set())

    render(<KitScreen {...mockProps} kitId="kit-1" />)
    fireEvent.click(await screen.findByText('Add Components'))
    const dialog = await waitFor(() => screen.getByRole('dialog'))

    fireEvent.click(within(dialog).getByText('Show items already in this kit'))
    await waitFor(() => {
      expect(within(dialog).getByText('SM58 Mic')).toBeInTheDocument()
    })

    fireEvent.click(within(dialog).getByText('SM58 Mic'))
    expect(within(dialog).getByText('0 selected')).toBeInTheDocument()
  })

  // Regression: a cyclic candidate's flattened assets always overlap the
  // kit being edited too (nesting X into Y when X already contains Y means
  // X's flattened set already has everything Y has) — the duplicate-asset
  // rule must not silently exclude it ahead of the cycle check, or the
  // circular-reference warning above would never actually be reachable.
  it('flags a candidate as cyclic even when its flattened assets also overlap — the cycle check takes priority over the duplicate-asset rule', async () => {
    vi.mocked(getKit).mockResolvedValue({
      id: 'kit-1',
      name: 'Full Rack',
      kit_components: [
        { id: 'kc-1', asset_id: 'asset-1', quantity: 1, asset: { id: 'asset-1', manufacturer_model: 'DI Box' } },
      ],
    } as any)

    vi.mocked(getKits).mockResolvedValue([
      { id: 'kit-parent', name: 'Grand Rack', category: null, kit_components: [] },
    ] as any)

    vi.mocked(getKitsFlattenedSummary).mockImplementation(async (ids: string[]) => {
      // Grand Rack already contains Full Rack, so its flattened set already
      // includes Full Rack's own DI Box — a genuine duplicate overlap too.
      const all = new Map([
        ['kit-parent', { totalValue: 50, totalItems: 1, assetIds: new Set(['asset-1']) }],
      ])
      const result = new Map()
      for (const id of ids) if (all.has(id)) result.set(id, all.get(id))
      return result
    })

    vi.mocked(getKitsThatWouldCycle).mockResolvedValue(new Set(['kit-parent']))

    render(<KitScreen {...mockProps} kitId="kit-1" />)
    fireEvent.click(await screen.findByText('Add Components'))

    await waitFor(() => {
      expect(screen.getByText('Grand Rack')).toBeInTheDocument()
    })
    expect(screen.getByText(/Would create a circular reference/)).toBeInTheDocument()
  })
})
