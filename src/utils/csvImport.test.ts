import { describe, it, expect } from 'vitest';
import { validateGigRow, parseAndValidateCSV, type GigRow, type ParsedRow } from './csvImport';

describe('CSV Import Timezone Handling', () => {
  describe('Date parsing and timezone interpretation', () => {
    it('should parse ISO datetime and preserve CSV timezone field', () => {
      const csvRow = {
        title: 'Pacific Gig',
        start: '2026-06-15T22:00:00', // 10 PM without timezone
        end: '2026-06-16T01:00:00',   // 1 AM without timezone  
        timezone: 'America/Los_Angeles', // Pacific Time
        status: 'Booked',
        venue: 'Test Venue'
      };

      const result = validateGigRow(csvRow, 0);
      
      expect(result.isValid).toBe(true);
      expect(result.data.timezone).toBe('America/Los_Angeles');
      
      // Verify dates are parsed as valid ISO strings
      expect(new Date(result.data.start).toISOString()).toBe(result.data.start);
      expect(new Date(result.data.end).toISOString()).toBe(result.data.end);
      
      // Verify start time is before end time
      expect(new Date(result.data.start).getTime()).toBeLessThan(new Date(result.data.end).getTime());
    });

    it('should handle UTC timezone explicitly marked with Z suffix', () => {
      const csvRow = {
        title: 'UTC Gig',
        start: '2026-06-15T22:00:00Z', // 10 PM UTC (explicit Z suffix)
        end: '2026-06-16T01:00:00Z',   // 1 AM UTC (explicit Z suffix)
        timezone: 'America/Los_Angeles', // Gig timezone (for display)
        status: 'Booked',
        venue: 'Test Venue'
      };

      const result = validateGigRow(csvRow, 0);
      
      expect(result.isValid).toBe(true);
      expect(result.data.start).toBe('2026-06-15T22:00:00.000Z'); // UTC preserved
      expect(result.data.end).toBe('2026-06-16T01:00:00.000Z'); // UTC preserved
      expect(result.data.timezone).toBe('America/Los_Angeles'); // Gig timezone preserved
    });

    it('should handle timezone offsets in datetime strings', () => {
      const csvRow = {
        title: 'Offset Gig',
        start: '2026-06-15T22:00:00-07:00', // 10 PM with -7 offset (PDT)
        end: '2026-06-16T01:00:00-07:00',   // 1 AM with -7 offset (PDT)
        timezone: 'America/New_York', // Different from offset timezone
        status: 'Booked',
        venue: 'Test Venue'
      };

      const result = validateGigRow(csvRow, 0);
      
      expect(result.isValid).toBe(true);
      // Should convert offset to UTC: -07:00 offset means +7 hours to get UTC
      expect(result.data.start).toBe('2026-06-16T05:00:00.000Z');
      expect(result.data.end).toBe('2026-06-16T08:00:00.000Z');
      expect(result.data.timezone).toBe('America/New_York'); // Gig timezone preserved
    });
  });

  describe('Timezone defaults and fallbacks', () => {
    it('should use user timezone as default when CSV timezone is empty', () => {
      const csvRow = {
        title: 'Default TZ Gig',
        start: '2026-06-15T22:00:00',
        end: '2026-06-16T01:00:00',
        timezone: '', // Empty timezone
        status: 'Booked'
      };

      const userTimezone = 'Europe/London';
      const result = validateGigRow(csvRow, 0, userTimezone);
      
      expect(result.isValid).toBe(true);
      expect(result.data.timezone).toBe('Europe/London');
    });

    it('should detect browser timezone when no user timezone provided', () => {
      const csvRow = {
        title: 'Browser TZ Gig',
        start: '2026-06-15T22:00:00',
        end: '2026-06-16T01:00:00',
        timezone: '', // Empty timezone
        status: 'Booked'
      };

      // No user timezone provided
      const result = validateGigRow(csvRow, 0);
      
      expect(result.isValid).toBe(true);
      // Should use detected timezone (will vary based on test environment)
      expect(result.data.timezone).toMatch(/^[A-Za-z_]+\/[A-Za-z_]+$|^UTC$/);
    });

    it('should validate timezone values', () => {
      const csvRow = {
        title: 'Invalid TZ Gig',
        start: '2026-06-15T22:00:00',
        end: '2026-06-16T01:00:00',
        timezone: 'Invalid/Timezone',
        status: 'Booked'
      };

      const result = validateGigRow(csvRow, 0);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'timezone',
            message: 'Timezone must be a valid IANA timezone'
          })
        ])
      );
    });
  });

  describe('Date format parsing', () => {
    it('should handle various date formats consistently', () => {
      const testCases = [
        {
          name: 'ISO with seconds',
          start: '2026-06-15T22:00:00',
        },
        {
          name: 'Date only',
          start: '2026-06-15',
        },
        {
          name: 'MM/DD/YYYY format',
          start: '06/15/2026',
        },
        {
          name: 'MM/DD/YYYY with time',
          start: '06/15/2026 22:00:00',
        },
        {
          name: 'MM-DD-YYYY format',
          start: '06-15-2026',
        }
      ];

      testCases.forEach(({ name, start }) => {
        const csvRow = {
          title: 'Format Test Gig',
          start,
          end: '2026-06-16T01:00:00',
          timezone: 'America/New_York',
          status: 'Booked'
        };

        const result = validateGigRow(csvRow, 0);
        expect(result.isValid, `${name} should be valid`).toBe(true);
        
        // Verify the result is a valid ISO string
        expect(result.data.start).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
      });
    });
  });

  describe('End time defaults', () => {
    it('should default end time to 2 hours after start when end is empty', () => {
      const csvRow = {
        title: 'Default End Time',
        start: '2026-06-15T20:00:00Z', // Use UTC to avoid timezone issues
        end: '', // Empty end time
        timezone: 'America/New_York', // Use valid timezone
        status: 'Booked'
      };

      const result = validateGigRow(csvRow, 0);
      
      if (!result.isValid) {
        console.log('End time default validation errors:', result.errors);
      }
      
      expect(result.isValid).toBe(true);
      expect(result.data.start).toBe('2026-06-15T20:00:00.000Z');
      expect(result.data.end).toBe('2026-06-15T22:00:00.000Z'); // 2 hours later
    });

    it('should preserve explicit end time', () => {
      const csvRow = {
        title: 'Explicit End Time',
        start: '2026-06-15T20:00:00Z',
        end: '2026-06-15T23:30:00Z', // 3.5 hours later
        timezone: 'America/New_York',
        status: 'Booked'
      };

      const result = validateGigRow(csvRow, 0);
      
      expect(result.isValid).toBe(true);
      expect(result.data.start).toBe('2026-06-15T20:00:00.000Z');
      expect(result.data.end).toBe('2026-06-15T23:30:00.000Z');
    });
  });

  describe('Complete CSV scenarios', () => {
    it('should handle mixed timezone scenarios in a single CSV import', () => {
      const csvRows = [
        // Row with CSV timezone
        {
          title: 'Pacific Gig',
          start: '2026-06-15T22:00:00',
          end: '2026-06-16T01:00:00',
          timezone: 'America/Los_Angeles',
          status: 'Booked'
        },
        // Row with UTC datetime
        {
          title: 'UTC Gig', 
          start: '2026-06-15T22:00:00Z',
          end: '2026-06-16T01:00:00Z',
          timezone: 'America/New_York',
          status: 'Booked'
        },
        // Row with empty timezone (should use user default)
        {
          title: 'Default TZ Gig',
          start: '2026-06-15T22:00:00',
          end: '', // Should default to 2 hours later
          timezone: '',
          status: 'Booked'
        }
      ];

      const userTimezone = 'Europe/London';
      const results = csvRows.map((row, index) => 
        validateGigRow(row, index, userTimezone)
      );

      expect(results).toHaveLength(3);
      
      // All should be valid
      results.forEach((result, index) => {
        expect(result.isValid, `Row ${index} should be valid`).toBe(true);
      });
      
      // Check timezone assignments
      expect(results[0].data.timezone).toBe('America/Los_Angeles'); // CSV timezone
      expect(results[1].data.timezone).toBe('America/New_York');    // Gig timezone (UTC parsing)
      expect(results[2].data.timezone).toBe('Europe/London');       // User default
      
      // Check end time default was applied for row 3
      expect(results[2].data.end).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid date formats', () => {
      const csvRow = {
        title: 'Bad Date Gig',
        start: 'not-a-date',
        end: '2026-06-16T01:00:00',
        timezone: 'America/New_York',
        status: 'Booked'
      };

      const result = validateGigRow(csvRow, 0);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'start',
            message: expect.stringContaining('Start date/time must be in a valid date format')
          })
        ])
      );
    });

    it('should validate that end time is after start time', () => {
      const csvRow = {
        title: 'Time Order Gig',
        start: '2026-06-15T23:00:00Z',
        end: '2026-06-15T22:00:00Z', // End before start
        timezone: 'America/New_York',
        status: 'Booked'
      };

      const result = validateGigRow(csvRow, 0);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'end',
            message: 'End time must be after start time'
          })
        ])
      );
    });

    it('should require all mandatory fields', () => {
      const csvRow = {
        title: '', // Empty title
        start: '2026-06-15T22:00:00',
        end: '2026-06-16T01:00:00',
        timezone: 'America/New_York',
        status: 'Booked'
      };

      const result = validateGigRow(csvRow, 0);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'title',
            message: 'Title is required'
          })
        ])
      );
    });
  });
});