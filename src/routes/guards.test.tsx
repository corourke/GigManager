import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { LandingRedirect, LogoutRoute } from './guards';

const mockUseAppShell = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('./appShell', () => ({
  useAppShell: () => mockUseAppShell(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderWithRouter() {
  let navigatedTo = '';
  function Capture({ path }: { path: string }) {
    navigatedTo = path;
    return <div data-testid={`at-${path.replace('/', '')}`} />;
  }
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<LandingRedirect />} />
        <Route path="/dashboard" element={<Capture path="/dashboard" />} />
        <Route path="/gigs" element={<Capture path="/gigs" />} />
      </Routes>
    </MemoryRouter>
  );
  return navigatedTo;
}

describe('LandingRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects mobile Staff to /dashboard', () => {
    mockUseAppShell.mockReturnValue({ isMobile: true });
    mockUseAuth.mockReturnValue({ userRole: 'Staff' });
    const result = renderWithRouter();
    expect(result).toBe('/dashboard');
  });

  it('redirects mobile Admin to /gigs', () => {
    mockUseAppShell.mockReturnValue({ isMobile: true });
    mockUseAuth.mockReturnValue({ userRole: 'Admin' });
    const result = renderWithRouter();
    expect(result).toBe('/gigs');
  });

  it('redirects mobile Manager to /gigs', () => {
    mockUseAppShell.mockReturnValue({ isMobile: true });
    mockUseAuth.mockReturnValue({ userRole: 'Manager' });
    const result = renderWithRouter();
    expect(result).toBe('/gigs');
  });

  it('redirects desktop Admin to /dashboard', () => {
    mockUseAppShell.mockReturnValue({ isMobile: false });
    mockUseAuth.mockReturnValue({ userRole: 'Admin' });
    const result = renderWithRouter();
    expect(result).toBe('/dashboard');
  });

  it('redirects desktop Viewer to /gigs', () => {
    mockUseAppShell.mockReturnValue({ isMobile: false });
    mockUseAuth.mockReturnValue({ userRole: 'Viewer' });
    const result = renderWithRouter();
    expect(result).toBe('/gigs');
  });

  it('redirects desktop Manager to /dashboard', () => {
    mockUseAppShell.mockReturnValue({ isMobile: false });
    mockUseAuth.mockReturnValue({ userRole: 'Manager' });
    const result = renderWithRouter();
    expect(result).toBe('/dashboard');
  });

  it('redirects desktop Staff to /dashboard', () => {
    mockUseAppShell.mockReturnValue({ isMobile: false });
    mockUseAuth.mockReturnValue({ userRole: 'Staff' });
    const result = renderWithRouter();
    expect(result).toBe('/dashboard');
  });

  it('redirects mobile Viewer to /gigs (not /dashboard)', () => {
    mockUseAppShell.mockReturnValue({ isMobile: true });
    mockUseAuth.mockReturnValue({ userRole: 'Viewer' });
    const result = renderWithRouter();
    expect(result).toBe('/gigs');
  });
});

describe('LogoutRoute (#18)', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    // A real browser navigation, not a client-side route change — see the
    // comment on LogoutRoute for why. Stub window.location so we can assert
    // on it without jsdom attempting (and failing) a real navigation.
    // @ts-expect-error - deliberately reassigning window.location for the test
    delete window.location;
    (window as any).location = { ...originalLocation, href: '' };
  });

  afterEach(() => {
    (window as any).location = originalLocation;
  });

  function renderLogoutRoute() {
    render(
      <MemoryRouter initialEntries={['/logout']}>
        <Routes>
          <Route path="/logout" element={<LogoutRoute />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('signs the user out and hard-navigates to / — a working /logout URL', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({ logout });

    renderLogoutRoute();

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(window.location.href).toBe('/'));
  });

  it('still hard-navigates to / if logout() rejects, so a broken session is never a dead end', async () => {
    const logout = vi.fn().mockRejectedValue(new Error('network error'));
    mockUseAuth.mockReturnValue({ logout });

    renderLogoutRoute();

    await waitFor(() => expect(window.location.href).toBe('/'));
  });
});
