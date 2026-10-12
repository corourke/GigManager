import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../services/inventoryManagement.service', () => ({
  createManualTrackingRecord: vi.fn(),
  moveLotPieces: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./LocationCombobox', () => ({
  LocationCombobox: ({ value, onChange }: any) => (
    <input aria-label="Location" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

// An option can be picked: its click goes to its own Select (#186).
vi.mock('../ui/select', async () => {
  const { createContext, useContext } = await import('react');
  const Ctx = createContext<(v: string) => void>(() => {});
  return {
    Select: ({ children, onValueChange }: any) => <Ctx.Provider value={onValueChange}><div>{children}</div></Ctx.Provider>,
    SelectTrigger: ({ children, id }: any) => <button id={id}>{children}</button>,
    SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
    SelectContent: ({ children }: any) => <div>{children}</div>,
    SelectItem: function SelectItem({ children, value }: any) {
      const change = useContext(Ctx);
      return <div role="option" onClick={() => change(value)}>{children}</div>;
    },
  };
});

import { ManualTrackingOverrideDialog } from './ManualTrackingOverrideDialog';
import { createManualTrackingRecord, moveLotPieces } from '../../services/inventoryManagement.service';

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  organizationId: 'org-1',
  gigId: 'gig-1',
  kitId: 'kit-1',
  userId: 'user-1',
  onSuccess: vi.fn(),
};

