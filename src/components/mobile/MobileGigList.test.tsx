import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import MobileGigList from './MobileGigList'

const mockGigs = [
  {
    id: 'gig-1',
    title: 'Summer Festival',
    status: 'Booked',
    start: new Date(Date.now() + 86400000).toISOString(),
    end: new Date(Date.now() + 90000000).toISOString(),
    timezone: 'America/New_York',
    tags: ['festival'],
    participants: [
      { id: 'p1', role: 'Venue', organization: { id: 'org-1', name: 'Central Park' } },
    ],
  },
  {
    id: 'gig-2',
    title: 'Past Concert',
    status: 'Completed',
    start: new Date(Date.now() - 172800000).toISOString(),
    end: new Date(Date.now() - 168000000).toISOString(),
    timezone: 'America/New_York',
    tags: [],
    participants: [],
  },
]

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    selectedOrganization: { id: 'org-1', name: 'Test Org' },
  }),
}))

vi.mock('../../services/gig.service', () => ({
  getGigsForOrganization: vi.fn(),
  createGig: vi.fn(),
  updateGig: vi.fn(),
}))

vi.mock('../../services/organization.service', () => ({
  searchOrganizations: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../utils/timezones', () => ({
  getAllTimezones: () => ['America/New_York', 'America/Chicago'],
}))

import { getGigsForOrganization } from '../../services/gig.service'

describe('MobileGigList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getGigsForOrganization).mockResolvedValue(mockGigs)
  })

  it('renders gig list with upcoming section', async () => {
    render(<MobileGigList onViewGig={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Summer Festival')).toBeInTheDocument()
    })
  })

  it('shows search input', async () => {
    render(<MobileGigList onViewGig={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search gigs...')).toBeInTheDocument()
    })
  })

  it('filters gigs by search query', async () => {
    render(<MobileGigList onViewGig={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Summer Festival')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search gigs...')
    fireEvent.change(searchInput, { target: { value: 'summer' } })

    expect(screen.getByText('Summer Festival')).toBeInTheDocument()
  })

  it('filters gigs by status tab', async () => {
    render(<MobileGigList onViewGig={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Summer Festival')).toBeInTheDocument()
    })

    const statusTabs = screen.getAllByText('Booked')
    const tabButton = statusTabs.find(el => el.tagName === 'BUTTON' || el.closest('button'))
    fireEvent.click(tabButton || statusTabs[0])

    expect(screen.getByText('Summer Festival')).toBeInTheDocument()
  })

  it('calls onViewGig when a gig card is clicked', async () => {
    const onViewGig = vi.fn()
    render(<MobileGigList onViewGig={onViewGig} />)

    await waitFor(() => {
      expect(screen.getByText('Summer Festival')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Summer Festival'))
    expect(onViewGig).toHaveBeenCalledWith('gig-1')
  })

  it('shows empty state when no gigs match', async () => {
    vi.mocked(getGigsForOrganization).mockResolvedValue([])
    render(<MobileGigList onViewGig={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('No gigs found.')).toBeInTheDocument()
    })
  })

  it('shows all status tabs', async () => {
    render(<MobileGigList onViewGig={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument()
    })
    expect(screen.getAllByText('Booked').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Proposed')).toBeInTheDocument()
  })

  it('has a date filter toggle button', async () => {
    render(<MobileGigList onViewGig={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('7d')).toBeInTheDocument()
    })
  })

  it('toggles date filter between upcoming and all', async () => {
    render(<MobileGigList onViewGig={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Next 7 days', { exact: false })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('7d'))

    await waitFor(() => {
      expect(screen.getByText('All dates', { exact: false })).toBeInTheDocument()
    })
  })

  it('shows quick create button', async () => {
    render(<MobileGigList onViewGig={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Summer Festival')).toBeInTheDocument()
    })

    const buttons = screen.getAllByRole('button')
    const plusButton = buttons.find(btn => btn.querySelector('svg.lucide-plus'))
    expect(plusButton).toBeDefined()
  })
})
