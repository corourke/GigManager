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

  const performSave = useCallback(async (data: T) => {
    setSaveState('saving');
    setError(null);
    try {
      await onSave(data);
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
  }, [onSave]);

  const triggerSave = useCallback((data: T) => {
    dataToSaveRef.current = data;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (dataToSaveRef.current) {
        performSave(dataToSaveRef.current);
      }
    }, debounceMs);
  }, [debounceMs, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    saveState,
    error,
    triggerSave,
  };
}
