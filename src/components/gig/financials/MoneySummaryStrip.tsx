import { cn } from '../../ui/utils';
import type { GigMoneySummary } from '../../../services/gigFinancial.service';
import { formatMoney } from './format';

interface Tile {
  label: string;
  value: number;
  detail: string;
  tone?: 'attention' | 'good' | 'bad';
}

/** Expected, Received, Owed to you, Costs, Net. */
export default function MoneySummaryStrip({ summary, isLoading }: { summary: GigMoneySummary | null; isLoading?: boolean }) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" aria-busy="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border bg-white p-3 animate-pulse">
            <div className="h-2.5 w-16 bg-muted rounded mb-2" />
            <div className="h-5 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  const owedTone = summary.dueIn > 0 ? 'attention' : undefined;
  const owedDetail =
    summary.outstandingIn === 0
      ? 'Nothing outstanding'
      : summary.dueIn > 0
        ? `${formatMoney(summary.dueIn)} due now`
        : 'Not yet due';
  const costDetail = [
    `${formatMoney(summary.paidOut)} paid`,
    summary.outstandingOut > 0 ? `${formatMoney(summary.outstandingOut)} owed` : null,
    summary.projectedStaffCosts > 0 ? `${formatMoney(summary.projectedStaffCosts)} staff booked` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const tiles: Tile[] = [
    { label: 'Expected', value: summary.expectedIn, detail: 'Money in, accepted or later' },
    { label: 'Received', value: summary.receivedIn, detail: 'Money in, paid' },
    { label: 'Owed to you', value: summary.outstandingIn, detail: owedDetail, tone: owedTone },
    { label: 'Costs', value: summary.totalCosts, detail: costDetail },
    {
      label: 'Net',
      value: summary.profit,
      detail: summary.expectedIn > 0 ? `${summary.margin.toFixed(0)}% margin` : 'Expected minus costs',
      tone: summary.profit > 0 ? 'good' : summary.profit < 0 ? 'bad' : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {tiles.map((t) => (
        <div
          key={t.label}
          className={cn(
            'rounded-lg border p-3',
            t.tone === 'attention' ? 'bg-amber-50 border-amber-300' : 'bg-white',
          )}
        >
          <div className={cn('text-xs uppercase tracking-wide font-semibold', t.tone === 'attention' ? 'text-amber-800' : 'text-gray-500')}>
            {t.label}
          </div>
          <div
            className={cn(
              'text-lg font-bold mt-0.5',
              t.tone === 'attention' && 'text-amber-900',
              t.tone === 'good' && 'text-green-700',
              t.tone === 'bad' && 'text-red-700',
            )}
          >
            {formatMoney(t.value)}
          </div>
          <div className={cn('text-xs', t.tone === 'attention' ? 'text-amber-800' : 'text-gray-500')}>{t.detail}</div>
        </div>
      ))}
    </div>
  );
}
