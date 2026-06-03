import { describe, it, expect } from 'vitest';
import {
  calculateMileageAmount,
  formatMileageNotes,
  getMileageRateForYear,
  IRS_MILEAGE_RATES
} from './financials.utils';

describe('financials.utils', () => {
  describe('getMileageRateForYear', () => {
    it('returns the correct rate for a known year', () => {
      expect(getMileageRateForYear(2024)).toBe(0.67);
      expect(getMileageRateForYear(2025)).toBe(0.675);
    });

    it('returns the latest rate for future years', () => {
      expect(getMileageRateForYear(2027)).toBe(0.675);
      expect(getMileageRateForYear(2030)).toBe(0.675);
    });

    it('returns the earliest rate for past years', () => {
      expect(getMileageRateForYear(2020)).toBe(0.67);
    });
  });

  describe('calculateMileageAmount', () => {
    it('calculates amount correctly for 2024 (0.67)', () => {
      expect(calculateMileageAmount(100, 2024)).toBe(67.00);
      expect(calculateMileageAmount(42.5, 2024)).toBe(28.48); // 42.5 * 0.67 = 28.475 -> 28.48
    });

    it('calculates amount correctly for 2025 (0.675)', () => {
      expect(calculateMileageAmount(100, 2025)).toBe(67.50);
      expect(calculateMileageAmount(42.5, 2025)).toBe(28.69); // 42.5 * 0.675 = 28.6875 -> 28.69
    });

    it('handles zero distance', () => {
      expect(calculateMileageAmount(0, 2024)).toBe(0);
    });
  });

  describe('formatMileageNotes', () => {
    it('formats notes correctly with 2 decimal rate', () => {
      expect(formatMileageNotes(100, 0.67)).toBe('100 miles @ $0.67/mile');
    });

    it('formats notes correctly with 3 decimal rate', () => {
      expect(formatMileageNotes(42.5, 0.675)).toBe('42.5 miles @ $0.675/mile');
    });

    it('handles round rates', () => {
      expect(formatMileageNotes(10, 0.5)).toBe('10 miles @ $0.5/mile');
    });
  });
});
