import Papa from 'papaparse';
import { Organization } from './supabase/types';

export type ImportType = 'gigs' | 'assets';

export type ImportStatus = 'pending' | 'importing' | 'success' | 'failed';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ParsedRow<T> {
  rowIndex: number;
  data: T;
  errors: ValidationError[];
  isValid: boolean;
  importStatus?: ImportStatus;
  importError?: string;
}

export interface GigRow {
  title: string;
  start: string;
  end: string;
  timezone: string;
  status: string;
  act?: string;
  venue?: string;
  tags?: string;
  notes?: string;
  amount?: string;
}

export interface AssetRow {
  category: string;
  'sub-category'?: string;
  manufacturer_model: string;
  equipment_type?: string;
  serial_number?: string;
  acquisition_date: string;
  vendor?: string;
  cost_per_item?: string;
  quantity?: string;
  replacement_value_per_item?: string;
  insured?: string;
  insurance_category?: string;
  notes?: string;
}

const GIG_STATUSES = ['DateHold', 'Proposed', 'Booked', 'Completed', 'Cancelled', 'Settled'];
const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu'
];

// Common IANA timezones - basic validation
const isValidTimezone = (tz: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export function parseCSV<T>(file: File): Promise<Papa.ParseResult<T>> {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim(),
      complete: (results) => {
        resolve(results);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

export function validateGigRow(row: any, rowIndex: number): ParsedRow<GigRow> {
  const errors: ValidationError[] = [];
  const data: GigRow = {
    title: row.title || '',
    start: row.start || '',
    end: row.end || '',
    timezone: row.timezone || '',
    status: row.status || '',
    act: row.act || '',
    venue: row.venue || '',
    tags: row.tags || '',
    notes: row.notes || '',
    amount: row.amount || '',
  };

  // Required fields
  if (!data.title.trim()) {
    errors.push({ field: 'title', message: 'Title is required' });
  }

  if (!data.start.trim()) {
    errors.push({ field: 'start', message: 'Start date/time is required' });
  } else {
    const startDate = new Date(data.start);
    if (isNaN(startDate.getTime())) {
      errors.push({ field: 'start', message: 'Start date/time must be a valid ISO datetime string' });
    }
  }

  if (!data.end.trim()) {
    errors.push({ field: 'end', message: 'End date/time is required' });
  } else {
    const endDate = new Date(data.end);
    if (isNaN(endDate.getTime())) {
      errors.push({ field: 'end', message: 'End date/time must be a valid ISO datetime string' });
    } else if (data.start) {
      const startDate = new Date(data.start);
      if (!isNaN(startDate.getTime()) && endDate <= startDate) {
        errors.push({ field: 'end', message: 'End time must be after start time' });
      }
    }
  }

  if (!data.timezone.trim()) {
    errors.push({ field: 'timezone', message: 'Timezone is required' });
  } else if (!isValidTimezone(data.timezone)) {
    errors.push({ field: 'timezone', message: 'Timezone must be a valid IANA timezone' });
  }

  if (!data.status.trim()) {
    errors.push({ field: 'status', message: 'Status is required' });
  } else if (!GIG_STATUSES.includes(data.status)) {
    errors.push({ field: 'status', message: `Status must be one of: ${GIG_STATUSES.join(', ')}` });
  }

  // Optional numeric validation
  if (data.amount && data.amount.trim()) {
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount < 0) {
      errors.push({ field: 'amount', message: 'Amount must be a positive number' });
    }
  }

  return {
    rowIndex,
    data,
    errors,
    isValid: errors.length === 0,
  };
}

export function validateAssetRow(row: any, rowIndex: number): ParsedRow<AssetRow> {
  const errors: ValidationError[] = [];
  const data: AssetRow = {
    category: row.category || '',
    'sub-category': row['sub-category'] || row['sub_category'] || '',
    manufacturer_model: row.manufacturer_model || '',
    equipment_type: row.equipment_type || '',
    serial_number: row.serial_number || '',
    acquisition_date: row.acquisition_date || '',
    vendor: row.vendor || '',
    cost_per_item: row.cost_per_item || '',
    quantity: row.quantity || '',
    replacement_value_per_item: row.replacement_value_per_item || '',
    insured: row.insured || '',
    insurance_category: row.insurance_category || '',
    notes: row.notes || '',
  };

  // Required fields
  if (!data.category.trim()) {
    errors.push({ field: 'category', message: 'Category is required' });
  }

  if (!data.manufacturer_model.trim()) {
    errors.push({ field: 'manufacturer_model', message: 'Manufacturer/Model is required' });
  }

  if (!data.acquisition_date.trim()) {
    errors.push({ field: 'acquisition_date', message: 'Acquisition date is required' });
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.acquisition_date)) {
      errors.push({ field: 'acquisition_date', message: 'Acquisition date must be in YYYY-MM-DD format' });
    } else {
      const date = new Date(data.acquisition_date);
      if (isNaN(date.getTime())) {
        errors.push({ field: 'acquisition_date', message: 'Acquisition date must be a valid date' });
      }
    }
  }

  // Optional numeric validation
  if (data.cost_per_item && data.cost_per_item.trim()) {
    const cost = parseFloat(data.cost_per_item);
    if (isNaN(cost) || cost < 0) {
      errors.push({ field: 'cost_per_item', message: 'Cost per item must be a positive number' });
    }
  }

  if (data.replacement_value_per_item && data.replacement_value_per_item.trim()) {
    const value = parseFloat(data.replacement_value_per_item);
    if (isNaN(value) || value < 0) {
      errors.push({ field: 'replacement_value_per_item', message: 'Replacement value per item must be a positive number' });
    }
  }

  if (data.quantity && data.quantity.trim()) {
    const qty = parseInt(data.quantity);
    if (isNaN(qty) || qty < 1) {
      errors.push({ field: 'quantity', message: 'Quantity must be a positive integer' });
    }
  }

  return {
    rowIndex,
    data,
    errors,
    isValid: errors.length === 0,
  };
}

