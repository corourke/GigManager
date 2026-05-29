import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle, CreditCard, AlertTriangle, FileText, Receipt, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../ui/collapsible';
import { cn } from '../ui/utils';
import { GigAccountingSummary, PaymentHealth, GigStatus } from '../../utils/supabase/types';
import { GIG_STATUS_CONFIG } from '../../utils/supabase/constants';
import type { GigSection } from './GigAccountingTable';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const formatDateRange = (start: string, end: string) => {
  try {
    const s = new Date(start);
    const e = new Date(end);
    if (s.toDateString() === e.toDateString()) {
      return format(s, 'MMM d, yyyy');
    }
    return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`;
  } catch {
    return start;
  }
};

type HealthConfigEntry = {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
};

const HEALTH_CONFIG: Record<PaymentHealth, HealthConfigEntry> = {
  'all-clear': { icon: CheckCircle2, color: 'text-green-600', label: 'All Clear' },
  'revenue-outstanding': { icon: AlertCircle, color: 'text-amber-500', label: 'Revenue Outstanding' },
  'payments-due': { icon: CreditCard, color: 'text-orange-500', label: 'Payments Due' },
  'both': { icon: AlertTriangle, color: 'text-red-600', label: 'Needs Attention' },
};

const SECTION_HEADER_STYLES: Record<GigSection['id'], string> = {
  'needs-attention': 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100',
  'upcoming': 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100',
  'past-settled': 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100',
};

const SECTION_COUNT_STYLES: Record<GigSection['id'], string> = {
  'needs-attention': 'bg-amber-200 text-amber-800',
  'upcoming': 'bg-blue-200 text-blue-800',
  'past-settled': 'bg-gray-200 text-gray-700',
};

function GigCard({
  gig,
  onNavigateToGigDetail,
}: {
  gig: GigAccountingSummary;
  onNavigateToGigDetail?: (gigId: string) => void;
}) {
  const health = HEALTH_CONFIG[gig.paymentHealth];
  const HealthIcon = health.icon;
  const statusConfig = GIG_STATUS_CONFIG[gig.gigStatus as GigStatus];

  const revenueCardColor =
    gig.contractAmount === 0
      ? 'border-gray-200'
      : gig.received >= gig.contractAmount
        ? 'border-green-500 bg-green-50/30'
        : 'border-amber-500 bg-amber-50/30';

  const profitCardColor =
    gig.profit === 0
      ? 'border-gray-200'
      : gig.profit > 0
        ? 'border-green-500 bg-green-50/30'
        : 'border-red-500 bg-red-50/30';

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 truncate">{gig.gigTitle}</div>
            <div className="text-xs text-gray-500 mt-0.5">{formatDateRange(gig.gigStart, gig.gigEnd)}</div>
            <Badge
              variant="outline"
              className={cn('mt-1 text-xs', statusConfig?.color ?? '')}
            >
              {statusConfig?.label ?? gig.gigStatus}
            </Badge>
          </div>
          <div className={cn('flex-shrink-0 mt-0.5', health.color)} title={health.label}>
            <HealthIcon className="w-5 h-5" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 pt-0">
        <div className="grid grid-cols-3 gap-2">
          <Card className={cn('border-l-4 transition-all', revenueCardColor)}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 px-3 pt-3">
              <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Revenue
              </CardTitle>
              <FileText className="h-3 w-3 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              <div className="text-sm font-bold">{formatCurrency(gig.contractAmount)}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-blue-500 bg-blue-50/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 px-3 pt-3">
              <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Costs
              </CardTitle>
              <Receipt className="h-3 w-3 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              <div className="text-sm font-bold">{formatCurrency(gig.totalCosts)}</div>
            </CardContent>
          </Card>

          <Card className={cn('border-l-4 transition-all', profitCardColor)}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 px-3 pt-3">
              <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {gig.profit >= 0 ? 'Profit' : 'Loss'}
              </CardTitle>
              {gig.profit >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              <div className={cn('text-sm font-bold', gig.profit > 0 ? 'text-green-700' : gig.profit < 0 ? 'text-red-700' : '')}>
                {formatCurrency(gig.profit)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-xs text-gray-500 px-0.5">
          Rcvd {formatCurrency(gig.received)} | Due {formatCurrency(gig.outstandingRevenue)} | Pay {formatCurrency(gig.paymentsToMake)}
        </div>

        <div className="mt-auto pt-1">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onNavigateToGigDetail?.(gig.gigId)}
          >
            View Gig
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionCardGrid({
  section,
  onNavigateToGigDetail,
}: {
  section: GigSection;
  onNavigateToGigDetail?: (gigId: string) => void;
}) {
  const [open, setOpen] = useState(!section.defaultCollapsed);
  const headerStyle = SECTION_HEADER_STYLES[section.id];
  const countStyle = SECTION_COUNT_STYLES[section.id];

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded-lg overflow-hidden mb-4">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn('w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b transition-colors', headerStyle)}
        >
          {open ? (
            <ChevronDown className="w-4 h-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{section.label}</span>
          <span className={cn('ml-1 text-xs font-semibold px-2 py-0.5 rounded-full', countStyle)}>
            {section.gigs.length}
          </span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="p-4">
          {section.gigs.length === 0 ? (
            <p className="text-center text-gray-400 text-sm italic py-4">No gigs</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.gigs.map((gig) => (
                <GigCard
                  key={gig.gigId}
                  gig={gig}
                  onNavigateToGigDetail={onNavigateToGigDetail}
                />
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface GigAccountingCardViewProps {
  sections: GigSection[];
  onNavigateToGigDetail?: (gigId: string) => void;
}

export default function GigAccountingCardView({ sections, onNavigateToGigDetail }: GigAccountingCardViewProps) {
  return (
    <div>
      {sections.map((section) => (
        <SectionCardGrid
          key={section.id}
          section={section}
          onNavigateToGigDetail={onNavigateToGigDetail}
        />
      ))}
    </div>
  );
}
