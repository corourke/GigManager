import { describe, it, expect } from 'vitest';
import { computeFieldChanges } from './fieldChanges';

// #20 batch 3: asset and kit shared one diff (asset by !==, kit by JSON, for arrays like tags).
// One helper now; these pin both services' results.
describe('computeFieldChanges', () => {
  const fields = ['name', 'tags', 'price', 'notes'] as const;

  it('lists the tracked fields that changed, with from and to', () => {
    expect(computeFieldChanges<Record<string, unknown>>({ name: 'Old', price: 5 }, { name: 'New', price: 5 }, fields))
      .toEqual([{ field: 'name', from: 'Old', to: 'New' }]);
  });

  it('only fields present in the new values count; untracked ones never do', () => {
    expect(computeFieldChanges<Record<string, unknown>>({ name: 'A', other: 1 }, { other: 2 }, fields)).toEqual([]);
  });

  it('arrays and objects compare by value (kit tags)', () => {
    expect(computeFieldChanges<Record<string, unknown>>({ tags: ['a', 'b'] }, { tags: ['a', 'b'] }, fields)).toEqual([]);
    expect(computeFieldChanges<Record<string, unknown>>({ tags: ['a'] }, { tags: ['a', 'b'] }, fields)).toEqual([{ field: 'tags', from: ['a'], to: ['a', 'b'] }]);
  });

  it('scalars compare as strictly as !== did (asset): type and null vs undefined count', () => {
    expect(computeFieldChanges<Record<string, unknown>>({ price: 5 }, { price: '5' }, fields)).toEqual([{ field: 'price', from: 5, to: '5' }]);
    expect(computeFieldChanges<Record<string, unknown>>({}, { notes: null }, fields)).toEqual([{ field: 'notes', from: undefined, to: null }]);
    expect(computeFieldChanges<Record<string, unknown>>({ notes: null }, { notes: undefined }, fields)).toEqual([{ field: 'notes', from: null, to: undefined }]);
    expect(computeFieldChanges<Record<string, unknown>>({ notes: null }, { notes: null }, fields)).toEqual([]);
  });
});
