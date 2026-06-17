import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { LandingRedirect } from './guards';

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
