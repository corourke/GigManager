import { Card } from '../ui/card';

/** A headline figure above a report (Financials → Reporting). */
export function Metric({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <Card className="flex-1 min-w-[150px] p-4 gap-1">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-semibold ${tone === 'warn' ? 'text-amber-600' : 'text-foreground'}`}>{value}</p>
    </Card>
  );
}

/** A report with nothing in it for the year. */
export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground py-6 text-center">{children}</p>;
}
