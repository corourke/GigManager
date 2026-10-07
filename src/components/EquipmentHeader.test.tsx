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

  it('renders the three tabs below the title', () => {
    render(<EquipmentHeader {...mockProps} />)
    expect(screen.getByRole('tab', { name: 'Assets' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Kits' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Inventory' })).toBeInTheDocument()
  })

  it('calls onNavigateToInventory when Inventory tab is clicked', async () => {
    const onNavigateToInventory = vi.fn()
    render(<EquipmentHeader {...mockProps} onNavigateToInventory={onNavigateToInventory} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Inventory' }))
    expect(onNavigateToInventory).toHaveBeenCalledOnce()
  })

  it('marks the active tab', () => {
    render(<EquipmentHeader {...mockProps} activeTab="inventory" />)
    expect(screen.getByRole('tab', { name: 'Inventory' })).toHaveAttribute('data-state', 'active')
    expect(screen.getByRole('tab', { name: 'Assets' })).toHaveAttribute('data-state', 'inactive')
  })

  it('shows the page actions on the title row', () => {
    render(<EquipmentHeader {...mockProps} actions={<button>Add Asset</button>} />)
    expect(screen.getByRole('button', { name: 'Add Asset' })).toBeInTheDocument()
  })
})
