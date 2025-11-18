import { useState, useCallback, useRef, useEffect } from 'react';
import { UseFormReturn, FieldPath, FieldValues } from 'react-hook-form';

export interface UseFormWithChangesOptions<T extends FieldValues> {
  form: UseFormReturn<T>;
  initialData?: Partial<T>;
  enableDeepComparison?: boolean;
}

export interface FormChangeState<T extends FieldValues> {
  hasChanges: boolean;
  changedFields: Partial<T>;
  originalData: Partial<T>;
  isDirty: boolean;
}

/**
 * Hook that tracks form changes and provides utilities for change detection
 * and partial updates. Works with react-hook-form.
 */
export function useFormWithChanges<T extends FieldValues>({
  form,
  initialData = {},
  enableDeepComparison = true,
}: UseFormWithChangesOptions<T>) {
  const [originalData, setOriginalData] = useState<Partial<T>>(initialData);
  const [hasChanges, setHasChanges] = useState(false);
  const [changedFields, setChangedFields] = useState<Partial<T>>({});

  // Track if we've manually marked as saved
  const markedAsSavedRef = useRef(false);

  /**
   * Deep equality check for objects and arrays
   */
  const deepEqual = useCallback((a: any, b: any): boolean => {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
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
  }, []);

  /**
   * Get only the fields that have changed from original data
   */
  const getChangedFields = useCallback((): Partial<T> => {
    const currentValues = form.getValues();
    const changes: Partial<T> = {};

    // Check each field in current values
    for (const key in currentValues) {
      if (currentValues.hasOwnProperty(key)) {
        const currentValue = currentValues[key];
        const originalValue = originalData[key];

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
  }, [form, originalData, enableDeepComparison, deepEqual]);

  /**
   * Update the changed fields state
   */
  const updateChangedFields = useCallback(() => {
    const changes = getChangedFields();
    setChangedFields(changes);
    setHasChanges(Object.keys(changes).length > 0);
  }, [getChangedFields]);

  /**
   * Watch for form changes and update change state
   */
  useEffect(() => {
    const subscription = form.watch(() => {
      // Only update if we haven't manually marked as saved
      if (!markedAsSavedRef.current) {
        updateChangedFields();
      }
    });

    return () => subscription.unsubscribe();
  }, [form, updateChangedFields]);

  /**
   * Mark the form as saved - update original data to current values
   */
  const markAsSaved = useCallback((newData?: Partial<T>) => {
    markedAsSavedRef.current = true;

    const currentValues = form.getValues();
    const updatedOriginal = newData || currentValues;

    setOriginalData(updatedOriginal);
    setChangedFields({});
    setHasChanges(false);

    // Reset the ref after a short delay to allow for subsequent changes
    setTimeout(() => {
      markedAsSavedRef.current = false;
    }, 100);
  }, [form]);

  /**
   * Reset form to original data
   */
  const resetToOriginal = useCallback(() => {
    form.reset(originalData as T);
    setChangedFields({});
    setHasChanges(false);
  }, [form, originalData]);

  /**
   * Load new initial data (e.g., when editing existing record)
   */
  const loadInitialData = useCallback((data: Partial<T>) => {
    setOriginalData(data);
    form.reset(data as T);
    setChangedFields({});
    setHasChanges(false);
  }, [form]);

  /**
   * Check if a specific field has changes
   */
  const hasFieldChanged = useCallback((fieldName: FieldPath<T>) => {
    return fieldName in changedFields;
  }, [changedFields]);

  const changeState: FormChangeState<T> = {
    hasChanges,
    changedFields,
    originalData,
    isDirty: form.formState.isDirty,
  };

  return {
    // State
    ...changeState,

    // Actions
    markAsSaved,
    resetToOriginal,
    loadInitialData,
    getChangedFields,
    updateChangedFields,
    hasFieldChanged,

    // Utilities
    deepEqual,
  };
}
