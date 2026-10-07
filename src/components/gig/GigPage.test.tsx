import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import GigPage from './GigPage';
import { getGig, updateGig } from '../../services/gig.service';

vi.mock('../AppHeader', () => ({ default: () => <div data-testid="app-header" /> }));
vi.mock('../AttachmentManager', () => ({ default: () => <div data-testid="attachments" /> }));
vi.mock('../ActivityFeed', () => ({ default: () => <div data-testid="activity" /> }));
vi.mock('../ConflictWarning', () => ({ ConflictWarning: () => null }));
vi.mock('./useGigParticipantContacts', () => ({ useGigParticipantContacts: () => ({ data: [] }) }));
// The schedule editor stand-in reports to the page's edit session like the real one,
// with a save state and flush each test controls.
const schedule = vi.hoisted(() => ({
  state: 'idle' as 'idle' | 'saving' | 'saved' | 'error',
  flush: () => Promise.resolve(),
  props: null as any,
}));
vi.mock('./GigScheduleEditor', async () => {
  const { useReportToEditSession } = await import('../../utils/hooks/editSession');
  function ScheduleEditorStandIn(props: any) {
    schedule.props = props;
    useReportToEditSession(schedule.state, () => schedule.flush());
    return <div data-testid="edit-schedule" />;
  }
  return { default: ScheduleEditorStandIn };
});
vi.mock('./print/GigPrintSheet', () => ({
  default: function PrintSheetStandIn({ includeFinancials, onReady }: { includeFinancials: boolean; onReady: () => void }) {
    useEffect(() => { onReady(); }, [onReady]);
    return <div data-testid="print-sheet" data-financials={String(includeFinancials)} />;
  },
}));
vi.mock('../inventory/InventoryReports', async () => {
  const { useEffect } = await import('react');
  return {
    PackingList: ({ gig, onLoaded, hidePrintButton }: any) => {
      useEffect(() => { onLoaded?.(); }, [onLoaded]);
      return <div data-testid={onLoaded ? 'packing-print' : 'packing-list'} data-gig={gig.id} data-hide-print={String(!!hidePrintButton)} />;
    },
  };
});
vi.mock('./GigParticipantsSection', () => ({ default: () => <div data-testid="edit-participants" /> }));
vi.mock('./GigStaffSlotsSection', () => ({ default: () => <div data-testid="edit-staffing" /> }));
vi.mock('./GigKitAssignmentsSection', () => ({ default: () => <div data-testid="edit-equipment" /> }));
vi.mock('./GigFinancialsSection', () => ({ default: ({ editing }: { editing?: boolean }) => <div data-testid="financials" data-editing={String(editing)} /> }));
vi.mock('../../services/activityLog.service', () => ({ getGigActivity: vi.fn().mockResolvedValue([]) }));
vi.mock('../../services/conflictDetection.service', () => ({ checkAllConflicts: vi.fn().mockResolvedValue({ conflicts: [] }) }));

const gig = {
  id: 'g1', title: 'Riverside Summer Series', status: 'Booked', start: '2026-07-12T19:00:00Z', end: '2026-07-13T06:30:00Z',
  timezone: 'America/Los_Angeles', tags: ['Outdoor'], notes: 'Crew parking in Lot C',
  participants: [{ id: 'p1', role: 'Venue', organization_id: 'o-venue', organization: { id: 'o-venue', name: 'Riverside Amphitheater', address_line1: '1200 Waterfront Dr', city: 'Portland', state: 'OR' } }],
  schedule_entries: [{ id: 's1', activity_type: 'Load-In', label: null, start_time: '2026-07-12T19:00:00Z', end_time: null, act_participant_id: null, notes: 'Dock B' }],
  staff_slots: [{ id: 'sl1', organization_id: 'org-1', role: 'A1 Audio Engineer', count: 1,
    staff_assignments: [{ id: 'a1', user_id: 'u1', status: 'Confirmed', fee: 450, user: { first_name: 'Jordan', last_name: 'Lee', phone: '555-0121', email: 'j@example.com' } }] }],
};

vi.mock('../../services/gig.service', () => ({
  getGig: vi.fn(() => Promise.resolve(gig)),
  updateGig: vi.fn().mockResolvedValue({}),
  getGigKits: vi.fn().mockResolvedValue([]),
  deleteGig: vi.fn(),
  duplicateGig: vi.fn(),
}));

const baseProps = {
  gigId: 'g1',
  organization: { id: 'org-1', name: 'Northwest Sound Co', roles: ['Sound'] } as any,
  user: { id: 'u-me' } as any,
  onBack: vi.fn(), onGigDeleted: vi.fn(), onSwitchOrganization: vi.fn(), onLogout: vi.fn(),
};

