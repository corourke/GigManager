import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../services/inventoryManagement.service', () => ({
  createManualTrackingRecord: vi.fn(),
}));

vi.mock('./LocationCombobox', () => ({
  LocationCombobox: ({ value, onChange }: any) => (
    <input aria-label="Location" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock('../ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children, id }: any) => <button id={id}>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div role="option">{children}</div>,
}));

import { ManualTrackingOverrideDialog } from './ManualTrackingOverrideDialog';

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
});
