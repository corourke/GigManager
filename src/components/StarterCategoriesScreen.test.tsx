import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StarterCategoriesScreen from './StarterCategoriesScreen';

vi.mock('./AppHeader', () => ({ default: () => null }));
vi.mock('./settings/CategoriesSettings', () => ({ default: () => <div>lists</div> }));

describe('Starter categories page', () => {
  it('has a way back (the app navigation is hidden here)', async () => {
    const onBack = vi.fn();
    render(<StarterCategoriesScreen user={{ id: 'u1' } as any} onBack={onBack} onLogout={vi.fn()} onEditProfile={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
  });
});
