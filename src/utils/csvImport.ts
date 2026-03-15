import Papa from 'papaparse';
import { Organization } from './supabase/types';
import { isValidTimezone, getDefaultTimezone } from './timezones';
import { GIG_STATUS_CONFIG } from './supabase/constants';
import { isNoonUTC } from './dateUtils';

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
  originalValues?: Record<string, string>;
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
  originalTimezone?: string;
  originalStatus?: string;
  originalStart?: string;
  originalEnd?: string;
}

export interface AssetRow {
  acquisition_date: string;
  source: string; // 0=Header, 1=Asset, 2=Expense/Item
  vendor?: string;
  total_inv_amount?: string;
  payment_method?: string;
  line_amount?: string;
  line_cost?: string;
  quantity?: string;
  item_price?: string;
  item_cost?: string;
  manufacturer_model: string;
  category: string;
  'sub-category'?: string;
  type?: string;
  kit?: string;
  serial_number?: string;
  tag_number?: string;
  description?: string;
  insured?: string;
  insurance_class?: string;
  replacement_value?: string;
  retired_on?: string;
  liquidation_amt?: string;
  service_life?: string;
  dep_method?: string;
  status?: string;
  // Legacy aliases for backward compatibility during transition
  cost_per_item?: string;
  replacement_value_per_item?: string;
  insurance_category?: string;
  notes?: string;
  equipment_type?: string;
}

const GIG_STATUSES = Object.keys(GIG_STATUS_CONFIG);

/**
 * Parse various date formats and return ISO string
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  
  const trimmed = dateStr.trim();
  
  // Try various date formats
  const formats = [
    // ISO format (preferred)
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    // YYYY-MM-DD HH:MM:SS
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
    // YYYY-MM-DD HH:MM
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
    // YYYY-MM-DD
    /^\d{4}-\d{2}-\d{2}$/,
    // MM/DD/YYYY HH:MM:SS
    /^\d{1,2}\/\d{1,2}\/\d{4} \d{2}:\d{2}:\d{2}$/,
    // MM/DD/YYYY HH:MM
    /^\d{1,2}\/\d{1,2}\/\d{4} \d{2}:\d{2}$/,
    // MM/DD/YYYY
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    // MM-DD-YYYY HH:MM:SS
    /^\d{1,2}-\d{1,2}-\d{4} \d{2}:\d{2}:\d{2}$/,
    // MM-DD-YYYY HH:MM
    /^\d{1,2}-\d{1,2}-\d{4} \d{2}:\d{2}$/,
    // MM-DD-YYYY
    /^\d{1,2}-\d{1,2}-\d{4}$/,
  ];

  // Check if this is a date-only format (YYYY-MM-DD, MM/DD/YYYY, MM-DD-YYYY)
  const isDateOnly = (
    /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ||
    /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed) ||
    /^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)
  );

  // Handle date-only formats first to ensure they get T12:00:00Z (noon UTC)
  if (isDateOnly) {
    // Handle MM/DD/YYYY and MM-DD-YYYY date-only formats
    const mdySlashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const mdyDashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    
    if (mdySlashMatch || mdyDashMatch) {
      const match = mdySlashMatch || mdyDashMatch;
      const [, month, day, year] = match;
      const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00Z`);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    
    // Handle YYYY-MM-DD date-only format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const date = new Date(`${trimmed}T12:00:00Z`);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  // Try to parse as-is first (handles ISO and many other formats with time)
  let date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }

  // Handle MM/DD/YYYY and MM-DD-YYYY formats with time
  const mdySlashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/);
  const mdyDashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(.*)$/);
  
  if (mdySlashMatch || mdyDashMatch) {
    const match = mdySlashMatch || mdyDashMatch;
    const [, month, day, year, timePart = ''] = match;
    
    // Convert to YYYY-MM-DD format with time
    const isoDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}${timePart}`;
    date = new Date(isoDateStr);
    
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return null;
}

/**
 * Apply defaults to gig row data
 */
