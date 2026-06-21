import { formatDistanceToNow } from 'date-fns';
import { Loader2 } from 'lucide-react';
import type { ActivityLogEntry } from '../utils/supabase/types';
import { formatActivityEvent } from '../utils/activityLog.utils';

interface ActivityFeedProps {
  entries: ActivityLogEntry[];
  isLoading: boolean;
}

export default function ActivityFeed({ entries, isLoading }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-muted mt-2 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-2/3" />
              <div className="h-2.5 bg-muted rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="w-4 h-4 opacity-0" />
        No recent activity.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const actor = entry.context.actor_display_name ?? '—';
        const org = entry.context.actor_org_name ?? '';
        const description = formatActivityEvent(entry);
        const timeAgo = formatDistanceToNow(new Date(entry.occurred_at), { addSuffix: true });

        return (
          <div key={entry.id} className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary/50 mt-2 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                {actor}{org ? ` · ${org}` : ''}
              </p>
              <p className="text-sm text-foreground">{description}</p>
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
