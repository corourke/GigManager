import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InventoryReports } from './InventoryReports';
import type { PackingListRow } from '../../services/inventoryManagement.service';

vi.mock('../../services/inventoryManagement.service', () => ({
  getGigsForReportPicker: vi.fn().mockResolvedValue([{ id: 'gig-1', title: 'Test Gig', start: '2026-07-12T19:00:00Z', timezone: 'America/Los_Angeles' }]),
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

import { getGigsForReportPicker, getPackingListReport } from '../../services/inventoryManagement.service';

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

// Issue #81, as Cameron listed it on 2026-09-28: kits A to Z, a kit's contents
// indented under it, a container on its own a single line.
const EXPECTED_81 = `
All Mic Stands (Items)
  Boom Stands 1 (Container)
  Boom Stands 2 (Container)
  Low Profile Boom Stands (Container)
  Atlas Straight Microphone Stand
Microphone Case (Container)
Network Cable Bag (Container)
Power Box (Container)
RCF Speakers (Items)
  RCF NX-932A Speaker, w/Cover
  RCF NX-932A Speaker, w/Cover
  RCF SUB-8003 Subwoofer, w/Casters and Cover
  RCF SUB-8003 Subwoofer, w/Casters and Cover
  RCF PowerCon Speaker Power Cable
  RCF TrueCon Speaker Power Cable
  Speaker Poles
SndEng Case (Container)
Stage Box Rack DS16 (Container)
Stage Snakes (Items)
  Seismic Audio - SASH-8x20 - 8 Channel XLR Send Sub Snake Cable - 20 Feet
  Seismic Audio - SASH-8x35 - 8 Channel XLR Send Sub Snake Cable - 35 Feet
WING Console (Container)
XLR Cable Box (Container)
`.trim().split('\n');

/** The report rows the service returns for that gig, kits in no particular order. */
function rowsFor81(): PackingListRow[] {
  const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const group = (name: string, container: boolean) =>
    ({ group_kit_id: `kit-${slug(name)}`, group_kit_name: name, group_is_container: container, group_tag_number: null });
  const container = (name: string) =>
    ({ kit_id: `kit-${slug(name)}`, kit_name: name, is_container: true, asset_id: null, asset_name: null, tag_number: null, quantity: 1, ...blank });
  const kits: [string, string[]][] = [];
  let current: [string, string[]] | null = null;
  for (const line of EXPECTED_81) {
    if (line.startsWith('  ')) current![1].push(line.trim());
    else kits.push((current = [line, []]));
  }
  const rows = kits.flatMap(([line, contents]) => {
    const name = line.replace(/ \((Items|Container)\)$/, '');
    if (line.endsWith('(Container)')) return [{ ...container(name), ...group(name, true) }];
    return contents.map((item, i) => item.endsWith('(Container)')
      ? { ...container(item.replace(' (Container)', '')), ...group(name, false) }
      : {
          kit_id: `kit-${slug(name)}`, kit_name: name, is_container: false, asset_id: `asset-${slug(name)}-${i}`, asset_name: item,
          tag_number: null, quantity: 1, ...blank, ...group(name, false),
        });
  });
  // Scramble the kits: the report sorts them, not the service.
  const order = ['kit-stage-snakes', 'kit-xlr-cable-box', 'kit-rcf-speakers', 'kit-power-box', 'kit-all-mic-stands'];
  return [...rows].sort((x, y) => (order.indexOf(y.group_kit_id) - order.indexOf(x.group_kit_id)));
}

/** The report body as an indented list: "Name (Type)", contents two spaces in. */
function packingTree(): string[] {
  const body = screen.getAllByRole('rowgroup')[1];
  return within(body).getAllByRole('row').map((row) => {
    const indent = row.getAttribute('data-depth') === '1' ? '  ' : '';
    const name = row.querySelector('[data-item-name]')?.textContent ?? '';
    const kind = row.querySelector('[data-kit-kind]')?.textContent;
    return `${indent}${name}${kind ? ` (${kind})` : ''}`;
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

  it('lists kits A to Z with their contents indented, each container once (#81)', async () => {
    (getPackingListReport as any).mockResolvedValue(rowsFor81());
    await renderPackingListTab();

    await waitFor(() => expect(screen.getByText('Speaker Poles')).toBeInTheDocument());
    expect(packingTree()).toEqual(EXPECTED_81);
  });

  it('gives each kit line a checkbox but no scan status for an Items kit (#81)', async () => {
    (getPackingListReport as any).mockResolvedValue(rowsFor81());
    await renderPackingListTab();

    const kitLine = (await screen.findByText('RCF Speakers')).closest('tr')!;
    expect(within(kitLine).getByRole('checkbox', { name: 'Verified: RCF Speakers' })).toBeInTheDocument();
    expect(within(kitLine).queryByText('Not scanned')).not.toBeInTheDocument();
    const powerBox = screen.getByText('Power Box').closest('tr')!;
    expect(within(powerBox).getByText('Not scanned')).toBeInTheDocument();
  });

  it('prints a header with the gig, its date and the kit and line counts (#12)', async () => {
    (getPackingListReport as any).mockResolvedValue(rowsFor81());
    await renderPackingListTab();

    await waitFor(() => expect(screen.getByText('Speaker Poles')).toBeInTheDocument());
    const header = screen.getByTestId('packing-print-header');
    expect(header).toHaveTextContent('Packing list · Test Org');
    expect(header).toHaveTextContent('Test Gig');
    expect(header).toHaveTextContent('Sun, Jul 12, 2026');
    expect(header).toHaveTextContent('10 kits · 23 lines');
  });
});

describe('InventoryReports — gig picker window (#109)', () => {
  const recent = { id: 'gig-1', title: 'Test Gig', start: '2026-07-12T19:00:00Z', timezone: 'America/Los_Angeles' };
  const old = { id: 'gig-old', title: 'Old Gig', start: '2025-01-10T19:00:00Z', timezone: 'America/Los_Angeles' };

  it('asks for the windowed list first and the full list when Show all gigs is checked', async () => {
    const picker = getGigsForReportPicker as any;
    picker.mockClear();
    picker.mockImplementation((_org: string, opts?: { showAll?: boolean }) =>
      Promise.resolve(opts?.showAll ? [recent, old] : [recent]));
    const user = userEvent.setup();
    render(<InventoryReports organizationId="org-1" organizationName="Test Org" />);
    await user.click(await screen.findByRole('tab', { name: 'Packing List' }));

    expect(picker).toHaveBeenLastCalledWith('org-1', { showAll: false });
    expect(screen.queryByRole('option', { name: 'Old Gig' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Show all gigs' }));

    expect(picker).toHaveBeenLastCalledWith('org-1', { showAll: true });
    expect(await screen.findByRole('option', { name: 'Old Gig' })).toBeInTheDocument();
  });

  it('keeps the selected gig in the list after Show all gigs is unchecked', async () => {
    const picker = getGigsForReportPicker as any;
    picker.mockImplementation((_org: string, opts?: { showAll?: boolean }) =>
      Promise.resolve(opts?.showAll ? [recent, old] : [recent]));
    (getPackingListReport as any).mockResolvedValue([]);
    const user = userEvent.setup();
    render(<InventoryReports organizationId="org-1" organizationName="Test Org" />);
    await user.click(await screen.findByRole('tab', { name: 'Packing List' }));
    await user.click(screen.getByRole('checkbox', { name: 'Show all gigs' }));
    await user.click(await screen.findByRole('option', { name: 'Old Gig' }));
    await waitFor(() => expect(getPackingListReport).toHaveBeenLastCalledWith('org-1', 'gig-old'));

    await user.click(screen.getByRole('checkbox', { name: 'Show all gigs' }));

    await waitFor(() => expect(picker).toHaveBeenLastCalledWith('org-1', { showAll: false }));
    expect(screen.getByRole('option', { name: 'Old Gig' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Test Gig' })).toBeInTheDocument();
  });
});
