import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InventoryTabScreen from './InventoryTabScreen'
import { makeUser, makeOrganization } from '../../test/factories'

// The panels have their own tests; stub them so this file checks the wiring.
vi.mock('./InventorySummaryDashboard', () => ({
  InventorySummaryDashboard: ({ onTrack }: { onTrack?: (gigId: string) => void }) => (
    <div>
      Summary Panel
      <button onClick={() => onTrack?.('gig-7')}>Track gig-7</button>
    </div>
  ),
}))
vi.mock('./LocationExplorer', () => ({
  LocationExplorer: () => <div>Explorer Panel</div>,
}))
vi.mock('./InventoryReports', () => ({
  ManifestReport: () => <div>Manifest Panel</div>,
  MaintenanceQueue: () => <div>Maintenance Panel</div>,
}))
vi.mock('./TrackingTab', () => ({
  default: ({ initialGigId }: { initialGigId?: string }) => <div>Tracking Panel for {initialGigId ?? 'no gig'}</div>,
}))

const mockProps = {
  organization: makeOrganization({ name: 'Test Org' }),
  user: makeUser(),
  userRole: 'Admin' as const,
  onNavigateToAssets: vi.fn(),
  onNavigateToKits: vi.fn(),
  onNavigateToInventory: vi.fn(),
}

describe('InventoryTabScreen (Equipment › Out on gigs, Locations, Maintenance, #39)', () => {
  it('has exactly one row of tabs, the Equipment tabs, and no sub-tabs', () => {
    render(<InventoryTabScreen {...mockProps} subTab="out-on-gigs" />)
    expect(screen.getAllByRole('tablist')).toHaveLength(1)
    expect(screen.getByRole('tab', { name: 'Out on gigs' })).toHaveAttribute('data-state', 'active')
  })

  it('Out on gigs: the summary, and Track opens the scanning panel for that gig', async () => {
    const user = userEvent.setup()
    render(<InventoryTabScreen {...mockProps} subTab="out-on-gigs" />)
    expect(screen.getByText('Summary Panel')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Track gig-7' }))
    expect(await screen.findByText('Tracking Panel for gig-7')).toBeInTheDocument()
  })

  it('Out on gigs: "Track a gig" in the title row opens the panel with no gig picked', async () => {
    const user = userEvent.setup()
    render(<InventoryTabScreen {...mockProps} subTab="out-on-gigs" />)
    await user.click(screen.getByRole('button', { name: 'Track a gig' }))
    expect(await screen.findByText('Tracking Panel for no gig')).toBeInTheDocument()
  })

  it('Locations: the explorer, and "Print manifest" in the title row opens the manifest', async () => {
    const user = userEvent.setup()
    render(<InventoryTabScreen {...mockProps} subTab="locations" />)
    expect(screen.getByText('Explorer Panel')).toBeInTheDocument()
    expect(screen.queryByText('Manifest Panel')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Print manifest' }))
    expect(await screen.findByText('Manifest Panel')).toBeInTheDocument()
  })

  it('Maintenance: the maintenance queue', () => {
    render(<InventoryTabScreen {...mockProps} subTab="maintenance" />)
    expect(screen.getByText('Maintenance Panel')).toBeInTheDocument()
  })

  it('switching tabs goes through the URL', async () => {
    const onNavigateToInventory = vi.fn()
    const user = userEvent.setup()
    render(<InventoryTabScreen {...mockProps} subTab="out-on-gigs" onNavigateToInventory={onNavigateToInventory} />)
    await user.click(screen.getByRole('tab', { name: 'Maintenance' }))
    expect(onNavigateToInventory).toHaveBeenCalledWith('maintenance')
  })
})
