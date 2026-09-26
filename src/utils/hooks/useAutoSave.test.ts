import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave, type SaveResult } from './useAutoSave';

describe('useAutoSave', () => {
  const mockOnSave = vi.fn().mockResolvedValue(undefined);
  const gigId = 'test-gig-id';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with idle state', () => {
    const { result } = renderHook(() => useAutoSave({ gigId, onSave: mockOnSave }));
    expect(result.current.saveState).toBe('idle');
    expect(result.current.error).toBe(null);
  });

  it('debounces the save call', async () => {
    const { result } = renderHook(() => useAutoSave({ gigId, onSave: mockOnSave, debounceMs: 500 }));
    
    act(() => {
      result.current.triggerSave({ title: 'New Title' });
    });

    expect(mockOnSave).not.toHaveBeenCalled();
    expect(result.current.saveState).toBe('idle');

    act(() => {
      vi.advanceTimersByTime(300);
      result.current.triggerSave({ title: 'Updated Title' });
    });

    expect(mockOnSave).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave).toHaveBeenCalledWith({ title: 'Updated Title' });
  });

  it('handles successful save cycle', async () => {
    const { result } = renderHook(() => useAutoSave({ gigId, onSave: mockOnSave }));
    
    await act(async () => {
      result.current.triggerSave({ title: 'Test' });
      vi.advanceTimersByTime(500);
    });

    expect(result.current.saveState).toBe('saved');

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.saveState).toBe('idle');
  });

  it('handles save errors', async () => {
    const testError = new Error('Save failed');
    const failingSave = vi.fn().mockRejectedValue(testError);
    const { result } = renderHook(() => useAutoSave({ gigId, onSave: failingSave }));
    
    await act(async () => {
      result.current.triggerSave({ title: 'Test' });
      vi.advanceTimersByTime(500);
    });

    expect(result.current.saveState).toBe('error');
    expect(result.current.error).toBe(testError);
  });

  it('does not re-send a debounced payload identical to the last one that failed (issue #71)', async () => {
    const failingSave = vi.fn().mockRejectedValue(new Error('invalid input value for enum'));
    const { result } = renderHook(() => useAutoSave({ gigId, onSave: failingSave }));

    await act(async () => {
      result.current.triggerSave({ title: 'Bad' });
      vi.advanceTimersByTime(500);
    });
    expect(failingSave).toHaveBeenCalledTimes(1);

    // A re-render re-triggers the same dirty payload: it must not retry.
    await act(async () => {
      result.current.triggerSave({ title: 'Bad' });
      vi.advanceTimersByTime(500);
    });
    expect(failingSave).toHaveBeenCalledTimes(1);

    // Once the user changes something, saving resumes.
    await act(async () => {
      result.current.triggerSave({ title: 'Fixed' });
      vi.advanceTimersByTime(500);
    });
    expect(failingSave).toHaveBeenCalledTimes(2);
  });

  it('saveNow saves immediately and reports whether it succeeded', async () => {
    const onSave = vi.fn().mockRejectedValueOnce(new Error('nope')).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave({ gigId, onSave }));

    let res: SaveResult | undefined;
    await act(async () => {
      res = await result.current.saveNow({ title: 'A' });
    });
    expect(res).toEqual({ ok: false, error: new Error('nope') });

    // An explicit save retries even an identical payload.
    await act(async () => {
      res = await result.current.saveNow({ title: 'A' });
    });
    expect(res).toEqual({ ok: true });
    expect(onSave).toHaveBeenCalledTimes(2);
  });
});

