/**
 * Form utilities for data normalization and submission
 */

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
 * Extract only the fields that have changed from original data
 * Uses simple shallow comparison for better performance
 */
export function getChangedFields<T extends Record<string, any>>(
  current: Partial<T>,
  original: Partial<T>
): Partial<T> {
  const changes: Partial<T> = {};

  for (const key in current) {
    if (current.hasOwnProperty(key)) {
      if (current[key] !== original[key]) {
        changes[key] = current[key];
      }
    }
  }

  return changes;
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
  const { normalize = true, deepCompare = false } = options; // Changed default to false for simplicity

  let dataToCompare = currentData;
  if (normalize) {
    dataToCompare = normalizeFormData(currentData);
  }

  // Use the standalone getChangedFields function
  return getChangedFields(dataToCompare, originalData);
}

