import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Barcode, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card } from '../ui/card';
import { getGigsForOrganization } from '../../services/gig.service';
import MobileInventoryMode from '../mobile/MobileInventoryMode';

interface TrackingTabProps {
  organizationId: string;
}

/**
 * The web home for equipment tracking/scanning — the same experience
 * mobile users get as "Inventory Mode" (MobileInventoryMode), just reached
 * from the desktop Equipment › Inventory menu instead of the phone's nav
 * bar, and with its own gig picker since there's no mobile dashboard here
 * to select one from first.
 */
export default function TrackingTab({ organizationId }: TrackingTabProps) {
  const [gigs, setGigs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getGigsForOrganization(organizationId)
      .then((data) => {
        if (!cancelled) setGigs(data || []);
      })
      .catch(() => {
        if (!cancelled) setGigs([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <label className="text-sm text-gray-600 mb-2 block">Gig</label>
        <Select value={selectedGigId ?? undefined} onValueChange={setSelectedGigId}>
          <SelectTrigger className="w-full max-w-md">
            {isLoading ? (
              <span className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading gigs...
              </span>
            ) : (
              <SelectValue placeholder="Select a gig to track" />
            )}
          </SelectTrigger>
          <SelectContent>
            {gigs.map((gig: any) => (
              <SelectItem key={gig.id} value={gig.id}>
                {gig.title || 'Untitled Gig'}
                {gig.start ? ` · ${format(new Date(gig.start), 'MMM d, yyyy')}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {selectedGigId ? (
        <div className="max-w-md border border-gray-200 rounded-lg overflow-hidden bg-white">
          <MobileInventoryMode gigId={selectedGigId} onSelectGig={setSelectedGigId} />
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Barcode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">Select a gig above to start tracking its equipment.</p>
        </Card>
      )}
    </div>
  );
}
