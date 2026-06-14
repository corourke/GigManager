import { describe, it, expect } from 'vitest';
import { canManage } from './permissions';

describe('canManage', () => {
  it('allows Admin and Manager', () => {
    expect(canManage('Admin')).toBe(true);
    expect(canManage('Manager')).toBe(true);
  });

  it('denies Staff, Viewer, and missing role', () => {
    expect(canManage('Staff')).toBe(false);
    expect(canManage('Viewer')).toBe(false);
    expect(canManage(undefined)).toBe(false);
    expect(canManage(null)).toBe(false);
  });
});
