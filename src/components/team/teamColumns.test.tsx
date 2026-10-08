import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useMemberColumns } from './teamColumns';
import type { UserRole } from '../../utils/supabase/types';
import type { OrganizationMember } from './useTeamData';

const member = (userId: string, role: UserRole) =>
  ({ id: `m-${userId}`, role, user: { id: userId } }) as unknown as OrganizationMember;

function roleColumn(currentUserRole: UserRole) {
  const { result } = renderHook(() =>
    useMemberColumns({
      staffRoleMap: new Map(),
      staffRoleOptions: [],
      timezoneOptions: [],
      currentUserId: 'me',
      currentUserRole,
      canManageTeam: currentUserRole === 'Admin' || currentUserRole === 'Manager',
    }),
  );
  return result.current.find((c) => c.id === 'role')!;
}

describe('useMemberColumns — System Role cell', () => {
  it('does not offer Admin to a Manager', () => {
    expect(roleColumn('Manager').options?.map((o) => o.value)).toEqual(['Manager', 'Staff', 'Viewer']);
  });

  it('offers Admin to an Admin', () => {
    expect(roleColumn('Admin').options?.map((o) => o.value)).toEqual(['Admin', 'Manager', 'Staff', 'Viewer']);
  });

  it('does not let you edit your own role inline', () => {
    expect(roleColumn('Admin').isEditable?.(member('me', 'Admin'))).toBe(false);
    expect(roleColumn('Manager').isEditable?.(member('me', 'Manager'))).toBe(false);
  });

  it("does not let a Manager edit an Admin's role inline", () => {
    expect(roleColumn('Manager').isEditable?.(member('other', 'Admin'))).toBe(false);
    expect(roleColumn('Manager').isEditable?.(member('other', 'Staff'))).toBe(true);
    expect(roleColumn('Admin').isEditable?.(member('other', 'Admin'))).toBe(true);
  });
});
