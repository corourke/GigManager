import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ImportScreen from './ImportScreen'
import { makeUser, makeOrganization } from '../test/factories'
import { getBackInHeaderSlot } from '../test/pageFrame'

vi.mock('../services/gig.service', () => ({ createGig: vi.fn() }))
vi.mock('../services/purchase.service', () => ({ importPurchases: vi.fn() }))
vi.mock('../services/organization.service', () => ({ searchOrganizations: vi.fn(), createOrganization: vi.fn() }))

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
