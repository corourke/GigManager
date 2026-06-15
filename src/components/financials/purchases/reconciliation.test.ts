import { describe, it, expect } from 'vitest';
import { sumLineCosts, getDiscrepancy, isReconciled, isSyntheticHeader } from './reconciliation';
import type { DbPurchase } from '../../../utils/supabase/types';

function makeItem(line_cost: number | null): DbPurchase {
  return { line_cost } as DbPurchase;
}

describe('reconciliation', () => {
  describe('sumLineCosts', () => {
    it('sums line_cost values', () => {
      expect(sumLineCosts([makeItem(10), makeItem(20.5)])).toBeCloseTo(30.5);
    });

    it('treats null line_cost as 0', () => {
      expect(sumLineCosts([makeItem(10), makeItem(null)])).toBe(10);
    });

    it('returns 0 for empty array', () => {
      expect(sumLineCosts([])).toBe(0);
    });
  });

  describe('getDiscrepancy', () => {
    it('returns difference between total and sum', () => {
      expect(getDiscrepancy(100, [makeItem(60), makeItem(30)])).toBeCloseTo(10);
    });

    it('returns negative when sum exceeds total', () => {
      expect(getDiscrepancy(50, [makeItem(30), makeItem(30)])).toBeCloseTo(-10);
    });

    it('treats null total as 0', () => {
      expect(getDiscrepancy(null, [makeItem(10)])).toBe(-10);
    });
  });

  describe('isReconciled', () => {
    it('returns true when exactly equal', () => {
      expect(isReconciled(100, [makeItem(60), makeItem(40)])).toBe(true);
    });

    it('returns true when difference is within 0.01 threshold', () => {
      expect(isReconciled(100, [makeItem(99.995)])).toBe(true);
    });

    it('returns false when difference exceeds 0.01', () => {
      expect(isReconciled(100.02, [makeItem(100)])).toBe(false);
    });

    it('returns true for 0 total and empty items', () => {
      expect(isReconciled(0, [])).toBe(true);
    });

    it('returns true for null total and empty items', () => {
      expect(isReconciled(null, [])).toBe(true);
    });

    it('returns false for negative discrepancy beyond threshold', () => {
      expect(isReconciled(99, [makeItem(100)])).toBe(false);
    });
  });

  describe('isSyntheticHeader', () => {
    it('returns true for orphan- prefixed IDs', () => {
      expect(isSyntheticHeader('orphan-2024-01-01|Amazon')).toBe(true);
    });

    it('returns false for regular UUIDs', () => {
      expect(isSyntheticHeader('abc-123-def')).toBe(false);
    });
  });
});
