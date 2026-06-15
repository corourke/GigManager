import { useState, useEffect } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { Button } from '../../ui/button';
import { DetailLine } from './DetailLine';
import { getGig, getGigFinancials } from '../../../services/gig.service';

interface GigDetailViewProps {
  gigId: string;
  organizationId: string;
  onNavigateToGigDetail?: (gigId: string) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);

export default function GigDetailView({ gigId, organizationId, onNavigateToGigDetail }: GigDetailViewProps) {
  const [gig, setGig] = useState<Record<string, any> | null>(null);
  const [financials, setFinancials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      getGig(gigId),
      getGigFinancials(gigId, organizationId),
    ])
      .then(([gigData, finData]) => {
        if (!cancelled) {
          setGig(gigData);
          setFinancials(finData || []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load gig details');
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [gigId, organizationId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading gig details...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-500 py-4 text-center">{error}</div>;
  }

  if (!gig) return null;

  const venueName = gig.venue?.name || gig.participants?.find((p: any) => p.role === 'Venue')?.organization?.name;
  const actName = gig.act?.name || gig.participants?.find((p: any) => p.role === 'Act')?.organization?.name;

  return (
    <div className="space-y-3">
      <DetailLine label="Title" value={gig.title || '—'} />
      <DetailLine label="Date" value={gig.start ? new Date(gig.start).toLocaleDateString() : '—'} />
      {venueName && <DetailLine label="Venue" value={venueName} />}
      {actName && <DetailLine label="Act" value={actName} />}
      <DetailLine label="Status" value={gig.status || '—'} />

      {financials.length > 0 && (
        <div className="pt-3 border-t border-gray-200">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Financial Records</h4>
          {financials.map((fin: any) => (
            <DetailLine
              key={fin.id}
              label={fin.type}
              value={formatCurrency(fin.amount)}
              secondary={fin.paid_at ? 'Paid' : 'Unpaid'}
            />
          ))}
        </div>
      )}

      {onNavigateToGigDetail && (
        <div className="pt-3 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onNavigateToGigDetail(gigId)}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Open Gig
          </Button>
        </div>
      )}
    </div>
  );
}
