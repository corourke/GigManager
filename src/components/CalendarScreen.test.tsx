import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, type MockedFunction } from 'vitest';
import { makeUser, makeOrganization } from '../test/factories';
import CalendarScreen from './CalendarScreen';
import { Organization, User, UserRole } from '../utils/supabase/types';
import * as gigService from '../services/gig.service';

// Mock the gig service
vi.mock('../services/gig.service', () => ({
  getGigsForOrganization: vi.fn(),
}));

// Mock AppHeader
vi.mock('./AppHeader', () => ({
  default: () => <div>AppHeader</div>,
}));

// Mock PageHeader
vi.mock('./ui/PageHeader', () => ({
  PageHeader: ({ title, description, actions }: { title: string; description: string; actions?: React.ReactNode; icon?: any }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
    </div>
  ),
}));

// Mock react-big-calendar to avoid complex setup
vi.mock('react-big-calendar', () => ({
  Calendar: () => <div>Calendar Component</div>,
  dateFnsLocalizer: vi.fn(() => ({})),
}));

// Mock date-fns functions
vi.mock('date-fns', () => ({
  format: vi.fn(() => 'January 2026'),
  parse: vi.fn(),
  startOfWeek: vi.fn(),
  getDay: vi.fn(),
}));

// Mock date-fns locale
vi.mock('date-fns/locale', () => ({
  enUS: {},
}));

const mockOrganization: Organization = makeOrganization({ name: 'Test Organization', roles: ['Venue'] });

const mockUser: User = makeUser();

const defaultProps = {
  organization: mockOrganization,
  user: mockUser,
  userRole: 'admin' as UserRole,
  onBack: vi.fn(),
  onViewGig: vi.fn(),
  onCreateGig: vi.fn(),
  onNavigateToDashboard: vi.fn(),
  onNavigateToGigs: vi.fn(),
  onNavigateToAssets: vi.fn(),
  onSwitchOrganization: vi.fn(),
  onLogout: vi.fn(),
  onEditProfile: vi.fn(),
};

describe('CalendarScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the calendar screen with loading state initially', async () => {
    // Mock a delayed response to test loading state
    const mockFn = gigService.getGigsForOrganization as MockedFunction<typeof gigService.getGigsForOrganization>;
    mockFn.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 100)));

    await act(async () => {
      render(<CalendarScreen {...defaultProps} />);
    });

    expect(screen.getByText('AppHeader')).toBeInTheDocument();
    expect(screen.getByText('Loading calendar...')).toBeInTheDocument();
  });

  it('renders calendar component after loading', async () => {
    const mockFn = gigService.getGigsForOrganization as MockedFunction<typeof gigService.getGigsForOrganization>;
    mockFn.mockResolvedValue([]);

    render(<CalendarScreen {...defaultProps} />);

    // Wait for loading to complete and calendar to render
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Calendar Component')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('View and manage your gigs in calendar format')).toBeInTheDocument();
  });

  it('displays create gig button', async () => {
    const mockFn = gigService.getGigsForOrganization as MockedFunction<typeof gigService.getGigsForOrganization>;
    mockFn.mockResolvedValue([]);

    render(<CalendarScreen {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create gig/i });
    expect(createButton).toBeInTheDocument();
  });

  it('displays navigation controls', async () => {
    const mockFn = gigService.getGigsForOrganization as MockedFunction<typeof gigService.getGigsForOrganization>;
    mockFn.mockResolvedValue([]);

    render(<CalendarScreen {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
  });

  it('displays view tabs', async () => {
    const mockFn = gigService.getGigsForOrganization as MockedFunction<typeof gigService.getGigsForOrganization>;
    mockFn.mockResolvedValue([]);

    render(<CalendarScreen {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: /month/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /week/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /day/i })).toBeInTheDocument();
  });
});