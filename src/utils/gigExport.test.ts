import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';
import {
  formatExportDate,
  roundMoney,
  buildExportRows,
  gigsToCsv,
  gigExportFilename,
} from './gigExport';
import type { ColumnDef } from '../components/tables/SmartDataTable';

interface Row {
  id: string;
  title: string;
  tags: string[];
  notes: string | null;
  amount: number;
}

const makeRow = (overrides: Partial<Row> = {}): Row => ({
  id: 'row-1',
  title: 'Summer Show',
  tags: ['Concert', 'Festival'],
  notes: 'Load in at 2pm',
  amount: 1234.5,
  ...overrides,
});

// A representative column set: a plain keyof accessor, a function accessor,
// an array-valued accessor (no exportValue — exercises the join fallback),
// and an exportValue override that reshapes the on-screen value for export.
const columns: ColumnDef<Row>[] = [
  { id: 'title', header: 'Title', accessor: 'title' },
  { id: 'tags', header: 'Tags', accessor: 'tags' },
  { id: 'notes', header: 'Notes', accessor: 'notes' },
  {
    id: 'amount',
    header: 'Amount',
    accessor: (row) => `$${row.amount}`, // on-screen display value (formatted string)
    exportValue: (row) => roundMoney(row.amount), // export gets the raw number instead
  },
];

describe('formatExportDate', () => {
  it('formats an ISO timestamp as YYYY-MM-DD in the given timezone', () => {
    expect(formatExportDate('2026-07-04T18:00:00.000Z', 'America/New_York')).toBe('2026-07-04');
  });

  it('uses the timezone to resolve the calendar date, not the UTC instant', () => {
    // 02:00 UTC on the 5th is still the evening of the 4th in Los Angeles.
    expect(formatExportDate('2026-07-05T02:00:00.000Z', 'America/Los_Angeles')).toBe('2026-07-04');
    expect(formatExportDate('2026-07-05T02:00:00.000Z', 'UTC')).toBe('2026-07-05');
  });

  it('returns empty string for missing or invalid input', () => {
    expect(formatExportDate(null)).toBe('');
    expect(formatExportDate(undefined)).toBe('');
    expect(formatExportDate('')).toBe('');
    expect(formatExportDate('not-a-date', 'UTC')).toBe('');
  });
});

describe('roundMoney', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundMoney(1000.005)).toBe(1000.01);
    expect(roundMoney(333.333)).toBe(333.33);
  });

  it('normalizes -0 to 0', () => {
    expect(Object.is(roundMoney(-0), -0)).toBe(false);
    expect(roundMoney(-0)).toBe(0);
  });
});

describe('buildExportRows', () => {
  it('uses each column header as the row key, in column order', () => {
    const [row] = buildExportRows(columns, [makeRow()]);
    expect(Object.keys(row)).toEqual(['Title', 'Tags', 'Notes', 'Amount']);
  });

  it('prefers exportValue over the on-screen accessor when present', () => {
    const [row] = buildExportRows(columns, [makeRow({ amount: 500.005 })]);
    // accessor would have produced the string "$500.005"; exportValue gives a rounded number
    expect(row.Amount).toBe(500.01);
  });

  it('falls back to accessor and joins array values with "; "', () => {
    const [row] = buildExportRows(columns, [makeRow()]);
    expect(row.Title).toBe('Summer Show');
    expect(row.Tags).toBe('Concert; Festival');
  });

  it('blanks null/undefined values', () => {
    const [row] = buildExportRows(columns, [makeRow({ notes: null })]);
    expect(row.Notes).toBe('');
  });

  it('only includes the columns it was given (simulating a hidden column)', () => {
    const visibleOnly = columns.filter((c) => c.id !== 'notes');
    const [row] = buildExportRows(visibleOnly, [makeRow()]);
    expect(Object.keys(row)).toEqual(['Title', 'Tags', 'Amount']);
  });

  it('maps every row', () => {
    const rows = buildExportRows(columns, [makeRow({ id: 'a' }), makeRow({ id: 'b', title: 'Other' })]);
    expect(rows).toHaveLength(2);
    expect(rows[1].Title).toBe('Other');
  });
});

describe('gigsToCsv', () => {
  it('emits the given headers, in order, as the header row', () => {
    const csv = gigsToCsv(buildExportRows(columns, [makeRow()]), columns.map((c) => c.header));
    const firstLine = csv.split(/\r?\n/)[0];
    expect(firstLine).toBe('Title,Tags,Notes,Amount');
  });

  it('respects a headers subset/order different from the rows object keys', () => {
    const rows = buildExportRows(columns, [makeRow()]);
    const csv = gigsToCsv(rows, ['Amount', 'Title']);
    const firstLine = csv.split(/\r?\n/)[0];
    expect(firstLine).toBe('Amount,Title');
  });

  it('round-trips notes containing commas, quotes and newlines', () => {
    const nasty = 'Tricky, "quoted", line\nbreak';
    const rows = buildExportRows(columns, [makeRow({ notes: nasty })]);
    const csv = gigsToCsv(rows, columns.map((c) => c.header));
    const parsed = Papa.parse(csv, { header: true }).data as Record<string, string>[];
    expect(parsed[0].Notes).toBe(nasty);
    expect(parsed[0].Title).toBe('Summer Show');
  });
});

describe('gigExportFilename', () => {
  it('builds gigs-export-YYYY-MM-DD.csv', () => {
    expect(gigExportFilename(new Date('2026-09-03T12:00:00Z'))).toMatch(/^gigs-export-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
