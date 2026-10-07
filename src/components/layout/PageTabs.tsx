import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../ui/utils';

/**
 * The one tab style for page navigation (#39): underlined, 40 px, sitting in
 * `PageHeader`'s `tabs` slot. Use inside the page's `Tabs` root (`ui/tabs`).
 * The boxed `ui/tabs` TabsList is for in-content toggles only (Upcoming/Past).
 */
function PageTabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="page-tabs-list"
      className={cn('flex h-10 items-stretch gap-6', className)}
      {...props}
    />
  );
}

function PageTabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="page-tabs-trigger"
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-0.5 text-sm font-medium text-gray-700 transition-colors hover:text-gray-900',
        'data-[state=active]:border-sky-700 data-[state=active]:font-semibold data-[state=active]:text-sky-700',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:pointer-events-none disabled:opacity-50',
        '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
        className,
      )}
      {...props}
    />
  );
}

export { PageTabsList, PageTabsTrigger };
