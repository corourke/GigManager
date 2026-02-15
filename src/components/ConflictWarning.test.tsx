import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConflictWarning } from './ConflictWarning';
import { Conflict } from '../services/conflictDetection.service';

const mockConflicts: Conflict[] = [
  {
    type: 'staff',
    gig_id: 'gig-1',
    gig_title: 'Test Gig 1',
    start: '2024-01-01T10:00:00Z',
    end: '2024-01-01T12:00:00Z',
    details: {
      conflicting_staff: [
        { user_id: 'user-1', name: 'John Doe' },
        { user_id: 'user-2', name: 'Jane Smith' }
      ]
    }
  },
  {
    type: 'venue',
    gig_id: 'gig-2',
    gig_title: 'Test Gig 2',
    start: '2024-01-01T14:00:00Z',
    end: '2024-01-01T16:00:00Z',
    details: {
      venue_id: 'venue-1',
      venue_name: 'Test Venue'
    }
  }
];

describe('ConflictWarning', () => {
  it('renders nothing when there are no conflicts', () => {
    const { container } = render(<ConflictWarning conflicts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders alert style when showAsCard is false', () => {
    render(<ConflictWarning conflicts={mockConflicts} />);
    expect(screen.getByText('2 Conflicts Detected')).toBeInTheDocument();
    expect(screen.getByText(/Test Gig 1/)).toBeInTheDocument();
    expect(screen.getByText(/Test Gig 2/)).toBeInTheDocument();
  });

  it('renders card style when showAsCard is true', () => {
    render(<ConflictWarning conflicts={mockConflicts} showAsCard={true} />);
    expect(screen.getByText('Conflicts Detected (2)')).toBeInTheDocument();
    expect(screen.getByText('Staff Conflict')).toBeInTheDocument();
    expect(screen.getByText('Venue Conflict')).toBeInTheDocument();
  });

  it('displays correct conflict details for staff conflicts', () => {
    render(<ConflictWarning conflicts={[mockConflicts[0]]} showAsCard={true} />);
    expect(screen.getByText('Staff conflict with: John Doe, Jane Smith')).toBeInTheDocument();
  });

  it('displays correct conflict details for venue conflicts', () => {
    render(<ConflictWarning conflicts={[mockConflicts[1]]} showAsCard={true} />);
    expect(screen.getByText('Venue conflict at: Test Venue')).toBeInTheDocument();
  });

  it('calls onViewGig when View Gig button is clicked', () => {
    const mockOnViewGig = vi.fn();
    render(
      <ConflictWarning
        conflicts={[mockConflicts[0]]}
        showAsCard={true}
        onViewGig={mockOnViewGig}
      />
    );

    const viewButton = screen.getByText('View Gig');
    fireEvent.click(viewButton);

    expect(mockOnViewGig).toHaveBeenCalledWith('gig-1');
  });

  it('calls onOverride when Override button is clicked', () => {
    const mockOnOverride = vi.fn();
    render(
      <ConflictWarning
        conflicts={[mockConflicts[0]]}
        showAsCard={true}
        onOverride={mockOnOverride}
      />
    );

    const overrideButton = screen.getByText('Override');
    fireEvent.click(overrideButton);

    expect(mockOnOverride).toHaveBeenCalledWith('staff-gig-1');
  });

  it('does not render View Gig button when onViewGig is not provided', () => {
    render(<ConflictWarning conflicts={[mockConflicts[0]]} showAsCard={true} />);
    expect(screen.queryByText('View Gig')).not.toBeInTheDocument();
  });

  it('does not render Override button when onOverride is not provided', () => {
    render(<ConflictWarning conflicts={[mockConflicts[0]]} showAsCard={true} />);
    expect(screen.queryByText('Override')).not.toBeInTheDocument();
  });
});