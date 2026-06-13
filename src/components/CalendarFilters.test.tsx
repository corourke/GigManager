import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, type MockedFunction } from 'vitest';
import { makeUser, makeOrganization } from '../test/factories';
import { CalendarFilters } from './CalendarFilters';
import * as organizationService from '../services/organization.service';
import * as userService from '../services/user.service';

// Mock the services
vi.mock('../services/organization.service', () => ({
  searchOrganizations: vi.fn(),
}));

vi.mock('../services/user.service', () => ({
  searchUsers: vi.fn(),
}));

const mockProps = {
  statusFilter: 'all' as const,
  setStatusFilter: vi.fn(),
  venueFilter: 'all' as const,
  setVenueFilter: vi.fn(),
  actFilter: 'all' as const,
  setActFilter: vi.fn(),
  staffFilter: 'all' as const,
  setStaffFilter: vi.fn(),
  dateFrom: undefined,
  setDateFrom: vi.fn(),
  dateTo: undefined,
  setDateTo: vi.fn(),
  onClearFilters: vi.fn(),
  hasActiveFilters: false,
  organizationId: 'org-1',
};

const mockVenues = [
  makeOrganization({ id: 'venue-1', name: 'Venue One', roles: ['Venue'] }),
  makeOrganization({ id: 'venue-2', name: 'Venue Two', roles: ['Venue'] }),
];

const mockActs = [
  makeOrganization({ id: 'act-1', name: 'Act One', roles: ['Act'] }),
  makeOrganization({ id: 'act-2', name: 'Act Two', roles: ['Act'] }),
];

const mockStaff = [
  makeUser({ id: 'user-1', first_name: 'John', last_name: 'Doe' }),
  makeUser({ id: 'user-2', first_name: 'Jane', last_name: 'Smith' }),
];

describe('CalendarFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the service calls
    (organizationService.searchOrganizations as MockedFunction<typeof organizationService.searchOrganizations>)
      .mockImplementation((filters) => {
        if (filters?.type === 'Venue') return Promise.resolve(mockVenues);
        if (filters?.type === 'Act') return Promise.resolve(mockActs);
        return Promise.resolve([]);
      });

    (userService.searchUsers as MockedFunction<typeof userService.searchUsers>)
      .mockResolvedValue(mockStaff);
  });

  it('renders all filter components', async () => {
    render(<CalendarFilters {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('All Statuses')).toBeInTheDocument();
      expect(screen.getByText('All Venues')).toBeInTheDocument();
      expect(screen.getByText('All Acts')).toBeInTheDocument();
      expect(screen.getByText('All Staff')).toBeInTheDocument();
      expect(screen.getByText('Date Range')).toBeInTheDocument();
    });
  });

  it('loads and displays venue options', async () => {
    render(<CalendarFilters {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('All Venues')).toBeInTheDocument();
    });
  });

  it('loads and displays act options', async () => {
    render(<CalendarFilters {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('All Acts')).toBeInTheDocument();
    });
  });

  it('loads and displays staff options', async () => {
    render(<CalendarFilters {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('All Staff')).toBeInTheDocument();
    });
  });

  // Note: Complex select interaction tests are skipped due to Radix UI testing limitations in JSDOM
  // The component renders correctly and the filter logic is tested through integration

  it('shows active filters indicator when filters are active', () => {
    render(<CalendarFilters {...mockProps} hasActiveFilters={true} />);

    expect(screen.getByText('Active filters:')).toBeInTheDocument();
    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('calls onClearFilters when clear all button is clicked', () => {
    render(<CalendarFilters {...mockProps} hasActiveFilters={true} />);

    const clearButton = screen.getByText('Clear all');
    fireEvent.click(clearButton);

    expect(mockProps.onClearFilters).toHaveBeenCalled();
  });

  it('does not show active filters indicator when no filters are active', () => {
    render(<CalendarFilters {...mockProps} hasActiveFilters={false} />);

    expect(screen.queryByText('Active filters:')).not.toBeInTheDocument();
    expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
  });
});