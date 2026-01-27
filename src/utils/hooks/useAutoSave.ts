import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions<T> {
  gigId: string;
  onSave: (data: T) => Promise<void>;
  onSuccess?: (data: T) => void;
  debounceMs?: number;
}

interface UseAutoSaveReturn<T> {
  saveState: SaveState;
  error: Error | null;
  triggerSave: (data: T) => void;
  flush: () => void;
}

export function useAutoSave<T>({
  gigId,
  onSave,
  onSuccess,
  debounceMs = 500,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn<T> {
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dataToSaveRef = useRef<T | null>(null);
  const lastSavedDataRef = useRef<string>('');

  const performSave = useCallback(async (data: T) => {
    const dataString = JSON.stringify(data);
    if (dataString === lastSavedDataRef.current) {
      return;
    }

    setSaveState('saving');
    setError(null);
    try {
      await onSave(data);
      lastSavedDataRef.current = dataString;
      setSaveState('saved');
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSaveState((current) => (current === 'saved' ? 'idle' : current));
      }, 2000);
    } catch (err: any) {
      console.error('Auto-save error:', err);
      setSaveState('error');
      setError(err);
      toast.error(err.message || 'Failed to auto-save changes');
    }
  }, [onSave, onSuccess]);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      if (dataToSaveRef.current) {
        performSave(dataToSaveRef.current);
      }
    }
  }, [performSave]);

  const triggerSave = useCallback((data: T) => {
    dataToSaveRef.current = data;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      if (dataToSaveRef.current) {
        performSave(dataToSaveRef.current);
      }
    }, debounceMs);
  }, [debounceMs, performSave]);

  // Cleanup on unmount - trigger save if pending
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        if (dataToSaveRef.current) {
          // Note: performSave is async and we are unmounting,
          // but the promise will still execute.
          performSave(dataToSaveRef.current);
        }
      }
    };
  }, [performSave]);

  return {
    saveState,
    error,
    triggerSave,
    flush,
  };
}
