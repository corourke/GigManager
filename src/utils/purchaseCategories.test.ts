import { describe, it, expect } from 'vitest';
import { suggestExpenseCategory, retargetCategories, equipmentCategoryOf, tidyAssetCategory } from './purchaseCategories';

describe('suggestExpenseCategory', () => {
  it('maps the old free-text categories to the 2025 return headings', () => {
    expect(suggestExpenseCategory('Audio')).toBe('Small audio parts');
    expect(suggestExpenseCategory('Lighting')).toBe('Small lighting parts');
    expect(suggestExpenseCategory('Networking')).toBe('Small networking parts');
    expect(suggestExpenseCategory('Power')).toBe('Small power parts and consumables');
    expect(suggestExpenseCategory('Small Parts')).toBe('Other small parts');
    expect(suggestExpenseCategory('Software')).toBe('Software subscriptions');
    expect(suggestExpenseCategory('Marketing')).toBe('Marketing and website');
    expect(suggestExpenseCategory('Meals')).toBe('Travel meals');
    expect(suggestExpenseCategory('Car and Truck Exp')).toBe('Car and truck expenses');
    expect(suggestExpenseCategory('Cases/Bags')).toBe('Cases and bags');
    expect(suggestExpenseCategory('Reimbursable')).toBe('Reimbursable (not deducted)');
  });
  it('keeps a heading as it is, ignoring case', () => {
    expect(suggestExpenseCategory('Supplies')).toBe('Supplies');
    expect(suggestExpenseCategory('travel meals')).toBe('Travel meals');
  });
  it('has no guess for a blank or unknown value', () => {
    expect(suggestExpenseCategory('')).toBeUndefined();
    expect(suggestExpenseCategory(undefined)).toBeUndefined();
    expect(suggestExpenseCategory('Office')).toBeUndefined();
  });
});

describe('tidyAssetCategory', () => {
  it('merges the duplicates Cameron asked for', () => {
    expect(tidyAssetCategory('Cases')).toBe('Cases/Bags');
    expect(tidyAssetCategory('Small Parts')).toBe('Misc');
    expect(tidyAssetCategory('Audio')).toBe('Audio');
  });
});

describe('retargetCategories', () => {
  it('an expensed line becoming depreciated takes its equipment category', () => {
    expect(retargetCategories({ category: 'Small audio parts', asset_category: 'Audio' }, 'expense', 'depreciate'))
      .toEqual({ category: 'Audio', asset_category: undefined });
  });
  it('drops an expense heading that has no equipment category to move up', () => {
    expect(retargetCategories({ category: 'Supplies' }, 'expense', 'depreciate'))
      .toEqual({ category: '', asset_category: undefined });
  });
  it('a depreciated line becoming an expense keeps its equipment category and suggests a heading', () => {
    expect(retargetCategories({ category: 'Lighting' }, 'depreciate', 'expense'))
      .toEqual({ category: 'Small lighting parts', asset_category: 'Lighting' });
    expect(retargetCategories({ category: 'Rack' }, 'depreciate', null))
      .toEqual({ category: '', asset_category: 'Rack' });
  });
  it('leaves the categories alone otherwise', () => {
    const c = { category: 'Supplies', asset_category: 'Misc' };
    expect(retargetCategories(c, 'expense', null)).toEqual(c);
    expect(retargetCategories(c, null, 'expense')).toEqual(c);
    expect(retargetCategories({ category: 'Audio' }, 'depreciate', 'depreciate')).toEqual({ category: 'Audio' });
  });
});

describe('equipmentCategoryOf', () => {
  it('is the line category when depreciated, else the separate equipment category', () => {
    expect(equipmentCategoryOf({ tax_treatment: 'depreciate', category: 'Audio', asset_category: 'x' })).toBe('Audio');
    expect(equipmentCategoryOf({ tax_treatment: 'expense', category: 'Supplies', asset_category: 'Misc' })).toBe('Misc');
    expect(equipmentCategoryOf({ tax_treatment: null, category: 'Supplies' })).toBe('');
  });
});
