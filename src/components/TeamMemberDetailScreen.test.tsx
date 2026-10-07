import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TeamMemberDetailScreen from './TeamMemberDetailScreen'
import { makeUser, makeOrganization } from '../test/factories'
import { getBackInHeaderSlot } from '../test/pageFrame'

vi.mock('../services/organization.service', () => ({
  getOrganizationMember: vi.fn().mockResolvedValue({
    id: 'm1',
    created_at: '2026-01-15T00:00:00Z',
    role: 'Staff',
    user: { id: 'other-user', first_name: 'Dana', last_name: 'Reyes', email: 'dana@example.com', user_status: 'active' },
  }),
  removeMember: vi.fn(),
}))

describe('TeamMemberDetailScreen page header (#39)', () => {
  it('puts Back to Team in the header slot, left of the member name', async () => {
    const onBack = vi.fn()
    render(
      <TeamMemberDetailScreen
        organization={makeOrganization({ name: 'Test Org' })}
        user={makeUser()}
        userRole="Admin"
        memberId="m1"
        onBack={onBack}
        onEdit={vi.fn()}
        onSwitchOrganization={vi.fn()}
        onLogout={vi.fn()}
      />,
    )
    expect(await screen.findByRole('heading', { level: 1, name: /Dana Reyes/ })).toBeInTheDocument()
    fireEvent.click(getBackInHeaderSlot('Back to Team'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
