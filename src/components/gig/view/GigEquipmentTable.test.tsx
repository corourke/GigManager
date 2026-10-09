import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import GigEquipmentTable from './GigEquipmentTable';
import { getGigKits } from '../../../services/gig.service';
import { getKitsFlattenedSummary } from '../../../services/kit.service';

vi.mock('../../../services/gig.service', () => ({ getGigKits: vi.fn() }));
vi.mock('../../../services/kit.service', () => ({ getKitsFlattenedSummary: vi.fn() }));

// #185: the gig's Equipment card says how many pieces each kit holds.
describe('GigEquipmentTable', () => {
  it('has a Holds column: the pieces in each kit, "any" lines included', async () => {
    vi.mocked(getGigKits).mockResolvedValue([
      { id: 'a1', kit_id: 'pa', kit: { id: 'pa', name: 'Main PA', tag_number: 'KIT-005' } },
      { id: 'a2', kit_id: 'case', kit: { id: 'case', name: 'Mic Case', tag_number: null } },
    ] as any);
    vi.mocked(getKitsFlattenedSummary).mockResolvedValue(new Map([
      ['pa', { totalItems: 12 } as any],
      ['case', { totalItems: 1 } as any],
    ]));
    render(<GigEquipmentTable gigId="gig-1" organizationId="org-1" showAmounts={false} />);
    expect(await screen.findByRole('columnheader', { name: 'Holds' })).toBeInTheDocument();
    expect(within((await screen.findByText('Main PA')).closest('tr')!).getByText('12 pieces')).toBeInTheDocument();
    expect(within(screen.getByText('Mic Case').closest('tr')!).getByText('1 piece')).toBeInTheDocument();
    expect(getKitsFlattenedSummary).toHaveBeenCalledWith(['pa', 'case']);
  });
});