describe('GigPage (#12)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    schedule.state = 'idle';
    schedule.flush = () => Promise.resolve();
    vi.mocked(getGig).mockImplementation(() => Promise.resolve(gig as any));
  });

  it('shows the overview in the agreed order, read-only', async () => {
    render(<GigPage {...baseProps} userRole="Admin" />);
    await screen.findByText('Riverside Summer Series');
    const names = ['Schedule', 'Venue', 'Notes & attachments', 'Participants', 'Staffing'];
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => names.find((n) => h.textContent?.startsWith(n)));
    expect(headings).toEqual(names);
    expect(screen.getByText('1200 Waterfront Dr')).toBeInTheDocument();
    expect(screen.queryByTestId('edit-staffing')).not.toBeInTheDocument();
  });

  it('gives Admins one Edit for the whole gig, then Done', async () => {
    render(<GigPage {...baseProps} userRole="Admin" />);
    fireEvent.click(await screen.findByRole('button', { name: /edit/i }));
    expect(await screen.findByRole('textbox', { name: 'Gig title' })).toBeInTheDocument();
    expect(screen.getByTestId('edit-staffing')).toBeInTheDocument();
    expect(screen.getByTestId('edit-participants')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Gig title' })).not.toBeInTheDocument());
  });

  describe('page header (#39)', () => {
    it('puts Back in the header slot, named for where it goes', async () => {
      const onBack = vi.fn();
      render(<GigPage {...baseProps} onBack={onBack} userRole="Manager" />);
      await screen.findByText('Riverside Summer Series');
      const back = within(screen.getByTestId('page-header-slot')).getByRole('button', { name: 'Back to Gigs' });
      fireEvent.click(back);
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('names Back for the calendar when the gig was opened from it', async () => {
      render(<GigPage {...baseProps} userRole="Manager" backLabel="Calendar" />);
      await screen.findByText('Riverside Summer Series');
      expect(screen.getByRole('button', { name: 'Back to Calendar' })).toBeInTheDocument();
    });

    it('keeps the title row first in edit mode: the Editing label is not above the title', async () => {
      render(<GigPage {...baseProps} userRole="Admin" initialEditing />);
      const title = await screen.findByRole('textbox', { name: 'Gig title' });
      const row = screen.getByTestId('page-header-title-row');
      expect(row).toContainElement(title);
      expect(row).toContainElement(screen.getByText('Editing'));
    });

    it('puts the gig tabs in the header, below the title', async () => {
      render(<GigPage {...baseProps} userRole="Manager" />);
      const heading = await screen.findByRole('heading', { level: 1, name: 'Riverside Summer Series' });
      const tablist = screen.getByRole('tablist', { name: 'Gig sections' });
      expect(heading.compareDocumentPosition(tablist) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it('opens on the tab the URL names, and reports tab changes to the URL', async () => {
    const onTabChange = vi.fn();
    render(<GigPage {...baseProps} userRole="Manager" tab="financials" onTabChange={onTabChange} />);
    expect(await screen.findByTestId('financials')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'History' }));
    expect(onTabChange).toHaveBeenCalledWith('history');
  });

  it('drives the Financials tab from the page edit mode', async () => {
    render(<GigPage {...baseProps} userRole="Manager" initialEditing />);
    await screen.findByRole('textbox', { name: 'Gig title' });
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Financials' }));
    expect((await screen.findByTestId('financials')).dataset.editing).toBe('true');
  });

  it.each(['Staff', 'Viewer'] as const)('%s: no Edit, no Financials tab, no pay column, even on the edit route', async (role) => {
    render(<GigPage {...baseProps} userRole={role} initialEditing />);
    await screen.findByText('Riverside Summer Series');
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Financials' })).not.toBeInTheDocument();
    const staffing = screen.getByRole('heading', { name: /Staffing/ }).closest('div.rounded-xl, [data-slot="card"]') as HTMLElement;
    expect(within(staffing).queryByText('Rate / Fee')).not.toBeInTheDocument();
    expect(within(staffing).queryByText(/\$450/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Staff cost/)).not.toBeInTheDocument();
  });

  it('shows Admins the crew pay and staff cost', async () => {
    render(<GigPage {...baseProps} userRole="Admin" />);
    await screen.findByText('Riverside Summer Series');
    expect(screen.getByText('$450 fee')).toBeInTheDocument();
    expect(screen.getByText(/Staff cost/)).toBeInTheDocument();
  });

  describe('edit mode', () => {
    const openEditor = async () => {
      render(<GigPage {...baseProps} userRole="Admin" initialEditing />);
      return screen.findByRole('textbox', { name: 'Gig title' });
    };
    const before = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

    it('edits the title, status and tags in the header, then When & schedule, Participants, Staffing, Notes', async () => {
      expect(await openEditor()).toHaveValue('Riverside Summer Series');
      const header = screen.getByRole('textbox', { name: 'Gig title' }).closest('[data-gig-header]') as HTMLElement;
      expect(within(header).getByRole('combobox', { name: 'Status' })).toHaveTextContent('Booked');
      expect(within(header).getByText('Outdoor')).toBeInTheDocument();

      const when = screen.getByRole('heading', { name: 'When & schedule' });
      const notes = screen.getByRole('heading', { name: 'Notes & attachments' });
      expect(before(when, screen.getByTestId('edit-schedule'))).toBe(true);
      expect(before(screen.getByTestId('edit-schedule'), screen.getByTestId('edit-participants'))).toBe(true);
      expect(before(screen.getByTestId('edit-participants'), screen.getByTestId('edit-staffing'))).toBe(true);
      expect(before(screen.getByTestId('edit-staffing'), notes)).toBe(true);
      const notesCard = notes.closest('[data-slot="card"]') as HTMLElement;
      expect(within(notesCard).getByDisplayValue('Crew parking in Lot C')).toBeInTheDocument();
      expect(within(notesCard).getByTestId('attachments')).toBeInTheDocument();
      expect(schedule.props.timeZone).toBe('America/Los_Angeles');
    });

    it('shows one save state for the whole page', async () => {
      schedule.state = 'saving';
      await openEditor();
      // Sections report their state from an effect, so it lands a render after the title box.
      expect(await screen.findByText('Saving…')).toBeInTheDocument();
    });

    it('Done waits for pending saves before leaving edit mode', async () => {
      let finish!: () => void;
      schedule.flush = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
      await openEditor();
      vi.mocked(getGig).mockClear();

      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      await act(async () => { await Promise.resolve(); });
      expect(schedule.flush).toHaveBeenCalled();
      expect(screen.getByRole('textbox', { name: 'Gig title' })).toBeInTheDocument();
      expect(getGig).not.toHaveBeenCalled();

      await act(async () => { finish(); });
      await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Gig title' })).not.toBeInTheDocument());
      expect(getGig).toHaveBeenCalled();
    });

    it('widens the gig to cover a schedule item outside it, and saves that', async () => {
      await openEditor();
      act(() => { schedule.props.onEntriesChange([{ start_time: '2026-07-12T17:00:00.000Z', end_time: null }]); });
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      await waitFor(() => expect(updateGig).toHaveBeenCalledWith('g1', expect.objectContaining({
        start: '2026-07-12T17:00:00.000Z',
        end: '2026-07-13T06:30:00.000Z',
      })));
    });

    it('leaves an all-day gig alone', async () => {
      vi.mocked(getGig).mockResolvedValue({ ...gig, start: '2026-07-12T12:00:00.000Z', end: '2026-07-12T12:00:00.000Z' } as any);
      await openEditor();
      act(() => { schedule.props.onEntriesChange([{ start_time: '2026-07-12T09:00:00.000Z', end_time: null }]); });
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Gig title' })).not.toBeInTheDocument());
      expect(updateGig).not.toHaveBeenCalled();
    });
  });

  it('shows the packing list on the Equipment tab, printed from the page Print menu (#39)', async () => {
    render(<GigPage {...baseProps} userRole="Manager" tab="equipment" />);
    const list = await screen.findByTestId('packing-list');
    expect(list.dataset.gig).toBe('g1');
    expect(list.dataset.hidePrint).toBe('true');
  });

  describe('printing', () => {
    beforeEach(() => { window.print = vi.fn(); });

    it('lets Admins print the gig sheet with or without the financials page', async () => {
      const user = userEvent.setup();
      render(<GigPage {...baseProps} userRole="Admin" />);
      await user.click(await screen.findByRole('button', { name: 'Print' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Gig sheet with financials' }));
      await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));
      expect(screen.getByTestId('print-sheet').dataset.financials).toBe('true');

      await user.click(screen.getByRole('button', { name: 'Print' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Gig sheet' }));
      await waitFor(() => expect(window.print).toHaveBeenCalledTimes(2));
      expect(screen.getByTestId('print-sheet').dataset.financials).toBe('false');
    });

    it.each(['Staff', 'Viewer'] as const)('%s prints the gig sheet without financials', async (role) => {
      const user = userEvent.setup();
      render(<GigPage {...baseProps} userRole={role} />);
      await user.click(await screen.findByRole('button', { name: 'Print' }));
      expect(screen.queryByRole('menuitem', { name: 'Gig sheet with financials' })).not.toBeInTheDocument();
      await user.click(await screen.findByRole('menuitem', { name: 'Gig sheet' }));
      await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));
      expect(screen.getByTestId('print-sheet').dataset.financials).toBe('false');
    });

    it.each(['Admin', 'Staff'] as const)('%s prints the packing list from the Print menu, once it has loaded (#39)', async (role) => {
      const user = userEvent.setup();
      render(<GigPage {...baseProps} userRole={role} />);
      await user.click(await screen.findByRole('button', { name: 'Print' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Packing list' }));
      const sheet = await screen.findByTestId('packing-print');
      expect(sheet.dataset.gig).toBe('g1');
      expect(sheet.closest('.no-print')).toBeNull();
      await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));
      expect(screen.queryByTestId('print-sheet')).not.toBeInTheDocument();
    });

    it('hides the screen page and shows only the sheet when printing', async () => {
      render(<GigPage {...baseProps} userRole="Admin" />);
      await screen.findByRole('button', { name: 'Print' });
      expect(screen.getByRole('main').closest('.no-print')).not.toBeNull();
    });
  });
});
