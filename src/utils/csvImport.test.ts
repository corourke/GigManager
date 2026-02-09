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
            message: expect.stringContaining('Invalid timezone "Invalid/Timezone". Use IANA timezone names like')
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
            message: expect.stringContaining('Invalid start date "not-a-date". Use formats like')
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

    it('should handle date-only entries with T12:00:00Z for special UI handling', () => {
      const csvRow = {
        title: 'Date Only Gig',
        start: '2026-06-15', // Date only
        end: '2026-06-16', // Date only
        timezone: 'America/New_York',
        status: 'Booked'
      };

      const result = validateGigRow(csvRow, 0);
      
      expect(result.isValid).toBe(true);
      // Should set time to noon UTC for date-only entries
      expect(result.data.start).toBe('2026-06-15T12:00:00.000Z');
      expect(result.data.end).toBe('2026-06-16T12:00:00.000Z');
      expect(result.data.timezone).toBe('America/New_York');
    });

    it('should handle MM/DD/YYYY date-only format with T12:00:00Z', () => {
      const csvRow = {
        title: 'US Date Format Gig',
        start: '06/15/2026', // MM/DD/YYYY format
        end: '06/16/2026', 
        timezone: 'America/New_York',
        status: 'Booked'
      };

      const result = validateGigRow(csvRow, 0);
      
      expect(result.isValid).toBe(true);
      // Should set time to noon UTC for date-only entries
      expect(result.data.start).toBe('2026-06-15T12:00:00.000Z');
      expect(result.data.end).toBe('2026-06-16T12:00:00.000Z');
      expect(result.data.timezone).toBe('America/New_York');
    });

    it('should set end time to same noon UTC when start is date-only and end is empty', () => {
      const csvRow = {
        title: 'Date Only with Empty End',
        start: '2026-06-15', // Date only
        end: '', // Empty end time
        timezone: 'America/New_York',
        status: 'Booked'
      };

      const result = validateGigRow(csvRow, 0);
      
      expect(result.isValid).toBe(true);
      // Both start and end should be noon UTC for date-only entries
      expect(result.data.start).toBe('2026-06-15T12:00:00.000Z');
      expect(result.data.end).toBe('2026-06-15T12:00:00.000Z'); // Same as start for date-only
      expect(result.data.timezone).toBe('America/New_York');
    });

    it('should still add 2 hours for time-based entries when end is empty', () => {
      const csvRow = {
        title: 'Time Entry with Empty End',
        start: '2026-06-15T20:00:00Z', // UTC with time
        end: '', // Empty end time
        timezone: 'America/New_York',
        status: 'Booked'
      };

      const result = validateGigRow(csvRow, 0);
      
      expect(result.isValid).toBe(true);
      expect(result.data.start).toBe('2026-06-15T20:00:00.000Z');
      expect(result.data.end).toBe('2026-06-15T22:00:00.000Z'); // 2 hours later
      expect(result.data.timezone).toBe('America/New_York');
    });

    it('should handle MM/DD/YYYY with T-time format', () => {
      const csvRow = {
        title: 'Mixed Format Gig',
        start: '3/31/2026T18:00:00', // MM/DD/YYYY with ISO time
        end: '3/31/2026T20:00:00', // MM/DD/YYYY with ISO time
        timezone: 'America/New_York',
        status: 'Booked'
      };

      const result = validateGigRow(csvRow, 0);
      
      expect(result.isValid).toBe(true);
      // Mixed format gets parsed as browser local time then converted to UTC
      // The exact UTC value depends on the browser's timezone during testing
      expect(result.data.start).toMatch(/^2026-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result.data.end).toMatch(/^2026-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result.data.timezone).toBe('America/New_York');
    });

    it('should handle completely invalid date formats gracefully', () => {
      const csvRow = {
        title: 'Invalid Date Gig',
        start: '33/22/1092', // Completely invalid date
        end: '45/67/8901', // Another invalid date
        timezone: 'America/New_York',
        status: 'Booked'
      };

      const result = validateGigRow(csvRow, 0);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].field).toBe('start');
      expect(result.errors[0].message).toContain('Invalid start date "33/22/1092". Use formats like');
      expect(result.errors[1].field).toBe('end');
      expect(result.errors[1].message).toContain('Invalid end date "45/67/8901". Use formats like');
      
      // Check that original values are preserved
      expect(result.data.originalStart).toBe('33/22/1092');
      expect(result.data.originalEnd).toBe('45/67/8901');
      expect(result.originalValues?.start).toBe('33/22/1092');
      expect(result.originalValues?.end).toBe('45/67/8901');
    });
  });
});