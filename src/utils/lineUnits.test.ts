import { describe, it, expect } from 'vitest';
import { buildLineUnits, resizeUnitRows, unitRowProblems, type LineEquipment } from './lineUnits';

const newItem = { manufacturer_model: 'QSC K12.2', category: 'Audio', type: 'Speaker, Powered', insurance_class: 'Class B', description: 'Powered 12″' };
const units = (rows: [string, string][]): LineEquipment => ({
  item: newItem, kind: 'units', units: rows.map(([serial_number, tag_number]) => ({ serial_number, tag_number })), replacement_value: 1049,
});

describe('buildLineUnits (#183)', () => {
  it('makes one record per unit on a line of 2 with two tags: the bug that failed to save', () => {
    const out = buildLineUnits('org-1', 0, 2, units([['GAA1', 'DSL-0101'], ['', 'DSL-0102']]));
    expect(out).toHaveLength(2);
    expect(out.map((u) => [u.serial_number, u.tag_number, u.quantity])).toEqual([['GAA1', 'DSL-0101', 1], [null, 'DSL-0102', 1]]);
    expect(out.every((u) => u.line_index === 0 && u.organization_id === 'org-1' && u.replacement_value === 1049)).toBe(true);
  });

  it('makes one record of the whole quantity for a lot, with no serial or tag', () => {
    const out = buildLineUnits('org-1', 3, 10, { item: newItem, kind: 'lot', units: [], replacement_value: 16 });
    expect(out).toEqual([expect.objectContaining({ line_index: 3, quantity: 10, serial_number: null, tag_number: null, replacement_value: 16 })]);
  });

  it('carries a new item’s fields, so the database finds or creates it', () => {
    const [u] = buildLineUnits('org-1', 0, 1, units([['GAA1', '']]));
    expect(u).toMatchObject({ manufacturer_model: 'QSC K12.2', category: 'Audio', type: 'Speaker, Powered', insurance_class: 'Class B', description: 'Powered 12″' });
    expect(u).not.toHaveProperty('equipment_item_id');
  });

  it('names a picked item, with its model and category for the transition columns', () => {
    const [u] = buildLineUnits('org-1', 0, 1, { item: { equipment_item_id: 'item-k12', manufacturer_model: 'QSC K12.2', category: 'Audio' }, kind: 'units', units: [{ serial_number: 'GAA1', tag_number: '' }] });
    expect(u).toMatchObject({ equipment_item_id: 'item-k12', manufacturer_model: 'QSC K12.2', category: 'Audio' });
  });

  it('sends the insured flag and the recovery period when given', () => {
    const [u] = buildLineUnits('org-1', 0, 1, { ...units([['GAA1', '']]), insured: true, recovery_period: 5 });
    expect(u).toMatchObject({ insurance_policy_added: true, recovery_period: 5 });
  });

  it('refuses units that need a serial or tag, or repeat one', () => {
    expect(() => buildLineUnits('org-1', 0, 2, units([['GAA1', ''], ['', '']]))).toThrow('Unit 2 needs a serial number or a tag (either will do).');
  });

  it('refuses a units line whose rows don’t match its quantity', () => {
    expect(() => buildLineUnits('org-1', 0, 3, units([['GAA1', ''], ['GAA2', '']]))).toThrow('This line has 3 units but 2 rows.');
  });
});

describe('unitRowProblems', () => {
  it('names each unit with neither a serial nor a tag', () => {
    expect(unitRowProblems([{ serial_number: ' ', tag_number: '' }, { serial_number: 'A', tag_number: '' }, { serial_number: '', tag_number: '' }]))
      .toEqual(['Unit 1 needs a serial number or a tag (either will do).', 'Unit 3 needs a serial number or a tag (either will do).']);
  });

  it('names units that share a tag or a serial (case and spaces aside)', () => {
    expect(unitRowProblems([
      { serial_number: 'A', tag_number: 'DSL-0152' }, { serial_number: 'B', tag_number: ' dsl-0152' }, { serial_number: 'b', tag_number: 'DSL-0153' },
    ])).toEqual(['Units 1 and 2 both have tag DSL-0152.', 'Units 2 and 3 both have serial B.']);
  });

  it('is happy with a serial or a tag on every row', () => {
    expect(unitRowProblems([{ serial_number: 'A', tag_number: '' }, { serial_number: '', tag_number: 'T' }])).toEqual([]);
  });
});

describe('resizeUnitRows', () => {
  it('adds empty rows when the quantity goes up', () => {
    expect(resizeUnitRows([{ serial_number: 'A', tag_number: '' }], 3)).toEqual([
      { serial_number: 'A', tag_number: '' }, { serial_number: '', tag_number: '' }, { serial_number: '', tag_number: '' },
    ]);
  });

  it('drops rows from the end when it goes down', () => {
    expect(resizeUnitRows([{ serial_number: 'A', tag_number: '' }, { serial_number: 'B', tag_number: '' }], 1)).toEqual([{ serial_number: 'A', tag_number: '' }]);
  });

  it('treats a missing or bad quantity as 1', () => {
    expect(resizeUnitRows([], 0)).toHaveLength(1);
    expect(resizeUnitRows([], NaN)).toHaveLength(1);
  });
});
