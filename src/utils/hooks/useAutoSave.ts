import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export type SaveResult = { ok: true } | { ok: false; error: Error };

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
  flushAsync: () => Promise<void>;
  /** Save now, skipping the debounce; resolves to whether it succeeded, and why not. */
  saveNow: (data: T) => Promise<SaveResult>;
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
  // The last payload that failed. A debounced save skips an identical payload, so a
  // re-render of a still-dirty form doesn't retry a doomed save (and re-toast) forever.
  const lastFailedDataRef = useRef<string | null>(null);

  const performSave = useCallback(async (data: T): Promise<SaveResult> => {
    const dataString = JSON.stringify(data);
    if (dataString === lastSavedDataRef.current) {
      return { ok: true };
    }

    setSaveState('saving');
    setError(null);
    try {
      await onSave(data);
      lastSavedDataRef.current = dataString;
      lastFailedDataRef.current = null;
      setSaveState('saved');
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      setTimeout(() => {
        setSaveState((current) => (current === 'saved' ? 'idle' : current));
      }, 2000);
      return { ok: true };
    } catch (err: any) {
      console.error('Auto-save error:', err);
      setSaveState('error');
      setError(err);
      toast.error(err.message || 'Failed to auto-save changes');
      lastFailedDataRef.current = dataString;
      return { ok: false, error: err };
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

  const flushAsync = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      if (dataToSaveRef.current) {
        await performSave(dataToSaveRef.current);
      }
    }
  }, [performSave]);

  const triggerSave = useCallback((data: T) => {
    if (JSON.stringify(data) === lastFailedDataRef.current) {
      return;
    }
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

  const saveNow = useCallback(async (data: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    dataToSaveRef.current = null;
    return performSave(data);
  }, [performSave]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        if (dataToSaveRef.current) {
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
    flushAsync,
    saveNow,
  };
}
