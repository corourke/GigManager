import { useState, useCallback, useRef, useEffect } from 'react';
import { UseFormReturn, FieldPath, FieldValues } from 'react-hook-form';

export interface UseFormWithChangesOptions<T extends FieldValues> {
  form?: UseFormReturn<T>; // Optional for manual state management
  initialData?: Partial<T>;
  enableDeepComparison?: boolean;
  currentData?: Partial<T>; // For manual state management
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
  currentData,
}: UseFormWithChangesOptions<T>) {
  const [originalData, setOriginalData] = useState<Partial<T>>(initialData);
  const [hasChanges, setHasChanges] = useState(false);
  const [changedFields, setChangedFields] = useState<Partial<T>>({});

  // Track if we've manually marked as saved
  const markedAsSavedRef = useRef(false);

  /**
   * Deep equality check for objects and arrays
   * Handles Date objects by comparing their time values
   */
  const deepEqual = useCallback((a: any, b: any): boolean => {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;

    // Handle Date objects - compare by time value
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    if (a instanceof Date || b instanceof Date) return false;

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
   * Get current values from form or currentData
   * When form is provided, always use form.getValues() for form fields
   * and merge with currentData for nested data that's not in the form
   */
  const getCurrentValues = useCallback((): Partial<T> => {
    if (form) {
      // When form is provided, always get values directly from form (most up-to-date)
      // This ensures we always have the latest form values, not stale memoized values
      const formValues = form.getValues();
      
      // Merge with currentData to include nested data (like staffSlots, participants, etc.)
      // that might not be in the form. Since currentData may include formValues,
      // we prioritize the fresh form.getValues() and only add fields from currentData
      // that aren't already in formValues
      if (currentData) {
        // Get form field names to identify what's a form field vs nested data
        const formFieldNames = new Set(Object.keys(formValues));
        
        // Extract nested data fields from currentData (fields not in form)
        const nestedData: Partial<T> = {};
        for (const key in currentData) {
          if (currentData.hasOwnProperty(key) && !formFieldNames.has(key)) {
            nestedData[key] = currentData[key];
          }
        }
        return { ...formValues, ...nestedData };
      }
      return formValues;
    }
    // For manual state management, use currentData
    return currentData || {};
  }, [currentData, form]);

  /**
   * Get only the fields that have changed from original data
   */
  const getChangedFields = useCallback((): Partial<T> => {
    const currentValues = getCurrentValues();
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
  }, [getCurrentValues, originalData, enableDeepComparison, deepEqual]);

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
    if (form) {
      const subscription = form.watch(() => {
        // Only update if we haven't manually marked as saved
        if (!markedAsSavedRef.current) {
          updateChangedFields();
        }
      });
      return () => subscription.unsubscribe();
    } else if (currentData) {
      // For manual state management, update when currentData changes
      updateChangedFields();
    }
  }, [form, currentData, updateChangedFields]);

  /**
   * Mark the form as saved - update original data to current values
   */
  const markAsSaved = useCallback((newData?: Partial<T>) => {
    markedAsSavedRef.current = true;

    const currentValues = getCurrentValues();
    const updatedOriginal = newData || currentValues;

    setOriginalData(updatedOriginal);
    setChangedFields({});
    setHasChanges(false);

    // Reset the ref after a short delay to allow for subsequent changes
    setTimeout(() => {
      markedAsSavedRef.current = false;
    }, 100);
  }, [getCurrentValues]);

  /**
   * Reset form to original data
   */
  const resetToOriginal = useCallback(() => {
    if (form) {
      form.reset(originalData as T);
    }
    setChangedFields({});
    setHasChanges(false);
  }, [form, originalData]);

  /**
   * Load new initial data (e.g., when editing existing record)
   */
  const loadInitialData = useCallback((data: Partial<T>) => {
    setOriginalData(data);
    if (form) {
      form.reset(data as T);
    }
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
    isDirty: form?.formState.isDirty || false,
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
