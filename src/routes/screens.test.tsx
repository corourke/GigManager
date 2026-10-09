import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppRoutes } from './screens';

const mockUseAuth = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('./appShell', () => ({
  useAppShell: () => ({
    isMobile: false,
    openEditProfile: vi.fn(),
    lockMobile: vi.fn(),
    mobileGigListScrollTop: { current: 0 },
  }),
}));

// Keep the sign-in landing prefetch out of the way
vi.mock('./prefetch', () => ({ prefetchLandingScreen: vi.fn() }));

vi.mock('../components/Dashboard', () => ({
  default: () => <div>Dashboard stub</div>,
}));
vi.mock('../components/GigListScreen', () => ({
  default: () => <div>GigListScreen stub</div>,
}));

// Reading the module's default export throws, like a chunk that failed to fetch
vi.mock('../components/TeamScreen', () => ({
  get default(): never {
    throw new TypeError('Failed to fetch dynamically imported module: /assets/TeamScreen-x.js');
  },
}));

const org = { id: 'org-1', name: 'Org' };

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe('AppRoutes lazy screens', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      user: { id: 'u1', first_name: 'A', last_name: 'B', email: 'a@b.c' },
      organizations: [{ organization: org, role: 'Admin' }],
      selectedOrganization: org,
      userRole: 'Admin',
      selectOrganization: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      setOrganizations: vi.fn(),
      refreshProfile: vi.fn(),
    });
  });

  it('shows the loading fallback first, then the screen once its chunk loads', async () => {
    renderAt('/dashboard');
    // Lazy: the screen is not in the first paint, the Suspense fallback is
    expect(screen.queryByText('Dashboard stub')).not.toBeInTheDocument();
    expect(await screen.findByText('Dashboard stub')).toBeInTheDocument();
  });

  it('lazy-loads the gig list the same way', async () => {
    renderAt('/gigs');
    expect(screen.queryByText('GigListScreen stub')).not.toBeInTheDocument();
    expect(await screen.findByText('GigListScreen stub')).toBeInTheDocument();
  });

  it('offers a reload when a screen chunk fails to load', async () => {
    const swallow = (e: ErrorEvent) => e.preventDefault();
    window.addEventListener('error', swallow);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderAt('/team');
    expect(await screen.findByRole('button', { name: 'Reload' })).toBeInTheDocument();
    consoleError.mockRestore();
    window.removeEventListener('error', swallow);
  });
});
