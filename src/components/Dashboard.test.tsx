import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Dashboard from './Dashboard'
import type { Organization, User } from '../App'

// Mock the createClient function
vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signOut: vi.fn().mockResolvedValue({}),
    },
  })),
}))

describe('Dashboard', () => {
  const mockOrganization: Organization = {
    id: 'org-1',
    name: 'Test Production Company',
    type: 'Production',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
  }

  const mockProps = {
    organization: mockOrganization,
    user: mockUser,
    onBackToSelection: vi.fn(),
    onLogout: vi.fn(),
    onNavigateToGigs: vi.fn(),
  }

  it('renders dashboard with organization and user info', () => {
    render(<Dashboard {...mockProps} />)

    expect(screen.getByText('Welcome back, John!')).toBeInTheDocument()
    expect(screen.getByText('Test Production Company')).toBeInTheDocument()
    expect(screen.getByText("Here's what's happening with Test Production Company")).toBeInTheDocument()
  })

  it('displays navigation tabs', () => {
    render(<Dashboard {...mockProps} />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Events')).toBeInTheDocument()
    expect(screen.getByText('Team')).toBeInTheDocument()
    expect(screen.getByText('Equipment')).toBeInTheDocument()
  })

  it('shows quick stats cards', () => {
    render(<Dashboard {...mockProps} />)

    expect(screen.getByText('Events')).toBeInTheDocument()
    expect(screen.getByText('Team Members')).toBeInTheDocument()
    expect(screen.getByText('Equipment')).toBeInTheDocument()
    expect(screen.getByText('Revenue')).toBeInTheDocument()
  })

  it('displays upcoming events section', () => {
    render(<Dashboard {...mockProps} />)

    expect(screen.getByText('Upcoming Events')).toBeInTheDocument()
    expect(screen.getByText('Manage Events')).toBeInTheDocument()
  })

  it('shows recent activity section', () => {
    render(<Dashboard {...mockProps} />)

    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
  })

  it('calls onNavigateToGigs when Events card is clicked', () => {
    render(<Dashboard {...mockProps} />)

    const eventsCard = screen.getByText('Events').closest('div')
    eventsCard?.click()

    expect(mockProps.onNavigateToGigs).toHaveBeenCalled()
  })

  it('calls onNavigateToGigs when Manage Events button is clicked', () => {
    render(<Dashboard {...mockProps} />)

    const manageEventsButton = screen.getByText('Manage Events')
    manageEventsButton.click()

    expect(mockProps.onNavigateToGigs).toHaveBeenCalled()
  })
})
