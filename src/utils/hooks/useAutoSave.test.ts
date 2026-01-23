import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';

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
});
