import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InventoryReports } from './InventoryReports';
import type { PackingListRow } from '../../services/inventoryManagement.service';

vi.mock('../../services/inventoryManagement.service', () => ({
  getGigsForReportPicker: vi.fn().mockResolvedValue([{ id: 'gig-1', title: 'Test Gig' }]),
  getInventoryConflictFlags: vi.fn().mockResolvedValue(new Set()),
  getManifestReport: vi.fn().mockResolvedValue([]),
  getMaintenanceQueueReport: vi.fn().mockResolvedValue([]),
  getPackingListReport: vi.fn(),
}));

// Real Radix Select doesn't drive well under jsdom; stand in a plain version
// that still round-trips a selection through onValueChange, so choosing a gig
// actually changes PackingListTab's state (same shape as the existing
// LocationExplorer.test.tsx select mock, extended to support selecting).
vi.mock('../ui/select', () => {
  let currentOnValueChange: (v: string) => void = () => {};
  return {
    Select: ({ children, onValueChange }: any) => {
      currentOnValueChange = onValueChange;
      return <div>{children}</div>;
    },
    SelectTrigger: ({ children, 'aria-label': ariaLabel }: any) => (
      <button role="combobox" aria-label={ariaLabel}>{children}</button>
    ),
    SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
    SelectContent: ({ children }: any) => <div>{children}</div>,
    SelectItem: ({ children, value }: any) => (
      <div role="option" onClick={() => currentOnValueChange(value)}>{children}</div>
    ),
  };
});

import { getPackingListReport } from '../../services/inventoryManagement.service';

const PACKING_ROWS: PackingListRow[] = [
  {
    kit_id: 'kit-lighting', kit_name: 'Lighting Kit', is_container: false,
    asset_id: 'asset-par', asset_name: 'LED Par', tag_number: 'PAR-1', quantity: 4,
    status: null, location: null, scanned_at: null, scanned_by_name: null, notes: null, has_conflict: false,
  },
  {
    kit_id: 'kit-lighting', kit_name: 'Lighting Kit', is_container: false,
    asset_id: 'asset-cable', asset_name: 'XLR Cable', tag_number: null, quantity: 3,
    status: null, location: null, scanned_at: null, scanned_by_name: null, notes: null, has_conflict: false,
  },
  {
    kit_id: 'kit-case', kit_name: 'Road Case', is_container: true,
    asset_id: null, asset_name: null, tag_number: 'RC-1', quantity: 1,
    status: null, location: null, scanned_at: null, scanned_by_name: null, notes: null, has_conflict: false,
  },
];

async function renderPackingListTab() {
  const user = userEvent.setup();
  render(<InventoryReports organizationId="org-1" organizationName="Test Org" />);
  await user.click(await screen.findByRole('tab', { name: 'Packing List' }));
  await user.click(await screen.findByRole('option', { name: 'Test Gig' }));
}

describe('InventoryReports — Packing List tab', () => {
  it('renders every kit group inside a single table, not one table per kit', async () => {
    (getPackingListReport as any).mockResolvedValue(PACKING_ROWS);
    await renderPackingListTab();

    await waitFor(() => expect(screen.getByText('LED Par')).toBeInTheDocument());
    expect(screen.getAllByRole('table')).toHaveLength(1);
  });

  it('shows the component quantity for each item', async () => {
    (getPackingListReport as any).mockResolvedValue(PACKING_ROWS);
    await renderPackingListTab();

    const parRow = (await screen.findByText('LED Par')).closest('tr')!;
    expect(within(parRow).getByText('4')).toBeInTheDocument();

    const cableRow = screen.getByText('XLR Cable').closest('tr')!;
    expect(within(cableRow).getByText('3')).toBeInTheDocument();
  });

  it('gives a multi-item kit a divider row but skips it for a standalone container row', async () => {
    (getPackingListReport as any).mockResolvedValue(PACKING_ROWS);
    await renderPackingListTab();

    await waitFor(() => expect(screen.getByText('LED Par')).toBeInTheDocument());

    // Lighting Kit groups two rows — it gets its own divider row naming the kit.
    expect(screen.getByText('Lighting Kit')).toBeInTheDocument();

    // Road Case is a standalone container row — its name appears exactly
    // once, inline on the item row itself, not also as a divider row.
    expect(screen.getAllByText('Road Case')).toHaveLength(1);
    const roadCaseRow = screen.getByText('Road Case').closest('tr')!;
    expect(within(roadCaseRow).getByText('1')).toBeInTheDocument();
  });
});
