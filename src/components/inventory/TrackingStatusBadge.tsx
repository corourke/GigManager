import React from 'react';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import { TRACKING_STATUS_CONFIG } from '../../utils/supabase/constants';

interface TrackingStatusBadgeProps {
  status?: string | null;
}

export function TrackingStatusBadge({ status }: TrackingStatusBadgeProps) {
  const config = TRACKING_STATUS_CONFIG[status as keyof typeof TRACKING_STATUS_CONFIG];
  const colorClasses = config?.color ?? 'border-border bg-muted/40 text-muted-foreground';

  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] py-0 h-4 px-1.5 font-normal border', colorClasses)}
    >
      {config?.label ?? status ?? 'Not tracked'}
    </Badge>
  );
}
