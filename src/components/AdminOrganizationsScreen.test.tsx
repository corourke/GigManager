import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AdminOrganizationsScreen from './AdminOrganizationsScreen'
import { makeUser } from '../test/factories'
import { getBackInHeaderSlot } from '../test/pageFrame'

vi.mock('./AppHeader', () => ({ default: () => null }))
vi.mock('../utils/supabase/client', () => ({
  createClient: () => ({ functions: { invoke: vi.fn().mockResolvedValue({ data: [], error: null }) } }),
}))

describe('AdminOrganizationsScreen page header (#39)', () => {
  it('puts Back to Select Organization in the header slot', async () => {
    const onBack = vi.fn()
    render(
      <AdminOrganizationsScreen
        user={makeUser()}
        organizations={[]}
        onEditOrganization={vi.fn()}
        onCreateOrganization={vi.fn()}
        onBack={onBack}
        onLogout={vi.fn()}
        onEditProfile={vi.fn()}
      />,
    )
    expect(await screen.findByRole('heading', { level: 1, name: 'Admin: All Organizations' })).toBeInTheDocument()
    fireEvent.click(getBackInHeaderSlot('Back to Select Organization'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
