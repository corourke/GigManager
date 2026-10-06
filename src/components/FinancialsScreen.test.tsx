import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import FinancialsScreen from './FinancialsScreen';
import { makeOrganization } from '../test/factories';

vi.mock('./AppHeader', () => ({ default: () => null }));
vi.mock('./financials/GigAccountingTab', () => ({ default: () => <div data-testid="gig-accounting" /> }));
vi.mock('./financials/TaxYearsCard', () => ({ default: () => <div data-testid="tax-years" /> }));
vi.mock('./financials/purchases/PurchasesSection', () => ({
  default: ({ view, onViewChange }: any) => (
    <button data-testid="purchases" data-view={view} onClick={() => onViewChange?.('scan')}>purchases</button>
  ),
}));

const base = {
  organization: makeOrganization({ id: 'o', name: 'Act4Audio' }),
  user: { id: 'u' } as any,
  userRole: 'Admin' as const,
  onSwitchOrganization: vi.fn(),
  onLogout: vi.fn(),
  onNavigateToGigs: vi.fn(),
};

describe('FinancialsScreen tabs follow the URL', () => {
  it('shows the tab the URL names', () => {
    render(<FinancialsScreen {...base} tab="gig-accounting" onNavigate={vi.fn()} />);
    expect(screen.getByTestId('gig-accounting')).toBeInTheDocument();
  });

  it('asks the URL to change instead of switching on its own', () => {
    const onNavigate = vi.fn();
    render(<FinancialsScreen {...base} tab="purchases" purchasesView="report" onNavigate={onNavigate} />);
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Gig Accounting/ }));
    expect(onNavigate).toHaveBeenCalledWith('gig-accounting');
    fireEvent.click(screen.getByTestId('purchases'));
    expect(onNavigate).toHaveBeenCalledWith('purchases', 'scan');
  });

  it('passes the Purchases sub-tab through', () => {
    render(<FinancialsScreen {...base} tab="purchases" purchasesView="manual" onNavigate={vi.fn()} />);
    expect(screen.getByTestId('purchases').dataset.view).toBe('manual');
  });
});
