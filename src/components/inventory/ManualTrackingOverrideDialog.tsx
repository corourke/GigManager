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
import { Input } from '../ui/input';
import { LocationCombobox } from './LocationCombobox';
import { createManualTrackingRecord, moveLotPieces } from '../../services/inventoryManagement.service';
import { sendToMaintenance } from '../../services/maintenance.service';
import { RETURNED_STATUS } from '../../config/inventoryWorkflow';
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
  /** A whole-kit override of a logical kit: its own kit row moves with its units. */
  keepKitRow?: boolean;
  userId: string;
  userRole?: UserRole;
  onSuccess: () => void;
  /** A short description of what's being edited, shown under the title — useful when this dialog is opened from a context (like Location Explorer) that isn't already scoped to one obvious item. */
  targetLabel?: string;
  /** When provided, the gig becomes editable via a selector (defaulting to `gigId`) instead of being fixed. */
  gigs?: { id: string; title: string }[];
  /** Part of a lot at one place (#186): move N of its pieces there, by the lot rules. */
  lot?: {
    here: number; of: number; status: string; location: string | null; place: string;
    /** The lot's pieces are in a case: its name and where the case itself is. */
    inCase?: { name: string; gigId: string; gigTitle: string } | null;
  };
  /** A unit's row is a return (it's home): Mark for Maintenance sends it with no gig (#186 step 4). */
  atHome?: boolean;
  /** The record is already in maintenance, or flagged (#186 step 4): said instead of the box. */
  maintenance?: { state: 'in' | 'flagged'; location?: string | null } | null;
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
  keepKitRow,
  userId,
  onSuccess,
  targetLabel,
  gigs,
  lot,
  atHome,
  maintenance,
}: ManualTrackingOverrideDialogProps) {
  const [selectedGigId, setSelectedGigId] = useState<string>(gigId);
  const [status, setStatus] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [markForMaintenance, setMarkForMaintenance] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [moveCount, setMoveCount] = useState<number>(lot?.here ?? 1);
  // Mark for Maintenance (#186 step 4): a send, with how many for a lot, where and when back.
  const [sendCount, setSendCount] = useState<number>(1);
  const [maintenanceLocation, setMaintenanceLocation] = useState<string>('');
  const [expectedBack, setExpectedBack] = useState<string>('');
  const sending = markForMaintenance && !!assetId && !maintenance;

  // A lot (#186): how many go, unless it's a new status for all of it at the same gig.
  // From home, `here` is the pieces home, so no more than those go.
  const written = status;
  const fromHome = lot?.status === RETURNED_STATUS;
  const goingHome = written === RETURNED_STATUS;
  const wholeBucket = !!lot && !!status && !goingHome && !fromHome && selectedGigId === gigId;
  const choosesCount = !!lot && !!assetId && !wholeBucket;
  const n = Math.max(1, Math.min(Math.floor(moveCount) || 1, lot?.here ?? 1));
  const destination = goingHome ? 'back home' : `to ${gigs?.find((g) => g.id === selectedGigId)?.title ?? 'the gig'}`;
  // Part of a lot in a case may go to another gig (Cameron, 10-12): those pieces leave the case.
  const leaveCase = !!lot?.inCase && !!status && choosesCount && !goingHome && selectedGigId !== lot.inCase.gigId;
  const after = lot && status && choosesCount
    ? `After: ${[!fromHome && lot.here - n > 0 ? `${lot.here - n} stay at ${lot.place}` : null, `${n} ${destination}`].filter(Boolean).join(' · ')}`
    : null;

  // Re-sync to the current target's gig whenever the dialog opens (or its
  // target changes while open) — this instance may be reused across
  // different rows rather than remounted per row.
  useEffect(() => {
    if (open) setSelectedGigId(gigId);
  }, [open, gigId]);

  const reset = () => {
    setStatus('');
    setLocation('');
    setNotes('');
    setMarkForMaintenance(false);
    setSendCount(1);
    setMaintenanceLocation('');
    setExpectedBack('');
  };

  // Sends to maintenance with the row's gig (still out: flagged until it comes home), or with
  // none from home, where the shared wrapper applies the Locations home count (#186 step 4).
  const handleSend = async () => {
    if (!assetId) return;
    setSubmitting(true);
    try {
      const home = lot ? lot.status === RETURNED_STATUS : !!atHome;
      await sendToMaintenance({
        assetId,
        quantity: lot ? Math.max(1, Math.min(Math.floor(sendCount) || 1, lot.here)) : 1,
        notes: notes || null,
        location: maintenanceLocation || null,
        expectedBack: expectedBack || null,
        gigId: home ? null : gigId,
      });
      toast.success('Sent to maintenance');
      onOpenChange(false);
      reset();
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : 'Not sent to maintenance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (sending) {
      await handleSend();
      return;
    }
    if (!status) {
      toast.error('Please select a status');
      return;
    }

    setSubmitting(true);
    try {
      if (lot && assetId) {
        await moveLotPieces({
          organizationId,
          assetId,
          kitId: kitId || null,
          fromGigId: gigId,
          fromStatus: lot.status,
          fromLocation: lot.location,
          here: lot.here,
          lotOf: lot.of,
          leaveCase,
          n: wholeBucket ? lot.here : n,
          toGigId: selectedGigId,
          // Unchanged in this step (Cameron, 10-11): the row's status, as for a unit.
          toStatus: written,
          toLocation: location || null,
          notes: notes || null,
          createdBy: userId,
        });
        toast.success('Tracking record updated');
        onOpenChange(false);
        setStatus('');
        setLocation('');
        setNotes('');
        setMarkForMaintenance(false);
        onSuccess();
        return;
      }
      await createManualTrackingRecord({
        organizationId,
        gigId: selectedGigId,
        kitId,
        assetId,
        status,
        location: location || null,
        notes: notes || null,
        createdBy: userId,
        isContainerKit,
        assetIds,
        keepKitRow,
      });
      toast.success('Tracking record updated');
      onOpenChange(false);
      setStatus('');
      setLocation('');
      setNotes('');
      setMarkForMaintenance(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : 'Failed to update tracking record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) reset();
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
          {gigs && !sending && (
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
          {!sending && (<>
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
          </>)}
          {sending && (
            <div className="flex flex-col gap-3">
              {lot && (
                <div className="flex items-center gap-2 text-sm">
                  <span>Send</span>
                  <Input
                    type="number"
                    aria-label="How many to send"
                    className="h-9 w-20"
                    min={1}
                    max={lot.here}
                    value={sendCount}
                    onChange={(e) => setSendCount(Number(e.target.value))}
                  />
                  <span>{`of the ${lot.here} at ${lot.place}`}</span>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="override-maintenance-location">Maintenance location</Label>
                <Input
                  id="override-maintenance-location"
                  value={maintenanceLocation}
                  onChange={(e) => setMaintenanceLocation(e.target.value)}
                  placeholder="e.g. Repair Bench"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="override-expected-back">Expected back</Label>
                <Input
                  id="override-expected-back"
                  type="date"
                  value={expectedBack}
                  onChange={(e) => setExpectedBack(e.target.value)}
                />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="override-notes">Notes</Label>
            <Textarea
              id="override-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
            />
          </div>
          {!sending && choosesCount && lot && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-sm">
                <span>Move</span>
                <Input
                  type="number"
                  aria-label="How many to move"
                  className="h-9 w-20"
                  min={1}
                  max={lot.here}
                  value={moveCount}
                  onChange={(e) => setMoveCount(Number(e.target.value))}
                />
                <span>{`of the ${lot.here} at ${lot.place}`}</span>
              </div>
              {after && <p className="text-xs text-muted-foreground">{after}</p>}
              {leaveCase && lot?.inCase && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {`These ${n} leave ${lot.inCase.name}. The case stays at ${lot.inCase.gigTitle}.`}
                </p>
              )}
            </div>
          )}
          {assetId && maintenance && (
            <p className="text-sm text-muted-foreground">
              {maintenance.state === 'in'
                ? `In maintenance${maintenance.location ? ` · ${maintenance.location}` : ''}.`
                : 'Flagged to maintenance: it goes in when it comes home.'}
              {' '}Edit it, or return it to service, on the Maintenance list.
            </p>
          )}
          {assetId && !maintenance && (
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
          <Button onClick={handleSubmit} disabled={submitting || (!sending && !status)}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {sending ? 'Send to maintenance' : choosesCount && status ? `Move ${n}` : 'Save Override'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
