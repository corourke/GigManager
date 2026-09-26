import type { ReactNode } from 'react';
import { Card } from '../../ui/card';
import { cn } from '../../ui/utils';

interface GigSectionProps {
  title: string;
  /** Short muted summary next to the title (e.g. "3 of 4 filled"). */
  summary?: ReactNode;
  /** Right-aligned controls in the header (e.g. the Columns picker). */
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** One card on the gig page (#12): title row, then content. */
export default function GigSection({ title, summary, actions, className, children }: GigSectionProps) {
  return (
    <Card className={cn('p-4 gap-2.5', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold flex items-center gap-2">
          {title}
          {summary && <span className="text-xs font-normal text-muted-foreground">{summary}</span>}
        </h2>
        {actions}
      </div>
      {children}
    </Card>
  );
}
