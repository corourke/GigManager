import { describe, it, expect } from 'vitest';
import { canManage, canEditOrganization, canAssignRole } from './permissions';

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

describe('canAssignRole', () => {
  it('lets an Admin give any role', () => {
    for (const role of ['Admin', 'Manager', 'Staff', 'Viewer'] as const) {
      expect(canAssignRole('Admin', role)).toBe(true);
    }
  });
  it('lets a Manager give any role but Admin', () => {
    expect(canAssignRole('Manager', 'Admin')).toBe(false);
    expect(canAssignRole('Manager', 'Manager')).toBe(true);
    expect(canAssignRole('Manager', 'Staff')).toBe(true);
    expect(canAssignRole('Manager', 'Viewer')).toBe(true);
  });
  it('denies Staff, Viewer, and missing role', () => {
    expect(canAssignRole('Staff', 'Viewer')).toBe(false);
    expect(canAssignRole('Viewer', 'Viewer')).toBe(false);
    expect(canAssignRole(undefined, 'Staff')).toBe(false);
    expect(canAssignRole(null, 'Staff')).toBe(false);
  });
});
