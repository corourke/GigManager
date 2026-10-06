import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EquipmentDetailsDialog, { type EquipmentDetails } from './EquipmentDetailsDialog';

const getTypeUsage = vi.fn(async (_org: string, category: string) =>
  category === 'Power'
    ? [{ type: 'Distribution, PowerCon', count: 1 }, { type: 'Distribution, PowerCon Breakout', count: 1 }, { type: 'Conditioner, Rack', count: 2 }]
    : [{ type: 'Cable, XLR', count: 7 }]);
vi.mock('../../services/purchaseCategory.service', () => ({ getTypeUsage: (...a: any[]) => getTypeUsage(...(a as [string, string])) }));
vi.mock('../../services/kit.service', () => ({
  getKitOptions: vi.fn(async () => [{ id: 'k1', name: 'Power Box' }, { id: 'k2', name: 'Lighting Rack' }, { id: 'k3', name: 'Stage Snakes' }]),
}));

const start: EquipmentDetails = { category: 'Power', type: '', kitIds: [], serial_number: '', tag_number: '', replacement_value: 69.99 };

const open = (props: Partial<React.ComponentProps<typeof EquipmentDetailsDialog>> = {}) => {
  const onSave = vi.fn();
  render(
    <EquipmentDetailsDialog open onOpenChange={vi.fn()} organizationId="org-1" itemName="PowerCON breakout box"
      categories={['Audio', 'Lighting', 'Power']} value={start} onSave={onSave} {...props} />,
  );
  return onSave;
};

describe('EquipmentDetailsDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('suggests only the types used in the chosen category, narrowing as you type', async () => {
    open();
    const type = screen.getByRole('combobox', { name: 'Type' });
    await userEvent.click(type);
    const list = await screen.findByRole('listbox', { name: 'Types used in Power' });
    expect(within(list).getAllByRole('option')).toHaveLength(3);
    expect(within(list).queryByText('Cable, XLR')).not.toBeInTheDocument();
    await userEvent.type(type, 'Distribution, Power');
    // the two matching types, plus the offer to use what was typed as a new one
    expect(within(list).getAllByRole('option').map(o => o.textContent)).toEqual([
      'Distribution, PowerCon1', 'Distribution, PowerCon Breakout1', '+ Use "Distribution, Power" as a new type']);
    await userEvent.click(within(list).getByRole('option', { name: /PowerCon Breakout/ }));
    expect(type).toHaveValue('Distribution, PowerCon Breakout');
  });

  it('lets you use a new type', async () => {
    open();
    const type = screen.getByRole('combobox', { name: 'Type' });
    await userEvent.type(type, 'Distribution, Cam-Lok');
    expect(screen.getByRole('option', { name: /Use "Distribution, Cam-Lok" as a new type/ })).toBeInTheDocument();
  });

  it('changing the category changes the suggestions', async () => {
    open();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Audio');
    await userEvent.click(screen.getByRole('combobox', { name: 'Type' }));
    expect(await screen.findByRole('listbox', { name: 'Types used in Audio' })).toHaveTextContent('Cable, XLR');
    expect(getTypeUsage).toHaveBeenLastCalledWith('org-1', 'Audio');
  });

  it('picks kits from a searchable list, and removes them', async () => {
    open();
    await userEvent.type(screen.getByRole('textbox', { name: 'Search kits' }), 'pow');
    await userEvent.click(await screen.findByRole('option', { name: 'Power Box' }));
    expect(screen.getByRole('button', { name: 'Remove Power Box' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Lighting Rack' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Power Box' }));
    expect(screen.queryByRole('button', { name: 'Remove Power Box' })).not.toBeInTheDocument();
  });

  it('Done saves everything; Cancel saves nothing', async () => {
    const onSave = open();
    await userEvent.type(screen.getByRole('combobox', { name: 'Type' }), 'Distribution, PowerCon Breakout');
    await userEvent.type(screen.getByRole('textbox', { name: 'Search kits' }), 'Power');
    await userEvent.click(await screen.findByRole('option', { name: 'Power Box' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Serial #' }), 'SN1');
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onSave).toHaveBeenCalledWith({ ...start, type: 'Distribution, PowerCon Breakout', kitIds: ['k1'], serial_number: 'SN1' });
  });

  it('kits can be locked (an existing record\'s kits are managed on its page)', async () => {
    open({ kitsLocked: true, value: { ...start, kitIds: [] } });
    expect(screen.queryByRole('textbox', { name: 'Search kits' })).not.toBeInTheDocument();
    expect(screen.getByText(/Manage its kits on the equipment page/)).toBeInTheDocument();
  });

  it('the category can be locked (a depreciated line in a filed year)', () => {
    open({ categoryLocked: true });
    expect(screen.getByRole('combobox', { name: 'Category' })).toBeDisabled();
  });
});
