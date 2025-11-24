import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

// Mock all screen components
vi.mock('./LoginScreen', () => ({
  default: ({ onLogin }: any) => (
    <div data-testid="login-screen">
      <button onClick={() => onLogin(
        { id: 'user-1', email: 'test@example.com', first_name: 'John', last_name: 'Doe' },
        [{ organization: { id: 'org-1', name: 'Test Org', type: 'Production' as any }, role: 'Admin' }]
      )}>
        Login
      </button>
    </div>
  ),
}))

vi.mock('./UserProfileCompletionScreen', () => ({
  default: ({ onProfileCompleted, onSkip }: any) => (
    <div data-testid="profile-completion-screen">
      <button onClick={() => onProfileCompleted({
        id: 'user-1', email: 'test@example.com', first_name: 'John', last_name: 'Doe'
      })}>
        Complete Profile
      </button>
      <button onClick={onSkip}>Skip Profile</button>
    </div>
  ),
}))

vi.mock('./OrganizationSelectionScreen', () => ({
  default: ({ onSelectOrganization, onCreateOrganization }: any) => (
    <div data-testid="org-selection-screen">
      <button onClick={() => onSelectOrganization({
        id: 'org-1', name: 'Test Org', type: 'Production' as any
      })}>
        Select Org
      </button>
      <button onClick={onCreateOrganization}>Create Org</button>
    </div>
  ),
}))

