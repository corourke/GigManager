import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import MobileGigDetail from './MobileGigDetail'

const mockGig = {
  id: 'gig-1',
  title: 'Summer Festival',
  status: 'Booked',
  start: '2026-07-15T19:00:00Z',
  end: '2026-07-15T23:00:00Z',
  timezone: 'America/New_York',
  tags: ['festival', 'outdoor'],
  notes: 'Load-in at 2pm',
  participants: [
    { id: 'p1', role: 'Venue', organization: { id: 'org-1', name: 'Madison Square Garden', city: 'New York', state: 'NY', phone_number: '555-1234' } },
    { id: 'p2', role: 'Act', organization: { id: 'org-2', name: 'The Rock Band' } },
  ],
  staff_slots: [
    {
      id: 'slot-1',
      role: 'Sound Engineer',
      count: 1,
      staff_assignments: [
        { id: 'a1', user: { id: 'user-1', first_name: 'John', last_name: 'Doe' }, status: 'Invited' },
      ],
    },
  ],
}

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))

vi.mock('../../services/gig.service', () => ({
  getGig: vi.fn(),
  updateGig: vi.fn(),
  updateStaffAssignmentStatus: vi.fn(),
}))

import { getGig, updateStaffAssignmentStatus, updateGig } from '../../services/gig.service'

describe('MobileGigDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getGig).mockResolvedValue(mockGig)
  })

  it('renders gig title and status', async () => {
    render(<MobileGigDetail gigId="gig-1" onBack={vi.fn()} onViewPackingList={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Summer Festival')).toBeInTheDocument()
    })
    expect(screen.getByText('Booked')).toBeInTheDocument()
  })

  it('renders venue and act information', async () => {
    render(<MobileGigDetail gigId="gig-1" onBack={vi.fn()} onViewPackingList={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getAllByText('Madison Square Garden').length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getAllByText('The Rock Band').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('New York, NY')).toBeInTheDocument()
  })

  it('shows accept/decline buttons for invited staff assignment', async () => {
    render(<MobileGigDetail gigId="gig-1" onBack={vi.fn()} onViewPackingList={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getAllByText('Accept').length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getAllByText('Decline').length).toBeGreaterThanOrEqual(1)
  })

  it('calls updateStaffAssignmentStatus on accept', async () => {
    vi.mocked(updateStaffAssignmentStatus).mockResolvedValue(undefined)
    render(<MobileGigDetail gigId="gig-1" onBack={vi.fn()} onViewPackingList={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getAllByText('Accept').length).toBeGreaterThanOrEqual(1)
    })

    fireEvent.click(screen.getAllByText('Accept')[0])

    await waitFor(() => {
      expect(updateStaffAssignmentStatus).toHaveBeenCalledWith('a1', 'Confirmed')
    })
  })

  it('renders notes within main card', async () => {
    render(<MobileGigDetail gigId="gig-1" onBack={vi.fn()} onViewPackingList={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Load-in at 2pm')).toBeInTheDocument()
    })
  })

  it('renders tags within main card', async () => {
    render(<MobileGigDetail gigId="gig-1" onBack={vi.fn()} onViewPackingList={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('festival')).toBeInTheDocument()
    })
    expect(screen.getByText('outdoor')).toBeInTheDocument()
  })

  it('renders packing list and call venue buttons (no standalone directions)', async () => {
    const onViewPackingList = vi.fn()
    render(<MobileGigDetail gigId="gig-1" onBack={onViewPackingList} onViewPackingList={onViewPackingList} />)

    await waitFor(() => {
      expect(screen.getByText('Packing List')).toBeInTheDocument()
    })
    expect(screen.getByText('Call Venue')).toBeInTheDocument()
    expect(screen.queryByText('Directions')).not.toBeInTheDocument()
  })

  it('calls onBack when back button is clicked', async () => {
    const onBack = vi.fn()
    render(<MobileGigDetail gigId="gig-1" onBack={onBack} onViewPackingList={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Summer Festival')).toBeInTheDocument()
    })

    const backButtons = screen.getAllByRole('button')
    fireEvent.click(backButtons[0])
    expect(onBack).toHaveBeenCalled()
  })

  it('shows status change options when status badge is clicked', async () => {
    render(<MobileGigDetail gigId="gig-1" onBack={vi.fn()} onViewPackingList={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Summer Festival')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Booked'))

    await waitFor(() => {
      expect(screen.getByText('Date Hold')).toBeInTheDocument()
      expect(screen.getByText('Proposed')).toBeInTheDocument()
    })
  })

  it('renders compact participant list with org type badges', async () => {
    render(<MobileGigDetail gigId="gig-1" onBack={vi.fn()} onViewPackingList={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Organizations')).toBeInTheDocument()
    })
  })
})
