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
  source: string; // "0-Invoice", "1-Asset", "2-Expense"
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
  sub_category?: string;
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
  
  // Helper to create date and check validity
  const createValidDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  // 1. Handle YYYY-MM-DD date-only format explicitly for noon UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return createValidDate(`${trimmed}T12:00:00Z`);
  }

  // 2. Handle MM/DD/YYYY or MM-DD-YYYY formats (date-only or with time)
  const mdyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(.*)$/);
  if (mdyMatch) {
    const [, month, day, year, timePart = ''] = mdyMatch;
    const normalizedMonth = month.padStart(2, '0');
    const normalizedDay = day.padStart(2, '0');
    
    if (!timePart.trim()) {
      return createValidDate(`${year}-${normalizedMonth}-${normalizedDay}T12:00:00Z`);
    }
    
    return createValidDate(`${year}-${normalizedMonth}-${normalizedDay}${timePart}`);
  }

  // 3. Try to parse as-is (handles ISO and many other formats)
  return createValidDate(trimmed);
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

function validateDate(field: 'start' | 'end', value: string, originalValue: string, errors: ValidationError[]) {
  if (!value.trim()) {
    errors.push({ field, message: `${field === 'start' ? 'Start' : 'End'} date/time is required` });
    return false;
  }
  
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    const exampleFormats = ['YYYY-MM-DD', 'MM/DD/YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD HH:mm', 'MM/DD/YYYY HH:mm'];
    errors.push({ 
      field, 
      message: `Invalid ${field} date "${originalValue}". Use formats like: ${exampleFormats.join(', ')}. Examples: "2024-07-15", "07/15/2024", "2024-07-15 18:00"` 
    });
    return false;
  }
  return true;
}

function validateTimezone(value: string, originalValue: string, errors: ValidationError[]) {
  if (!value.trim()) {
    errors.push({ field: 'timezone', message: 'Timezone is required' });
    return false;
  }
  if (!isValidTimezone(value)) {
    errors.push({ 
      field: 'timezone', 
      message: `Invalid timezone "${originalValue}". Use IANA timezone names like: America/New_York, America/Los_Angeles, Europe/London, or UTC. See dropdown for full list.` 
    });
    return false;
  }
  return true;
}

function validateStatus(value: string, originalValue: string, errors: ValidationError[]) {
  if (!value.trim()) {
    errors.push({ field: 'status', message: 'Status is required' });
    return false;
  }
  if (!GIG_STATUSES.includes(value)) {
    errors.push({ 
      field: 'status', 
      message: `Invalid status "${originalValue}". Valid options: ${GIG_STATUSES.join(', ')}. Use the dropdown to select a valid status.` 
    });
    return false;
  }
  return true;
}

