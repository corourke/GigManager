import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ImportScreen from './ImportScreen'
import { makeUser, makeOrganization } from '../test/factories'
import { getBackInHeaderSlot } from '../test/pageFrame'
import { getItems } from '../services/equipmentItem.service'
import { importPurchases } from '../services/purchase.service'
import { createClient } from '../utils/supabase/client'

// Lets a test make the preview's planning fail (#183 D review).
const planControl = vi.hoisted(() => ({ fail: null as string | null }))
vi.mock('../utils/csvAssetImportPlan', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/csvAssetImportPlan')>()
  return {
    ...actual,
    buildAssetImportPlan: (...args: Parameters<typeof actual.buildAssetImportPlan>) => {
      if (planControl.fail) throw new Error(planControl.fail)
      return actual.buildAssetImportPlan(...args)
    },
  }
})

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

// Review of #183 D: only complete purchases import; a failed purchase can be retried alone.
describe('ImportScreen assets import: held, failed and broken purchases (#183 D)', () => {
  const upload = (container: HTMLElement, lines: string[]) => {
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File([lines.join('\n')], 'purchases.csv', { type: 'text/csv' })] } })
  }
  const assetsProps = { ...props, backLabel: 'Back to Assets', initialImportType: 'assets' as const }
  const COLS = 'source,acquisition_date,vendor,total_inv_amount,manufacturer_model,category,quantity,serial_number,kit,item_price'
  const signedIn = () => vi.mocked(createClient).mockReturnValue({
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 't' } } }) },
  } as any)
  const sentRows = (call: number) => (vi.mocked(importPurchases).mock.calls[call][1].purchases).map((p) => p.rowIndexes)

  afterEach(() => {
    planControl.fail = null
    vi.mocked(importPurchases).mockReset()
  })

  it('imports only complete purchases, and says which row holds the others back', async () => {
    signedIn()
    vi.mocked(importPurchases).mockResolvedValue({ successCount: 2, errors: [], results: [{ rowIndexes: [2, 3], status: 'success' }] })
    const { container } = render(<ImportScreen {...assetsProps} />)
    upload(container, [
      COLS,
      '0,2025-01-01,Vendor A,110,,,,,,',
      '1,,,,Item A1,Audio,1,,,100',
      '0,2025-02-01,Vendor B,,,,,,,', // no total: invalid
      '1,,,,Item B1,Audio,1,s1,K,100',
    ])
    expect(await screen.findByText('Held: fix row 4')).toBeInTheDocument()
    expect(screen.getByText('1 purchase held back until its invalid rows are fixed.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Import 1 Complete Purchase(s)' }))
    await waitFor(() => expect(importPurchases).toHaveBeenCalledTimes(1))
    expect(sentRows(0)).toEqual([[2, 3]])
    expect(await screen.findByText(/Purchases with an invalid row are held back and aren’t imported/)).toBeInTheDocument()
  })

  it('retries only the purchase that failed', async () => {
    signedIn()
    vi.mocked(importPurchases)
      .mockResolvedValueOnce({ successCount: 2, errors: ['Purchase on 2025-01-01 from Vendor A: boom'], results: [
        { rowIndexes: [2, 3], status: 'failed', error: 'boom' },
        { rowIndexes: [4, 5], status: 'success' },
      ] })
      .mockResolvedValueOnce({ successCount: 2, errors: [], results: [{ rowIndexes: [2, 3], status: 'success' }] })
    const { container } = render(<ImportScreen {...assetsProps} />)
    upload(container, [
      COLS,
      '0,2025-01-01,Vendor A,100,,,,,,',
      '1,,,,Item A1,Audio,1,,,100',
      '0,2025-02-01,Vendor B,100,,,,,,',
      '1,,,,Item B1,Audio,1,,,100',
    ])
    fireEvent.click(await screen.findByRole('button', { name: 'Import 2 Complete Purchase(s)' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Retry 1 Failed Purchase(s)' }))
    await waitFor(() => expect(importPurchases).toHaveBeenCalledTimes(2))
    expect(sentRows(1)).toEqual([[2, 3]])
    await waitFor(() => expect(screen.queryByRole('button', { name: /Retry/ })).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /Complete Purchase/ })).not.toBeInTheDocument()
  })

  it('shows a planning error inline instead of crashing the screen', async () => {
    planControl.fail = 'boom'
    const { container } = render(<ImportScreen {...assetsProps} />)
    upload(container, [COLS, '1,2025-01-01,Vendor A,,Item A1,Audio,1,,,100'])
    expect(await screen.findByText('Couldn’t build the import preview: boom')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'CSV Import' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Complete Purchase/ })).not.toBeInTheDocument()
  })

  it('refuses a quantity of 1e1 with one serial instead of crashing', async () => {
    const { container } = render(<ImportScreen {...assetsProps} />)
    upload(container, [COLS, '1,2025-01-01,Vendor A,,Item A1,Audio,1e1,S1,,100'])
    expect(await screen.findByText('Invalid quantity "1e1". Must be a whole number.')).toBeInTheDocument()
  })
})
