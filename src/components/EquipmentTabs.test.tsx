import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EquipmentTabs from './EquipmentTabs'

const mockProps = {
  activeTab: 'assets' as const,
  onNavigateToAssets: vi.fn(),
  onNavigateToKits: vi.fn(),
  onNavigateToInventory: vi.fn(),
}

describe('EquipmentTabs', () => {
  it('renders all three tabs', () => {
    render(<EquipmentTabs {...mockProps} />)
    expect(screen.getByText('Assets')).toBeDefined()
    expect(screen.getByText('Kits')).toBeDefined()
    expect(screen.getByText('Inventory')).toBeDefined()
  })

  it('calls onNavigateToInventory when Inventory tab is clicked', () => {
    const onNavigateToInventory = vi.fn()
    render(<EquipmentTabs {...mockProps} onNavigateToInventory={onNavigateToInventory} />)
    fireEvent.click(screen.getByText('Inventory'))
    expect(onNavigateToInventory).toHaveBeenCalledOnce()
  })

  it('highlights the active inventory tab', () => {
    render(<EquipmentTabs {...mockProps} activeTab="inventory" />)
    const inventoryBtn = screen.getByText('Inventory')
    expect(inventoryBtn.className).toContain('border-sky-500')
  })
})
