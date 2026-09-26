import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import GigPage from './GigPage';

vi.mock('../AppHeader', () => ({ default: () => <div data-testid="app-header" /> }));
vi.mock('../AttachmentManager', () => ({ default: () => <div data-testid="attachments" /> }));
vi.mock('../ActivityFeed', () => ({ default: () => <div data-testid="activity" /> }));
vi.mock('../ConflictWarning', () => ({ ConflictWarning: () => null }));
vi.mock('./useGigParticipantContacts', () => ({ useGigParticipantContacts: () => ({ data: [] }) }));
vi.mock('./GigBasicInfoSection', () => ({ default: () => <div data-testid="edit-basic-info" /> }));
vi.mock('./GigScheduleEditor', () => ({ default: () => <div data-testid="edit-schedule" /> }));
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
  beforeEach(() => localStorage.clear());

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
    expect(screen.getByTestId('edit-basic-info')).toBeInTheDocument();
    expect(screen.getByTestId('edit-staffing')).toBeInTheDocument();
    expect(screen.getByTestId('edit-participants')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByTestId('edit-basic-info')).not.toBeInTheDocument();
  });

  it('drives the Financials tab from the page edit mode', async () => {
    render(<GigPage {...baseProps} userRole="Manager" initialEditing />);
    await screen.findByText('Riverside Summer Series');
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
});
