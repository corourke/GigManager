import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
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
import { queryKeys } from '../lib/queryKeys';
import { getOrgAccessRequests } from '../services/accessRequest.service';
import {
  useMyAccessRequests,
  useModeratorAccessRequests,
  useMarkAccessRequestSeen,
  ACCESS_REQUEST_REFRESH,
} from '../hooks/useAccessRequests';

/**
 * Access-request notifications (issue #33/#45): the requester's own
 * approved/rejected outcomes, plus a live count of pending items the viewer
 * can act on (as an org Admin, across every org they administer, and/or as a
 * platform moderator). No separate generic notifications table — this reads
 * access_requests directly, same as the Team screen and moderator queue.
 */
export default function NotificationBell() {
  const { user, organizations, selectOrganization } = useAuth();
  const nav = useNav();

  const myRequestsQuery = useMyAccessRequests(!!user);
  const markSeen = useMarkAccessRequestSeen();

  const adminMemberships = useMemo(
    () => organizations.filter((m) => m.role === 'Admin'),
    [organizations]
  );
  // Shares the same query key/cache as Team screen's useOrgAccessRequests, so
  // visiting Team for one of these orgs doesn't re-fetch.
  const orgRequestsQueries = useQueries({
    queries: adminMemberships.map((m) => ({
      queryKey: queryKeys.orgAccessRequests(m.organization.id),
      queryFn: () => getOrgAccessRequests(m.organization.id),
      enabled: !!user,
      ...ACCESS_REQUEST_REFRESH,
    })),
  });
  const orgPendingCount = orgRequestsQueries.reduce((sum, q) => sum + (q.data?.length ?? 0), 0);
  const firstOrgWithPending = adminMemberships.find(
    (m, i) => (orgRequestsQueries[i]?.data?.length ?? 0) > 0
  );

  const moderatorRequestsQuery = useModeratorAccessRequests(!!user?.platform_moderator);
  const moderatorPendingCount = moderatorRequestsQuery.data?.length ?? 0;

  const outcomeNotices = (myRequestsQuery.data ?? []).filter(
    (r) => r.status !== 'pending' && !r.requester_seen_at
  );

  const totalCount = outcomeNotices.length + orgPendingCount + moderatorPendingCount;

  const goToOrgRequests = () => {
    if (firstOrgWithPending) selectOrganization(firstOrgWithPending.organization);
    nav.toTeam();
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

        {orgPendingCount > 0 && (
          <DropdownMenuItem onClick={goToOrgRequests}>
            {orgPendingCount} access {orgPendingCount === 1 ? 'request needs' : 'requests need'} your review
          </DropdownMenuItem>
        )}

        {moderatorPendingCount > 0 && (
          <DropdownMenuItem onClick={nav.toModeratorQueue}>
            {moderatorPendingCount} unclaimed-org access {moderatorPendingCount === 1 ? 'request needs' : 'requests need'} moderator review
          </DropdownMenuItem>
        )}

        {(orgPendingCount > 0 || moderatorPendingCount > 0) && outcomeNotices.length > 0 && (
          <DropdownMenuSeparator />
        )}

        {outcomeNotices.map((notice) => (
          <DropdownMenuItem
            key={notice.id}
            onSelect={(e) => {
              e.preventDefault();
              markSeen.mutate(notice.id);
            }}
            className="flex items-start gap-2 whitespace-normal"
          >
            {notice.status === 'approved' ? (
              <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
            ) : (
              <X className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            )}
            <div className="flex-1">
              <p className="text-sm">
                Your request for <strong>{notice.requested_role}</strong> on {notice.organization.name} was{' '}
                {notice.status}.
              </p>
              {notice.response_message && (
                <p className="text-xs text-muted-foreground mt-1">{notice.response_message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {notice.handled_at ? formatDistanceToNow(new Date(notice.handled_at), { addSuffix: true }) : ''}
              </p>
            </div>
            {markSeen.isPending && markSeen.variables === notice.id && (
              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
