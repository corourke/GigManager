import React from 'react';
import { AlertTriangle, Users, MapPin, Package } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Conflict } from '../services/conflictDetection.service';

interface ConflictWarningProps {
  conflicts: Conflict[];
  showAsCard?: boolean;
  onViewGig?: (gigId: string) => void;
  onOverride?: (conflictId: string) => void;
}

export function ConflictWarning({
  conflicts,
  showAsCard = false,
  onViewGig,
  onOverride
}: ConflictWarningProps) {
  if (conflicts.length === 0) return null;

  const getConflictIcon = (type: Conflict['type']) => {
    switch (type) {
      case 'staff':
        return <Users className="h-4 w-4" />;
      case 'venue':
        return <MapPin className="h-4 w-4" />;
      case 'equipment':
        return <Package className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getConflictColor = (type: Conflict['type']) => {
    switch (type) {
      case 'staff':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'venue':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'equipment':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatConflictDetails = (conflict: Conflict) => {
    switch (conflict.type) {
      case 'staff':
        const staffNames = conflict.details.conflicting_staff?.map((s: any) => s.name).join(', ') || '';
        return `Staff conflict with: ${staffNames}`;
      case 'venue':
        return `Venue conflict at: ${conflict.details.venue_name || 'Unknown venue'}`;
      case 'equipment':
        const kitNames = conflict.details.conflicting_kits?.map((k: any) => k.kit_name).join(', ') || '';
        return `Equipment conflict with kits: ${kitNames}`;
      default:
        return 'Unknown conflict type';
    }
  };

  const ConflictItem = ({ conflict }: { conflict: Conflict }) => (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-white">
      <div className={`p-1 rounded ${getConflictColor(conflict.type)}`}>
        {getConflictIcon(conflict.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className={getConflictColor(conflict.type)}>
            {conflict.type.charAt(0).toUpperCase() + conflict.type.slice(1)} Conflict
          </Badge>
          <span className="text-sm font-medium text-gray-900 truncate">
            {conflict.gig_title}
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-2">
          {formatConflictDetails(conflict)}
        </p>
        <div className="flex items-center gap-2">
          {onViewGig && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewGig(conflict.gig_id)}
            >
              View Gig
            </Button>
          )}
          {onOverride && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOverride(`${conflict.type}-${conflict.gig_id}`)}
            >
              Override
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  if (showAsCard) {
    return (
      <Card className="p-4 border-orange-200 bg-orange-50/50">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <h3 className="text-sm font-semibold text-orange-800 uppercase tracking-wider">
            Conflicts Detected ({conflicts.length})
          </h3>
        </div>
        <div className="space-y-3">
          {conflicts.map((conflict, index) => (
            <ConflictItem key={`${conflict.type}-${conflict.gig_id}-${index}`} conflict={conflict} />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Alert variant="destructive" className="border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="text-orange-800">
        {conflicts.length} Conflict{conflicts.length > 1 ? 's' : ''} Detected
      </AlertTitle>
      <AlertDescription className="text-orange-700">
        <div className="space-y-2 mt-2">
          {conflicts.map((conflict, index) => (
            <div key={`${conflict.type}-${conflict.gig_id}-${index}`} className="flex items-center gap-2">
              {getConflictIcon(conflict.type)}
              <span className="text-sm">
                <strong>{conflict.gig_title}</strong> - {formatConflictDetails(conflict)}
              </span>
              {onViewGig && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto h-6 text-xs"
                  onClick={() => onViewGig(conflict.gig_id)}
                >
                  View
                </Button>
              )}
            </div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}