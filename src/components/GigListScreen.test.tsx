import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

vi.mock('../utils/gigExport', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/gigExport')>()),
  downloadGigCsv: vi.fn(),
}));

vi.mock('../services/conflictDetection.service', () => ({
  checkAllConflictsForGigs: vi.fn().mockResolvedValue([]),
}));

import { getGigsForOrganization } from '../services/gig.service';
import { downloadGigCsv } from '../utils/gigExport';
import { checkAllConflictsForGigs } from '../services/conflictDetection.service';

const organization = { id: 'org-1', name: 'Test Org' } as any;
const user = { id: 'user-1', name: 'Test User' } as any;

const noop = () => {};

describe('GigListScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getGigsForOrganization).mockResolvedValue([futureGig, pastGig]);
  });

  describe('a gig that started earlier today (#74)', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('stays in Upcoming until its day is over', async () => {
      // 15:00 in New York; the gig ran 10:00-12:00 there the same day.
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-25T19:00:00.000Z'));
      vi.mocked(getGigsForOrganization).mockResolvedValue([
        { ...futureGig, id: 'gig-today', title: 'Today Show', start: '2026-09-25T14:00:00.000Z', end: '2026-09-25T16:00:00.000Z' },
      ]);
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
        expect(screen.getByText('Today Show')).toBeInTheDocument();
      });
      expect(screen.getByText('Upcoming (1)')).toBeInTheDocument();
      expect(screen.getByText('Past (0)')).toBeInTheDocument();
    });
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

  it('opens the gig when the title cell is clicked (#27)', async () => {
    const ue = userEvent.setup();
    const onViewGig = vi.fn();
    render(
      <GigListScreen
        organization={organization}
        user={user}
        userRole="Admin"
        onBack={noop}
        onCreateGig={noop}
        onViewGig={onViewGig}
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

    await ue.click(screen.getByText('Upcoming Show'));

    expect(onViewGig).toHaveBeenCalledWith('gig-future');
  });

  // Issue #168: money columns are Admin/Manager only (gig_financials RLS, and
  // Staff/Viewers can't see pay), so they aren't offered or exported to others.
  describe('financial columns (#168)', () => {
    const moneyColumns = ['Cost of Staff', 'Revenue', 'Expenses', 'Profit'];

    const renderAs = (userRole: 'Admin' | 'Manager' | 'Staff' | 'Viewer') =>
      render(
        <GigListScreen
          organization={organization}
          user={user}
          userRole={userRole}
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

    it.each(['Admin', 'Manager'] as const)('offers the money columns to %s', async (role) => {
      const ue = userEvent.setup();
      renderAs(role);
      await screen.findByText('Upcoming Show');

      await ue.click(screen.getByRole('button', { name: /columns/i }));

      expect(screen.getByRole('menuitemcheckbox', { name: 'Number of Staff' })).toBeInTheDocument();
      for (const name of moneyColumns) {
        expect(screen.getByRole('menuitemcheckbox', { name })).toBeInTheDocument();
      }
    });

    it.each(['Staff', 'Viewer'] as const)('does not offer the money columns to %s', async (role) => {
      const ue = userEvent.setup();
      renderAs(role);
      await screen.findByText('Upcoming Show');

      await ue.click(screen.getByRole('button', { name: /columns/i }));

      expect(screen.getByRole('menuitemcheckbox', { name: 'Number of Staff' })).toBeInTheDocument();
      for (const name of moneyColumns) {
        expect(screen.queryByRole('menuitemcheckbox', { name })).not.toBeInTheDocument();
      }
    });

    it('does not export money columns for Staff, even if they were turned on in this browser', async () => {
      const ue = userEvent.setup();
      localStorage.setItem('table-state-gig-list', JSON.stringify({
        columnVisibility: { staffCount: true, costOfStaff: true, revenue: true, expenses: true, profit: true },
      }));
      renderAs('Staff');
      await screen.findByText('Upcoming Show');

      await ue.click(screen.getByRole('button', { name: /export/i }));
      await ue.click(await screen.findByRole('button', { name: 'Continue' }));

      expect(downloadGigCsv).toHaveBeenCalledTimes(1);
      const headerRow = vi.mocked(downloadGigCsv).mock.calls[0][0].split(/\r?\n/)[0];
      expect(headerRow).toContain('Number of Staff');
      for (const name of moneyColumns) {
        expect(headerRow).not.toContain(name);
      }
    });
  });

  describe('the conflict banner View button (#170)', () => {
    const conflict = {
      level: 'conflict' as const, type: 'staff' as const,
      gig_id: 'gig-future', gig_title: 'Upcoming Show',
      start: futureGig.start, end: futureGig.end,
      details: { conflicting_staff: [{ user_id: 'u-1', name: 'Sam Whitfield' }] },
    };

    const renderScreen = (viewMode: 'list' | 'calendar', onViewGig: (id: string, fromCalendar?: boolean) => void) =>
      render(
        <GigListScreen
          organization={organization}
          user={user}
          userRole="Admin"
          viewMode={viewMode}
          onBack={noop}
          onCreateGig={noop}
          onViewGig={onViewGig}
          onEditGig={noop}
          onNavigateToDashboard={noop}
          onNavigateToGigs={noop}
          onNavigateToAssets={noop}
          onSwitchOrganization={noop}
          onLogout={noop}
        />
      );

    beforeEach(() => {
      vi.mocked(checkAllConflictsForGigs).mockResolvedValue([conflict]);
    });

    it('from the list, opens the gig with Back to Gigs', async () => {
      const ue = userEvent.setup();
      const onViewGig = vi.fn();
      renderScreen('list', onViewGig);

      await ue.click(await screen.findByRole('button', { name: 'View' }));

      expect(onViewGig).toHaveBeenCalledWith('gig-future');
      expect(onViewGig.mock.calls[0][1]).toBeFalsy();
    });

    it('from the calendar, opens the gig with Back to Calendar', async () => {
      const ue = userEvent.setup();
      const onViewGig = vi.fn();
      renderScreen('calendar', onViewGig);

      await ue.click(await screen.findByRole('button', { name: 'View' }));

      expect(onViewGig).toHaveBeenCalledWith('gig-future', true);
    });
  });
});
