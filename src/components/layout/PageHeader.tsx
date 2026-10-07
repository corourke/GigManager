import React from 'react';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { cn } from '../ui/utils';

/**
 * The page header every web screen uses (#39). One white band under the top
 * bar, in a fixed order:
 *
 *   [slot] Title  badge  meta ............................ actions
 *          Tab · Tab · Tab                       (optional, one row only)
 *
 * The slot is always rendered, so the title lands in the same place on every
 * page. It holds Back on pages you drill into, otherwise the section icon.
 * Nothing goes above the title. See docs/design/STYLE_GUIDE.md, "Page layout".
 */
export interface PageHeaderBack {
  /** Accessible name and tooltip, e.g. "Back to Gigs". */
  label: string;
  onClick: () => void;
}

export interface PageHeaderProps {
  /** The page's name, rendered as its h1. */
  title?: React.ReactNode;
  /**
   * Replaces the title, badge and meta with custom content in the same place,
   * e.g. the gig page's editable title in edit mode.
   */
  heading?: React.ReactNode;
  /** Section icon for top-level pages. Ignored when `back` is set. */
  icon?: LucideIcon;
  /** Slot colours for the icon; defaults to sky. */
  iconClassName?: string;
  back?: PageHeaderBack;
  /** A status badge after the title. */
  badge?: React.ReactNode;
  /** One line of facts after the title (a gig's date and venue). Not a description. */
  meta?: React.ReactNode;
  /** Buttons on the right of the title row. */
  actions?: React.ReactNode;
  /** One row of tabs below the title: a `PageTabsList` inside the page's `Tabs`. */
  tabs?: React.ReactNode;
  /** Band overrides, e.g. the gig page's edit-mode colours. */
  className?: string;
}

export function PageHeader({
  title,
  heading,
  icon: Icon,
  iconClassName,
  back,
  badge,
  meta,
  actions,
  tabs,
  className,
}: PageHeaderProps) {
  return (
    <div data-slot="page-header" className={cn('bg-white border-b border-gray-200', className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div data-testid="page-header-title-row" className="flex min-h-16 items-center gap-3 py-3">
          <div data-testid="page-header-slot" className="flex h-8 w-8 flex-none items-center justify-center">
            {back ? (
              <button
                type="button"
                onClick={back.onClick}
                aria-label={back.label}
                title={back.label}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-sky-700 transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
              >
                <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
            ) : Icon ? (
              <span
                aria-hidden="true"
                className={cn('flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700', iconClassName)}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
            ) : null}
          </div>
          {heading ? (
            <div className="min-w-0 flex-1">{heading}</div>
          ) : (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="truncate text-[22px] font-bold leading-7 text-gray-900">{title}</h1>
              {badge}
              {meta && <div className="text-sm text-gray-600">{meta}</div>}
            </div>
          )}
          {actions && <div className="flex flex-none flex-wrap items-center justify-end gap-2">{actions}</div>}
        </div>
        {tabs && <div className="-mt-1 overflow-x-auto pl-11">{tabs}</div>}
      </div>
    </div>
  );
}
