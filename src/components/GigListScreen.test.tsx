import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GigListScreen from './GigListScreen';

// Mock localStorage. Whether jsdom / the JS engine backs localStorage with a
// real implementation varies (it is absent under the CI runner), so provide a
// deterministic stand-in the way the other list-screen tests do.
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    length: 0,
    key: vi.fn((_index: number) => null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const now = Date.now();
const futureGig = {
  id: 'gig-future',
  title: 'Upcoming Show',
  status: 'Booked',
  start: new Date(now + 86400000).toISOString(),
  end: new Date(now + 90000000).toISOString(),
  timezone: 'America/New_York',
  tags: [],
  notes: '',
  venue: null,
  act: null,
};
const pastGig = {
  id: 'gig-past',
  title: 'Old Show',
  status: 'Completed',
  start: new Date(now - 172800000).toISOString(),
  end: new Date(now - 168000000).toISOString(),
  timezone: 'America/New_York',
  tags: [],
  notes: '',
  venue: null,
  act: null,
};

vi.mock('../services/gig.service', () => ({
  getGigsForOrganization: vi.fn(),
  updateGig: vi.fn(),
  duplicateGig: vi.fn(),
  deleteGig: vi.fn(),
  getGigExportAggregates: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock('../services/conflictDetection.service', () => ({
  checkAllConflictsForGigs: vi.fn().mockResolvedValue([]),
}));

import { getGigsForOrganization } from '../services/gig.service';

const organization = { id: 'org-1', name: 'Test Org' } as any;
const user = { id: 'user-1', name: 'Test User' } as any;

const noop = () => {};

describe('GigListScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getGigsForOrganization).mockResolvedValue([futureGig, pastGig]);
  });

  it('shows Upcoming gigs by default and hides Past gigs', async () => {
    render(
      <GigListScreen
        organization={organization}
        user={user}
        userRole="Admin"
        onBack={noop}
        onCreateGig={noop}
        onViewGig={noop}
        onEditGig={noop}
        onNavigateToDashboard={noop}
        onNavigateToGigs={noop}
        onNavigateToAssets={noop}
        onSwitchOrganization={noop}
        onLogout={noop}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Upcoming Show')).toBeInTheDocument();
    });
    expect(screen.queryByText('Old Show')).not.toBeInTheDocument();
  });

  it('shows Past gigs and hides Upcoming gigs when the Past tab is selected', async () => {
    const ue = userEvent.setup();
    render(
      <GigListScreen
        organization={organization}
        user={user}
        userRole="Admin"
        onBack={noop}
        onCreateGig={noop}
        onViewGig={noop}
        onEditGig={noop}
        onNavigateToDashboard={noop}
        onNavigateToGigs={noop}
        onNavigateToAssets={noop}
        onSwitchOrganization={noop}
        onLogout={noop}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Upcoming Show')).toBeInTheDocument();
    });

    await ue.click(screen.getByText('Past (1)'));

    await waitFor(() => {
      expect(screen.getByText('Old Show')).toBeInTheDocument();
    });
    expect(screen.queryByText('Upcoming Show')).not.toBeInTheDocument();
  });

  it('labels the tabs with the count of gigs in each timeframe', async () => {
    render(
      <GigListScreen
        organization={organization}
        user={user}
        userRole="Admin"
        onBack={noop}
        onCreateGig={noop}
        onViewGig={noop}
        onEditGig={noop}
        onNavigateToDashboard={noop}
        onNavigateToGigs={noop}
        onNavigateToAssets={noop}
        onSwitchOrganization={noop}
        onLogout={noop}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Upcoming (1)')).toBeInTheDocument();
    });
    expect(screen.getByText('Past (1)')).toBeInTheDocument();
  });
});
