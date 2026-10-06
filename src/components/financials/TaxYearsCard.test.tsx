import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaxYearsCard from './TaxYearsCard';
import { getTaxYears, saveTaxYear } from '../../services/taxYear.service';

vi.mock('../../services/taxYear.service', () => ({
  getTaxYears: vi.fn(),
  saveTaxYear: vi.fn(async () => ({})),
  deleteTaxYear: vi.fn(),
}));

// #133: filed tax years are locked so their purchases keep their tax fields.
describe('TaxYearsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTaxYears).mockResolvedValue([
      { organization_id: 'org-1', year: 2025, locked: true, filed_on: '2026-04-10', notes: null },
      { organization_id: 'org-1', year: 2024, locked: false, filed_on: null, notes: null },
    ]);
  });

  const row = (year: string) => screen.getByRole('row', { name: new RegExp(`^${year}`) });

  it('lists each year as locked or open', async () => {
    render(<TaxYearsCard organizationId="org-1" userRole="Admin" />);
    await waitFor(() => expect(row('2025')).toBeInTheDocument());
    expect(within(row('2025')).getByText('Locked')).toBeInTheDocument();
    expect(within(row('2025')).getByText('Apr 10, 2026')).toBeInTheDocument();
    expect(within(row('2024')).getByText('Open')).toBeInTheDocument();
  });

  it('lets an Admin lock a filed year', async () => {
    render(<TaxYearsCard organizationId="org-1" userRole="Admin" />);
    await screen.findByText('Locked');
    await userEvent.clear(screen.getByLabelText('Tax year'));
    await userEvent.type(screen.getByLabelText('Tax year'), '2023');
    await userEvent.type(screen.getByLabelText('Filed on'), '2024-04-01');
    await userEvent.click(screen.getByRole('button', { name: 'Lock year' }));
    await waitFor(() => expect(saveTaxYear).toHaveBeenCalledWith('org-1', 2023, { locked: true, filed_on: '2024-04-01' }));
  });

  it('lets an Admin unlock a year, and lock it again', async () => {
    render(<TaxYearsCard organizationId="org-1" userRole="Admin" />);
    await screen.findByText('Locked');
    await userEvent.click(within(row('2025')).getByRole('button', { name: 'Unlock' }));
    await waitFor(() => expect(saveTaxYear).toHaveBeenCalledWith('org-1', 2025, { locked: false }));
    await userEvent.click(within(row('2024')).getByRole('button', { name: 'Lock' }));
    await waitFor(() => expect(saveTaxYear).toHaveBeenCalledWith('org-1', 2024, { locked: true }));
  });

  it('is read-only for Managers', async () => {
    render(<TaxYearsCard organizationId="org-1" userRole="Manager" />);
    await screen.findByText('Locked');
    expect(screen.queryByRole('button', { name: 'Lock year' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unlock' })).not.toBeInTheDocument();
    expect(screen.getByText(/Only Admins can lock or unlock a year/)).toBeInTheDocument();
  });
});
