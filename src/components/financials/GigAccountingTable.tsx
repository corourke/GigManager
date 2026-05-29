import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle, CreditCard, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../ui/collapsible';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table';
import { Badge } from '../ui/badge';
import { GigAccountingSummary, PaymentHealth, GigStatus } from '../../utils/supabase/types';
import { GIG_STATUS_CONFIG } from '../../utils/supabase/constants';
import GigAccountingRowDetail from './GigAccountingRowDetail';

export interface GigSection {
  id: 'needs-attention' | 'upcoming' | 'past-settled';
  label: string;
  gigs: GigAccountingSummary[];
  defaultCollapsed: boolean;
}

interface GigAccountingTableProps {
  sections: GigSection[];
  onNavigateToGigDetail?: (gigId: string) => void;
  organizationId?: string;
}

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

function GigTableRow({
  gig,
  onNavigateToGigDetail,
  organizationId,
}: {
  gig: GigAccountingSummary;
  onNavigateToGigDetail?: (gigId: string) => void;
  organizationId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const health = HEALTH_CONFIG[gig.paymentHealth];
  const HealthIcon = health.icon;
  const statusConfig = GIG_STATUS_CONFIG[gig.gigStatus as GigStatus];

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => onNavigateToGigDetail?.(gig.gigId)}
      >
        <TableCell className="max-w-[220px]">
          <div className="font-semibold text-gray-900 truncate">{gig.gigTitle}</div>
          <div className="text-xs text-gray-500 mt-0.5">{formatDateRange(gig.gigStart, gig.gigEnd)}</div>
          <Badge
            variant="outline"
            className={`mt-1 text-xs ${statusConfig?.color ?? ''}`}
          >
            {statusConfig?.label ?? gig.gigStatus}
          </Badge>
        </TableCell>

        <TableCell>
          <div className="font-medium text-gray-900">{formatCurrency(gig.contractAmount)}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            Rcvd: {formatCurrency(gig.received)} / Due: {formatCurrency(gig.outstandingRevenue)}
          </div>
        </TableCell>

        <TableCell>
          <div className="font-medium text-gray-900">{formatCurrency(gig.totalCosts)}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            Actual: {formatCurrency(gig.actualCosts)} / Staff: {formatCurrency(gig.expectedStaffCosts)} / Sub: {formatCurrency(gig.expectedSubContractCosts)}
          </div>
        </TableCell>

        <TableCell>
          <div className={`font-medium ${gig.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {formatCurrency(gig.profit)}
          </div>
          <span
            className={`inline-block mt-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
              gig.margin >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
            }`}
          >
            {gig.margin.toFixed(1)}%
          </span>
        </TableCell>

        <TableCell>
          <div className="flex items-center gap-1.5">
            <HealthIcon className={`w-4 h-4 flex-shrink-0 ${health.color}`} />
            <span className={`text-xs ${health.color}`}>{health.label}</span>
          </div>
        </TableCell>

        <TableCell
          className="text-gray-400 hover:text-gray-700 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </TableCell>
      </TableRow>

      {expanded && (
        <GigAccountingRowDetail
          gig={gig}
          organizationId={organizationId}
          onNavigateToGigDetail={onNavigateToGigDetail}
        />
      )}
    </>
  );
}

function SectionTable({
  section,
  onNavigateToGigDetail,
  organizationId,
}: {
  section: GigSection;
  onNavigateToGigDetail?: (gigId: string) => void;
  organizationId?: string;
}) {
  const [open, setOpen] = useState(!section.defaultCollapsed);
  const headerStyle = SECTION_HEADER_STYLES[section.id];
  const countStyle = SECTION_COUNT_STYLES[section.id];

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded-lg overflow-hidden mb-4">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b transition-colors ${headerStyle}`}
        >
          {open ? (
            <ChevronDown className="w-4 h-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{section.label}</span>
          <span className={`ml-1 text-xs font-semibold px-2 py-0.5 rounded-full ${countStyle}`}>
            {section.gigs.length}
          </span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              <TableHead className="w-[220px]">Gig</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Costs</TableHead>
              <TableHead>Profit</TableHead>
              <TableHead>Health</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {section.gigs.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="text-center text-gray-400 py-6 text-sm italic">
                  No gigs
                </TableCell>
              </TableRow>
            ) : (
              section.gigs.map((gig) => (
                <GigTableRow
                  key={gig.gigId}
                  gig={gig}
                  onNavigateToGigDetail={onNavigateToGigDetail}
                  organizationId={organizationId}
                />
              ))
            )}
          </TableBody>
        </Table>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function GigAccountingTable({ sections, onNavigateToGigDetail, organizationId }: GigAccountingTableProps) {
  return (
    <div>
      {sections.map((section) => (
        <SectionTable
          key={section.id}
          section={section}
          onNavigateToGigDetail={onNavigateToGigDetail}
          organizationId={organizationId}
        />
      ))}
    </div>
  );
}
