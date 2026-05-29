import { useMemo } from 'react';
import { Card } from '../ui/card';
import { GigAccountingSummary } from '../../utils/supabase/types';

interface GigAccountingSummaryBarProps {
  summaries: GigAccountingSummary[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

interface MetricCardProps {
  label: string;
  value: number;
  valueClassName?: string;
}

function MetricCard({ label, value, valueClassName }: MetricCardProps) {
  return (
    <Card className="flex-1 min-w-[140px] p-4 flex flex-col gap-1">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-semibold ${valueClassName ?? 'text-gray-900'}`}>{formatCurrency(value)}</p>
    </Card>
  );
}

export default function GigAccountingSummaryBar({ summaries }: GigAccountingSummaryBarProps) {
  const totals = useMemo(() => {
    let contractAmount = 0;
    let received = 0;
    let outstandingRevenue = 0;
    let totalCosts = 0;
    let paymentsToMake = 0;
    let profit = 0;

    for (const s of summaries) {
      contractAmount += s.contractAmount;
      received += s.received;
      outstandingRevenue += s.outstandingRevenue;
      totalCosts += s.totalCosts;
      paymentsToMake += s.paymentsToMake;
      profit += s.profit;
    }

    return { contractAmount, received, outstandingRevenue, totalCosts, paymentsToMake, profit };
  }, [summaries]);

  return (
    <div className="flex flex-wrap gap-3">
      <MetricCard label="Expected Revenue" value={totals.contractAmount} />
      <MetricCard label="Received" value={totals.received} />
      <MetricCard
        label="Outstanding"
        value={totals.outstandingRevenue}
        valueClassName={totals.outstandingRevenue > 0 ? 'text-amber-600' : 'text-green-600'}
      />
      <MetricCard label="Total Costs" value={totals.totalCosts} />
      <MetricCard
        label="Payments Due"
        value={totals.paymentsToMake}
        valueClassName={totals.paymentsToMake > 0 ? 'text-red-600' : 'text-green-600'}
      />
      <MetricCard
        label="Net Profit"
        value={totals.profit}
        valueClassName={totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}
      />
    </div>
  );
}
