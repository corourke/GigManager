import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CategoryListEditor from './CategoryListEditor';
import * as svc from '../../services/purchaseCategory.service';

vi.mock('../../services/purchaseCategory.service', () => ({
  listCategories: vi.fn(),
  addCategory: vi.fn(async (_k: string, org: string | null, f: any) => ({ id: 'new', organization_id: org, active: true, ...f })),
  updateCategory: vi.fn(async () => {}),
  getScheduleCLines: vi.fn(async () => [{ code: '22', label: 'Supplies' }, { code: '27b', label: 'Other expenses (Part V)' }]),
  getCategoryUsage: vi.fn(async () => ({ supplies: 3 })),
}));

const expenseRows = [
  { id: 'e1', organization_id: 'org-1', name: 'Supplies', schedule_c_line: '22', sort_order: 10, active: true },
  { id: 'e2', organization_id: 'org-1', name: 'Training', schedule_c_line: '27b', sort_order: 20, active: false },
];

describe('CategoryListEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(svc.listCategories).mockResolvedValue(expenseRows as any);
  });

  it('lists the categories with their Schedule C line, use and on/off state', async () => {
    render(<CategoryListEditor kind="expense" organizationId="org-1" canEdit />);
    expect(await screen.findByDisplayValue('Supplies')).toBeInTheDocument();
    expect((screen.getByRole('combobox', { name: 'Schedule C line: Training' }) as HTMLSelectElement).value).toBe('27b');
    expect(screen.getByRole('switch', { name: 'Use Supplies' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Use Training' })).not.toBeChecked();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('a category in use can\'t be renamed; an unused one can', async () => {
    render(<CategoryListEditor kind="expense" organizationId="org-1" canEdit />);
    const supplies = await screen.findByRole('textbox', { name: 'Name: Supplies' });
    expect(supplies).toBeDisabled();
    const training = screen.getByRole('textbox', { name: 'Name: Training' });
    await userEvent.clear(training);
    await userEvent.type(training, 'Training and education');
    await userEvent.tab();
    expect(svc.updateCategory).toHaveBeenCalledWith('expense', 'e2', { name: 'Training and education' });
  });

  it('turns a category off and on', async () => {
    render(<CategoryListEditor kind="expense" organizationId="org-1" canEdit />);
    await userEvent.click(await screen.findByRole('switch', { name: 'Use Supplies' }));
    expect(svc.updateCategory).toHaveBeenCalledWith('expense', 'e1', { active: false });
  });

  it('adds a category at the end, with its line', async () => {
    render(<CategoryListEditor kind="expense" organizationId="org-1" canEdit />);
    await userEvent.type(await screen.findByRole('textbox', { name: 'New category name' }), 'Postage');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'New category Schedule C line' }), '27b');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(svc.addCategory).toHaveBeenCalledWith('expense', 'org-1', { name: 'Postage', schedule_c_line: '27b', sort_order: 30 }));
    expect(await screen.findByDisplayValue('Postage')).toBeInTheDocument();
  });

  it('is read-only without edit rights', async () => {
    render(<CategoryListEditor kind="expense" organizationId="org-1" canEdit={false} />);
    expect(await screen.findByRole('textbox', { name: 'Name: Training' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Use Training' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument();
  });

  it('equipment categories come with the rules for writing types, and no Schedule C line', async () => {
    vi.mocked(svc.listCategories).mockResolvedValue([{ id: 'q1', organization_id: 'org-1', name: 'Audio', sort_order: 10, active: true }] as any);
    render(<CategoryListEditor kind="equipment" organizationId="org-1" canEdit />);
    expect(await screen.findByDisplayValue('Audio')).toBeInTheDocument();
    expect(screen.getByText('How the types are written')).toBeInTheDocument();
    expect(screen.getByText(/The first word says what it is/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /Schedule C line/ })).not.toBeInTheDocument();
  });

  it('the starter set has no usage counts', async () => {
    render(<CategoryListEditor kind="expense" organizationId={null} canEdit />);
    await screen.findByDisplayValue('Supplies');
    expect(svc.listCategories).toHaveBeenCalledWith('expense', null);
    expect(svc.getCategoryUsage).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Name: Supplies' })).toBeEnabled();
  });
});
