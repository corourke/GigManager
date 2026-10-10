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

  // A column added later as default-hidden starts off for a viewer who already chose columns.
  it('keeps a default-hidden column off for a viewer with saved choices from before it existed', () => {
    localStorage.setItem('gw.columns.staffing', JSON.stringify(['phone']));
    const { result } = renderHook(() => useColumnVisibility('staffing', COLUMNS));
    expect(result.current.visible).toEqual(['role']);
  });

  it('remembers a default-hidden column turned on', () => {
    const { result } = renderHook(() => useColumnVisibility('staffing', COLUMNS));
    act(() => result.current.toggle('notes'));
    expect(result.current.isVisible('notes')).toBe(true);
    const again = renderHook(() => useColumnVisibility('staffing', COLUMNS));
    expect(again.result.current.visible).toEqual(['role', 'phone', 'notes']);
    act(() => again.result.current.toggle('notes'));
    const third = renderHook(() => useColumnVisibility('staffing', COLUMNS));
    expect(third.result.current.isVisible('notes')).toBe(false);
  });

  it('ignores unreadable saved state', () => {
    localStorage.setItem('gw.columns.staffing', '{not json');
    const { result } = renderHook(() => useColumnVisibility('staffing', COLUMNS));
    expect(result.current.visible).toEqual(['role', 'phone']);
  });
});
