import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { TableRow, TableCell } from '../ui/table';
import { getGigFinancials } from '../../services/gig.service';
import { GigAccountingSummary } from '../../utils/supabase/types';

interface GigAccountingRowDetailProps {
  gig: GigAccountingSummary;
  organizationId?: string;
  onNavigateToGigDetail?: (gigId: string) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const formatDate = (dateStr: string) => {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
};

interface FinancialRecord {
  id: string;
  type: string;
  amount: number;
  date: string;
  paid_at?: string | null;
  description?: string;
  external_entity_name?: string;
  counterparty?: { name: string } | null;
  category?: string | null;
}

function DetailLine({ label, value, secondary }: { label: string; value: string; secondary?: string }) {
  return (
    <div className="flex items-baseline justify-between py-1 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="text-right">
        <span className="text-sm font-medium text-gray-900">{value}</span>
        {secondary && <span className="text-xs text-gray-500 ml-2">{secondary}</span>}
      </div>
    </div>
  );
}

export default function GigAccountingRowDetail({
  gig,
  organizationId,
  onNavigateToGigDetail,
}: GigAccountingRowDetailProps) {
  const [records, setRecords] = useState<FinancialRecord[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getGigFinancials(gig.gigId, organizationId)
      .then((data) => {
        if (!cancelled) {
          setRecords(data as FinancialRecord[]);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load financial details');
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [gig.gigId, organizationId]);

  const contractSigned = records?.filter((r) => r.type === 'Contract Signed') ?? [];
  const depositsReceived = records?.filter((r) => r.type === 'Deposit Received') ?? [];
  const paymentsReceived = records?.filter((r) => r.type === 'Payment Received') ?? [];

  const expensesIncurred = records?.filter((r) => r.type === 'Expense Incurred') ?? [];
  const paymentsSent = records?.filter((r) => r.type === 'Payment Sent') ?? [];
  const depositsSent = records?.filter((r) => r.type === 'Deposit Sent') ?? [];

  const subContractSubmitted = records?.filter((r) => r.type === 'Sub-Contract Submitted') ?? [];
  const subContractSigned = records?.filter((r) => r.type === 'Sub-Contract Signed') ?? [];
  const subContractSettled = records?.filter((r) => r.type === 'Sub-Contract Settled') ?? [];

  const getCounterpartyName = (r: FinancialRecord) =>
    r.counterparty?.name || r.external_entity_name || '—';

  return (
    <TableRow className="bg-gray-50 hover:bg-gray-50">
      <TableCell colSpan={6} className="p-0">
        <div className="p-4">
          {isLoading && (
            <div className="flex items-center justify-center py-6 gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading details…</span>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-500 py-4 text-center">{error}</div>
          )}

          {!isLoading && !error && records && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Revenue</h4>

                {contractSigned.length > 0 ? (
                  contractSigned.map((r) => (
                    <DetailLine
                      key={r.id}
                      label="Contract Signed"
                      value={formatCurrency(r.amount)}
                      secondary={r.date ? formatDate(r.date) : undefined}
                    />
                  ))
                ) : (
                  <DetailLine label="Contract Signed" value="—" />
                )}

                {depositsReceived.length > 0 && depositsReceived.map((r) => (
                  <DetailLine
                    key={r.id}
                    label="Deposit Received"
                    value={formatCurrency(r.amount)}
                    secondary={r.paid_at ? `Paid ${formatDate(r.paid_at)}` : undefined}
                  />
                ))}

                {paymentsReceived.length > 0 && paymentsReceived.map((r) => (
                  <DetailLine
                    key={r.id}
                    label="Payment Received"
                    value={formatCurrency(r.amount)}
                    secondary={r.paid_at ? `Paid ${formatDate(r.paid_at)}` : undefined}
                  />
                ))}

                {depositsReceived.length === 0 && paymentsReceived.length === 0 && (
                  <DetailLine label="Payments / Deposits Received" value="None" />
                )}

                <div className="mt-2 pt-2 border-t border-gray-200">
                  <DetailLine label="Outstanding" value={formatCurrency(gig.outstandingRevenue)} />
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Expenses</h4>

                {expensesIncurred.map((r) => (
                  <DetailLine
                    key={r.id}
                    label={r.description || r.category || 'Expense'}
                    value={formatCurrency(r.amount)}
                    secondary={r.paid_at ? `Paid ${formatDate(r.paid_at)}` : 'Unpaid'}
                  />
                ))}

                {paymentsSent.map((r) => (
                  <DetailLine
                    key={r.id}
                    label={r.description || 'Payment Sent'}
                    value={formatCurrency(r.amount)}
                    secondary={r.paid_at ? formatDate(r.paid_at) : undefined}
                  />
                ))}

                {depositsSent.map((r) => (
                  <DetailLine
                    key={r.id}
                    label={r.description || 'Deposit Sent'}
                    value={formatCurrency(r.amount)}
                    secondary={r.paid_at ? formatDate(r.paid_at) : undefined}
                  />
                ))}

                {expensesIncurred.length === 0 && paymentsSent.length === 0 && depositsSent.length === 0 && (
                  <p className="text-sm text-gray-400 italic">No direct expenses</p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Sub-Contracts</h4>

                {subContractSubmitted.length === 0 && subContractSigned.length === 0 && subContractSettled.length === 0 && (
                  <p className="text-sm text-gray-400 italic">No sub-contracts</p>
                )}

                {subContractSettled.map((r) => (
                  <div key={r.id} className="flex items-baseline justify-between py-1 border-b border-gray-100 last:border-0">
                    <div>
                      <span className="text-sm text-gray-700">{getCounterpartyName(r)}</span>
                      <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Settled</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(r.amount)}</span>
                  </div>
                ))}

                {subContractSigned.map((r) => (
                  <div key={r.id} className="flex items-baseline justify-between py-1 border-b border-gray-100 last:border-0">
                    <div>
                      <span className="text-sm text-gray-700">{getCounterpartyName(r)}</span>
                      <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Signed</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(r.amount)}</span>
                  </div>
                ))}

                {subContractSubmitted.map((r) => (
                  <div key={r.id} className="flex items-baseline justify-between py-1 border-b border-gray-100 last:border-0">
                    <div>
                      <span className="text-sm text-gray-700">{getCounterpartyName(r)}</span>
                      <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Submitted</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(r.amount)}</span>
                  </div>
                ))}

                {gig.paymentsToMake > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <DetailLine
                      label="Payments to Make"
                      value={formatCurrency(gig.paymentsToMake)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToGigDetail?.(gig.gigId)}
            >
              View Gig Financials
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
