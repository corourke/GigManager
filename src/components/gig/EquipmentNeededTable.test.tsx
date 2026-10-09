import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import EquipmentNeededTable from './EquipmentNeededTable';
import { getEquipmentNeeded } from '../../services/conflictDetection.service';

vi.mock('../../services/conflictDetection.service', () => ({ getEquipmentNeeded: vi.fn() }));

const row = (over: Record<string, any>) => ({
  itemId: 'x', name: 'X', thisGig: 1, overlapping: 0, needed: 1, owned: 1, inMaintenance: 0, inContainers: 0, free: 1, short: 0, status: 'enough', ...over,
});

// #184 (mockup screen 10): the gig's Equipment tab lists what it needs per item.
describe('EquipmentNeededTable (#184)', () => {
  it('lists each item: this gig, overlapping, needed, owned, in maintenance, free and status', async () => {
    vi.mocked(getEquipmentNeeded).mockResolvedValue({
      overlapping: 1,
      rows: [
        row({ itemId: 'trio', name: 'Chauvet Intimidator Trio', thisGig: 4, overlapping: 4, needed: 8, owned: 6, free: 6, short: 2, status: 'short' }),
        row({ itemId: 'k12', name: 'QSC K12.2', thisGig: 2, overlapping: 2, needed: 4, owned: 6, inMaintenance: 1, free: 5, status: 'enough' }),
        row({ itemId: 'xlr', name: 'XLR Cable, 50 ft', thisGig: 4, overlapping: 2, needed: 6, owned: 10, inContainers: 4, free: 6, status: 'none-spare' }),
      ],
    } as any);
    render(<EquipmentNeededTable gigId="g1" gigStart="2026-10-10T18:00:00" gigEnd="2026-10-10T23:00:00" />);
    expect(await screen.findByText('Equipment needed on Oct 10')).toBeInTheDocument();
    expect(screen.getByText('this gig and the 1 that overlaps it')).toBeInTheDocument();
    const trio = screen.getByText('Chauvet Intimidator Trio').closest('tr')!;
    expect(trio).toHaveTextContent('Chauvet Intimidator Trio448606 2 short');
    expect(within(screen.getByText('QSC K12.2').closest('tr')!).getByText('Enough')).toBeInTheDocument();
    expect(within(screen.getByText('XLR Cable, 50 ft').closest('tr')!).getByText('none spare · 4 are in container kits')).toBeInTheDocument();
    expect(getEquipmentNeeded).toHaveBeenCalledWith('g1', '2026-10-10T18:00:00', '2026-10-10T23:00:00', undefined);
  });

  it('shows nothing when the gig needs no equipment', async () => {
    vi.mocked(getEquipmentNeeded).mockResolvedValue({ overlapping: 0, rows: [] });
    const { container } = render(<EquipmentNeededTable gigId="g1" gigStart="2026-10-10T18:00:00" gigEnd="2026-10-10T23:00:00" />);
    await new Promise((r) => setTimeout(r, 0));
    expect(container).toBeEmptyDOMElement();
  });
});
