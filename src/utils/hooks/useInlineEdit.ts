import { useState, useCallback, useRef } from 'react';

interface InlineEditState {
  editingField: string | null;
  editValue: any;
  saving: boolean;
  error: string | null;
}

interface UseInlineEditOptions {
  onSave?: (field: string, value: any) => Promise<void>;
  onCancel?: (field: string) => void;
}

/**
 * Hook for managing inline editing state and actions
 */
export function useInlineEdit({ onSave, onCancel }: UseInlineEditOptions = {}) {
  const [state, setState] = useState<InlineEditState>({
    editingField: null,
    editValue: null,
    saving: false,
    error: null,
  });

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const isSavingRef = useRef(false);

  // Start editing a field
  const startEdit = useCallback((field: string, currentValue: any = '') => {
    isSavingRef.current = false;
    setState({
      editingField: field,
      editValue: currentValue,
      saving: false,
      error: null,
    });

    // Focus input after state update
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        if (inputRef.current instanceof HTMLInputElement) {
          inputRef.current.select();
        }
      }
    }, 0);
  }, []);

  // Update the edit value
  const updateValue = useCallback((value: any) => {
    setState(prev => ({
      ...prev,
      editValue: value,
      error: null,
    }));
  }, []);

  // Save the edit
  const saveEdit = useCallback(async (): Promise<boolean> => {
    if (isSavingRef.current || !state.editingField) {
      return true; // Already saving or not editing
    }

    try {
      isSavingRef.current = true;
      setState(prev => ({ ...prev, saving: true, error: null }));

      if (onSave) {
        await onSave(state.editingField, state.editValue);
      }

      if (isSavingRef.current) {
        setState({
          editingField: null,
          editValue: null,
          saving: false,
          error: null,
        });
        isSavingRef.current = false;
      }

      return true;
    } catch (error: any) {
      isSavingRef.current = false;
      setState(prev => ({
        ...prev,
        saving: false,
        error: error.message || 'Failed to save',
      }));
      return false;
    }
  }, [state.editingField, state.editValue, onSave]);

  // Cancel the edit
  const cancelEdit = useCallback(() => {
    if (onCancel && state.editingField) {
      onCancel(state.editingField);
    }

    setState({
      editingField: null,
      editValue: null,
      saving: false,
      error: null,
    });
  }, [state.editingField, onCancel]);

  // Check if a field is being edited
  const isEditing = useCallback((field: string) => {
    return state.editingField === field;
  }, [state.editingField]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  return {
    // State
    editingField: state.editingField,
    editValue: state.editValue,
    saving: state.saving,
    error: state.error,

    // Actions
    startEdit,
    updateValue,
    saveEdit,
    cancelEdit,
    isEditing,
    handleKeyDown,

    // Refs
    inputRef,
  };
}
