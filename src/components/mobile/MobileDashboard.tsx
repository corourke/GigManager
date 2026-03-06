import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { PageHeader } from '../ui/PageHeader';
import { 
  LayoutDashboard, 
  MapPin, 
  Phone, 
  ChevronRight, 
  Package, 
  WifiOff, 
  RefreshCw 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { packingListService } from '../../services/mobile/packingList.service';
import { idbStore } from '../../utils/idb/store';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export default function MobileDashboard() {
  const [gigs, setGigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleStatusChange = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    loadGigs();

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const loadGigs = async () => {
    setLoading(true);
    try {
      // First try to load from IDB for fast initial render
      const cachedGigs = await idbStore.getGigs();
      if (cachedGigs.length > 0) {
        setGigs(cachedGigs);
      }

      // Then refresh from network if online
      if (navigator.onLine) {
        const freshGigs = await packingListService.fetchUpcomingGigs();
        setGigs(freshGigs || []);
      }
    } catch (error) {
      console.error('Failed to load gigs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky Sub-Header for Page Title */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Gigs</h1>
          <p className="text-xs text-muted-foreground">Next 48 hours</p>
        </div>
        <div className="flex items-center gap-2">
          {isOffline && (
            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200">
              <WifiOff className="w-3 h-3" />
              <span className="text-[10px]">Offline</span>
            </Badge>
          )}
          <Button variant="ghost" size="icon" onClick={loadGigs} disabled={loading} className="h-9 w-9">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 pb-12">
        {gigs.length === 0 && !loading ? (
          <Card className="p-8 text-center bg-muted/30 border-dashed">
            <p className="text-muted-foreground">No upcoming gigs found.</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {gigs.map((gig) => (
              <GigCard key={gig.id} gig={gig} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GigCard({ gig }: { gig: any }) {
  const startTime = parseISO(gig.start);
  const venue = gig.participants?.find((p: any) => p.role === 'Venue')?.organization;

  const handleDirections = () => {
    if (!venue) return;
    const address = `${venue.name} ${venue.address_line1 || ''}`;
    window.open(`https://maps.apple.com/?q=${encodeURIComponent(address)}`, '_blank');
  };

  return (
    <Card className="overflow-hidden border-l-4 border-l-sky-500 active:bg-muted/50 transition-colors shadow-sm">
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <CardTitle className="text-lg leading-tight truncate">{gig.title}</CardTitle>
            <CardDescription className="font-semibold text-sky-700 mt-0.5">
              {format(startTime, 'EEE, MMM d • h:mm a')}
            </CardDescription>
          </div>
          <Badge variant={gig.status === 'Booked' ? 'default' : 'secondary'} className="shrink-0 text-[10px]">
            {gig.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {venue && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="line-clamp-1">{venue.name}</span>
          </div>
        )}
        
        <div className="flex gap-2 pt-1">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 gap-2 h-10 text-xs" 
            onClick={handleDirections}
            disabled={!venue}
          >
            <MapPin className="w-4 h-4" />
            Directions
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 gap-2 h-10 text-xs"
            onClick={() => window.open(`tel:${gig.contact_phone || '555-0199'}`)}
          >
            <Phone className="w-4 h-4" />
            Call
          </Button>
        </div>

        <Button 
          variant="secondary" 
          className="w-full justify-between h-10 text-xs"
          asChild
        >
          <a href={`/mobile/inventory/${gig.id}`}>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>Packing List</span>
            </div>
            <ChevronRight className="w-4 h-4" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
