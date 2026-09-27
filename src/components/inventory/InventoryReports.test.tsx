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

const blank = { status: null, location: null, scanned_at: null, scanned_by_name: null, notes: null, has_conflict: false };
const lighting = { group_kit_id: 'kit-lighting', group_kit_name: 'Lighting Kit', group_is_container: false, group_tag_number: null };
const PACKING_ROWS: PackingListRow[] = [
  {
    kit_id: 'kit-lighting', kit_name: 'Lighting Kit', is_container: false,
    asset_id: 'asset-par', asset_name: 'LED Par', tag_number: 'PAR-1', quantity: 4, ...lighting, ...blank,
  },
  {
    kit_id: 'kit-lighting', kit_name: 'Lighting Kit', is_container: false,
    asset_id: 'asset-cable', asset_name: 'XLR Cable', tag_number: null, quantity: 3, ...lighting, ...blank,
  },
  {
    kit_id: 'kit-case', kit_name: 'Road Case', is_container: true,
    asset_id: null, asset_name: null, tag_number: 'RC-1', quantity: 1,
    group_kit_id: 'kit-case', group_kit_name: 'Road Case', group_is_container: true, group_tag_number: 'RC-1', ...blank,
  },
];

// Issue #81: a kit holding only containers, then a container assigned on its own.
const allMic = { group_kit_id: 'kit-all-mic', group_kit_name: 'All Mic Stands', group_is_container: false, group_tag_number: null };
const MIC_STAND_ROWS: PackingListRow[] = [
  { kit_id: 'kit-boom-1', kit_name: 'Boom Stands 1', is_container: true, asset_id: null, asset_name: null, tag_number: 'BS-1', quantity: 1, ...allMic, ...blank },
  { kit_id: 'kit-boom-2', kit_name: 'Boom Stands 2', is_container: true, asset_id: null, asset_name: null, tag_number: 'BS-2', quantity: 1, ...allMic, ...blank },
  {
    kit_id: 'kit-power', kit_name: 'Power Box', is_container: true, asset_id: null, asset_name: null, tag_number: 'PWR-1', quantity: 1,
    group_kit_id: 'kit-power', group_kit_name: 'Power Box', group_is_container: true, group_tag_number: 'PWR-1', ...blank,
  },
];

/** The table body top to bottom: a kit heading (a row with one spanning cell) as "# <kit>", an item row as its name. */
function packingOrder(): string[] {
  const body = screen.getAllByRole('rowgroup')[1];
  return within(body).getAllByRole('row').map((row) => {
    const cells = within(row).getAllByRole('cell');
    return cells.length === 1
      ? `# ${cells[0].querySelector('span')?.textContent ?? ''}`
      : cells[1].firstElementChild?.firstChild?.textContent ?? '';
  });
}

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

  it('puts every assigned kit under its own heading, a lone container included (#81)', async () => {
    (getPackingListReport as any).mockResolvedValue(PACKING_ROWS);
    await renderPackingListTab();

    await waitFor(() => expect(screen.getByText('LED Par')).toBeInTheDocument());
    expect(packingOrder()).toEqual(['# Lighting Kit', 'LED Par', 'XLR Cable', '# Road Case', 'Road Case']);
    const roadCaseRow = screen.getAllByRole('row').find((r) => r.querySelectorAll('td').length > 1 && r.textContent?.includes('RC-1'))!;
    expect(within(roadCaseRow).getByText('1')).toBeInTheDocument();
  });

  it('lists containers packed inside a kit under that kit, not under whatever comes before (#81)', async () => {
    (getPackingListReport as any).mockResolvedValue([...PACKING_ROWS.slice(0, 2), ...MIC_STAND_ROWS]);
    await renderPackingListTab();

    await waitFor(() => expect(screen.getByText('Boom Stands 1')).toBeInTheDocument());
    expect(packingOrder()).toEqual([
      '# Lighting Kit', 'LED Par', 'XLR Cable',
      '# All Mic Stands', 'Boom Stands 1', 'Boom Stands 2',
      '# Power Box', 'Power Box',
    ]);
  });
});