function applyGigRowDefaults(row: any, userTimezone?: string | null): GigRow {
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
    amount: row.amount || row.amount_paid || '',
  };

  // Apply timezone default if not provided
  if (!data.timezone.trim()) {
    data.timezone = getDefaultTimezone(userTimezone);
  }

  // Parse and normalize date formats
  if (data.start) {
    const parsedStart = parseDate(data.start);
    if (parsedStart) {
      data.start = parsedStart;
    }
  }

  if (data.end) {
    const parsedEnd = parseDate(data.end);
    if (parsedEnd) {
      data.end = parsedEnd;
    }
  }

  // If we have a start time but no end time, default end appropriately
  if (data.start && !data.end.trim()) {
    const parsedStart = parseDate(data.start);
    if (parsedStart) {
      // Check if start is a date-only entry (noon UTC)
      if (isNoonUTC(parsedStart)) {
        // For date-only entries, set end time to same noon UTC for special UI handling
        data.end = parsedStart;
      } else {
        // For entries with time, default end to 2 hours after start
        const startDate = new Date(parsedStart);
        const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Add 2 hours
        data.end = endDate.toISOString();
      }
    }
  }

  return data;
}

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

export function validateGigRow(row: any, rowIndex: number, userTimezone?: string | null): ParsedRow<GigRow> {
  const errors: ValidationError[] = [];
  const originalValues: Record<string, string> = {};
  
  // Store original values before processing for error display
  const originalTimezone = row.timezone?.trim() || '';
  const originalStatus = row.status?.trim() || '';
  const originalStart = row.start?.trim() || '';
  const originalEnd = row.end?.trim() || '';
  
  // Apply defaults and normalize data
  const data = applyGigRowDefaults(row, userTimezone);

  // Required fields
  if (!data.title.trim()) {
    errors.push({ field: 'title', message: 'Title is required' });
  }

  if (!data.start.trim()) {
    errors.push({ field: 'start', message: 'Start date/time is required' });
  } else {
    const startDate = new Date(data.start);
    if (isNaN(startDate.getTime())) {
      const exampleFormats = ['YYYY-MM-DD', 'MM/DD/YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD HH:mm', 'MM/DD/YYYY HH:mm'];
      errors.push({ 
        field: 'start', 
        message: `Invalid start date "${originalStart}". Use formats like: ${exampleFormats.join(', ')}. Examples: "2024-07-15", "07/15/2024", "2024-07-15 18:00"` 
      });
      // Store original value for display when invalid
      originalValues.start = originalStart;
      data.originalStart = originalStart;
    }
  }

  if (!data.end.trim()) {
    errors.push({ field: 'end', message: 'End date/time is required' });
  } else {
    const endDate = new Date(data.end);
    if (isNaN(endDate.getTime())) {
      const exampleFormats = ['YYYY-MM-DD', 'MM/DD/YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD HH:mm', 'MM/DD/YYYY HH:mm'];
      errors.push({ 
        field: 'end', 
        message: `Invalid end date "${originalEnd}". Use formats like: ${exampleFormats.join(', ')}. Examples: "2024-07-15", "07/15/2024", "2024-07-15 22:00"` 
      });
      // Store original value for display when invalid
      originalValues.end = originalEnd;
      data.originalEnd = originalEnd;
    } else if (data.start) {
      const startDate = new Date(data.start);
      if (!isNaN(startDate.getTime()) && endDate < startDate) {
        errors.push({ field: 'end', message: 'End time must be after start time' });
      } else if (!isNaN(startDate.getTime()) && endDate.getTime() === startDate.getTime()) {
        // Equal times are only allowed for date-only entries (both at noon UTC)
        if (!(isNoonUTC(data.start) && isNoonUTC(data.end))) {
          errors.push({ field: 'end', message: 'End time must be after start time' });
        }
      }
    }
  }

  if (!data.timezone.trim()) {
    errors.push({ field: 'timezone', message: 'Timezone is required' });
  } else if (!isValidTimezone(data.timezone)) {
    errors.push({ 
      field: 'timezone', 
      message: `Invalid timezone "${originalTimezone}". Use IANA timezone names like: America/New_York, America/Los_Angeles, Europe/London, or UTC. See dropdown for full list.` 
    });
    // Store original value for display when invalid
    originalValues.timezone = originalTimezone;
    data.originalTimezone = originalTimezone;
  }

  if (!data.status.trim()) {
    errors.push({ field: 'status', message: 'Status is required' });
  } else if (!GIG_STATUSES.includes(data.status)) {
    errors.push({ 
      field: 'status', 
      message: `Invalid status "${originalStatus}". Valid options: ${GIG_STATUSES.join(', ')}. Use the dropdown to select a valid status.` 
    });
    // Store original value for display when invalid
    originalValues.status = originalStatus;
    data.originalStatus = originalStatus;
  }

  // Optional numeric validation
  if (data.amount && data.amount.trim()) {
    const amount = parseFloat(data.amount);
    if (isNaN(amount)) {
      errors.push({ field: 'amount', message: `Invalid amount "${data.amount}". Must be a number (e.g., 1000, 1000.50, 0)` });
    } else if (amount < 0) {
      errors.push({ field: 'amount', message: 'Amount cannot be negative. Use 0 for free gigs or positive numbers for paid gigs.' });
    }
  }

  return {
    rowIndex,
    data,
    errors,
    isValid: errors.length === 0,
    originalValues: Object.keys(originalValues).length > 0 ? originalValues : undefined,
  };
}

