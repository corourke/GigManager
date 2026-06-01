import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('../../services/inventoryManagement.service', () => ({
  getItemsByLocation: vi.fn(),
  getActiveGigsWithTracking: vi.fn(),
  getLocationSuggestions: vi.fn(),
}));

vi.mock('../ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, id }: any) => (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid={id}
    />
  ),
}));

vi.mock('../ui/label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('../ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" onClick={() => onValueChange(value)}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children, 'aria-label': ariaLabel }: any) => (
    <button role="combobox" aria-label={ariaLabel}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid={`select-item-${value}`} role="option">
      {children}
    </div>
  ),
}));

import {
  getItemsByLocation,
  getActiveGigsWithTracking,
  getLocationSuggestions,
} from '../../services/inventoryManagement.service';
import { LocationExplorer } from './LocationExplorer';

const mockGigs = [
  {
    id: 'gig-1',
    title: 'Summer Festival',
    start: '2026-06-01T08:00:00Z',
    end: '2026-06-02T22:00:00Z',
    status: 'Booked',
    kit_assignments: [],
  },
  {
    id: 'gig-2',
    title: 'Corporate Event',
    start: '2026-07-01T08:00:00Z',
    end: '2026-07-01T22:00:00Z',
    status: 'Booked',
    kit_assignments: [],
  },
];

const mockItems = [
  {
    kit_id: 'kit-1',
    kit_name: 'Sound Kit A',
    asset_id: 'asset-1',
    asset_name: 'Main Speaker',
    tag_number: 'SP-001',
    status: 'On Site',
    location: 'Stage Left',
    gig_id: 'gig-1',
    gig_title: 'Summer Festival',
    scanned_at: '2026-06-01T10:00:00Z',
    scanned_by_name: 'John Doe',
  },
  {
    kit_id: 'kit-2',
    kit_name: 'Lighting Rig B',
    asset_id: null,
    asset_name: null,
    tag_number: null,
    status: 'In Transit',
    location: 'Truck 1',
    gig_id: 'gig-1',
    gig_title: 'Summer Festival',
    scanned_at: '2026-06-01T09:00:00Z',
    scanned_by_name: null,
  },
];

describe('LocationExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getActiveGigsWithTracking as any).mockResolvedValue(mockGigs);
    (getItemsByLocation as any).mockResolvedValue([]);
    (getLocationSuggestions as any).mockResolvedValue([]);
  });

  it('renders filter controls', async () => {
    render(<LocationExplorer organizationId="org-1" />);

    expect(screen.getByPlaceholderText('Filter by location...')).toBeInTheDocument();
    expect(screen.getByText('Status Filter')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Filter by gig' })).toBeInTheDocument();
  });

  it('renders status toggles for core statuses', () => {
    render(<LocationExplorer organizationId="org-1" />);

    expect(screen.getByText('On Site')).toBeInTheDocument();
    expect(screen.getByText('In Transit')).toBeInTheDocument();
    expect(screen.getByText('Checked Out')).toBeInTheDocument();
    expect(screen.getByText('In Warehouse')).toBeInTheDocument();
  });

  it('renders gig options from active gigs', async () => {
    render(<LocationExplorer organizationId="org-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('select-item-gig-1')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-gig-2')).toBeInTheDocument();
    });

    expect(screen.getByText('Summer Festival')).toBeInTheDocument();
    expect(screen.getByText('Corporate Event')).toBeInTheDocument();
  });

  it('shows empty state when no filters are applied', async () => {
    render(<LocationExplorer organizationId="org-1" />);

    // Wait for initial search to finish
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Turn off all default status filter buttons
    fireEvent.click(screen.getByText('On Site'));
    fireEvent.click(screen.getByText('In Transit'));
    fireEvent.click(screen.getByText('Checked Out'));
    fireEvent.click(screen.getByText('In Warehouse'));

    await waitFor(() => {
      expect(screen.getByText(/Apply filters above/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('does not render the results table when no filters are selected', () => {
    render(<LocationExplorer organizationId="org-1" />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('calls getItemsByLocation with location filter when location is entered', async () => {
    (getItemsByLocation as any).mockResolvedValue(mockItems);

    render(<LocationExplorer organizationId="org-1" />);

    const locationInput = screen.getByPlaceholderText('Filter by location...');
    fireEvent.change(locationInput, { target: { value: 'Stage Left' } });

    await waitFor(() => {
      expect(getItemsByLocation).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({ location: 'Stage Left' })
      );
    });
  });

  it('renders results table with correct column headers after filtering', async () => {
    (getItemsByLocation as any).mockResolvedValue(mockItems);

    render(<LocationExplorer organizationId="org-1" />);

    // Wait for initial search to finish
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    const locationInput = screen.getByPlaceholderText('Filter by location...');
    fireEvent.change(locationInput, { target: { value: 'Stage Left' } });

    await waitFor(() => {
      expect(screen.getAllByRole('table').length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    const table = screen.getAllByRole('table')[0];
    expect(table).toBeInTheDocument();
    const headers = table.querySelectorAll('th');
    const headerTexts = Array.from(headers).map((h) => h.textContent);
    expect(headerTexts).toContain('Kit Name');
    expect(headerTexts).toContain('Asset Name');
    expect(headerTexts).toContain('Tag #');
    expect(headerTexts).not.toContain('Status');
    expect(headerTexts).not.toContain('Location');
    expect(headerTexts).toContain('Gig');
    expect(headerTexts).toContain('Last Scanned');
  });

  it('groups items by status and location', async () => {
    (getItemsByLocation as any).mockResolvedValue(mockItems);

    render(<LocationExplorer organizationId="org-1" />);

    // Wait for initial search to finish
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    const locationInput = screen.getByPlaceholderText('Filter by location...');
    fireEvent.change(locationInput, { target: { value: 'Stage Left' } });

    await waitFor(() => {
      // Statuses appear in toggles and headers
      expect(screen.getAllByText('On Site').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Stage Left').length).toBeGreaterThan(0);
      expect(screen.getAllByText('In Transit').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Truck 1').length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('renders item rows when data is returned', async () => {
    (getItemsByLocation as any).mockResolvedValue(mockItems);

    render(<LocationExplorer organizationId="org-1" />);

    // Wait for initial search to finish
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    const locationInput = screen.getByPlaceholderText('Filter by location...');
    fireEvent.change(locationInput, { target: { value: 'Stage Left' } });

    await waitFor(() => {
      expect(screen.getByText('Sound Kit A')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Main Speaker')).toBeInTheDocument();
    expect(screen.getByText('SP-001')).toBeInTheDocument();
    expect(screen.getByText('Lighting Rig B')).toBeInTheDocument();
  });

  it('shows empty table message when filters return no results', async () => {
    (getItemsByLocation as any).mockResolvedValue([]);

    render(<LocationExplorer organizationId="org-1" />);

    const locationInput = screen.getByPlaceholderText('Filter by location...');
    fireEvent.change(locationInput, { target: { value: 'Unknown Location' } });

    await waitFor(() => {
      expect(screen.getByText(/no items found/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
