import { describe, it, expect } from 'vitest';
import { canManage, canEditOrganization } from './permissions';

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

describe('canEditOrganization (issue #24/#33)', () => {
  it('lets that org\'s own Admin edit it regardless of claimed status', () => {
    expect(canEditOrganization({ claimed: true }, true, false)).toBe(true);
    expect(canEditOrganization({ claimed: false }, true, false)).toBe(true);
  });
  it('lets any org\'s Admin edit an unclaimed org', () => {
    expect(canEditOrganization({ claimed: false }, false, true)).toBe(true);
  });
  it('denies any org\'s Admin from editing a claimed org they are not Admin of', () => {
    expect(canEditOrganization({ claimed: true }, false, true)).toBe(false);
  });
  it('denies a non-Admin entirely', () => {
    expect(canEditOrganization({ claimed: false }, false, false)).toBe(false);
    expect(canEditOrganization({ claimed: true }, false, false)).toBe(false);
  });
});
