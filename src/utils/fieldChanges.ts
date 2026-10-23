import type { FieldChange } from './supabase/types';

/**
 * The tracked fields a change touches, for the activity log (#20: shared by asset and kit).
 * A field counts when it's in the new values and differs from before: by value, so arrays such
 * as a kit's tags compare by their contents; scalars as strictly as `!==` (type, and null vs
 * undefined, count).
 */
export function computeFieldChanges<T extends Record<string, any>>(
  preValues: Partial<T>,
  newValues: Partial<T>,
  trackedFields: readonly (keyof T)[]
): FieldChange[] {
  const same = (a: unknown, b: unknown) =>
    a === b || (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null && JSON.stringify(a) === JSON.stringify(b));
  return trackedFields
    .filter(f => f in newValues && !same(newValues[f], preValues[f]))
    .map(f => ({
      field: f as string,
      from: preValues[f],
      to: newValues[f]
    }));
}
