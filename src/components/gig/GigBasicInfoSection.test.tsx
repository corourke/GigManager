import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GigBasicInfoSection from './GigBasicInfoSection';
import * as gigService from '../../services/gig.service';

vi.mock('../../services/gig.service');

describe('GigBasicInfoSection', () => {
  const mockGigId = 'gig-123';
  const mockGigData = {
    id: mockGigId,
    title: 'Test Gig',
    start: '2024-01-15T10:00:00Z',
    end: '2024-01-15T18:00:00Z',
    timezone: 'America/Los_Angeles',
    status: 'Booked',
    tags: ['Concert', 'Live Music'],
    notes: 'Test notes',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gigService.getGig).mockResolvedValue(mockGigData as any);
    vi.mocked(gigService.updateGig).mockResolvedValue(mockGigData as any);
  });

  it('renders loading state initially', () => {
    render(<GigBasicInfoSection gigId={mockGigId} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('loads and displays gig data', async () => {
    render(<GigBasicInfoSection gigId={mockGigId} />);

    await waitFor(() => {
      expect(gigService.getGig).toHaveBeenCalledWith(mockGigId);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Gig')).toBeInTheDocument();
    });
  });

  it('renders all form fields', async () => {
    render(<GigBasicInfoSection gigId={mockGigId} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Gig')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('Enter gig title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Add notes about this gig/i)).toBeInTheDocument();
  });

  it('shows validation error for empty title', async () => {
    const user = userEvent.setup();
    render(<GigBasicInfoSection gigId={mockGigId} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Gig')).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText('Enter gig title');
    await user.clear(titleInput);
    
    await waitFor(() => {
      expect(screen.getByText(/Title is required/i)).toBeInTheDocument();
    });

    expect(gigService.updateGig).not.toHaveBeenCalled();
  });

  it('calls updateGig on form change', async () => {
    const user = userEvent.setup();
    render(<GigBasicInfoSection gigId={mockGigId} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Gig')).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText('Enter gig title');
    await user.type(titleInput, ' Updated');

    await waitFor(() => {
      expect(gigService.updateGig).toHaveBeenCalledWith(
        mockGigId,
        expect.objectContaining({
          title: 'Test Gig Updated',
        })
      );
    }, { timeout: 2000 }); // Account for debounce
  });
});
