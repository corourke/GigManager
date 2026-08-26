import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { LocationCombobox } from './LocationCombobox';
import { createManualTrackingRecord } from '../../services/inventoryManagement.service';
import { TRACKING_STATUS_CONFIG } from '../../utils/supabase/constants';
import type { UserRole } from '../../utils/supabase/types';

interface ManualTrackingOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  gigId: string;
  kitId: string;
  assetId?: string;
  isContainerKit?: boolean;
  assetIds?: string[];
  userId: string;
  userRole?: UserRole;
  onSuccess: () => void;
  /** A short description of what's being edited, shown under the title — useful when this dialog is opened from a context (like Location Explorer) that isn't already scoped to one obvious item. */
  targetLabel?: string;
  /** When provided, the gig becomes editable via a selector (defaulting to `gigId`) instead of being fixed. */
  gigs?: { id: string; title: string }[];
}

export function ManualTrackingOverrideDialog({
  open,
  onOpenChange,
  organizationId,
  gigId,
  kitId,
  assetId,
  isContainerKit,
  assetIds,
  userId,
  onSuccess,
  targetLabel,
  gigs,
}: ManualTrackingOverrideDialogProps) {
  const [selectedGigId, setSelectedGigId] = useState<string>(gigId);
  const [status, setStatus] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [markForMaintenance, setMarkForMaintenance] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Re-sync to the current target's gig whenever the dialog opens (or its
  // target changes while open) — this instance may be reused across
  // different rows rather than remounted per row.
  useEffect(() => {
    if (open) setSelectedGigId(gigId);
  }, [open, gigId]);

  const handleSubmit = async () => {
    if (!status) {
      toast.error('Please select a status');
      return;
    }

    setSubmitting(true);
    try {
      await createManualTrackingRecord({
        organizationId,
        gigId: selectedGigId,
        kitId,
        assetId,
        status: markForMaintenance && assetId ? 'Maintenance' : status,
        location: location || null,
        notes: notes || null,
        createdBy: userId,
        isContainerKit,
        assetIds,
      });
      toast.success('Tracking record updated');
      onOpenChange(false);
      setStatus('');
      setLocation('');
      setNotes('');
      setMarkForMaintenance(false);
      onSuccess();
    } catch {
      toast.error('Failed to update tracking record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setStatus('');
      setLocation('');
      setNotes('');
      setMarkForMaintenance(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manual Tracking Override</DialogTitle>
          {targetLabel && <DialogDescription>{targetLabel}</DialogDescription>}
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          {gigs && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="override-gig">Gig</Label>
              <Select value={selectedGigId} onValueChange={setSelectedGigId}>
                <SelectTrigger id="override-gig">
                  <SelectValue placeholder="Select gig..." />
                </SelectTrigger>
                <SelectContent>
                  {gigs.map((gig) => (
                    <SelectItem key={gig.id} value={gig.id}>
                      {gig.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="override-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="override-status">
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRACKING_STATUS_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Location</Label>
            <LocationCombobox
              value={location}
              onChange={setLocation}
              organizationId={organizationId}
              placeholder="Enter or select location..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="override-notes">Notes</Label>
            <Textarea
              id="override-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
            />
          </div>
          {assetId && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="override-maintenance"
                checked={markForMaintenance}
                onCheckedChange={(checked) => setMarkForMaintenance(checked === true)}
              />
              <Label htmlFor="override-maintenance" className="cursor-pointer">
                Mark for Maintenance
              </Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !status}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