function validateAmount(value: string, errors: ValidationError[]) {
  if (value && value.trim()) {
    const amount = parseFloat(value);
    if (isNaN(amount)) {
      errors.push({ field: 'amount', message: `Invalid amount "${value}". Must be a number (e.g., 1000, 1000.50, 0)` });
    } else if (amount < 0) {
      errors.push({ field: 'amount', message: 'Amount cannot be negative. Use 0 for free gigs or positive numbers for paid gigs.' });
    }
  }
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

  const isStartValid = validateDate('start', data.start, originalStart, errors);
  if (!isStartValid && data.start.trim()) {
    originalValues.start = originalStart;
    data.originalStart = originalStart;
  }

  const isEndValid = validateDate('end', data.end, originalEnd, errors);
  if (!isEndValid && data.end.trim()) {
    originalValues.end = originalEnd;
    data.originalEnd = originalEnd;
  }

  // Cross-field date validation
  if (isStartValid && isEndValid) {
    const startDate = new Date(data.start);
    const endDate = new Date(data.end);
    if (endDate < startDate) {
      errors.push({ field: 'end', message: 'End time must be after start time' });
    } else if (endDate.getTime() === startDate.getTime() && !(isNoonUTC(data.start) && isNoonUTC(data.end))) {
      errors.push({ field: 'end', message: 'End time must be after start time' });
    }
  }

  if (!validateTimezone(data.timezone, originalTimezone, errors)) {
    if (data.timezone.trim()) {
      originalValues.timezone = originalTimezone;
      data.originalTimezone = originalTimezone;
    }
  }

  if (!validateStatus(data.status, originalStatus, errors)) {
    if (data.status.trim()) {
      originalValues.status = originalStatus;
      data.originalStatus = originalStatus;
    }
  }

  validateAmount(data.amount, errors);

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
/**
 * REUSABLE LOGIC FOR CALCULATING ITEM COSTS
 * This logic tree applies to both CSV imports and AI extraction pipelines.
 * 
 * Rules:
 * 1. Default Quantity = 1 if missing.
 * 2. Path A ("Cost" Row): If line_cost or item_cost is present, use it directly (burdened).
 * 3. Path B ("Price" Row): If line_amount or item_price is present, it must be scaled by a factor.
 * 4. Total Check: sum(line_cost) must equal total_inv_amount.
 * 5. Penny Reconciliation: Adjust the last item in the group to match the total.
 */
export function applyCostAllocation(
  headerRow: AssetRow,
  itemRows: ParsedRow<AssetRow>[]
): void {
  const invoiceTotalStr = headerRow.total_inv_amount?.replace(/[^0-9.-]/g, '') || '';
  const invoiceTotal = invoiceTotalStr ? parseFloat(invoiceTotalStr) : 0;
  
  // Step 1 & 2: Resolve Quantity and categorize rows
  let sumLineAmountForPriceRows = 0;
  
  itemRows.forEach(row => {
    const data = row.data;
    
    // 1. Resolve Quantity
    const qtyStr = data.quantity?.toString().replace(/[^0-9.-]/g, '') || '';
    const q = qtyStr ? Math.max(1, parseFloat(qtyStr)) : 1;
    data.quantity = q.toString();

    // 2. Identify Path
    const lineCostStr = data.line_cost?.toString().replace(/[^0-9.-]/g, '') || '';
    const itemCostStr = data.item_cost?.toString().replace(/[^0-9.-]/g, '') || '';
    const lineAmountStr = data.line_amount?.toString().replace(/[^0-9.-]/g, '') || '';
    const itemPriceStr = data.item_price?.toString().replace(/[^0-9.-]/g, '') || '';

    if (lineCostStr || itemCostStr) {
      // Path A: "Cost" Row
      let lc = lineCostStr ? parseFloat(lineCostStr) : 0;
      let ic = itemCostStr ? parseFloat(itemCostStr) : 0;

      if (!lineCostStr && itemCostStr) {
        lc = ic * q;
      } else if (!itemCostStr && lineCostStr) {
        ic = lc / q;
      }
      
      data.line_cost = (Math.round(lc * 100) / 100).toFixed(2);
      data.item_cost = (Math.round(ic * 100) / 100).toFixed(2);
      (row as any)._allocationPath = 'cost';
    } else if (lineAmountStr || itemPriceStr) {
      // Path B: "Price" Row
      let la = lineAmountStr ? parseFloat(lineAmountStr) : 0;
      let ip = itemPriceStr ? parseFloat(itemPriceStr) : 0;

      if (!lineAmountStr && itemPriceStr) {
        la = ip * q;
      } else if (!itemPriceStr && lineAmountStr) {
        ip = la / q;
      }

      data.line_amount = (Math.round(la * 100) / 100).toFixed(2);
      data.item_price = (Math.round(ip * 100) / 100).toFixed(2);
      sumLineAmountForPriceRows += Math.round(la * 100) / 100;
      (row as any)._allocationPath = 'price';
    } else {
      // Path C: Invalid
      row.isValid = false;
      row.errors.push({ field: 'item_cost', message: 'Cannot compute cost: No price or cost information provided.' });
    }
  });

  // Step 4: Calculate Factor (F)
  // Only applied to "Price" rows. "Cost" rows remain fixed.
  let factor = 1.0;
  if (sumLineAmountForPriceRows > 0 && invoiceTotal > 0) {
    // We need to know the sum of FIXED costs to find the remaining balance for price rows
    const sumFixedLineCosts = itemRows.reduce((sum, row) => {
      if ((row as any)._allocationPath === 'cost') {
        return sum + (parseFloat(row.data.line_cost || '0') || 0);
      }
      return sum;
    }, 0);

    const remainingBalance = invoiceTotal - sumFixedLineCosts;
    factor = remainingBalance / sumLineAmountForPriceRows;
  }

  // Step 5: Final Resolution & Penny Reconciliation
  itemRows.filter(r => r.isValid).forEach(row => {
    const data = row.data;
    const q = parseFloat(data.quantity || '1');

    if ((row as any)._allocationPath === 'price') {
      const la = parseFloat(data.line_amount || '0');
      const finalLC = la * factor;
      data.line_cost = (Math.round(finalLC * 100) / 100).toFixed(2);
    }
    // item_cost is always line_cost / quantity
    const lc = parseFloat(data.line_cost || '0');
    data.item_cost = (Math.round((lc / q) * 100) / 100).toFixed(2);
  });

  // Penny Reconciliation - Adjust the LAST row in the group
  if (invoiceTotal > 0) {
    const validRows = itemRows.filter(r => r.isValid);
    if (validRows.length > 0) {
      const currentSum = validRows.reduce((sum, row) => sum + parseFloat(row.data.line_cost || '0'), 0);
      const difference = Math.round((invoiceTotal - currentSum) * 100) / 100;
      
      if (Math.abs(difference) > 0) {
        const lastRow = validRows[validRows.length - 1];
        const newLC = parseFloat(lastRow.data.line_cost || '0') + difference;
        const q = parseFloat(lastRow.data.quantity || '1');
        
        lastRow.data.line_cost = newLC.toFixed(2);
        lastRow.data.item_cost = (Math.round((newLC / q) * 100) / 100).toFixed(2);
      }
    }
  }
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
    manufacturer_model: row.manufacturer_model || row.description || row.notes || '',
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
  let normalizedSource = data.source;
  if (data.source.startsWith('0')) normalizedSource = '0';
  else if (data.source.startsWith('1')) normalizedSource = '1';
  else if (data.source.startsWith('2')) normalizedSource = '2';

  const validSources = ['0-Invoice', '1-Asset', '2-Expense', '0', '1', '2'];
  if (!validSources.includes(data.source)) {
    errors.push({ field: 'source', message: `Invalid source "${data.source}". Must be "0-Invoice", "1-Asset", or "2-Expense".` });
  } else {
    // Normalize source for easier internal processing
    data.source = normalizedSource;
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
    
    const hasFinancials = data.line_amount.trim() || data.item_price.trim() || data.line_cost.trim() || data.item_cost.trim();
    if (!hasFinancials) {
      errors.push({ field: 'item_cost', message: 'Price or Cost information is required for Asset rows' });
    }
  } else if (data.source === '2') {
    // Expense/Item Row
    if (!data.category.trim()) {
      errors.push({ field: 'category', message: 'Category is required for Expense items' });
    }
    
    const hasFinancials = data.line_amount.trim() || data.item_price.trim() || data.line_cost.trim() || data.item_cost.trim();
    if (!hasFinancials) {
      errors.push({ field: 'item_cost', message: 'Price or Cost information is required for Expense items' });
    }
  }

  // 3. Common Date validation
  const validateAndNormalizeDate = (field: keyof AssetRow, label: string) => {
    const value = data[field]?.toString().trim() || '';
    if (value) {
      // YYYY-MM-DD
      const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
      // MM/DD/YYYY or M/D/YYYY
      const slashRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      // MM-DD-YYYY or M-D-YYYY
      const dashRegex = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;

      let normalizedDate: string | null = null;

      if (isoRegex.test(value)) {
        normalizedDate = value;
      } else if (slashRegex.test(value)) {
        const [, m, d, y] = value.match(slashRegex)!;
        normalizedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else if (dashRegex.test(value)) {
        const [, m, d, y] = value.match(dashRegex)!;
        normalizedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }

      if (!normalizedDate) {
        errors.push({ field, message: `Invalid ${label} "${value}". Use YYYY-MM-DD, MM/DD/YYYY, or MM-DD-YYYY format.` });
      } else {
        const date = new Date(normalizedDate);
        if (isNaN(date.getTime())) {
          errors.push({ field, message: `Invalid ${label} "${value}". Must be a valid date.` });
        } else {
          // Store normalized version
          (data as any)[field] = normalizedDate;
        }
      }
    }
  };

  validateAndNormalizeDate('acquisition_date', 'acquisition date');
  validateAndNormalizeDate('retired_on', 'retired date');

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
  validateNumeric('line_cost', data.line_cost, 'line cost');
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
        
        // Group rows using Transaction Context
        const allGroups: {
          header: AssetRow | null;
          items: ParsedRow<AssetRow>[];
        }[] = [];
        const latestGroupMap = new Map<string, number>(); // dateKey|vendorKey -> index in allGroups
        let lastHeaderIdx: number | undefined = undefined;

        assetRows.forEach((row) => {
          if (!row.isValid) return;
          
          const data = row.data;
          const dateKey = data.acquisition_date || '';
          const vendorKey = (data.vendor || '').toLowerCase().trim();
          const lookupKey = dateKey && vendorKey ? `${dateKey}|${vendorKey}` : null;
          
          const isHeader = data.source === '0';
          const hasTotal = !!(data.total_inv_amount && parseFloat(data.total_inv_amount.toString().replace(/[^0-9.-]/g, '')) > 0);
          const isStandalone = (data.source === '1' || data.source === '2') && hasTotal;

          if (isHeader) {
            const existingIdx = lookupKey ? latestGroupMap.get(lookupKey) : undefined;
            const invAmt = hasTotal ? parseFloat(data.total_inv_amount!.toString().replace(/[^0-9.-]/g, '')) : 0;

            if (existingIdx !== undefined && allGroups[existingIdx].items.length === 0) {
              const group = allGroups[existingIdx];
              const currentTotal = parseFloat(group.header!.total_inv_amount?.toString().replace(/[^0-9.-]/g, '') || '0');
              group.header!.total_inv_amount = (currentTotal + invAmt).toFixed(2);
              if (data.description || data.manufacturer_model) {
                group.header!.description = group.header!.description 
                  ? `${group.header!.description}; ${data.manufacturer_model || data.description}`
                  : (data.manufacturer_model || data.description);
              }
              lastHeaderIdx = existingIdx;
            } else {
              const newGroup = {
                header: data,
                items: [],
              };
              allGroups.push(newGroup);
              lastHeaderIdx = allGroups.length - 1;
              if (lookupKey) {
                latestGroupMap.set(lookupKey, lastHeaderIdx);
              }
            }
          } else if (isStandalone) {
            const newGroup = {
              header: data,
              items: [row],
            };
            allGroups.push(newGroup);
            // Don't update lastHeaderIdx or latestGroupMap for standalone
          } else {
            // It's a child row (Asset or Expense)
            let groupIdx = lookupKey ? latestGroupMap.get(lookupKey) : undefined;
            
            // If no explicit match via lookupKey, try the last seen header
            if (groupIdx === undefined && lastHeaderIdx !== undefined) {
              groupIdx = lastHeaderIdx;
            }

            if (groupIdx === undefined) {
              const synthesizedGroup = {
                header: {
                  ...data,
                  source: '0',
                  total_inv_amount: '0',
                  description: 'Synthesized Purchase Header',
                },
                items: [row],
              };
              allGroups.push(synthesizedGroup);
              groupIdx = allGroups.length - 1;
              if (lookupKey) {
                latestGroupMap.set(lookupKey, groupIdx);
              }
            } else {
              allGroups[groupIdx].items.push(row);
            }
          }
        });

        // Apply allocation to each group and track overall totals
        let totalImportInvAmount = 0;
        let totalImportLineCost = 0;

        allGroups.forEach((group) => {
          if (group.header && group.items.length > 0) {
            // Before allocation, ensure all items in the group have the header's date/vendor
            // if they were missing them
            group.items.forEach(item => {
              if (!item.data.vendor && group.header!.vendor) {
                item.data.vendor = group.header!.vendor;
              }
              if (!item.data.acquisition_date && group.header!.acquisition_date) {
                item.data.acquisition_date = group.header!.acquisition_date;
              }
            });

            applyCostAllocation(group.header, group.items);
            
            // Add to overall totals for verification
            totalImportInvAmount += parseFloat(group.header.total_inv_amount?.toString().replace(/[^0-9.-]/g, '') || '0');
            totalImportLineCost += group.items.reduce((sum, item) => sum + parseFloat(item.data.line_cost || '0'), 0);
          }
        });

        // Final verification: total_inv_amount = sum(line_cost) for the whole import
        // (Rounding to 2 decimal places to handle floating point issues)
        const diff = Math.abs(Math.round((totalImportInvAmount - totalImportLineCost) * 100) / 100);
        if (diff > 0.01 && totalImportInvAmount > 0) {
          console.warn(`Import total mismatch: Total Inv AMT (${totalImportInvAmount.toFixed(2)}) != Total Line Cost (${totalImportLineCost.toFixed(2)}). Diff: ${diff}`);
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
  const exampleInvoice = [
    '2025-10-10',
    '0-Invoice',
    'Amazon',
    '106.05',
    'Visa',
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
    '',
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
    '2025-10-10',
    '1-Asset',
    'Amazon',
    '',
    '',
    '87.98',
    '95.24',
    '2',
    '43.99',
    '47.62',
    'PowerCon Power Cable 1M',
    'Lighting',
    'Cables',
    'PowerCon Cable',
    'LightBox',
    '',
    '',
    '',
    'FALSE',
    '',
    '50',
    '',
    '',
    '5',
    'MACRS',
    'Active'
  ];
  const exampleExpense = [
    '2025-10-10',
    '2-Expense',
    'Amazon',
    '',
    '',
    '9.99',
    '10.81',
    '1',
    '9.99',
    '10.81',
    'Gaffer Power Black Gaffers Tape 2"x30yd',
    'Supplies',
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
    '',
    ''
  ];

  return Papa.unparse([headers, exampleInvoice, exampleAsset, exampleExpense], { header: false });
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

