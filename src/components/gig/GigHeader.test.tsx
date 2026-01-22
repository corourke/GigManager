import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GigHeader from './GigHeader';

describe('GigHeader', () => {
  const mockOnBack = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnDuplicate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders back button', () => {
    render(
      <GigHeader
        gigId="gig-1"
        onBack={mockOnBack}
        onDelete={mockOnDelete}
        onDuplicate={mockOnDuplicate}
      />
    );

    expect(screen.getByText('Back to Gigs')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <GigHeader
        gigId="gig-1"
        onBack={mockOnBack}
        onDelete={mockOnDelete}
        onDuplicate={mockOnDuplicate}
      />
    );

    await user.click(screen.getByText('Back to Gigs'));
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('renders dropdown menu trigger button', () => {
    render(
      <GigHeader
        gigId="gig-1"
        onBack={mockOnBack}
        onDelete={mockOnDelete}
        onDuplicate={mockOnDuplicate}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('calls onDelete when delete menu item is clicked', async () => {
    const user = userEvent.setup();
    render(
      <GigHeader
        gigId="gig-1"
        onBack={mockOnBack}
        onDelete={mockOnDelete}
        onDuplicate={mockOnDuplicate}
      />
    );

    const menuButtons = screen.getAllByRole('button');
    const dropdownTrigger = menuButtons[1];
    await user.click(dropdownTrigger);

    const deleteItem = await screen.findByText(/Delete Gig/i);
    await user.click(deleteItem);

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it('calls onDuplicate when duplicate menu item is clicked', async () => {
    const user = userEvent.setup();
    render(
      <GigHeader
        gigId="gig-1"
        onBack={mockOnBack}
        onDelete={mockOnDelete}
        onDuplicate={mockOnDuplicate}
      />
    );

    const menuButtons = screen.getAllByRole('button');
    const dropdownTrigger = menuButtons[1];
    await user.click(dropdownTrigger);

    const duplicateItem = await screen.findByText(/Duplicate Gig/i);
    await user.click(duplicateItem);

    expect(mockOnDuplicate).toHaveBeenCalledTimes(1);
    expect(mockOnDuplicate).toHaveBeenCalledWith('gig-1');
  });
});
