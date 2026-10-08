import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ItemDetailScreen from './ItemDetailScreen'
import { makeUser, makeOrganization } from '../test/factories'
import { updateItem } from '../services/equipmentItem.service'

const unit = (n: number, over: Record<string, unknown> = {}) => ({
  id: `k12-${n}`,
  organization_id: 'org-1',
  equipment_item_id: 'item-k12',
  manufacturer_model: 'QSC K12.2',
  category: 'Audio',
  quantity: 1,
  serial_number: `GAA21340${n}`,
  tag_number: `DSL-010${n}`,
  status: 'Active',
  replacement_value: 999,
  item_cost: 899,
  vendor: 'Sweetwater',
  acquisition_date: '2024-03-12',
  recovery_period: '5-year',
  ...over,
})

const item = {
  id: 'item-k12',
  organization_id: 'org-1',
  manufacturer_model: 'QSC K12.2',
  category: 'Audio',
  type: 'Speaker, Powered, Full-Range',
  description: '12″ two-way powered loudspeaker.',
  insurance_class: 'Class B',
  records: [unit(1), unit(2), unit(3), unit(4, { status: 'Maintenance' }), unit(5, { replacement_value: 1049 }), unit(6, { replacement_value: 1049 })],
}

vi.mock('../services/equipmentItem.service', () => ({
  getItem: vi.fn(() => Promise.resolve(item)),
  getContainerPieces: vi.fn(() => Promise.resolve(new Map())),
  getItemKitLines: vi.fn(() => Promise.resolve([
    { id: 'l1', quantity: 2, asset_id: null, equipment_item_id: 'item-k12', kit: { id: 'pa', name: 'Main PA: K12.2 Pair', tag_number: 'KIT-005', is_container: false } },
    { id: 'l2', quantity: 1, asset_id: 'k12-5', equipment_item_id: null, kit: { id: 'side', name: 'Monitor Pair, Side Fill', tag_number: 'KIT-007', is_container: false } },
  ])),
  updateItem: vi.fn(() => Promise.resolve({})),
}))

vi.mock('../services/inventoryManagement.service', () => ({
  getAssetTrackingSummary: vi.fn().mockResolvedValue(new Map([['k12-4', { status: 'In Warehouse', location: 'Repair Bench' }]])),
}))

const props = {
  organization: makeOrganization({ id: 'org-1' }),
  user: makeUser(),
  userRole: 'Admin' as const,
  itemId: 'item-k12',
  onBack: vi.fn(),
  onViewAsset: vi.fn(),
  onAddRecord: vi.fn(),
  onViewKit: vi.fn(),
  onSwitchOrganization: vi.fn(),
  onLogout: vi.fn(),
}

describe('ItemDetailScreen (#182)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the item, with Back to Items', async () => {
    render(<ItemDetailScreen {...props} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'QSC K12.2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to Items' })).toBeInTheDocument()
    expect(screen.getByText('Class B')).toBeInTheDocument()
  })

  it('counts what is owned and available from the units', async () => {
    render(<ItemDetailScreen {...props} />)
    const inventory = (await screen.findByRole('heading', { name: 'Inventory' })).closest('section')!
    expect(within(inventory).getByTestId('owned')).toHaveTextContent('6')
    expect(within(inventory).getByTestId('available')).toHaveTextContent('5')
    expect(within(inventory).getByTestId('in-maintenance')).toHaveTextContent('1')
    expect(within(inventory).getByText('$6,094.00')).toBeInTheDocument()
  })

  it('lists the units with tag, serial, status and replacement value, and opens one', async () => {
    const ue = userEvent.setup()
    render(<ItemDetailScreen {...props} />)
    const units = (await screen.findByRole('heading', { name: 'Units and lots' })).closest('section')!
    const row = (await within(units).findByText('DSL-0104')).closest('tr')!
    expect(within(row).getByText('GAA213404')).toBeInTheDocument()
    expect(within(row).getByText('Maintenance')).toBeInTheDocument()
    expect(within(row).getByText('Repair Bench')).toBeInTheDocument()
    expect(within(within(units).getByText('DSL-0105').closest('tr')!).getByText('$1,049')).toBeInTheDocument()
    await ue.click(within(units).getByText('DSL-0101'))
    expect(props.onViewAsset).toHaveBeenCalledWith('k12-1')
  })

  it('shows the kits that use the item, both kinds of line', async () => {
    render(<ItemDetailScreen {...props} />)
    const kits = (await screen.findByRole('heading', { name: 'Used in kits' })).closest('section')!
    expect(await within(kits).findByText('Main PA: K12.2 Pair')).toBeInTheDocument()
    expect(within(kits).getByText('2 × any')).toBeInTheDocument()
    expect(within(kits).getByText('Monitor Pair, Side Fill')).toBeInTheDocument()
    expect(within(kits).getByText('DSL-0105')).toBeInTheDocument()
  })

  it('adds a unit or lot to this item', async () => {
    const ue = userEvent.setup()
    render(<ItemDetailScreen {...props} />)
    await screen.findByText('DSL-0101')
    await ue.click(screen.getAllByRole('button', { name: /Add unit or lot/ })[0])
    expect(props.onAddRecord).toHaveBeenCalledWith('item-k12')
  })

  it('edits the shared fields in place and saves them to the item', async () => {
    const ue = userEvent.setup()
    render(<ItemDetailScreen {...props} />)
    await screen.findByText('DSL-0101')
    await ue.click(screen.getByRole('button', { name: 'Edit' }))
    const field = screen.getByLabelText('Insurance class')
    await ue.clear(field)
    await ue.type(field, 'Class A')
    await ue.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(updateItem).toHaveBeenCalledWith('item-k12', expect.objectContaining({ insurance_class: 'Class A' })))
  })

  it('hides editing from read-only roles', async () => {
    render(<ItemDetailScreen {...props} userRole="Viewer" />)
    await screen.findByText('DSL-0101')
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add unit or lot/ })).not.toBeInTheDocument()
  })
})
