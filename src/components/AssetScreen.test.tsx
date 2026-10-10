import type { ReactElement } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render as rtlRender, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AssetScreen from './AssetScreen'
import { makeUser, makeOrganization } from '../test/factories'
import { getBackInHeaderSlot } from '../test/pageFrame'

// AssetScreen now uses TanStack Query — renders need a QueryClientProvider.
function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

const k12Item = {
  id: 'item-k12', organization_id: 'org-1', manufacturer_model: 'QSC K12.2', category: 'Audio',
  type: 'Speaker, Powered, Full-Range', description: null, insurance_class: 'Class B', records: [],
}
vi.mock('../services/equipmentItem.service', () => ({
  getItem: vi.fn(() => Promise.resolve(k12Item)),
  getItems: vi.fn(() => Promise.resolve([k12Item])),
}))

// Mock all dependencies
vi.mock('../services/asset.service', () => ({
  getAsset: vi.fn().mockResolvedValue({}),
  createAsset: vi.fn().mockResolvedValue({ id: 'new-1', equipment_item_id: 'item-k12' }),
  createAssets: vi.fn().mockResolvedValue([{ id: 'new-1', equipment_item_id: 'item-k12' }]),
  updateAsset: vi.fn(),
  getAssetStatusHistory: vi.fn().mockResolvedValue([]),
  getAssetInventoryTracking: vi.fn().mockResolvedValue([]),
  getAssetDepreciatedDate: vi.fn().mockResolvedValue(null),
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

vi.mock('../services/purchaseCategory.service', () => ({
  getEquipmentCategories: vi.fn().mockResolvedValue(['Audio', 'Lighting']),
  getEquipmentCategoryPeriods: vi.fn().mockResolvedValue({}),
  getTypeUsage: vi.fn().mockResolvedValue([]),
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
  beforeEach(() => vi.clearAllMocks())

  it('is Add Item when opened from Equipment, with Back to Items in the header slot (#39, #183)', () => {
    const onCancel = vi.fn()
    render(<AssetScreen {...mockProps} onCancel={onCancel} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Add Item' })).toBeInTheDocument()
    fireEvent.click(getBackInHeaderSlot('Back to Items'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('renders in edit mode without throwing errors', () => {
    expect(() => {
      render(<AssetScreen {...mockProps} assetId="test-id" />)
    }).not.toThrow()
  })

  it('editing a unit: switching it to Lot asks first, because its serial and tag go', async () => {
    const svc = await import('../services/asset.service')
    vi.mocked(svc.getAsset).mockResolvedValue({
      id: 'u1', organization_id: 'org-1', equipment_item_id: 'item-k12', manufacturer_model: 'QSC K12.2', category: 'Audio',
      serial_number: 'S1', tag_number: 'T1', quantity: 1, status: 'Active', acquisition_date: '2026-03-01',
    } as any)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const ue = userEvent.setup()
    render(<AssetScreen {...mockProps} assetId="u1" />)
    expect(await screen.findByDisplayValue('S1')).toBeInTheDocument()
    await ue.click(screen.getByRole('radio', { name: /Lot/ }))
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/serial number and tag/))
    expect(screen.getByRole('radio', { name: /Unit/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByDisplayValue('S1')).toBeInTheDocument()
    confirm.mockRestore()
    vi.mocked(svc.getAsset).mockResolvedValue({} as any)
  })

  it('a written-off record\'s status can\'t be changed by hand: it says where to undo (#185)', async () => {
    const svc = await import('../services/asset.service')
    vi.mocked(svc.getAsset).mockResolvedValue({
      id: 'u1', organization_id: 'org-1', equipment_item_id: 'item-k12', manufacturer_model: 'QSC K12.2', category: 'Audio',
      serial_number: 'S1', tag_number: 'T1', quantity: 1, status: 'Missing', retired_on: '2026-10-09', acquisition_date: '2026-03-01',
    } as any)
    render(<AssetScreen {...mockProps} assetId="u1" />)
    expect((await screen.findAllByText(/Written off as missing/)).length).toBeGreaterThan(0)
    expect(screen.getByRole('combobox', { name: 'Status' })).toBeDisabled()
    vi.mocked(svc.getAsset).mockResolvedValue({} as any)
  })

  describe('a written-off (Missing) record (#242)', () => {
    const missing = {
      id: 'u1', organization_id: 'org-1', equipment_item_id: 'item-k12', manufacturer_model: 'QSC K12.2', category: 'Audio',
      serial_number: 'S1', tag_number: 'T1', quantity: 1, status: 'Missing', retired_on: '2026-10-09', acquisition_date: '2026-03-01',
      item_price: 500, item_cost: 400, replacement_value: 900, liquidation_amt: null,
    }
    const loadMissing = async () => {
      const svc = await import('../services/asset.service')
      vi.mocked(svc.getAsset).mockResolvedValue(missing as any)
      vi.mocked(svc.updateAsset).mockResolvedValue({ id: 'u1' } as any)
      render(<AssetScreen {...mockProps} assetId="u1" />)
      expect(await screen.findByDisplayValue('S1')).toBeInTheDocument()
      return svc
    }
    const restore = async () => {
      const svc = await import('../services/asset.service')
      vi.mocked(svc.getAsset).mockResolvedValue({} as any)
    }

    it('locks Retired On and the disposal amount like Status, with the note pointing to Undo', async () => {
      await loadMissing()
      expect(screen.getByRole('combobox', { name: 'Status' })).toBeDisabled()
      expect(screen.getByLabelText('Retired On')).toBeDisabled()
      expect(screen.getByLabelText(/Disposal or Salvage Amount/)).toBeDisabled()
      expect(screen.getAllByText(/use Undo in the gig's Not returned list/).length).toBeGreaterThanOrEqual(3)
      await restore()
    })

    it('a disposal amount does not flip a Missing record to Disposed', async () => {
      await loadMissing()
      // The field is disabled; force the change event to prove the handler is guarded too.
      fireEvent.change(screen.getByLabelText(/Disposal or Salvage Amount/), { target: { value: '50' } })
      expect(screen.queryByText(/marked as disposed/)).not.toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Missing')
      await restore()
    })

    it('the save payload never changes status, retired_on or liquidation_amt', async () => {
      const ue = userEvent.setup()
      const svc = await loadMissing()
      fireEvent.change(screen.getByLabelText(/Disposal or Salvage Amount/), { target: { value: '50' } })
      fireEvent.change(screen.getByLabelText('Retired On'), { target: { value: '2025-01-01' } })
      const price = document.getElementById('item_price') as HTMLElement
      await ue.clear(price)
      await ue.type(price, '600')
      await ue.click(screen.getByRole('button', { name: /Update Unit/ }))
      await waitFor(() => expect(svc.updateAsset).toHaveBeenCalled())
      const payload = vi.mocked(svc.updateAsset).mock.calls[0][1] as Record<string, unknown>
      expect(payload).toHaveProperty('item_price', 600)
      for (const f of ['status', 'retired_on', 'liquidation_amt']) expect(payload, f).not.toHaveProperty(f)
      await restore()
    })

    it('a record that is not Missing still flips to Disposed when a disposal amount is typed', async () => {
      const ue = userEvent.setup()
      const svc = await import('../services/asset.service')
      vi.mocked(svc.getAsset).mockResolvedValue({ ...missing, status: 'Active', retired_on: null } as any)
      render(<AssetScreen {...mockProps} assetId="u1" />)
      expect(await screen.findByDisplayValue('S1')).toBeInTheDocument()
      expect(screen.getByLabelText('Retired On')).toBeEnabled()
      await ue.type(screen.getByLabelText(/Disposal or Salvage Amount/), '50')
      expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Disposed')
      await restore()
    })
  })

  it('clearing a money field on a unit saves null, not nothing (#226)', async () => {
    const svc = await import('../services/asset.service')
    vi.mocked(svc.getAsset).mockResolvedValue({
      id: 'u1', organization_id: 'org-1', equipment_item_id: 'item-k12', manufacturer_model: 'QSC K12.2', category: 'Audio',
      serial_number: 'S1', tag_number: 'T1', quantity: 1, status: 'Disposed', acquisition_date: '2026-03-01',
      item_price: 500, item_cost: 400, replacement_value: 900, liquidation_amt: 150,
    } as any)
    vi.mocked(svc.updateAsset).mockResolvedValue({ id: 'u1' } as any)
    const ue = userEvent.setup()
    render(<AssetScreen {...mockProps} assetId="u1" />)
    expect(await screen.findByDisplayValue('S1')).toBeInTheDocument()
    for (const id of ['item_price', 'item_cost', 'liquidation_amt']) {
      await ue.clear(document.getElementById(id) as HTMLElement)
    }
    await ue.clear(screen.getByLabelText('Replacement Value'))
    await ue.click(screen.getByRole('button', { name: /Update Unit/ }))
    await waitFor(() => expect(svc.updateAsset).toHaveBeenCalled())
    const payload = vi.mocked(svc.updateAsset).mock.calls[0][1] as Record<string, unknown>
    for (const f of ['item_price', 'item_cost', 'replacement_value', 'liquidation_amt']) {
      expect(payload, f).toHaveProperty(f, null)
    }
    vi.mocked(svc.getAsset).mockResolvedValue({} as any)
  })

  describe('Add Item (#183)', () => {
    it('a new item takes its insurance class and description in What it is, and has no Lifecycle', () => {
      render(<AssetScreen {...mockProps} />)
      const whatItIs = screen.getByRole('region', { name: 'What it is' })
      expect(within(whatItIs).getByLabelText('Insurance Class')).toBeInTheDocument()
      expect(within(whatItIs).getByLabelText('Description')).toBeInTheDocument()
      expect(screen.queryByRole('region', { name: 'Lifecycle' })).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Status')).not.toBeInTheDocument()
    })

    it('adds a new item with 3 units in one form: one record per serial/tag row', async () => {
      const ue = userEvent.setup()
      const { createAssets } = await import('../services/asset.service')
      const onBackToItem = vi.fn()
      render(<AssetScreen {...mockProps} onBackToItem={onBackToItem} />)
      await ue.type(screen.getByLabelText(/Manufacturer and Model/), 'Shure ULXD2/SM58')
      await ue.selectOptions(screen.getByLabelText(/^Category/), 'Audio')
      await ue.type(screen.getByLabelText('Insurance Class'), 'Class B')
      const qty = screen.getByLabelText('Quantity')
      await ue.clear(qty)
      await ue.type(qty, '3')
      await ue.type(screen.getByLabelText('Serial number, unit 1'), 'SN1')
      await ue.type(screen.getByLabelText('Inventory tag, unit 2'), 'DSL-0152')
      await ue.type(screen.getByLabelText('Serial number, unit 3'), 'SN3')
      await ue.type(screen.getByLabelText('Replacement Value'), '1099')
      fireEvent.change(screen.getByLabelText(/Acquisition Date/), { target: { value: '2026-10-02' } })
      await ue.click(screen.getByRole('button', { name: 'Add Item and 3 Units' }))

      await waitFor(() => expect(createAssets).toHaveBeenCalledTimes(1))
      const records = vi.mocked(createAssets).mock.calls[0][0] as any[]
      expect(records.map((r) => [r.serial_number, r.tag_number, r.quantity])).toEqual([['SN1', null, 1], [null, 'DSL-0152', 1], ['SN3', null, 1]])
      expect(records.every((r) => r.manufacturer_model === 'Shure ULXD2/SM58' && r.category === 'Audio'
        && r.insurance_class === 'Class B' && r.replacement_value === 1099 && r.acquisition_date === '2026-10-02')).toBe(true)
      expect(onBackToItem).toHaveBeenCalledWith('item-k12')
    })

    it('won’t save a unit with neither a serial nor a tag', async () => {
      const ue = userEvent.setup()
      const { createAssets } = await import('../services/asset.service')
      render(<AssetScreen {...mockProps} itemId="item-k12" />)
      await screen.findByText('Audio · Speaker, Powered, Full-Range · Class B')
      const qty = screen.getByLabelText('Quantity')
      await ue.clear(qty)
      await ue.type(qty, '2')
      await ue.type(screen.getByLabelText('Inventory tag, unit 1'), 'DSL-0107')
      fireEvent.change(screen.getByLabelText(/Acquisition Date/), { target: { value: '2025-05-02' } })
      await ue.click(screen.getByRole('button', { name: 'Add 2 Units' }))
      expect(screen.getAllByText('Unit 2 needs a serial number or a tag (either will do).').length).toBeGreaterThan(0)
      expect(createAssets).not.toHaveBeenCalled()
    })
  })

  describe('Add unit or lot (#182, #183)', () => {
    it('adds to an item: shows what it is, and Back goes to the item', async () => {
      const onBackToItem = vi.fn()
      render(<AssetScreen {...mockProps} itemId="item-k12" onBackToItem={onBackToItem} />)
      expect(screen.getByRole('heading', { level: 1, name: 'Add unit or lot' })).toBeInTheDocument()
      expect(await screen.findByText('Audio · Speaker, Powered, Full-Range · Class B')).toBeInTheDocument()
      fireEvent.click(getBackInHeaderSlot('Back to QSC K12.2'))
      expect(onBackToItem).toHaveBeenCalledWith('item-k12')
    })

    it('adds a unit of the item, named by the item', async () => {
      const ue = userEvent.setup()
      const { createAssets } = await import('../services/asset.service')
      render(<AssetScreen {...mockProps} itemId="item-k12" />)
      await screen.findByText('Audio · Speaker, Powered, Full-Range · Class B')
      await ue.type(screen.getByLabelText('Inventory tag'), 'DSL-0107')
      fireEvent.change(screen.getByLabelText(/Acquisition Date/), { target: { value: '2025-05-02' } })
      await ue.click(screen.getByRole('button', { name: 'Add Unit' }))
      await waitFor(() => expect(createAssets).toHaveBeenCalledWith([expect.objectContaining({
        equipment_item_id: 'item-k12', manufacturer_model: 'QSC K12.2', category: 'Audio', tag_number: 'DSL-0107', quantity: 1,
      })]))
    })

    it('a lot is one record of its quantity, with no serial or tag', async () => {
      const ue = userEvent.setup()
      const { createAssets } = await import('../services/asset.service')
      render(<AssetScreen {...mockProps} itemId="item-k12" />)
      await screen.findByText('Audio · Speaker, Powered, Full-Range · Class B')
      await ue.click(screen.getByRole('radio', { name: /Lot/ }))
      expect(screen.getByLabelText('Serial Number')).toBeDisabled()
      const qty = screen.getByLabelText('Quantity')
      await ue.clear(qty)
      await ue.type(qty, '10')
      fireEvent.change(screen.getByLabelText(/Acquisition Date/), { target: { value: '2025-05-02' } })
      await ue.click(screen.getByRole('button', { name: 'Add Lot' }))
      await waitFor(() => expect(createAssets).toHaveBeenCalledWith([expect.objectContaining({
        quantity: 10, serial_number: null, tag_number: null,
      })]))
    })

    it('picks an existing item when none is given', async () => {
      const ue = userEvent.setup()
      render(<AssetScreen {...mockProps} />)
      await ue.click(screen.getByRole('radio', { name: /An item we already have/ }))
      await ue.selectOptions(await screen.findByLabelText('Item'), 'item-k12')
      expect(screen.getByRole('button', { name: 'Add Unit' })).toBeInTheDocument()
    })
  })
})
