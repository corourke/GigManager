import { describe, it, expect } from 'vitest';
import {
  calculateMileageAmount,
  formatMileageNotes,
  getMileageRateForDate
} from './financials.utils';

describe('financials.utils', () => {
  describe('getMileageRateForDate', () => {
    it('returns the rate for each range', () => {
      expect(getMileageRateForDate('2023-01-01')).toBe(0.655);
      expect(getMileageRateForDate('2023-12-31')).toBe(0.655);
      expect(getMileageRateForDate('2024-01-01')).toBe(0.67);
      expect(getMileageRateForDate('2024-12-31')).toBe(0.67);
      expect(getMileageRateForDate('2025-01-01')).toBe(0.70);
      expect(getMileageRateForDate('2025-12-31')).toBe(0.70);
      expect(getMileageRateForDate('2026-01-01')).toBe(0.725);
    });

    it('changes rate mid-2026: 72.5¢ through June 30, 76¢ from July 1', () => {
      expect(getMileageRateForDate('2026-06-30')).toBe(0.725);
      expect(getMileageRateForDate('2026-07-01')).toBe(0.76);
    });

    it('uses the last (open-ended) rate after the table', () => {
      expect(getMileageRateForDate('2026-12-31')).toBe(0.76);
      expect(getMileageRateForDate('2030-05-01')).toBe(0.76);
    });

    it('uses the first rate before the table', () => {
      expect(getMileageRateForDate('2022-12-31')).toBe(0.655);
      expect(getMileageRateForDate('2010-01-01')).toBe(0.655);
    });

    it('reads the calendar date, not a UTC instant, in timezones behind UTC', () => {
      const originalTZ = process.env.TZ;
      process.env.TZ = 'America/Los_Angeles';
      try {
        expect(getMileageRateForDate('2026-07-01')).toBe(0.76);
        expect(getMileageRateForDate('2026-06-30')).toBe(0.725);
      } finally {
        process.env.TZ = originalTZ;
      }
    });
  });

  describe('calculateMileageAmount', () => {
    it('prices by the trip date', () => {
      expect(calculateMileageAmount(100, '2024-05-01')).toBe(67.00);
      expect(calculateMileageAmount(100, '2025-05-01')).toBe(70.00);
      expect(calculateMileageAmount(100, '2026-06-30')).toBe(72.50);
      expect(calculateMileageAmount(100, '2026-07-01')).toBe(76.00);
    });

    it('rounds to the cent, half a cent up', () => {
      expect(calculateMileageAmount(1, '2026-06-30')).toBe(0.73); // 72.5¢
      expect(calculateMileageAmount(336, '2026-03-01')).toBe(243.60);
      expect(calculateMileageAmount(972, '2026-08-01')).toBe(738.72);
    });

    it('handles zero distance', () => {
      expect(calculateMileageAmount(0, '2024-01-01')).toBe(0);
    });
  });

  describe('formatMileageNotes', () => {
    it('formats notes correctly with 2 decimal rate', () => {
      expect(formatMileageNotes(100, 0.67)).toBe('100 miles @ $0.67/mile');
    });

    it('formats notes correctly with 3 decimal rate', () => {
      expect(formatMileageNotes(42.5, 0.725)).toBe('42.5 miles @ $0.725/mile');
    });

    it('handles round rates', () => {
      expect(formatMileageNotes(10, 0.5)).toBe('10 miles @ $0.5/mile');
    });
  });
});
