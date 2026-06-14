import { useMemo } from 'react';
import { Crown, Shield, User as UserIcon, Mail, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '../ui/badge';
import { ColumnDef } from '../tables/SmartDataTable';
import type { UserRole } from '../../utils/supabase/types';
import type { OrganizationMember, Invitation } from './useTeamData';

export function getRoleIcon(role: UserRole) {
  switch (role) {
    case 'Admin':
      return <Crown className="w-4 h-4 text-amber-600" />;
    case 'Manager':
      return <Shield className="w-4 h-4 text-blue-600" />;
    default:
      return <UserIcon className="w-4 h-4 text-gray-600" />;
  }
}

export function getRoleBadgeColor(role: UserRole) {
  switch (role) {
    case 'Admin':
      return 'bg-amber-100 text-amber-800';
    case 'Manager':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

interface MemberColumnsArgs {
  staffRoleMap: Map<string, string>;
  staffRoleOptions: Array<{ label: string; value: string }>;
  timezoneOptions: Array<{ label: string; value: string }>;
  currentUserId: string;
  canManageTeam: boolean;
}

export function useMemberColumns({
  staffRoleMap,
  staffRoleOptions,
  timezoneOptions,
  currentUserId,
  canManageTeam,
}: MemberColumnsArgs): ColumnDef<OrganizationMember>[] {
  return useMemo<ColumnDef<OrganizationMember>[]>(() => [
    {
      id: 'name',
      header: 'Name',
      accessor: (row) => `${row.user.first_name} ${row.user.last_name}`,
      sortable: true,
      filterable: true,
      editable: canManageTeam,
      type: 'text',
      render: (val, row) => {
        const isCurrentUser = row.user?.id === currentUserId;
        return (
          <div className="flex items-center gap-3">
            {row.user.avatar_url ? (
              <img src={row.user.avatar_url} alt="" className="w-8 h-8 rounded-full border" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 border">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{val || 'Unknown'}</span>
              {isCurrentUser && <Badge variant="outline" className="text-xs">You</Badge>}
            </div>
          </div>
        );
      },
    },
    {
      id: 'email',
      header: 'Email',
      accessor: (row) => row.user.email,
      sortable: true,
      filterable: true,
    },
    {
      id: 'staff_role',
      header: 'Position',
      accessor: 'default_staff_role_id',
      sortable: true,
      filterable: true,
      editable: canManageTeam,
      type: 'select',
      options: staffRoleOptions,
      render: (val) => (
        <span className="text-sm text-gray-600">{val ? staffRoleMap.get(val) || 'None' : 'None'}</span>
      ),
    },
    {
      id: 'role',
      header: 'System Role',
      accessor: 'role',
      sortable: true,
      filterable: true,
      editable: canManageTeam,
      type: 'select',
      options: [
        { label: 'Admin', value: 'Admin' },
        { label: 'Manager', value: 'Manager' },
        { label: 'Staff', value: 'Staff' },
        { label: 'Viewer', value: 'Viewer' },
      ],
      render: (val) => (
        <Badge className={getRoleBadgeColor(val as UserRole)}>
          <div className="flex items-center gap-1">
            {getRoleIcon(val as UserRole)}
            {val}
          </div>
        </Badge>
      ),
    },
    {
      id: 'timezone',
      header: 'Timezone',
      accessor: (row) => row.user.timezone,
      sortable: true,
      filterable: true,
      optional: true,
      editable: canManageTeam,
      type: 'select',
      options: timezoneOptions,
      render: (val) => {
        const tz = timezoneOptions.find((o) => o.value === val);
        return <span className="text-sm text-gray-600">{tz?.label || val || '—'}</span>;
      },
    },
    {
      id: 'last_login',
      header: 'Last Login',
      accessor: (row) => row.user.last_sign_in_at,
      sortable: true,
      render: (_, row) => {
        if (row.user.user_status === 'pending') {
          return (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
              <Clock className="w-3 h-3 mr-1" />
              Pending
            </Badge>
          );
        }
        return (
          <div className="text-sm text-gray-600">
            {row.user.last_sign_in_at
              ? format(new Date(row.user.last_sign_in_at), 'MMM d, h:mm a')
              : 'Never'}
          </div>
        );
      },
    },
  ], [staffRoleMap, staffRoleOptions, timezoneOptions, currentUserId, canManageTeam]);
}

export function useInvitationColumns(): ColumnDef<Invitation>[] {
  return useMemo<ColumnDef<Invitation>[]>(() => [
    {
      id: 'email',
      header: 'Email',
      accessor: 'email',
      sortable: true,
      filterable: true,
      render: (val) => (
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-400" />
          {val}
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      accessor: 'role',
      sortable: true,
      filterable: true,
      render: (val) => <Badge className={getRoleBadgeColor(val as UserRole)}>{val}</Badge>,
    },
    {
      id: 'invited_by',
      header: 'Invited By',
      accessor: (row) =>
        row.invited_by_user ? `${row.invited_by_user.first_name} ${row.invited_by_user.last_name}` : '-',
      sortable: true,
    },
    {
      id: 'expires_at',
      header: 'Expires',
      accessor: 'expires_at',
      sortable: true,
      render: (val) => (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          {format(new Date(val), 'MMM d, yyyy')}
        </div>
      ),
    },
  ], []);
}
