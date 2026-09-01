import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InventoryTabScreen from './InventoryTabScreen'
import { makeUser, makeOrganization } from '../../test/factories'

// These sub-tab panels have their own dedicated tests — stub them here so
// this file only verifies the tab wiring, including the new "Tracking" tab.
vi.mock('./InventorySummaryDashboard', () => ({
  InventorySummaryDashboard: () => <div>Summary Panel</div>,
}))
vi.mock('./LocationExplorer', () => ({
  LocationExplorer: () => <div>Explorer Panel</div>,
}))
vi.mock('./InventoryReports', () => ({
  InventoryReports: () => <div>Reports Panel</div>,
}))
vi.mock('./TrackingTab', () => ({
  default: ({ organizationId }: { organizationId: string }) => <div>Tracking Panel for {organizationId}</div>,
}))

const mockProps = {
  organization: makeOrganization({ name: 'Test Org' }),
  user: makeUser(),
  userRole: 'Admin' as const,
  onNavigateToAssets: vi.fn(),
  onNavigateToKits: vi.fn(),
  onNavigateToInventory: vi.fn(),
}

describe('InventoryTabScreen', () => {
  it('renders a Tracking tab alongside Summary/Explorer/Reports, and switches to it on click', async () => {
    const user = userEvent.setup()
    render(<InventoryTabScreen {...mockProps} />)

    expect(screen.getByText('Summary Panel')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Tracking' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Tracking' }))

    await waitFor(() => {
      expect(screen.getByText(`Tracking Panel for ${mockProps.organization.id}`)).toBeInTheDocument()
    })
  })
})
