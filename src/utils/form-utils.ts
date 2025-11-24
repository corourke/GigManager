/**
 * Form utilities for change detection, normalization, and validation
 */

/**
 * Deep equality check for objects and arrays
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  // Treat null and undefined as equal for form comparison purposes
  if ((a == null && b == null) || (a === null && b === undefined) || (a === undefined && b === null)) {
    return true;
  }
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Extract only the fields that have changed from original data
 */
export function getChangedFields<T extends Record<string, any>>(
  current: Partial<T>,
  original: Partial<T>,
  enableDeepComparison = true
): Partial<T> {
  const changes: Partial<T> = {};

  for (const key in current) {
    if (current.hasOwnProperty(key)) {
      const currentValue = current[key];
      const originalValue = original[key];

      if (enableDeepComparison) {
        if (!deepEqual(currentValue, originalValue)) {
          changes[key] = currentValue;
        }
      } else {
        if (currentValue !== originalValue) {
          changes[key] = currentValue;
        }
      }
    }
  }

  return changes;
}

/**
 * Normalize form data for submission (handle nulls, empty strings, etc.)
 */
export function normalizeFormData<T extends Record<string, any>>(data: T): T {
  const normalized = { ...data };

  for (const key in normalized) {
    if (normalized.hasOwnProperty(key)) {
      let value = normalized[key];

      // Trim strings first
      if (typeof value === 'string') {
        value = value.trim();
      }

      // Convert empty strings to null for optional fields (after trimming)
      if (value === '') {
        value = null;
      }

      // Handle arrays
      if (Array.isArray(value)) {
        value = value.filter(item =>
          item !== null && item !== undefined && item !== ''
        ) as any;
      }

      normalized[key] = value as any;
    }
  }

  return normalized;
}

/**
 * Create a submission payload with only changed fields
 */
export function createSubmissionPayload<T extends Record<string, any>>(
  currentData: T,
  originalData: Partial<T> = {},
  options: {
    normalize?: boolean;
    deepCompare?: boolean;
  } = {}
): Partial<T> {
  const { normalize = true, deepCompare = true } = options;

  let dataToCompare = currentData;
  if (normalize) {
    dataToCompare = normalizeFormData(currentData);
  }

  const changes = getChangedFields(dataToCompare, originalData, deepCompare);
  return changes;
}

/**
 * Check if form data has any changes
 */
export function hasFormChanges<T extends Record<string, any>>(
  current: Partial<T>,
  original: Partial<T> = {},
  enableDeepComparison = true
): boolean {
  const changes = getChangedFields(current, original, enableDeepComparison);
  return Object.keys(changes).length > 0;
}

/**
 * Validate form data against a schema (placeholder for now)
 * In a real implementation, this would integrate with zod or similar
 */
export function validateForm<T extends Record<string, any>>(
  data: T,
  schema?: any
): { isValid: boolean; errors: Record<string, string> } {
  // Basic validation - check required fields
  const errors: Record<string, string> = {};

  // This is a placeholder. In practice, you'd use zod or similar
  // For now, just check that required fields aren't null/undefined/empty

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Format field name for display (convert camelCase to Title Case)
 */
export function formatFieldName(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Get field value for display (handle null/undefined)
 */
export function formatFieldValue(value: any): string {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

/**
 * Create optimistic update payload for UI updates
 */
export function createOptimisticUpdate<T extends Record<string, any>>(
  currentData: T,
  updates: Partial<T>
): T {
  return {
    ...currentData,
    ...updates,
    updated_at: new Date().toISOString(),
  };
}