/**
 * Calculate pro-rata cost allocation factor and apply to rows
 * Factor = Invoice Total / Sum(Unit Price * Quantity)
 */
export function applyCostAllocation(
  headerRow: AssetRow,
  itemRows: ParsedRow<AssetRow>[]
): void {
  const invoiceTotal = parseFloat(headerRow.total_inv_amount?.replace(/[^0-9.-]/g, '') || '0');
  if (isNaN(invoiceTotal) || invoiceTotal <= 0) return;

  // Calculate sum of raw line prices
  let rawSum = 0;
  itemRows.forEach(row => {
    // Try item_price first, then item_cost as fallback for base price
    const priceStr = row.data.item_price || row.data.item_cost || '0';
    const price = parseFloat(priceStr.replace(/[^0-9.-]/g, ''));
    const qty = parseInt(row.data.quantity || '1');
    if (!isNaN(price) && !isNaN(qty)) {
      rawSum += price * qty;
    }
  });

  if (rawSum <= 0) return;

  const factor = invoiceTotal / rawSum;
  let runningTotal = 0;

  itemRows.forEach((row, index) => {
    const isLast = index === itemRows.length - 1;
    const priceStr = row.data.item_price || row.data.item_cost || '0';
    const price = parseFloat(priceStr.replace(/[^0-9.-]/g, ''));
    const qty = parseInt(row.data.quantity || '1');
    
    if (!isNaN(price) && !isNaN(qty)) {
      let allocatedCost: number;
      
      if (isLast) {
        // Penny reconciliation for the last row
        allocatedCost = (invoiceTotal - runningTotal) / qty;
      } else {
        allocatedCost = price * factor;
        // Use rounded value for running total to ensure exact match with invoiceTotal
        runningTotal += parseFloat(allocatedCost.toFixed(2)) * qty;
      }
      
      // Update the row data with the burdened cost
      row.data.item_cost = allocatedCost.toFixed(2);
      // For Source 2 items, we also update line_cost
      if (row.data.source === '2') {
        row.data.line_cost = (allocatedCost * qty).toFixed(2);
      }
    }
  });
}
export function validateAssetRow(row: any, rowIndex: number): ParsedRow<AssetRow> {
  const errors: ValidationError[] = [];
  
  // Basic data extraction with legacy support
  const data: AssetRow = {
    acquisition_date: row.acquisition_date || '',
    source: row.source || '1', // Default to Asset (1) if not specified for legacy compatibility
    vendor: row.vendor || '',
    total_inv_amount: row.total_inv_amount || '',
    payment_method: row.payment_method || '',
    line_amount: row.line_amount || '',
    line_cost: row.line_cost || '',
    quantity: row.quantity || '',
    item_price: row.item_price || '',
    item_cost: row.item_cost || row.cost_per_item || '',
    manufacturer_model: row.manufacturer_model || '',
    category: row.category || '',
    'sub-category': row['sub-category'] || row['sub_category'] || '',
    type: row.type || row.equipment_type || '',
    kit: row.kit || '',
    serial_number: row.serial_number || '',
    tag_number: row.tag_number || '',
    description: row.description || row.notes || '',
    insured: row.insured || '',
    insurance_class: row.insurance_class || row.insurance_category || '',
    replacement_value: row.replacement_value || row.replacement_value_per_item || '',
    retired_on: row.retired_on || '',
    liquidation_amt: row.liquidation_amt || '',
    service_life: row.service_life || '',
    dep_method: row.dep_method || '',
    status: row.status || '',
    // Legacy aliases
    cost_per_item: row.cost_per_item || '',
    replacement_value_per_item: row.replacement_value_per_item || '',
    insurance_category: row.insurance_category || '',
    notes: row.notes || '',
    equipment_type: row.equipment_type || '',
  };

  // 1. Source validation
  if (!['0', '1', '2'].includes(data.source)) {
    errors.push({ field: 'source', message: `Invalid source "${data.source}". Must be 0 (Header), 1 (Asset), or 2 (Expense/Item).` });
  }

  // 2. Conditional required fields based on Source
  if (data.source === '0') {
    // Header Row
    if (!data.acquisition_date.trim()) {
      errors.push({ field: 'acquisition_date', message: 'Acquisition date is required for Header rows' });
    }
    if (!data.vendor.trim()) {
      errors.push({ field: 'vendor', message: 'Vendor is required for Header rows' });
    }
    if (!data.total_inv_amount.trim()) {
      errors.push({ field: 'total_inv_amount', message: 'Total Invoice Amount is required for Header rows' });
    }
  } else if (data.source === '1') {
    // Asset Row
    if (!data.category.trim()) {
      errors.push({ field: 'category', message: 'Category is required for Asset rows' });
    }
    if (!data.manufacturer_model.trim()) {
      errors.push({ field: 'manufacturer_model', message: 'Manufacturer/Model is required for Asset rows' });
    }
    // Acquisition date is actually optional for assets if they are linked to a header, 
    // but for standalone imports it's required. 
    // Given the hierarchical structure, we might relax this if we have a parent, 
    // but for individual row validation we should probably keep it required if no header is present.
  } else if (data.source === '2') {
    // Expense/Item Row
    if (!data.category.trim()) {
      errors.push({ field: 'category', message: 'Category is required for Expense items' });
    }
    if (!data.line_amount.trim()) {
      errors.push({ field: 'line_amount', message: 'Line Amount is required for Expense items' });
    }
  }

  // 3. Common Date validation
  const validateDate = (field: string, value: string, label: string) => {
    if (value.trim()) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        errors.push({ field, message: `Invalid ${label} "${value}". Use YYYY-MM-DD format (e.g., 2024-01-15)` });
      } else {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push({ field, message: `Invalid ${label} "${value}". Must be a valid date in YYYY-MM-DD format` });
        }
      }
    }
  };

  validateDate('acquisition_date', data.acquisition_date, 'acquisition date');
  validateDate('retired_on', data.retired_on, 'retired date');

  // 4. Numeric validation
  const validateNumeric = (field: string, value: string, label: string, allowNegative = false) => {
    if (value.trim()) {
      const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
      if (isNaN(num)) {
        errors.push({ field, message: `Invalid ${label} "${value}". Must be a number.` });
      } else if (!allowNegative && num < 0) {
        errors.push({ field, message: `${label} cannot be negative.` });
      }
    }
  };

  validateNumeric('total_inv_amount', data.total_inv_amount, 'total invoice amount');
  validateNumeric('line_amount', data.line_amount, 'line amount');
  validateNumeric('item_price', data.item_price, 'item price');
  validateNumeric('item_cost', data.item_cost, 'item cost');
  validateNumeric('replacement_value', data.replacement_value, 'replacement value');
  validateNumeric('liquidation_amt', data.liquidation_amt, 'liquidation amount');
  validateNumeric('service_life', data.service_life, 'service life');

  if (data.quantity && data.quantity.trim()) {
    const qty = parseInt(data.quantity);
    if (isNaN(qty)) {
      errors.push({ field: 'quantity', message: `Invalid quantity "${data.quantity}". Must be a whole number.` });
    } else if (qty < 1) {
      errors.push({ field: 'quantity', message: 'Quantity must be at least 1' });
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
  importType: ImportType,
  userTimezone?: string | null
): Promise<{ validRows: ParsedRow<T>[]; invalidRows: ParsedRow<T>[] }> {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await parseCSV<any>(file);
      const rows: ParsedRow<T>[] = [];

      result.data.forEach((row, index) => {
        let parsedRow: ParsedRow<T>;
        if (importType === 'gigs') {
          parsedRow = validateGigRow(row, index + 2, userTimezone) as ParsedRow<T>;
        } else {
          parsedRow = validateAssetRow(row, index + 2) as ParsedRow<T>;
        }
        rows.push(parsedRow);
      });

      // For assets, handle hierarchical grouping and cost allocation
      if (importType === 'assets') {
        const assetRows = rows as ParsedRow<AssetRow>[];
        let currentHeader: AssetRow | null = null;
        let currentGroup: ParsedRow<AssetRow>[] = [];

        assetRows.forEach((row) => {
          if (row.isValid) {
            if (row.data.source === '0') {
              // Apply allocation to previous group before starting new one
              if (currentHeader && currentGroup.length > 0) {
                applyCostAllocation(currentHeader, currentGroup);
              }
              currentHeader = row.data;
              currentGroup = [];
            } else if (row.data.source === '1' || row.data.source === '2') {
              currentGroup.push(row);
            }
          }
        });

        // Apply allocation to final group
        if (currentHeader && currentGroup.length > 0) {
          applyCostAllocation(currentHeader, currentGroup);
        }
      }

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
    'acquisition_date',
    'source',
    'vendor',
    'total_inv_amount',
    'payment_method',
    'line_amount',
    'line_cost',
    'quantity',
    'item_price',
    'item_cost',
    'manufacturer_model',
    'category',
    'sub_category',
    'type',
    'kit',
    'serial_number',
    'tag_number',
    'description',
    'insured',
    'insurance_class',
    'replacement_value',
    'retired_on',
    'liquidation_amt',
    'service_life',
    'dep_method',
    'status'
  ];
  const exampleHeader = [
    '2024-01-15',
    '0',
    'Sweetwater',
    '1250.00',
    'Credit Card',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Order for microphones and stands',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ];
  const exampleAsset = [
    '',
    '1',
    '',
    '',
    '',
    '',
    '',
    '10',
    '99.00',
    '',
    'Shure SM58',
    'Audio',
    'Microphones',
    'Dynamic',
    '',
    'SN001, SN002...',
    '',
    'Standard dynamic mic',
    'Yes',
    'Class A',
    '150.00',
    '',
    '',
    '5',
    'Straight Line',
    'Active'
  ];

  return Papa.unparse([headers, exampleHeader, exampleAsset], { header: false });
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