describe('ManualTrackingOverrideDialog', () => {
  it('does not show a gig selector when gigs is not provided (existing InventorySummaryDashboard usage)', () => {
    render(<ManualTrackingOverrideDialog {...baseProps} />);
    expect(screen.queryByText('Gig')).not.toBeInTheDocument();
  });

  it('shows an editable gig selector, defaulting to the target\'s current gig, when gigs is provided', () => {
    render(
      <ManualTrackingOverrideDialog
        {...baseProps}
        gigs={[{ id: 'gig-1', title: 'Summer Festival' }, { id: 'gig-2', title: 'Corporate Event' }]}
      />
    );
    expect(screen.getByText('Gig')).toBeInTheDocument();
    expect(screen.getByText('Summer Festival')).toBeInTheDocument();
    expect(screen.getByText('Corporate Event')).toBeInTheDocument();
  });

  it('shows the target label when provided, for context when reused across many different rows', () => {
    render(<ManualTrackingOverrideDialog {...baseProps} targetLabel="Sound Kit A — Main Speaker" />);
    expect(screen.getByText('Sound Kit A — Main Speaker')).toBeInTheDocument();
  });

  it('renders without a target label when none is provided (existing InventorySummaryDashboard usage)', () => {
    render(<ManualTrackingOverrideDialog {...baseProps} />);
    expect(screen.getByText('Manual Tracking Override')).toBeInTheDocument();
  });

  // #186 / #160 (Cameron, 10-11): move N of a lot's M pieces.
  describe('a lot', () => {
    const lot = { here: 6, of: 10, status: 'On Site', location: 'Stage', place: 'Summer Festival (Stage)' };

    it('moves N of the M, says what follows, and writes it by the lot rules', async () => {
      const onSuccess = vi.fn();
      render(<ManualTrackingOverrideDialog {...baseProps} assetId="lot-1" lot={lot} onSuccess={onSuccess} />);
      const n = screen.getByLabelText('How many to move') as HTMLInputElement;
      expect(n.value).toBe('6');
      expect(screen.getByText('of the 6 at Summer Festival (Stage)')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('option', { name: 'In Warehouse' }));
      fireEvent.change(n, { target: { value: '4' } });
      expect(screen.getByText('After: 2 stay at Summer Festival (Stage) · 4 back home')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Move 4' }));
      await waitFor(() => expect(moveLotPieces).toHaveBeenCalledWith(expect.objectContaining({
        organizationId: 'org-1', assetId: 'lot-1', kitId: 'kit-1', fromGigId: 'gig-1', fromStatus: 'On Site', fromLocation: 'Stage',
        here: 6, n: 4, toGigId: 'gig-1', toStatus: 'In Warehouse', createdBy: 'user-1',
      })));
      expect(createManualTrackingRecord).not.toHaveBeenCalled();
      await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    });

    it('a new status at the same gig is for the whole lot here: no count to choose', () => {
      render(<ManualTrackingOverrideDialog {...baseProps} assetId="lot-1" lot={lot} />);
      fireEvent.click(screen.getByRole('option', { name: 'In Transit' }));
      expect(screen.queryByLabelText('How many to move')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save Override' })).toBeInTheDocument();
    });

    // Coordinator review (10-12): what's written is Maintenance at this gig, not a trip home.
    it('Mark for Maintenance with In Warehouse is the whole lot here, in Maintenance: no count', async () => {
      render(<ManualTrackingOverrideDialog {...baseProps} assetId="lot-1" lot={lot} />);
      fireEvent.click(screen.getByRole('option', { name: 'In Warehouse' }));
      fireEvent.click(screen.getByLabelText('Mark for Maintenance'));
      expect(screen.queryByLabelText('How many to move')).not.toBeInTheDocument();
      expect(screen.queryByText(/back home/)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Save Override' }));
      await waitFor(() => expect(moveLotPieces).toHaveBeenCalledWith(expect.objectContaining({
        here: 6, n: 6, toGigId: 'gig-1', toStatus: 'Maintenance',
      })));
    });

    // Cameron (10-12): part of a lot in a case may go to another gig, with a warning. Those
    // pieces leave the case and show loose at the new gig.
    describe('pieces in a case', () => {
      const twoGigs = [{ id: 'gig-1', title: 'Summer Festival' }, { id: 'gig-2', title: 'Corporate Event' }];
      const inCase = { ...lot, inCase: { name: 'Mic Case', gigId: 'gig-1', gigTitle: 'Summer Festival' } };

      it('to another gig: says they leave the case, which stays, and writes them loose', async () => {
        render(<ManualTrackingOverrideDialog {...baseProps} assetId="lot-1" lot={inCase} gigs={twoGigs} />);
        fireEvent.click(screen.getByRole('option', { name: 'Corporate Event' }));
        fireEvent.click(screen.getByRole('option', { name: 'Checked Out' }));
        fireEvent.change(screen.getByLabelText('How many to move'), { target: { value: '2' } });
        expect(screen.getByText('These 2 leave Mic Case. The case stays at Summer Festival.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Move 2' }));
        await waitFor(() => expect(moveLotPieces).toHaveBeenCalledWith(expect.objectContaining({ n: 2, toGigId: 'gig-2', leaveCase: true })));
      });

      it('home, or at the case\'s own gig: no warning, and they stay in the case', async () => {
        render(<ManualTrackingOverrideDialog {...baseProps} assetId="lot-1" lot={inCase} gigs={twoGigs} />);
        fireEvent.click(screen.getByRole('option', { name: 'In Warehouse' }));
        fireEvent.change(screen.getByLabelText('How many to move'), { target: { value: '2' } });
        expect(screen.queryByText(/leave Mic Case/)).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Move 2' }));
        await waitFor(() => expect(moveLotPieces).toHaveBeenCalledWith(expect.objectContaining({ leaveCase: false })));
      });
    });

    it('from home, no more than the pieces at home can go', async () => {
      const home = { here: 1, of: 6, status: 'In Warehouse', location: 'Bay 2', place: 'Bay 2' };
      render(<ManualTrackingOverrideDialog {...baseProps} assetId="lot-1" lot={home} />);
      fireEvent.click(screen.getByRole('option', { name: 'Checked Out' }));
      const n = screen.getByLabelText('How many to move') as HTMLInputElement;
      expect(n.max).toBe('1');
      fireEvent.change(n, { target: { value: '6' } });
      fireEvent.click(screen.getByRole('button', { name: 'Move 1' }));
      await waitFor(() => expect(moveLotPieces).toHaveBeenCalledWith(expect.objectContaining({ here: 1, n: 1, lotOf: 6 })));
    });
  });

  it('a unit has no count to move', () => {
    render(<ManualTrackingOverrideDialog {...baseProps} assetId="unit-1" />);
    expect(screen.queryByLabelText('How many to move')).not.toBeInTheDocument();
  });
});
