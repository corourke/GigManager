import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EquipmentHeader from './EquipmentHeader'

const mockProps = {
  activeTab: 'assets' as const,
  onNavigateToAssets: vi.fn(),
  onNavigateToKits: vi.fn(),
  onNavigateToInventory: vi.fn(),
}

describe('EquipmentHeader', () => {
  it('titles every Equipment tab "Equipment", so the title does not change between tabs', () => {
    render(<EquipmentHeader {...mockProps} activeTab="kits" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Equipment' })).toBeInTheDocument()
  })

  it('has one row of five tabs: Assets, Kits, Out on gigs, Locations, Maintenance (#39)', () => {
    render(<EquipmentHeader {...mockProps} />)
    expect(screen.getAllByRole('tablist')).toHaveLength(1)
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Assets', 'Kits', 'Out on gigs', 'Locations', 'Maintenance',
    ])
  })

  it('navigates to the clicked tab, once', async () => {
    const onNavigateToInventory = vi.fn()
    render(<EquipmentHeader {...mockProps} onNavigateToInventory={onNavigateToInventory} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Locations' }))
    expect(onNavigateToInventory).toHaveBeenCalledOnce()
    expect(onNavigateToInventory).toHaveBeenCalledWith('locations')
  })

  it('marks the active tab', () => {
    render(<EquipmentHeader {...mockProps} activeTab="maintenance" />)
    expect(screen.getByRole('tab', { name: 'Maintenance' })).toHaveAttribute('data-state', 'active')
    expect(screen.getByRole('tab', { name: 'Assets' })).toHaveAttribute('data-state', 'inactive')
  })

  it('shows the page actions on the title row', () => {
    render(<EquipmentHeader {...mockProps} actions={<button>Add Asset</button>} />)
    expect(screen.getByRole('button', { name: 'Add Asset' })).toBeInTheDocument()
  })
})
