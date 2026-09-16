import { Bell, Check, X, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useAuth } from '../contexts/AuthContext';
import { useNav } from '../routes/useNav';
import { useNotifications, useMarkNotificationRead } from '../hooks/useNotifications';
import type {
  AccessRequestCreatedPayload,
  AccessRequestOutcomePayload,
  InvitationAcceptedPayload,
  Notification,
} from '../utils/supabase/types';

/**
 * Generic notification feed (issue #52): every alert type (access-request
 * events today, health-check failures later) is one row in `notifications`,
 * read/unread. Domain tables like access_requests stay the durable,
 * resolvable record — this is purely the "something happened" side-channel,
 * so an event can go stale relative to a request someone else already
 * resolved. Clicking through and resolving it, or dismissing the notice
 * directly, both mark it read.
 */
export default function NotificationBell() {
  const { user, organizations, selectOrganization } = useAuth();
  const nav = useNav();

  const notificationsQuery = useNotifications(!!user);
  const markRead = useMarkNotificationRead();

  const notifications = notificationsQuery.data ?? [];
  const totalCount = notifications.length;

  const adminMemberships = organizations.filter((m) => m.role === 'Admin');

  const goToAccessRequest = (organizationId: string) => {
    const membership = adminMemberships.find((m) => m.organization.id === organizationId);
    if (membership) {
      selectOrganization(membership.organization);
      nav.toTeam();
    } else {
      nav.toModeratorQueue();
    }
  };

  const goToOrgTeam = (organizationId: string) => {
    const membership = organizations.find((m) => m.organization.id === organizationId);
    if (membership) selectOrganization(membership.organization);
    nav.toTeam();
  };

  const handleCreatedClick = (notification: Notification) => {
    const payload = notification.payload as AccessRequestCreatedPayload;
    markRead.mutate(notification.id);
    goToAccessRequest(payload.organization_id);
  };

  const handleInvitationAcceptedClick = (notification: Notification) => {
    const payload = notification.payload as InvitationAcceptedPayload;
    markRead.mutate(notification.id);
    goToOrgTeam(payload.organization_id);
  };

  const handleDismiss = (notification: Notification) => {
    markRead.mutate(notification.id);
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-accent transition-colors" aria-label="Notifications">
          <Bell className="w-5 h-5 text-foreground" />
          {totalCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-destructive text-white text-xs">
              {totalCount > 9 ? '9+' : totalCount}
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {totalCount === 0 && (
          <div className="px-2 py-4 text-sm text-muted-foreground text-center">You're all caught up.</div>
        )}

        {notifications.map((notification) => {
          const isPending = markRead.isPending && markRead.variables === notification.id;

          if (notification.type === 'access_request.created') {
            const payload = notification.payload as AccessRequestCreatedPayload;
            return (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => handleCreatedClick(notification)}
                className="flex items-start gap-2 whitespace-normal"
              >
                <div className="flex-1">
                  <p className="text-sm">
                    <strong>{payload.requester_name}</strong> requested <strong>{payload.requested_role}</strong>{' '}
                    on {payload.organization_name}.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                {isPending && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
              </DropdownMenuItem>
            );
          }

          if (notification.type === 'access_request.outcome') {
            const payload = notification.payload as AccessRequestOutcomePayload;
            return (
              <DropdownMenuItem
                key={notification.id}
                onSelect={(e) => {
                  e.preventDefault();
                  handleDismiss(notification);
                }}
                className="flex items-start gap-2 whitespace-normal"
              >
                {payload.status === 'approved' ? (
                  <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm">
                    Your request for <strong>{payload.requested_role}</strong> on {payload.organization_name} was{' '}
                    {payload.status}.
                  </p>
                  {payload.response_message && (
                    <p className="text-xs text-muted-foreground mt-1">{payload.response_message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                {isPending && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
              </DropdownMenuItem>
            );
          }

          if (notification.type === 'invitation.accepted') {
            const payload = notification.payload as InvitationAcceptedPayload;
            return (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => handleInvitationAcceptedClick(notification)}
                className="flex items-start gap-2 whitespace-normal"
              >
                <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm">
                    <strong>{payload.accepted_user_name}</strong> accepted your invitation to{' '}
                    {payload.organization_name}.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                {isPending && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
              </DropdownMenuItem>
            );
          }

          return null;
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
