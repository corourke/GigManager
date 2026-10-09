import { describe, it, expect } from 'vitest';
import { numberTags, fillTags, splitPasted, fillSerials, suggestItems } from './unitRowHelpers';

const rows = (n: number) => Array.from({ length: n }, () => ({ serial_number: '', tag_number: '' }));

describe('numberTags (#183)', () => {
  it('counts on from the start, keeping the prefix and the zero padding', () => {
    expect(numberTags('DSL-0141', 3)).toEqual(['DSL-0141', 'DSL-0142', 'DSL-0143']);
    expect(numberTags('A9', 3)).toEqual(['A9', 'A10', 'A11']);
    expect(numberTags('0098', 3)).toEqual(['0098', '0099', '0100']);
  });

  it('adds a number to a start with none', () => {
    expect(numberTags('CASE', 2)).toEqual(['CASE1', 'CASE2']);
  });
});

describe('fillTags', () => {
  it('fills every unit’s tag in sequence, keeping serials', () => {
    const start = [{ serial_number: 'S1', tag_number: '' }, { serial_number: '', tag_number: 'OLD' }];
    expect(fillTags(start, 'DSL-0141')).toEqual([
      { serial_number: 'S1', tag_number: 'DSL-0141' }, { serial_number: '', tag_number: 'DSL-0142' },
    ]);
  });
});

describe('splitPasted', () => {
  it('splits a column, a ";" list or a "," list, dropping blanks', () => {
    expect(splitPasted('IT1\nIT2\r\n\nIT3')).toEqual(['IT1', 'IT2', 'IT3']);
    expect(splitPasted(' IT1 ; IT2;IT3 ')).toEqual(['IT1', 'IT2', 'IT3']);
    expect(splitPasted('IT1, IT2\tIT3')).toEqual(['IT1', 'IT2', 'IT3']);
  });
});

describe('fillSerials', () => {
  it('puts pasted serials into the units in order, keeping tags', () => {
    const start = [{ serial_number: '', tag_number: 'T1' }, ...rows(2)];
    expect(fillSerials(start, 'A\nB\nC')).toEqual([
      { serial_number: 'A', tag_number: 'T1' }, { serial_number: 'B', tag_number: '' }, { serial_number: 'C', tag_number: '' },
    ]);
  });

  it('leaves units past the pasted list as they were, and ignores extra serials', () => {
    expect(fillSerials([{ serial_number: 'KEEP', tag_number: '' }, ...rows(1)], '')).toEqual([{ serial_number: 'KEEP', tag_number: '' }, ...rows(1)]);
    expect(fillSerials(rows(1), 'A\nB')).toEqual([{ serial_number: 'A', tag_number: '' }]);
  });
});

describe('suggestItems', () => {
  const items = [
    { id: '1', manufacturer_model: 'Chauvet Intimidator Spot 360', category: 'Lighting' },
    { id: '2', manufacturer_model: 'Chauvet Intimidator Trio', category: 'Lighting' },
    { id: '3', manufacturer_model: 'Shure SM58', category: 'Audio' },
    { id: '4', manufacturer_model: 'Fennimore Spot 150 Moving Head', category: 'Lighting' },
  ];

  it('suggests items sharing words with the typed model, closest first', () => {
    expect(suggestItems(items, 'Chauvet DJ Intimidator Trio').map((i) => i.id)).toEqual(['2', '1']);
  });

  it('puts the same category first', () => {
    expect(suggestItems(items, 'Spot', 'Lighting').map((i) => i.id)).toEqual(['1', '4']);
  });

  it('ignores case and punctuation, and words that tell nothing apart', () => {
    expect(suggestItems(items, 'shure-sm58').map((i) => i.id)).toEqual(['3']);
    expect(suggestItems(items, 'the')).toEqual([]);
  });

  it('suggests nothing for a blank model, and at most three', () => {
    expect(suggestItems(items, '  ')).toEqual([]);
    expect(suggestItems([...items, ...items.map((i) => ({ ...i, id: i.id + 'b' }))], 'Chauvet Intimidator Spot Trio')).toHaveLength(3);
  });
});
