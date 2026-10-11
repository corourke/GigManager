import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ImportScreen from './ImportScreen'
import { makeUser, makeOrganization } from '../test/factories'
import { getBackInHeaderSlot } from '../test/pageFrame'
import { getItems } from '../services/equipmentItem.service'

vi.mock('../services/gig.service', () => ({ createGig: vi.fn() }))
vi.mock('../services/purchase.service', () => ({ importPurchases: vi.fn() }))
vi.mock('../services/organization.service', () => ({ searchOrganizations: vi.fn(), createOrganization: vi.fn() }))
vi.mock('../services/equipmentItem.service', () => ({ getItems: vi.fn(async () => []) }))
vi.mock('../services/kit.service', () => ({ getKitOptions: vi.fn(async () => []) }))

const props = {
  organization: makeOrganization({ name: 'Test Org' }),
  user: makeUser(),
  userRole: 'Admin' as const,
  onCancel: vi.fn(),
  onNavigateToGigs: vi.fn(),
  onSwitchOrganization: vi.fn(),
  onLogout: vi.fn(),
}

describe('ImportScreen page header (#39)', () => {
  it('names Back for the Gigs list by default and puts it in the header slot', () => {
    const onCancel = vi.fn()
    render(<ImportScreen {...props} onCancel={onCancel} />)
    expect(screen.getByRole('heading', { level: 1, name: 'CSV Import' })).toBeInTheDocument()
    fireEvent.click(getBackInHeaderSlot('Back to Gigs'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('opened from Assets: Back says so and the import type starts on Assets', () => {
    render(<ImportScreen {...props} backLabel="Back to Assets" initialImportType="assets" />)
    expect(getBackInHeaderSlot('Back to Assets')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveTextContent('Assets')
  })
})

describe('ImportScreen assets import (#183 D)', () => {
  const upload = (container: HTMLElement, lines: string[]) => {
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File([lines.join('\n')], 'purchases.csv', { type: 'text/csv' })] } })
  }
  const assetsProps = { ...props, backLabel: 'Back to Assets', initialImportType: 'assets' as const }

  it('offers the microphone example next to the template', () => {
    render(<ImportScreen {...assetsProps} />)
    expect(screen.getByRole('button', { name: 'Download Example' })).toBeInTheDocument()
  })

  it('lets an invalid row’s quantity, serial numbers, tags and kit be fixed on screen', async () => {
    const { container } = render(<ImportScreen {...assetsProps} />)
    upload(container, [
      'source,acquisition_date,vendor,category,manufacturer_model,quantity,serial_number,item_price',
      '1,2025-11-03,Sweetwater,Audio,Halden HX-8M,4,HX8M-55120,250',
    ])
    expect(await screen.findByText(/1 serial number for quantity 4/)).toBeInTheDocument()
    expect(screen.getByLabelText('Quantity')).toHaveValue('4')
    expect(screen.getByLabelText('Serial numbers')).toHaveValue('HX8M-55120')
    expect(screen.getByLabelText('Tags')).toHaveValue('')
    expect(screen.getByLabelText('Kit')).toHaveValue('')

    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '1' } })
    expect(await screen.findByText('Fixed')).toBeInTheDocument()
  })

  it('shows a notice for an old file’s retired_on and liquidation_amt columns', async () => {
    const { container } = render(<ImportScreen {...assetsProps} />)
    upload(container, [
      'source,acquisition_date,vendor,category,manufacturer_model,quantity,item_price,retired_on,liquidation_amt',
      '1,2025-11-03,Sweetwater,Audio,Shure SM58,1,99,2026-01-01,40',
    ])
    expect(await screen.findByText(/Record sales and retirements on the equipment page/)).toBeInTheDocument()
  })

  it('notes a quantity taken from the serials, a stored item that differs, and the kit', async () => {
    vi.mocked(getItems).mockResolvedValue([
      { id: 'item-58', organization_id: 'org-1', manufacturer_model: 'Shure SM58', category: 'Audio', type: 'Dynamic Microphone', description: null, insurance_class: null, records: [] } as any,
    ])
    const { container } = render(<ImportScreen {...assetsProps} />)
    upload(container, [
      'source,acquisition_date,vendor,category,manufacturer_model,type,quantity,serial_number,kit,item_price',
      '1,2025-11-03,Sweetwater,Audio,Shure SM58,Vocal Mic,,A;B;C;D,Mic Kit 1,99',
    ])
    expect(await screen.findByText('Qty 4 (from serials)')).toBeInTheDocument()
    expect(await screen.findByText('Differs from the stored item (type). The stored item’s details are kept.')).toBeInTheDocument()
    expect(screen.getByText('Mic Kit 1 (new kit)')).toBeInTheDocument()
  })
})
