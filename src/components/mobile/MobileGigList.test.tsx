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
      expect(screen.getByText('All Statuses')).toBeInTheDocument()
    })
    expect(screen.getByText('All Statuses')).toBeInTheDocument()
  })

  it('has a date filter toggle button', async () => {
    render(<MobileGigList onViewGig={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('All Dates')).toBeInTheDocument()
    })
  })

  it('toggles date filter between upcoming and all', async () => {
    render(<MobileGigList onViewGig={vi.fn()} />)

    // Initial state should be "All Dates"
    await waitFor(() => {
      expect(screen.getByText('All Dates')).toBeInTheDocument()
    })

    // Open dropdown
    const filterButton = screen.getByText('All Dates')
    fireEvent.click(filterButton)

    // In the dropdown, select +7d
    const plus7dOption = await screen.findByText('+7d')
    fireEvent.click(plus7dOption)

    // Button should now show +7d
    await waitFor(() => {
      // Find the one in the header or button
      expect(screen.getAllByText('+7d').length).toBeGreaterThan(0)
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

  it('sorts upcoming gigs in ascending order (nearest first)', async () => {
    const now = Date.now()
    const nearFuture = new Date(now + 86400000).toISOString()
    const farFuture = new Date(now + 864000000).toISOString()
    vi.mocked(getGigsForOrganization).mockResolvedValue([
      { id: 'far', title: 'Far Future Gig', status: 'Booked', start: farFuture, end: farFuture, timezone: 'UTC', tags: [], participants: [] },
      { id: 'near', title: 'Near Future Gig', status: 'Booked', start: nearFuture, end: nearFuture, timezone: 'UTC', tags: [], participants: [] },
    ])
    render(<MobileGigList onViewGig={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Near Future Gig')).toBeInTheDocument()
    })
    const cards = screen.getAllByText(/Future Gig/)
    expect(cards[0].textContent).toBe('Near Future Gig')
    expect(cards[1].textContent).toBe('Far Future Gig')
  })

  it('sorts past gigs in descending order (most recent first)', async () => {
    const now = Date.now()
    const recentPast = new Date(now - 86400000).toISOString()
    const olderPast = new Date(now - 864000000).toISOString()
    vi.mocked(getGigsForOrganization).mockResolvedValue([
      { id: 'older', title: 'Older Past Gig', status: 'Completed', start: olderPast, end: olderPast, timezone: 'UTC', tags: [], participants: [] },
      { id: 'recent', title: 'Recent Past Gig', status: 'Completed', start: recentPast, end: recentPast, timezone: 'UTC', tags: [], participants: [] },
    ])
    render(<MobileGigList onViewGig={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Recent Past Gig')).toBeInTheDocument()
    })
    const cards = screen.getAllByText(/Past Gig/)
    expect(cards[0].textContent).toBe('Recent Past Gig')
    expect(cards[1].textContent).toBe('Older Past Gig')
  })

  it('restores scroll position via initialScrollTop', async () => {
    const container = document.createElement('div')
    container.setAttribute('data-mobile-scroll', '')
    container.scrollTop = 0
    const scrollSpy = vi.fn()
    Object.defineProperty(container, 'scrollTop', {
      get: () => 0,
      set: scrollSpy,
      configurable: true,
    })
    document.body.appendChild(container)

    render(<MobileGigList onViewGig={vi.fn()} initialScrollTop={200} />)

    await waitFor(() => {
      expect(scrollSpy).toHaveBeenCalledWith(200)
    })

    document.body.removeChild(container)
  })
})
