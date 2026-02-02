import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GigListScreen from './GigListScreen';
import * as gigService from '../services/gig.service';

// Mock the services
vi.mock('../services/gig.service', () => ({
  getGigsForOrganization: vi.fn(),
  updateGig: vi.fn().mockResolvedValue({ id: 'gig-1', title: 'New Title' }),
  updateGigVenue: vi.fn(),
  updateGigAct: vi.fn(),
  duplicateGig: vi.fn(),
  deleteGig: vi.fn(),
}));

// Mock sub-components to reduce noise
vi.mock('./AppHeader', () => ({
  default: () => <div data-testid="app-header">App Header</div>
}));

vi.mock('./gigs/GigListFilters', () => ({
  GigListFilters: () => <div data-testid="filters">Filters</div>
}));

vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } }),
    },
  })),
}));

describe('GigListScreen Inline Editing Network Requests', () => {
  const mockOrganization = { id: 'org-1', name: 'Test Organization' };
  const mockUser = { id: 'user-1', email: 'test@example.com' };
  const mockGigs = [
    { 
      id: 'gig-1', 
      title: 'Jazz Concert', 
      start: '2026-02-22T12:00:00Z', 
      end: '2026-02-22T14:00:00Z', 
      status: 'Proposed',
      timezone: 'UTC',
      tags: [],
      venue: null,
      act: null
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (gigService.getGigsForOrganization as any).mockResolvedValue(mockGigs);
  });

  it('reproduces multiple updateGig calls when re-renders occur during editing', async () => {
    const { rerender } = render(
      <GigListScreen
        organization={mockOrganization as any}
        user={mockUser as any}
        userRole="Admin"
        onBack={() => {}}
        onCreateGig={() => {}}
        onViewGig={() => {}}
        onEditGig={() => {}}
        onNavigateToDashboard={() => {}}
        onNavigateToGigs={() => {}}
        onNavigateToAssets={() => {}}
        onSwitchOrganization={() => {}}
        onLogout={() => {}}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Jazz Concert')).toBeInTheDocument();
    });

    // 1. Click to edit title
    const titleCell = screen.getByText('Jazz Concert');
    fireEvent.click(titleCell);

    // Wait for the setTimeout(..., 0) in EditableTableCell to add the listener
    await new Promise(r => setTimeout(r, 10));

    // 2. Find input
    const input = screen.getByDisplayValue('Jazz Concert');

    // 3. Trigger multiple re-renders while editing
    // This simulates the listener leak condition
    for (let i = 0; i < 5; i++) {
      rerender(
        <GigListScreen
          organization={{ ...mockOrganization }}
          user={mockUser as any}
          userRole="Admin"
          onBack={() => {}}
          onCreateGig={() => {}}
          onViewGig={() => {}}
          onEditGig={() => {}}
          onNavigateToDashboard={() => {}}
          onNavigateToGigs={() => {}}
          onNavigateToAssets={() => {}}
          onSwitchOrganization={() => {}}
          onLogout={() => {}}
        />
      );
    }
    
    // Wait for all the setTimeouts from the effect runs to potentially fire
    await new Promise(r => setTimeout(r, 50));

    // 4. Change value
    fireEvent.change(input, { target: { value: 'New Title' } });

    // 5. Click outside to save
    fireEvent.mouseDown(document);

    // 6. Wait for updateGig to be called
    await waitFor(() => {
      expect(gigService.updateGig).toHaveBeenCalled();
    });

    // Check call count - if it's > 1, the bug is reproduced
    const callCount = (gigService.updateGig as any).mock.calls.length;
    console.log(`[TEST] updateGig called ${callCount} times`);
    
    expect(callCount).toBe(1);
  });
});
