import { describe, it, expect } from 'vitest';
import { toFinCategory, FIN_CATEGORY_CONFIG } from './constants';

describe('toFinCategory', () => {
  it('returns valid categories unchanged', () => {
    for (const key of Object.keys(FIN_CATEGORY_CONFIG)) {
      expect(toFinCategory(key)).toBe(key);
    }
  });

  it('returns undefined for values the fin_category enum would reject', () => {
    // 'Production' was previously written by the scan-review flow and is not
    // a valid fin_category — the database insert fails on it
    expect(toFinCategory('Production')).toBeUndefined();
    expect(toFinCategory('Labor')).toBeUndefined();
    expect(toFinCategory('')).toBeUndefined();
    expect(toFinCategory(undefined)).toBeUndefined();
    expect(toFinCategory(null)).toBeUndefined();
  });
});