export function parseAndValidateCSV<T extends GigRow | AssetRow>(
  file: File,
  importType: ImportType
): Promise<{ validRows: ParsedRow<T>[]; invalidRows: ParsedRow<T>[] }> {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await parseCSV<any>(file);
      const rows: ParsedRow<T>[] = [];

      result.data.forEach((row, index) => {
        let parsedRow: ParsedRow<T>;
        if (importType === 'gigs') {
          parsedRow = validateGigRow(row, index + 2) as ParsedRow<T>; // +2 because header is row 1, and we're 0-indexed
        } else {
          parsedRow = validateAssetRow(row, index + 2) as ParsedRow<T>;
        }
        rows.push(parsedRow);
      });

      const validRows = rows.filter(r => r.isValid);
      const invalidRows = rows.filter(r => !r.isValid);

      resolve({ validRows, invalidRows });
    } catch (error) {
      reject(error);
    }
  });
}

export function generateGigTemplate(): string {
  const headers = ['title', 'start', 'end', 'timezone', 'status', 'act', 'venue', 'tags', 'notes', 'amount_paid'];
  const example = [
    'Summer Concert',
    '2024-07-15T18:00:00',
    '2024-07-15T22:00:00',
    'America/Los_Angeles',
    'Booked',
    'The Band',
    'Venue Name',
    'Concert,Outdoor',
    'Notes about the gig',
    '5000.00'
  ];

  return Papa.unparse([headers, example], { header: false });
}

export function generateAssetTemplate(): string {
  const headers = [
    'category',
    'sub-category',
    'manufacturer_model',
    'equipment_type',
    'serial_number',
    'acquisition_date',
    'vendor',
    'cost_per_item',
    'quantity',
    'replacement_value_per_item',
    'insured',
    'insurance_category',
    'notes'
  ];
  const example = [
    'Audio',
    'Microphones',
    'Shure SM58',
    'Dynamic Microphone',
    'SN123456',
    '2024-01-15',
    'Audio Vendor Inc',
    '99.99',
    '1',
    '150.00',
    'Yes',
    'Class A',
    'Notes about the asset'
  ];

  return Papa.unparse([headers, example], { header: false });
}

export function downloadTemplate(importType: ImportType): void {
  const csv = importType === 'gigs' ? generateGigTemplate() : generateAssetTemplate();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${importType}-template.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Helper to parse boolean from various text formats
export function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase().trim();
  return ['yes', 'true', '1', 'y'].includes(normalized);
}

// Helper to parse tags from comma-separated string
export function parseTags(tagsString: string | undefined): string[] {
  if (!tagsString || !tagsString.trim()) return [];
  return tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0);
}

// Helper to find or create organization
export async function findOrCreateOrganization(
  name: string,
  type: 'Act' | 'Venue',
  searchOrganizations: (filters?: { type?: string; search?: string }) => Promise<Organization[]>,
  createOrganization: (orgData: { name: string; type: string }) => Promise<Organization>
): Promise<Organization> {
  if (!name || !name.trim()) {
    throw new Error(`Organization name is required for type ${type}`);
  }

  // Search for existing organization
  const existing = await searchOrganizations({ type, search: name.trim() });
  const match = existing.find(org => 
    org.name.toLowerCase().trim() === name.toLowerCase().trim() && org.type === type
  );

  if (match) {
    return match;
  }

  // Create new organization
  return await createOrganization({
    name: name.trim(),
    type,
  });
}