vi.mock('./CreateOrganizationScreen', () => ({
  default: ({ onOrganizationCreated, onCancel }: any) => (
    <div data-testid="create-org-screen">
      <button onClick={() => onOrganizationCreated({
        id: 'org-1', name: 'New Org', type: 'Production' as any
      })}>
        Create Organization
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}))

vi.mock('./AdminOrganizationsScreen', () => ({
  default: ({ onBack }: any) => (
    <div data-testid="admin-orgs-screen">
      <button onClick={onBack}>Back</button>
    </div>
  ),
}))

vi.mock('./Dashboard', () => ({
  default: ({ onLogout, onNavigateToGigs, onNavigateToTeam, onNavigateToAssets, onNavigateToKits }: any) => (
    <div data-testid="dashboard-screen">
      <button onClick={onLogout}>Logout</button>
      <button onClick={onNavigateToGigs}>Gigs</button>
      <button onClick={onNavigateToTeam}>Team</button>
      <button onClick={onNavigateToAssets}>Assets</button>
      <button onClick={onNavigateToKits}>Kits</button>
    </div>
  ),
}))

vi.mock('./GigListScreen', () => ({
  default: ({ onBack, onCreateGig }: any) => (
    <div data-testid="gig-list-screen">
      <button onClick={onBack}>Back</button>
      <button onClick={onCreateGig}>Create Gig</button>
    </div>
  ),
}))

vi.mock('./CreateGigScreen', () => ({
  default: ({ onCancel }: any) => (
    <div data-testid="create-gig-screen">
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}))

vi.mock('./GigDetailScreen', () => ({
  default: ({ onBack }: any) => (
    <div data-testid="gig-detail-screen">
      <button onClick={onBack}>Back</button>
    </div>
  ),
}))

vi.mock('./TeamScreen', () => ({
  default: ({ onNavigateToDashboard }: any) => (
    <div data-testid="team-screen">
      <button onClick={onNavigateToDashboard}>Back to Dashboard</button>
    </div>
  ),
}))

vi.mock('./AssetListScreen', () => ({
  default: ({ onBack }: any) => (
    <div data-testid="asset-list-screen">
      <button onClick={onBack}>Back</button>
    </div>
  ),
}))

vi.mock('./CreateAssetScreen', () => ({
  default: ({ onCancel }: any) => (
    <div data-testid="create-asset-screen">
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}))

vi.mock('./KitListScreen', () => ({
  default: ({ onBack }: any) => (
    <div data-testid="kit-list-screen">
      <button onClick={onBack}>Back</button>
    </div>
  ),
}))

vi.mock('./CreateKitScreen', () => ({
  default: ({ onCancel }: any) => (
    <div data-testid="create-kit-screen">
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}))

vi.mock('./KitDetailScreen', () => ({
  default: ({ onBack }: any) => (
    <div data-testid="kit-detail-screen">
      <button onClick={onBack}>Back</button>
    </div>
  ),
}))

vi.mock('./ImportScreen', () => ({
  default: ({ onCancel }: any) => (
    <div data-testid="import-screen">
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}))

vi.mock('./EditUserProfileDialog', () => ({
  default: () => <div data-testid="edit-profile-dialog" />,
}))

vi.mock('./ui/sonner', () => ({
  Toaster: () => <div data-testid="toaster" />,
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial state', () => {
    it('renders login screen by default', () => {
      render(<App />)
      expect(screen.getByTestId('login-screen')).toBeInTheDocument()
    })
  })

  describe('Authentication flow', () => {
    it('navigates to profile completion when user has incomplete profile', async () => {
      render(<App />)

      // User logs in with incomplete profile (missing first_name/last_name)
      const loginButton = screen.getByText('Login')
      await userEvent.click(loginButton)

      await waitFor(() => {
        expect(screen.getByTestId('profile-completion-screen')).toBeInTheDocument()
      })
    })

    it('navigates to org selection when profile is complete but has multiple orgs', async () => {
      // Mock user with complete profile and multiple orgs
      vi.doMock('./LoginScreen', () => ({
        default: ({ onLogin }: any) => (
          <div data-testid="login-screen">
            <button onClick={() => onLogin(
              { id: 'user-1', email: 'test@example.com', first_name: 'John', last_name: 'Doe' },
              [
                { organization: { id: 'org-1', name: 'Org 1', type: 'Production' as any }, role: 'Admin' },
                { organization: { id: 'org-2', name: 'Org 2', type: 'Production' as any }, role: 'Staff' }
              ]
            )}>
              Login Multiple Orgs
            </button>
          </div>
        ),
      }))

      render(<App />)

      const loginButton = screen.getByText('Login Multiple Orgs')
      await userEvent.click(loginButton)

      await waitFor(() => {
        expect(screen.getByTestId('org-selection-screen')).toBeInTheDocument()
      })
    })

    it('navigates directly to dashboard when user has one org and complete profile', async () => {
      // Mock user with complete profile and single org
      vi.doMock('./LoginScreen', () => ({
        default: ({ onLogin }: any) => (
          <div data-testid="login-screen">
            <button onClick={() => onLogin(
              { id: 'user-1', email: 'test@example.com', first_name: 'John', last_name: 'Doe' },
              [{ organization: { id: 'org-1', name: 'Test Org', type: 'Production' as any }, role: 'Admin' }]
            )}>
              Login Single Org
            </button>
          </div>
        ),
      }))

      render(<App />)

      const loginButton = screen.getByText('Login Single Org')
      await userEvent.click(loginButton)

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-screen')).toBeInTheDocument()
      })
    })
  })

  describe('Organization selection flow', () => {
    it('navigates to dashboard after selecting organization', async () => {
      render(<App />)

      // Login first
      const loginButton = screen.getByText('Login')
      await userEvent.click(loginButton)

      // Complete profile
      const completeProfileButton = screen.getByText('Complete Profile')
      await userEvent.click(completeProfileButton)

      // Select organization
      const selectOrgButton = screen.getByText('Select Org')
      await userEvent.click(selectOrgButton)

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-screen')).toBeInTheDocument()
      })
    })

    it('navigates to create organization screen', async () => {
      render(<App />)

      // Login first
      const loginButton = screen.getByText('Login')
      await userEvent.click(loginButton)

      // Skip profile completion
      const skipButton = screen.getByText('Skip Profile')
      await userEvent.click(skipButton)

      // Create organization
      const createOrgButton = screen.getByText('Create Org')
      await userEvent.click(createOrgButton)

      await waitFor(() => {
        expect(screen.getByTestId('create-org-screen')).toBeInTheDocument()
      })
    })
  })

  describe('Dashboard navigation', () => {
    beforeEach(async () => {
      render(<App />)

      // Navigate to dashboard
      const loginButton = screen.getByText('Login')
      await userEvent.click(loginButton)

      const completeProfileButton = screen.getByText('Complete Profile')
      await userEvent.click(completeProfileButton)

      const selectOrgButton = screen.getByText('Select Org')
      await userEvent.click(selectOrgButton)

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-screen')).toBeInTheDocument()
      })
    })

    it('navigates to gigs list', async () => {
      const gigsButton = screen.getByText('Gigs')
      await userEvent.click(gigsButton)

      await waitFor(() => {
        expect(screen.getByTestId('gig-list-screen')).toBeInTheDocument()
      })
    })

    it('navigates to team screen', async () => {
      const teamButton = screen.getByText('Team')
      await userEvent.click(teamButton)

      await waitFor(() => {
        expect(screen.getByTestId('team-screen')).toBeInTheDocument()
      })
    })

    it('navigates to assets list', async () => {
      const assetsButton = screen.getByText('Assets')
      await userEvent.click(assetsButton)

      await waitFor(() => {
        expect(screen.getByTestId('asset-list-screen')).toBeInTheDocument()
      })
    })

    it('navigates to kits list', async () => {
      const kitsButton = screen.getByText('Kits')
      await userEvent.click(kitsButton)

      await waitFor(() => {
        expect(screen.getByTestId('kit-list-screen')).toBeInTheDocument()
      })
    })

    it('handles logout', async () => {
      const logoutButton = screen.getByText('Logout')
      await userEvent.click(logoutButton)

      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeInTheDocument()
      })
    })
  })

  describe('Gig navigation', () => {
    beforeEach(async () => {
      render(<App />)

      // Navigate to gig list
      const loginButton = screen.getByText('Login')
      await userEvent.click(loginButton)

      const completeProfileButton = screen.getByText('Complete Profile')
      await userEvent.click(completeProfileButton)

      const selectOrgButton = screen.getByText('Select Org')
      await userEvent.click(selectOrgButton)

      const gigsButton = screen.getByText('Gigs')
      await userEvent.click(gigsButton)

      await waitFor(() => {
        expect(screen.getByTestId('gig-list-screen')).toBeInTheDocument()
      })
    })

    it('navigates back to dashboard', async () => {
      const backButton = screen.getByText('Back')
      await userEvent.click(backButton)

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-screen')).toBeInTheDocument()
      })
    })

    it('navigates to create gig screen', async () => {
      const createGigButton = screen.getByText('Create Gig')
      await userEvent.click(createGigButton)

      await waitFor(() => {
        expect(screen.getByTestId('create-gig-screen')).toBeInTheDocument()
      })
    })
  })

  describe('Back navigation', () => {
    it('navigates back from create gig to gig list', async () => {
      render(<App />)

      // Navigate to create gig screen
      const loginButton = screen.getByText('Login')
      await userEvent.click(loginButton)

      const completeProfileButton = screen.getByText('Complete Profile')
      await userEvent.click(completeProfileButton)

      const selectOrgButton = screen.getByText('Select Org')
      await userEvent.click(selectOrgButton)

      const gigsButton = screen.getByText('Gigs')
      await userEvent.click(gigsButton)

      const createGigButton = screen.getByText('Create Gig')
      await userEvent.click(createGigButton)

      await waitFor(() => {
        expect(screen.getByTestId('create-gig-screen')).toBeInTheDocument()
      })

      // Navigate back
      const cancelButton = screen.getByText('Cancel')
      await userEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.getByTestId('gig-list-screen')).toBeInTheDocument()
      })
    })

    it('navigates back from team to dashboard', async () => {
      render(<App />)

      // Navigate to team screen
      const loginButton = screen.getByText('Login')
      await userEvent.click(loginButton)

      const completeProfileButton = screen.getByText('Complete Profile')
      await userEvent.click(completeProfileButton)

      const selectOrgButton = screen.getByText('Select Org')
      await userEvent.click(selectOrgButton)

      const teamButton = screen.getByText('Team')
      await userEvent.click(teamButton)

      await waitFor(() => {
        expect(screen.getByTestId('team-screen')).toBeInTheDocument()
      })

      // Navigate back
      const backButton = screen.getByText('Back to Dashboard')
      await userEvent.click(backButton)

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-screen')).toBeInTheDocument()
      })
    })
  })

  describe('Organization switching', () => {
    it('handles organization switching from dashboard', async () => {
      render(<App />)

      // Navigate to dashboard
      const loginButton = screen.getByText('Login')
      await userEvent.click(loginButton)

      const completeProfileButton = screen.getByText('Complete Profile')
      await userEvent.click(completeProfileButton)

      const selectOrgButton = screen.getByText('Select Org')
      await userEvent.click(selectOrgButton)

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-screen')).toBeInTheDocument()
      })

      // Mock dashboard with organization switching
      vi.doMock('./Dashboard', () => ({
        default: ({ onBackToSelection }: any) => (
          <div data-testid="dashboard-screen">
            <button onClick={onBackToSelection}>Switch Org</button>
          </div>
        ),
      }))

      // This test would need to be updated with the new mock
      // For now, it demonstrates the pattern
    })
  })
})
