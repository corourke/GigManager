import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import QuickActionButtons from './QuickActionButtons';
import * as gigService from '../../services/gig.service';

vi.mock('../../services/gig.service', () => ({
  createGigFinancial: vi.fn(),
}));

describe('QuickActionButtons', () => {
  const defaultProps = {
    gigId: 'test-gig-id',
    organizationId: 'test-org-id',
    onSuccess: vi.fn(),
    onOther: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all action buttons', () => {
    render(<QuickActionButtons {...defaultProps} />);
    expect(screen.getByText('Agreement')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
    expect(screen.getByText('Expense / Mileage')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('opens agreement modal when Agreement is clicked', async () => {
    render(<QuickActionButtons {...defaultProps} />);
    fireEvent.click(screen.getByText('Agreement'));
    expect(screen.getByText('Record Agreement')).toBeInTheDocument();
  });

  it('opens payment modal when Payment is clicked', async () => {
    render(<QuickActionButtons {...defaultProps} />);
    fireEvent.click(screen.getByText('Payment'));
    expect(screen.getByText('Record Payment')).toBeInTheDocument();
  });

  it('opens expense/mileage choice modal when Expense / Mileage is clicked', async () => {
    render(<QuickActionButtons {...defaultProps} />);
    fireEvent.click(screen.getByText('Expense / Mileage'));
    expect(screen.getByText('Expense or Mileage?')).toBeInTheDocument();
  });

  it('calls onOther when Other is clicked', () => {
    render(<QuickActionButtons {...defaultProps} />);
    fireEvent.click(screen.getByText('Other'));
    expect(defaultProps.onOther).toHaveBeenCalled();
  });

  it('calculates mileage correctly from distance', async () => {
    render(<QuickActionButtons {...defaultProps} />);
    
    // Open choice modal
    fireEvent.click(screen.getByText('Expense / Mileage'));
    
    // Click Mileage
    await waitFor(() => {
      expect(screen.getByText('Mileage', { selector: 'div.font-semibold' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Mileage', { selector: 'div.font-semibold' }));
    
    // Fill form
    await waitFor(() => {
      expect(screen.getByLabelText(/Miles Driven/)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/Miles Driven/), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Test travel' } });
    
    // Submit
    fireEvent.click(screen.getByText('Save Mileage'));
    
    await waitFor(() => {
      expect(gigService.createGigFinancial).toHaveBeenCalledWith(expect.objectContaining({
        mileage: 100,
        amount: 67.5, // 100 * 0.675 (for 2026 default in utils)
        type: 'Expense Incurred',
        category: 'Car and truck expenses'
      }));
    });
  });

  it('calculates mileage correctly from odometer readings', async () => {
    render(<QuickActionButtons {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Expense / Mileage'));
    
    await waitFor(() => {
      expect(screen.getByText('Mileage', { selector: 'div.font-semibold' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Mileage', { selector: 'div.font-semibold' }));
    
    await waitFor(() => {
      expect(screen.getByLabelText('Start')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '1050' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Test travel' } });
    
    fireEvent.click(screen.getByText('Save Mileage'));
    
    await waitFor(() => {
      expect(gigService.createGigFinancial).toHaveBeenCalledWith(expect.objectContaining({
        mileage: 50,
        amount: 33.75,
      }));
    });
  });
});
