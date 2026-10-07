import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '../ui/table';
import { getTaxReportData, type TaxReportData } from '../../services/taxReport.service';
import { getLockedTaxYears } from '../../services/taxYear.service';
import {
  buildIncomeReport, buildExpenseReport, buildAssetReport,
  incomeCsv, expensesCsv, assetsCsv, disposalsCsv, reportFilename, downloadCsv, dayOf,
} from '../../utils/taxReports';
import { recoveryPeriodLabel } from '../../utils/recoveryPeriod';

export type ReportKind = 'income' | 'expenses' | 'assets';

const REPORTS: { kind: ReportKind; label: string }[] = [
  { kind: 'income', label: 'Income' },
  { kind: 'expenses', label: 'Expenses' },
  { kind: 'assets', label: 'Assets' },
];

const usd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <Card className="flex-1 min-w-[150px] p-4 gap-1">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-semibold ${tone === 'warn' ? 'text-amber-600' : 'text-foreground'}`}>{value}</p>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground py-6 text-center">{children}</p>;
}

interface ReportingTabProps {
  organizationId: string;
  organizationName: string;
  /** Opens an equipment record's edit form (to choose its recovery period). */
  onEditAsset?: (assetId: string) => void;
}

/**
 * Tax-year reports (#125): Income, Expenses and Assets, cash basis, each with a
 * CSV download for the tax program. The counting is in utils/taxReports.
 */
export default function ReportingTab({ organizationId, organizationName, onEditAsset }: ReportingTabProps) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [kind, setKind] = useState<ReportKind>('income');
  const [data, setData] = useState<TaxReportData | null>(null);
  const [locked, setLocked] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setData(null);
    getTaxReportData(organizationId)
      .then(d => { if (!cancelled) setData(d); })
      .catch(err => {
        console.error('Error loading report data:', err);
        if (!cancelled) { toast.error('Failed to load the reports'); setData({ lines: [], gigRows: [], categories: [], scheduleC: [] }); }
      });
    getLockedTaxYears(organizationId).then(y => { if (!cancelled) setLocked(y); }).catch(() => {});
    return () => { cancelled = true; };
  }, [organizationId]);

  // Every year with data, and this year.
  const years = useMemo(() => {
    const ys = new Set<number>([thisYear]);
    for (const l of data?.lines ?? []) { const d = dayOf(l.purchase_date ?? l.parent?.purchase_date); if (d) ys.add(Number(d.slice(0, 4))); }
    for (const r of data?.gigRows ?? []) { const d = dayOf(r.paid_at); if (d) ys.add(Number(d.slice(0, 4))); }
    return [...ys].sort((a, b) => b - a);
  }, [data, thisYear]);

  const income = useMemo(() => data && buildIncomeReport(data.gigRows, year), [data, year]);
  const expenses = useMemo(() => data && buildExpenseReport(data.lines, data.gigRows, data.categories, data.scheduleC, year), [data, year]);
  const assets = useMemo(() => data && buildAssetReport(data.lines, year), [data, year]);

  const download = () => {
    if (!data) return;
    const csv = kind === 'income' ? incomeCsv(income!) : kind === 'expenses' ? expensesCsv(expenses!, data.scheduleC) : assetsCsv(assets!);
    downloadCsv(csv, reportFilename(organizationName, kind, year));
  };

  return (
    <Card className="p-6 gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="report-year" className="text-xs font-semibold text-muted-foreground">Tax year</label>
          <select id="report-year" aria-label="Tax year" value={year} onChange={e => setYear(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div role="group" aria-label="Report" className="inline-flex rounded-md border border-input overflow-hidden h-9">
          {REPORTS.map(r => (
            <button key={r.kind} type="button" aria-pressed={kind === r.kind} onClick={() => setKind(r.kind)}
              className={`px-4 text-sm font-medium border-r last:border-r-0 border-input ${kind === r.kind ? 'bg-sky-700 text-white' : 'bg-background text-foreground hover:bg-muted'}`}>
              {r.label}
            </button>
          ))}
        </div>
        {locked.has(year) && (
          <Badge variant="outline" className="h-7 gap-1 text-slate-600"><Lock className="w-3 h-3" />{year} is filed</Badge>
        )}
        <Button className="ml-auto bg-sky-700 hover:bg-sky-800 text-white" onClick={download} disabled={!data}>
          <Download className="w-4 h-4 mr-1" />Download CSV
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Cash basis: money counts in the year it was received or paid; equipment in the year it was bought.
        These are the figures your tax program asks for. GigWrangler doesn't calculate tax.
      </p>

      {!data ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading reports…</p>
      ) : kind === 'income' ? (
        <IncomeView report={income!} year={year} />
      ) : kind === 'expenses' ? (
        <ExpensesView report={expenses!} year={year} />
      ) : (
        <AssetsView report={assets!} year={year} onEditAsset={onEditAsset}
          onDownloadDisposals={() => downloadCsv(disposalsCsv(assets!), reportFilename(organizationName, 'disposals', year))} />
      )}
    </Card>
  );
}

function IncomeView({ report, year }: { report: ReturnType<typeof buildIncomeReport>; year: number }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Metric label={`Received in ${year}`} value={usd(report.total)} />
        <Metric label="Payments" value={String(report.rows.length)} />
      </div>
      {report.rows.length === 0 ? <Empty>No gig payments were received in {year}.</Empty> : (
        <Table aria-label="Income">
          <TableHeader>
            <TableRow>
              <TableHead>Date received</TableHead><TableHead>Gig</TableHead><TableHead>From</TableHead>
              <TableHead>Description</TableHead><TableHead>Reference</TableHead><TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="tabular-nums">{r.date}</TableCell>
                <TableCell>{r.gig}{r.gigDate && <span className="text-xs text-muted-foreground ml-2">{r.gigDate}</span>}</TableCell>
                <TableCell>{r.from}</TableCell>
                <TableCell className="max-w-[280px] truncate" title={r.description}>{r.description}</TableCell>
                <TableCell>{r.reference}</TableCell>
                <TableCell className="text-right tabular-nums">{usd(r.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow><TableCell colSpan={5}>Total</TableCell><TableCell className="text-right tabular-nums">{usd(report.total)}</TableCell></TableRow>
          </TableFooter>
        </Table>
      )}
    </div>
  );
}

function ExpensesView({ report, year }: { report: ReturnType<typeof buildExpenseReport>; year: number }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Metric label={`Expenses in ${year}`} value={usd(report.total)} />
        <Metric label="Items" value={String(report.rows.length)} />
        {report.needsCategory > 0 && <Metric label="Need a category" value={String(report.needsCategory)} tone="warn" />}
      </div>
      {report.rows.length === 0 ? <Empty>No expenses were paid in {year}.</Empty> : (
        <>
          {report.needsCategory > 0 && (
            <p role="status" className="flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {report.needsCategory} {report.needsCategory === 1 ? 'item has a category' : 'items have categories'} that aren’t on your expense list,
              so {report.needsCategory === 1 ? 'it has' : 'they have'} no Schedule C line. Edit the purchase to choose one.
            </p>
          )}
          <Table aria-label="Expenses by Schedule C line">
            <TableHeader>
              <TableRow><TableHead>Schedule C line / category</TableHead><TableHead className="text-right">Items</TableHead><TableHead className="text-right">Total</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {report.byLine.map(g => [
                <TableRow key={`l-${g.line ?? 'none'}`} className="bg-muted/40 font-semibold">
                  <TableCell>{g.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{g.categories.reduce((s, c) => s + c.count, 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">{usd(g.total)}</TableCell>
                </TableRow>,
                ...g.categories.map(c => (
                  <TableRow key={`c-${g.line ?? 'none'}-${c.category}`}>
                    <TableCell className="pl-8">{c.category}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.count}</TableCell>
                    <TableCell className="text-right tabular-nums">{usd(c.total)}</TableCell>
                  </TableRow>
                )),
              ])}
            </TableBody>
            <TableFooter>
              <TableRow><TableCell colSpan={2}>Total</TableCell><TableCell className="text-right tabular-nums">{usd(report.total)}</TableCell></TableRow>
            </TableFooter>
          </Table>

          <h3 className="text-sm font-semibold pt-2">Every expense</h3>
          <Table aria-label="Expenses">
            <TableHeader>
              <TableRow>
                <TableHead>Date paid</TableHead><TableHead>Source</TableHead><TableHead>Payee</TableHead><TableHead>Description</TableHead>
                <TableHead>Category</TableHead><TableHead>Line</TableHead><TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.map(r => (
                <TableRow key={`${r.source}-${r.id}`}>
                  <TableCell className="tabular-nums">{r.date}</TableCell>
                  <TableCell>{r.source}{r.gig && <span className="block text-xs text-muted-foreground">{r.gig}</span>}</TableCell>
                  <TableCell>{r.payee}</TableCell>
                  <TableCell className="max-w-[260px] truncate" title={r.description}>
                    {r.description}{r.miles != null && <span className="text-xs text-muted-foreground ml-1">({r.miles} mi)</span>}
                  </TableCell>
                  <TableCell className={r.unlisted ? 'text-amber-700' : undefined}>{r.category || '—'}</TableCell>
                  <TableCell>{r.line ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{usd(r.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}

function AssetsView({ report, year, onEditAsset, onDownloadDisposals }: {
  report: ReturnType<typeof buildAssetReport>; year: number;
  onEditAsset?: (assetId: string) => void; onDownloadDisposals: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Metric label={`Bought in ${year}`} value={usd(report.total)} />
        <Metric label="Items" value={String(report.rows.length)} />
        {report.missingPeriod > 0 && <Metric label="Need a recovery period" value={String(report.missingPeriod)} tone="warn" />}
        <Metric label="De minimis candidates" value={String(report.deMinimis)} />
      </div>
      {report.rows.length === 0 ? <Empty>No depreciated equipment was bought in {year}.</Empty> : (
        <>
          {report.byPeriod.length > 0 && (
            <div className="flex flex-wrap gap-2 text-sm" aria-label="Totals by recovery period">
              {report.byPeriod.map(p => (
                <span key={p.period ?? 'none'} className={`rounded-md border px-3 py-1 ${p.period ? 'bg-muted/40' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                  <strong>{p.period ? recoveryPeriodLabel(p.period) : 'No period yet'}</strong>: {p.count} · {usd(p.total)}
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Cost is the basis: what was paid, including the item’s share of tax and shipping. De minimis candidates cost $2,500 or
            less each, so the safe harbor could expense them; whether to use it is decided on the return.
          </p>
          <Table aria-label="Assets">
            <TableHeader>
              <TableRow>
                <TableHead>Date bought</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead>
                <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Cost each</TableHead>
                <TableHead className="text-right">Cost</TableHead><TableHead>Recovery period</TableHead><TableHead>De minimis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="tabular-nums">{r.date}</TableCell>
                  <TableCell className="max-w-[280px] truncate" title={r.description}>{r.description}</TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{usd(r.itemCost)}</TableCell>
                  <TableCell className="text-right tabular-nums">{usd(r.cost)}</TableCell>
                  <TableCell>
                    {r.recoveryPeriod ? recoveryPeriodLabel(r.recoveryPeriod) : r.assetId && onEditAsset ? (
                      <button type="button" className="text-amber-700 font-medium underline" onClick={() => onEditAsset(r.assetId!)}
                        aria-label={`Choose a recovery period: ${r.description}`}>Choose…</button>
                    ) : <span className="text-amber-700">Not chosen</span>}
                  </TableCell>
                  <TableCell>{r.deMinimis ? 'Candidate' : ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow><TableCell colSpan={5}>Total</TableCell><TableCell className="text-right tabular-nums">{usd(report.total)}</TableCell><TableCell colSpan={2} /></TableRow>
            </TableFooter>
          </Table>
        </>
      )}

      <div className="flex items-center gap-3 pt-2">
        <h3 className="text-sm font-semibold">Disposed of in {year}</h3>
        {report.disposals.length > 0 && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={onDownloadDisposals}>
            <Download className="w-4 h-4 mr-1" />Download disposals CSV
          </Button>
        )}
      </div>
      {report.disposals.length === 0 ? <Empty>No depreciated equipment was sold or retired in {year}.</Empty> : (
        <Table aria-label="Disposals">
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead><TableHead>Date bought</TableHead><TableHead className="text-right">Cost</TableHead>
              <TableHead>Date disposed</TableHead><TableHead className="text-right">Sale proceeds</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.disposals.map(d => (
              <TableRow key={d.id}>
                <TableCell>{d.description}</TableCell>
                <TableCell className="tabular-nums">{d.bought}</TableCell>
                <TableCell className="text-right tabular-nums">{usd(d.cost)}</TableCell>
                <TableCell className="tabular-nums">{d.disposed}</TableCell>
                <TableCell className="text-right tabular-nums">{d.proceeds != null ? usd(d.proceeds) : '—'}</TableCell>
                <TableCell>{d.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
