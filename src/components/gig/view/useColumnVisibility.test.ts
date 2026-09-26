import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useColumnVisibility } from './useColumnVisibility';

const COLUMNS = [
  { key: 'role', label: 'Role', required: true },
  { key: 'phone', label: 'Phone' },
  { key: 'notes', label: 'Notes', defaultHidden: true },
] as const;

describe('useColumnVisibility (#12 Columns picker)', () => {
  beforeEach(() => localStorage.clear());

  it('shows every column except the default-hidden ones', () => {
    const { result } = renderHook(() => useColumnVisibility('staffing', COLUMNS));
    expect(result.current.visible).toEqual(['role', 'phone']);
  });

  it('hides a column and remembers it per table', () => {
    const { result } = renderHook(() => useColumnVisibility('staffing', COLUMNS));
    act(() => result.current.toggle('phone'));
    expect(result.current.isVisible('phone')).toBe(false);
    const again = renderHook(() => useColumnVisibility('staffing', COLUMNS));
    expect(again.result.current.isVisible('phone')).toBe(false);
    const other = renderHook(() => useColumnVisibility('participants', COLUMNS));
    expect(other.result.current.isVisible('phone')).toBe(true);
  });

  it('never hides a required column', () => {
    const { result } = renderHook(() => useColumnVisibility('staffing', COLUMNS));
    act(() => result.current.toggle('role'));
    expect(result.current.isVisible('role')).toBe(true);
  });

  it('ignores unreadable saved state', () => {
    localStorage.setItem('gw.columns.staffing', '{not json');
    const { result } = renderHook(() => useColumnVisibility('staffing', COLUMNS));
    expect(result.current.visible).toEqual(['role', 'phone']);
  });
});
