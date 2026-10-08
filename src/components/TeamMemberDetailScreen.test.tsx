import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TeamMemberDetailScreen from './TeamMemberDetailScreen'
import { getOrganizationMember, updateMemberDetails } from '../services/organization.service'
import { makeUser, makeOrganization } from '../test/factories'
import { getBackInHeaderSlot } from '../test/pageFrame'

function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

vi.mock('../services/organization.service', () => ({
  getOrganizationMember: vi.fn().mockResolvedValue({
    id: 'm1',
    created_at: '2026-01-15T00:00:00Z',
    role: 'Staff',
    default_staff_role_id: 'sr-foh',
    user: { id: 'other-user', first_name: 'Dana', last_name: 'Reyes', email: 'dana@example.com', user_status: 'active', timezone: 'America/Chicago' },
  }),
  getStaffRoles: vi.fn().mockResolvedValue([
    { id: 'sr-a1', name: 'A1' },
    { id: 'sr-foh', name: 'FOH Engineer' },
  ]),
  updateMemberDetails: vi.fn().mockResolvedValue({}),
  removeMember: vi.fn(),
}))

const baseProps = {
  organization: makeOrganization({ name: 'Test Org' }),
  user: makeUser(),
  userRole: 'Admin' as const,
  memberId: 'm1',
  onSwitchOrganization: vi.fn(),
  onLogout: vi.fn(),
}

describe('TeamMemberDetailScreen page header (#39)', () => {
  it('puts Back to Team in the header slot, left of the member name', async () => {
    const onBack = vi.fn()
    render(<TeamMemberDetailScreen {...baseProps} onBack={onBack} />)
    expect(await screen.findByRole('heading', { level: 1, name: /Dana Reyes/ })).toBeInTheDocument()
    fireEvent.click(getBackInHeaderSlot('Back to Team'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})

describe('TeamMemberDetailScreen (#173)', () => {
  it('shows the default staff role by name', async () => {
    render(<TeamMemberDetailScreen {...baseProps} onBack={vi.fn()} />)
    expect(await screen.findByText('FOH Engineer')).toBeInTheDocument()
    expect(screen.queryByText('No default role assigned')).not.toBeInTheDocument()
  })

  // The client sends timezone; the server's member PUT currently drops it (#173, server-side).
  it('opens Edit Team Member on Edit, saves, and reloads the member', async () => {
    const onBack = vi.fn()
    render(<TeamMemberDetailScreen {...baseProps} onBack={onBack} />)
    await screen.findByRole('heading', { level: 1, name: /Dana Reyes/ })
    vi.mocked(getOrganizationMember).mockClear()

    fireEvent.click(screen.getByRole('button', { name: /^Edit$/ }))
    expect(await screen.findByRole('dialog', { name: 'Edit Team Member' })).toBeInTheDocument()
    expect(onBack).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => {
      expect(updateMemberDetails).toHaveBeenCalledWith(
        'org-1',
        'm1',
        expect.objectContaining({ first_name: 'Dana', default_staff_role_id: 'sr-foh', timezone: 'America/Chicago' }),
      )
    })
    await waitFor(() => expect(getOrganizationMember).toHaveBeenCalledWith('org-1', 'm1'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
